import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { query, runMigrations } from './db.js';
import {
  hashPassword,
  comparePassword,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  authMiddleware,
} from './auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS setup for dev and production
app.use(
  cors({
    origin: true, // Allow frontend origin
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 attempts per 15 min
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// Helper: generate random invite code
function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 characters
}

// Helper: check group membership
async function checkGroupMember(groupId, userId) {
  // Check if group exists
  const groupRes = await query('SELECT * FROM groups WHERE id = $1', [groupId]);
  if (groupRes.rows.length === 0) {
    return { status: 404, error: 'Group not found.' };
  }
  const group = groupRes.rows[0];

  // Check if user is a member of this group
  const memberRes = await query(
    'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );

  if (memberRes.rows.length === 0) {
    return { status: 403, error: 'Access forbidden. You are not a member of this group.' };
  }

  return { status: 200, group, currentMember: memberRes.rows[0] };
}

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, display_name, emoji, color } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplayName = (display_name || username).trim();

    // Check duplicate username
    const existing = await query('SELECT id FROM users WHERE LOWER(username) = $1', [cleanUsername]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username is already taken. Please choose another.' });
    }

    const password_hash = await hashPassword(password);
    const userId = `usr_${crypto.randomUUID()}`;

    const insertRes = await query(
      `INSERT INTO users (id, username, password_hash, display_name, emoji, color)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, display_name, emoji, color, created_at`,
      [userId, cleanUsername, password_hash, cleanDisplayName, emoji || '⚡', color || '#FF2E93']
    );

    const user = insertRes.rows[0];
    const token = signToken(user);
    setAuthCookie(res, token);

    res.status(201).json({ user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Please provide both username and password.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const userRes = await query(
      'SELECT id, username, password_hash, display_name, emoji, color, created_at FROM users WHERE LOWER(username) = $1',
      [cleanUsername]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = userRes.rows[0];
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const { password_hash: _password_hash, ...safeUser } = user;
    const token = signToken(safeUser);
    setAuthCookie(res, token);

    res.json({ user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out successfully.' });
});

// Current User Me
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const userRes = await query(
      'SELECT id, username, display_name, emoji, color, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (userRes.rows.length === 0) {
      clearAuthCookie(res);
      return res.status(401).json({ error: 'User no longer exists.' });
    }
    res.json({ user: userRes.rows[0] });
  } catch (err) {
    console.error('Auth me error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ==========================================
// 2. GROUPS ROUTES
// ==========================================

// List user's groups
app.get('/api/groups', authMiddleware, async (req, res) => {
  try {
    const groupsRes = await query(
      `SELECT g.*, 
              (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) AS member_count,
              (SELECT COUNT(*) FROM expenses e WHERE e.group_id = g.id) AS expense_count
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = $1
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );

    res.json({ groups: groupsRes.rows });
  } catch (err) {
    console.error('List groups error:', err);
    res.status(500).json({ error: 'Could not fetch groups.' });
  }
});

// Create Group
app.post('/api/groups', authMiddleware, async (req, res) => {
  try {
    const { name, emoji, signature_color, accent_color, currency, initial_members } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required.' });
    }

    const groupId = `grp_${crypto.randomUUID()}`;
    const inviteCode = generateInviteCode();
    const groupCurrency = currency || 'INR';

    await query(
      `INSERT INTO groups (id, name, emoji, signature_color, accent_color, currency, invite_code, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        groupId,
        name.trim(),
        emoji || '🏖️',
        signature_color || '#FF7A00',
        accent_color || '#FFE600',
        groupCurrency,
        inviteCode,
        req.user.id,
      ]
    );

    // Add creator as first group member
    const creatorMemberId = `m_${crypto.randomUUID()}`;
    await query(
      `INSERT INTO group_members (id, group_id, user_id, display_name, emoji, color)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        creatorMemberId,
        groupId,
        req.user.id,
        req.user.display_name,
        req.user.emoji || '⚡',
        req.user.color || '#FF2E93',
      ]
    );

    // Add any initial placeholder members
    if (Array.isArray(initial_members)) {
      for (const m of initial_members) {
        const mName = (m.name || m.display_name || '').trim();
        if (mName && mName.toLowerCase() !== req.user.display_name.toLowerCase()) {
          const mId = `m_${crypto.randomUUID()}`;
          await query(
            `INSERT INTO group_members (id, group_id, user_id, display_name, emoji, color)
             VALUES ($1, $2, NULL, $3, $4, $5)`,
            [mId, groupId, mName, m.emoji || '👤', m.color || '#FFE600']
          );
        }
      }
    }

    // Return the newly created group with members
    const groupData = await fetchFullGroupData(groupId);
    res.status(201).json({ group: groupData });
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Could not create group.' });
  }
});

// Get Group Details
app.get('/api/groups/:id', authMiddleware, async (req, res) => {
  try {
    const check = await checkGroupMember(req.params.id, req.user.id);
    if (check.status !== 200) {
      return res.status(check.status).json({ error: check.error });
    }

    const groupData = await fetchFullGroupData(req.params.id);
    res.json({ group: groupData });
  } catch (err) {
    console.error('Get group error:', err);
    res.status(500).json({ error: 'Could not fetch group details.' });
  }
});

// Delete Group (ONLY Creator can delete)
app.delete('/api/groups/:id', authMiddleware, async (req, res) => {
  try {
    const groupRes = await query('SELECT * FROM groups WHERE id = $1', [req.params.id]);
    if (groupRes.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found.' });
    }
    const group = groupRes.rows[0];

    // Check if user is the creator
    if (group.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Only the group creator can delete this group.' });
    }

    await query('DELETE FROM groups WHERE id = $1', [req.params.id]);
    res.json({ message: 'Group deleted successfully.' });
  } catch (err) {
    console.error('Delete group error:', err);
    res.status(500).json({ error: 'Could not delete group.' });
  }
});

// Join Group via Invite Code (with optional placeholder claiming)
app.post('/api/groups/join', authMiddleware, async (req, res) => {
  try {
    const { invite_code, claim_member_id } = req.body;
    if (!invite_code) {
      return res.status(400).json({ error: 'Invite code is required.' });
    }

    const groupRes = await query(
      'SELECT * FROM groups WHERE UPPER(invite_code) = UPPER($1)',
      [invite_code.trim()]
    );

    if (groupRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid invite code. Group not found.' });
    }

    const group = groupRes.rows[0];

    // Check if already a member
    const existingMember = await query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group.id, req.user.id]
    );

    if (existingMember.rows.length > 0) {
      const groupData = await fetchFullGroupData(group.id);
      return res.json({ group: groupData, message: 'You are already a member of this group.' });
    }

    // Check if claiming an existing placeholder member
    if (claim_member_id) {
      const placeholderRes = await query(
        'SELECT * FROM group_members WHERE id = $1 AND group_id = $2 AND user_id IS NULL',
        [claim_member_id, group.id]
      );
      if (placeholderRes.rows.length > 0) {
        await query(
          'UPDATE group_members SET user_id = $1 WHERE id = $2',
          [req.user.id, claim_member_id]
        );
        const groupData = await fetchFullGroupData(group.id);
        return res.json({ group: groupData, message: 'Joined and claimed member profile!' });
      }
    }

    // Otherwise create a new member record
    const newMemberId = `m_${crypto.randomUUID()}`;
    await query(
      `INSERT INTO group_members (id, group_id, user_id, display_name, emoji, color)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        newMemberId,
        group.id,
        req.user.id,
        req.user.display_name,
        req.user.emoji || '⚡',
        req.user.color || '#FF2E93',
      ]
    );

    const groupData = await fetchFullGroupData(group.id);
    res.json({ group: groupData, message: 'Successfully joined group!' });
  } catch (err) {
    console.error('Join group error:', err);
    res.status(500).json({ error: 'Could not join group.' });
  }
});

// Add Member to Group
app.post('/api/groups/:id/members', authMiddleware, async (req, res) => {
  try {
    const check = await checkGroupMember(req.params.id, req.user.id);
    if (check.status !== 200) {
      return res.status(check.status).json({ error: check.error });
    }

    const { display_name, emoji, color } = req.body;
    if (!display_name || !display_name.trim()) {
      return res.status(400).json({ error: 'Member name is required.' });
    }

    const trimmed = display_name.trim();

    // Enforce case-insensitive uniqueness in group
    const duplicateCheck = await query(
      'SELECT id FROM group_members WHERE group_id = $1 AND LOWER(display_name) = LOWER($2)',
      [req.params.id, trimmed]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ error: `A member named "${trimmed}" already exists in this group.` });
    }

    const memberId = `m_${crypto.randomUUID()}`;
    await query(
      `INSERT INTO group_members (id, group_id, user_id, display_name, emoji, color)
       VALUES ($1, $2, NULL, $3, $4, $5)`,
      [memberId, req.params.id, trimmed, emoji || '👤', color || '#FFE600']
    );

    const membersRes = await query(
      'SELECT * FROM group_members WHERE group_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );

    res.status(201).json({ members: membersRes.rows });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ error: 'Could not add member.' });
  }
});

// ==========================================
// 3. EXPENSES ROUTES
// ==========================================

const MAX_PAISE_CAP = 1_000_000_000n; // ₹1,00,00,000 in paise

app.post('/api/groups/:id/expenses', authMiddleware, async (req, res) => {
  try {
    const check = await checkGroupMember(req.params.id, req.user.id);
    if (check.status !== 200) {
      return res.status(check.status).json({ error: check.error });
    }

    const {
      description,
      amount_paise,
      category,
      date,
      split_method,
      notes,
      payers, // [{ member_id, amount_paise }]
      splits, // [{ member_id, amount_paise, share_value }]
    } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Description is required.' });
    }

    const paise = BigInt(amount_paise || 0);
    if (paise <= 0n) {
      return res.status(400).json({ error: 'Amount must be greater than zero.' });
    }
    if (paise > MAX_PAISE_CAP) {
      return res.status(400).json({ error: 'Amount cannot exceed ₹1,00,00,000.' });
    }

    const expenseId = `exp_${crypto.randomUUID()}`;

    // Insert expense
    await query(
      `INSERT INTO expenses (id, group_id, description, amount_paise, category, date, split_method, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        expenseId,
        req.params.id,
        description.trim(),
        paise.toString(),
        category || 'food',
        date || new Date().toISOString().split('T')[0],
        split_method || 'equal',
        notes ? notes.trim() : null,
        req.user.id,
      ]
    );

    // Insert payers
    if (Array.isArray(payers)) {
      for (const p of payers) {
        await query(
          `INSERT INTO expense_payers (id, expense_id, member_id, amount_paise)
           VALUES ($1, $2, $3, $4)`,
          [`pyr_${crypto.randomUUID()}`, expenseId, p.member_id, BigInt(p.amount_paise).toString()]
        );
      }
    }

    // Insert splits
    if (Array.isArray(splits)) {
      for (const s of splits) {
        await query(
          `INSERT INTO expense_splits (id, expense_id, member_id, amount_paise, share_value)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            `spl_${crypto.randomUUID()}`,
            expenseId,
            s.member_id,
            BigInt(s.amount_paise).toString(),
            s.share_value || null,
          ]
        );
      }
    }

    // Log Activity
    const actId = `act_${crypto.randomUUID()}`;
    await query(
      `INSERT INTO activity (id, group_id, type, description, payload, actor)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        actId,
        req.params.id,
        'expense_add',
        `${req.user.display_name} added "${description.trim()}"`,
        JSON.stringify({ expenseId, description, amount_paise: paise.toString() }),
        req.user.id,
      ]
    );

    const groupData = await fetchFullGroupData(req.params.id);
    res.status(201).json({ group: groupData });
  } catch (err) {
    console.error('Add expense error:', err);
    res.status(500).json({ error: 'Could not record expense.' });
  }
});

// Edit Expense
app.put('/api/groups/:id/expenses/:expenseId', authMiddleware, async (req, res) => {
  try {
    const check = await checkGroupMember(req.params.id, req.user.id);
    if (check.status !== 200) {
      return res.status(check.status).json({ error: check.error });
    }

    const {
      description,
      amount_paise,
      category,
      date,
      split_method,
      notes,
      payers,
      splits,
    } = req.body;

    const paise = BigInt(amount_paise || 0);
    if (paise <= 0n || paise > MAX_PAISE_CAP) {
      return res.status(400).json({ error: 'Invalid expense amount.' });
    }

    // Fetch existing for undo payload
    const oldExpense = await query('SELECT * FROM expenses WHERE id = $1 AND group_id = $2', [
      req.params.expenseId,
      req.params.id,
    ]);
    if (oldExpense.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    // Update expense row
    await query(
      `UPDATE expenses 
       SET description = $1, amount_paise = $2, category = $3, date = $4, split_method = $5, notes = $6
       WHERE id = $7 AND group_id = $8`,
      [
        description.trim(),
        paise.toString(),
        category || 'food',
        date,
        split_method || 'equal',
        notes ? notes.trim() : null,
        req.params.expenseId,
        req.params.id,
      ]
    );

    // Refresh payers & splits
    await query('DELETE FROM expense_payers WHERE expense_id = $1', [req.params.expenseId]);
    await query('DELETE FROM expense_splits WHERE expense_id = $1', [req.params.expenseId]);

    if (Array.isArray(payers)) {
      for (const p of payers) {
        await query(
          `INSERT INTO expense_payers (id, expense_id, member_id, amount_paise)
           VALUES ($1, $2, $3, $4)`,
          [`pyr_${crypto.randomUUID()}`, req.params.expenseId, p.member_id, BigInt(p.amount_paise).toString()]
        );
      }
    }

    if (Array.isArray(splits)) {
      for (const s of splits) {
        await query(
          `INSERT INTO expense_splits (id, expense_id, member_id, amount_paise, share_value)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            `spl_${crypto.randomUUID()}`,
            req.params.expenseId,
            s.member_id,
            BigInt(s.amount_paise).toString(),
            s.share_value || null,
          ]
        );
      }
    }

    // Log Activity
    const actId = `act_${crypto.randomUUID()}`;
    await query(
      `INSERT INTO activity (id, group_id, type, description, payload, actor)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        actId,
        req.params.id,
        'expense_edit',
        `${req.user.display_name} edited "${description.trim()}"`,
        JSON.stringify({ expenseId: req.params.expenseId, previous: oldExpense.rows[0] }),
        req.user.id,
      ]
    );

    const groupData = await fetchFullGroupData(req.params.id);
    res.json({ group: groupData });
  } catch (err) {
    console.error('Edit expense error:', err);
    res.status(500).json({ error: 'Could not update expense.' });
  }
});

// Delete Expense
app.delete('/api/groups/:id/expenses/:expenseId', authMiddleware, async (req, res) => {
  try {
    const check = await checkGroupMember(req.params.id, req.user.id);
    if (check.status !== 200) {
      return res.status(check.status).json({ error: check.error });
    }

    // Grab full details for undo
    const expRes = await query('SELECT * FROM expenses WHERE id = $1 AND group_id = $2', [
      req.params.expenseId,
      req.params.id,
    ]);
    if (expRes.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found.' });
    }
    const oldExpense = expRes.rows[0];

    const payersRes = await query('SELECT * FROM expense_payers WHERE expense_id = $1', [
      req.params.expenseId,
    ]);
    const splitsRes = await query('SELECT * FROM expense_splits WHERE expense_id = $1', [
      req.params.expenseId,
    ]);

    await query('DELETE FROM expenses WHERE id = $1 AND group_id = $2', [
      req.params.expenseId,
      req.params.id,
    ]);

    // Log activity
    const actId = `act_${crypto.randomUUID()}`;
    await query(
      `INSERT INTO activity (id, group_id, type, description, payload, actor)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        actId,
        req.params.id,
        'expense_delete',
        `${req.user.display_name} deleted "${oldExpense.description}"`,
        JSON.stringify({
          expense: oldExpense,
          payers: payersRes.rows,
          splits: splitsRes.rows,
        }),
        req.user.id,
      ]
    );

    const groupData = await fetchFullGroupData(req.params.id);
    res.json({ group: groupData });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ error: 'Could not delete expense.' });
  }
});

// ==========================================
// 4. SETTLEMENTS ROUTES
// ==========================================

app.post('/api/groups/:id/settlements', authMiddleware, async (req, res) => {
  try {
    const check = await checkGroupMember(req.params.id, req.user.id);
    if (check.status !== 200) {
      return res.status(check.status).json({ error: check.error });
    }

    const { from_member, to_member, amount_paise, date, notes } = req.body;
    if (!from_member || !to_member) {
      return res.status(400).json({ error: 'Both sender and receiver are required.' });
    }
    if (from_member === to_member) {
      return res.status(400).json({ error: 'Payer and receiver cannot be the same person.' });
    }

    const paise = BigInt(amount_paise || 0);
    if (paise <= 0n || paise > MAX_PAISE_CAP) {
      return res.status(400).json({ error: 'Invalid settlement amount.' });
    }

    const settlementId = `stl_${crypto.randomUUID()}`;
    await query(
      `INSERT INTO settlements (id, group_id, from_member, to_member, amount_paise, date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        settlementId,
        req.params.id,
        from_member,
        to_member,
        paise.toString(),
        date || new Date().toISOString().split('T')[0],
        notes ? notes.trim() : null,
      ]
    );

    // Get member names for activity
    const mRes = await query('SELECT id, display_name FROM group_members WHERE id IN ($1, $2)', [
      from_member,
      to_member,
    ]);
    const nameMap = Object.fromEntries(mRes.rows.map((r) => [r.id, r.display_name]));

    const actId = `act_${crypto.randomUUID()}`;
    await query(
      `INSERT INTO activity (id, group_id, type, description, payload, actor)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        actId,
        req.params.id,
        'settlement',
        `${nameMap[from_member] || 'Someone'} paid ${nameMap[to_member] || 'Someone'}`,
        JSON.stringify({ settlementId, from_member, to_member, amount_paise: paise.toString() }),
        req.user.id,
      ]
    );

    const groupData = await fetchFullGroupData(req.params.id);
    res.status(201).json({ group: groupData });
  } catch (err) {
    console.error('Record settlement error:', err);
    res.status(500).json({ error: 'Could not record settlement.' });
  }
});

// ==========================================
// 5. ACTIVITY & UNDO ROUTES
// ==========================================

app.get('/api/groups/:id/activity', authMiddleware, async (req, res) => {
  try {
    const check = await checkGroupMember(req.params.id, req.user.id);
    if (check.status !== 200) {
      return res.status(check.status).json({ error: check.error });
    }

    // Strictly newest first
    const actRes = await query(
      'SELECT * FROM activity WHERE group_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );

    res.json({ activities: actRes.rows });
  } catch (err) {
    console.error('Get activity error:', err);
    res.status(500).json({ error: 'Could not fetch activity.' });
  }
});

app.post('/api/groups/:id/undo', authMiddleware, async (req, res) => {
  try {
    const check = await checkGroupMember(req.params.id, req.user.id);
    if (check.status !== 200) {
      return res.status(check.status).json({ error: check.error });
    }

    // Get the latest action
    const latestRes = await query(
      'SELECT * FROM activity WHERE group_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.params.id]
    );

    if (latestRes.rows.length === 0) {
      return res.status(400).json({ error: 'No recent actions to undo.' });
    }

    const latest = latestRes.rows[0];
    const payload = latest.payload || {};

    if (latest.type === 'expense_add' && payload.expenseId) {
      await query('DELETE FROM expenses WHERE id = $1', [payload.expenseId]);
    } else if (latest.type === 'expense_delete' && payload.expense) {
      const e = payload.expense;
      await query(
        `INSERT INTO expenses (id, group_id, description, amount_paise, category, date, split_method, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [e.id, e.group_id, e.description, e.amount_paise, e.category, e.date, e.split_method, e.notes, e.created_by]
      );
      if (Array.isArray(payload.payers)) {
        for (const p of payload.payers) {
          await query(
            'INSERT INTO expense_payers (id, expense_id, member_id, amount_paise) VALUES ($1, $2, $3, $4)',
            [p.id, p.expense_id, p.member_id, p.amount_paise]
          );
        }
      }
      if (Array.isArray(payload.splits)) {
        for (const s of payload.splits) {
          await query(
            'INSERT INTO expense_splits (id, expense_id, member_id, amount_paise, share_value) VALUES ($1, $2, $3, $4, $5)',
            [s.id, s.expense_id, s.member_id, s.amount_paise, s.share_value]
          );
        }
      }
    } else if (latest.type === 'settlement' && payload.settlementId) {
      await query('DELETE FROM settlements WHERE id = $1', [payload.settlementId]);
    }

    // Remove the undone activity
    await query('DELETE FROM activity WHERE id = $1', [latest.id]);

    const groupData = await fetchFullGroupData(req.params.id);
    res.json({ group: groupData, message: `Undid: ${latest.description}` });
  } catch (err) {
    console.error('Undo error:', err);
    res.status(500).json({ error: 'Could not undo last action.' });
  }
});

// ==========================================
// 6. IMPORT LOCALSTORAGE & DEMO DATA
// ==========================================

app.post('/api/import-local', authMiddleware, async (req, res) => {
  try {
    const { groups, members } = req.body;
    if (!Array.isArray(groups) || groups.length === 0) {
      return res.status(400).json({ error: 'No groups provided for import.' });
    }

    const memberIdMap = {}; // oldId -> newId

    for (const grp of groups) {
      const newGroupId = `grp_${crypto.randomUUID()}`;
      const inviteCode = generateInviteCode();

      await query(
        `INSERT INTO groups (id, name, emoji, signature_color, accent_color, currency, invite_code, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          newGroupId,
          grp.name || 'Imported Group',
          grp.emoji || '📁',
          grp.signatureColor || '#FF7A00',
          grp.accentColor || '#FFE600',
          grp.currency || 'INR',
          inviteCode,
          req.user.id,
        ]
      );

      // Create group members
      const groupOldMemberIds = grp.memberIds || [];
      for (const oldMId of groupOldMemberIds) {
        const m = (members || []).find((mem) => mem.id === oldMId) || {
          name: oldMId,
          emoji: '👤',
          color: '#FFE600',
        };

        const newMId = `m_${crypto.randomUUID()}`;
        memberIdMap[oldMId] = newMId;

        const isCurrent = Boolean(m.isUser);
        await query(
          `INSERT INTO group_members (id, group_id, user_id, display_name, emoji, color)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            newMId,
            newGroupId,
            isCurrent ? req.user.id : null,
            isCurrent ? req.user.display_name : m.name,
            m.emoji || '👤',
            m.color || '#FFE600',
          ]
        );
      }

      // Import expenses (convert rupees to paise)
      for (const exp of grp.expenses || []) {
        const newExpId = `exp_${crypto.randomUUID()}`;
        const amountPaise = BigInt(Math.round(Number(exp.amount || 0) * 100));

        await query(
          `INSERT INTO expenses (id, group_id, description, amount_paise, category, date, split_method, notes, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            newExpId,
            newGroupId,
            exp.description || 'Imported Expense',
            amountPaise.toString(),
            exp.category || 'food',
            exp.date || new Date().toISOString().split('T')[0],
            exp.splitMethod || 'equal',
            exp.notes || null,
            req.user.id,
          ]
        );

        // Payers
        if (exp.isMultiPayer && exp.payers) {
          for (const [oldPayerId, amt] of Object.entries(exp.payers)) {
            const newPayerId = memberIdMap[oldPayerId];
            if (newPayerId) {
              await query(
                `INSERT INTO expense_payers (id, expense_id, member_id, amount_paise)
                 VALUES ($1, $2, $3, $4)`,
                [`pyr_${crypto.randomUUID()}`, newExpId, newPayerId, BigInt(Math.round(Number(amt) * 100)).toString()]
              );
            }
          }
        } else if (exp.paidBy && memberIdMap[exp.paidBy]) {
          await query(
            `INSERT INTO expense_payers (id, expense_id, member_id, amount_paise)
             VALUES ($1, $2, $3, $4)`,
            [`pyr_${crypto.randomUUID()}`, newExpId, memberIdMap[exp.paidBy], amountPaise.toString()]
          );
        }

        // Splits
        if (exp.splits) {
          for (const [oldDebtorId, shareAmt] of Object.entries(exp.splits)) {
            const newDebtorId = memberIdMap[oldDebtorId];
            if (newDebtorId) {
              await query(
                `INSERT INTO expense_splits (id, expense_id, member_id, amount_paise)
                 VALUES ($1, $2, $3, $4)`,
                [
                  `spl_${crypto.randomUUID()}`,
                  newExpId,
                  newDebtorId,
                  BigInt(Math.round(Number(shareAmt) * 100)).toString(),
                ]
              );
            }
          }
        }
      }

      // Import settlements
      for (const st of grp.settlements || []) {
        const fromM = memberIdMap[st.from];
        const toM = memberIdMap[st.to];
        if (fromM && toM) {
          const stPaise = BigInt(Math.round(Number(st.amount || 0) * 100));
          await query(
            `INSERT INTO settlements (id, group_id, from_member, to_member, amount_paise, date, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              `stl_${crypto.randomUUID()}`,
              newGroupId,
              fromM,
              toM,
              stPaise.toString(),
              st.date || new Date().toISOString().split('T')[0],
              st.notes || null,
            ]
          );
        }
      }
    }

    res.json({ message: 'Local data successfully imported into your Neon cloud account!' });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Failed to import local data.' });
  }
});

// Helper: Fetch full group payload with members, expenses, settlements
async function fetchFullGroupData(groupId) {
  const gRes = await query('SELECT * FROM groups WHERE id = $1', [groupId]);
  if (gRes.rows.length === 0) return null;
  const group = gRes.rows[0];

  const mRes = await query(
    'SELECT * FROM group_members WHERE group_id = $1 ORDER BY created_at ASC',
    [groupId]
  );
  const members = mRes.rows;

  const expRes = await query(
    'SELECT * FROM expenses WHERE group_id = $1 ORDER BY date DESC, created_at DESC',
    [groupId]
  );
  const expenses = [];

  for (const exp of expRes.rows) {
    const payersRes = await query(
      'SELECT member_id, amount_paise FROM expense_payers WHERE expense_id = $1',
      [exp.id]
    );
    const splitsRes = await query(
      'SELECT member_id, amount_paise, share_value FROM expense_splits WHERE expense_id = $1',
      [exp.id]
    );

    const payersMap = {};
    payersRes.rows.forEach((p) => {
      payersMap[p.member_id] = Number(p.amount_paise) / 100;
    });

    const splitsMap = {};
    splitsRes.rows.forEach((s) => {
      splitsMap[s.member_id] = Number(s.amount_paise) / 100;
    });

    const isMultiPayer = payersRes.rows.length > 1;
    const singlePayer = payersRes.rows[0]?.member_id || null;

    expenses.push({
      id: exp.id,
      description: exp.description,
      amount: Number(exp.amount_paise) / 100,
      amount_paise: exp.amount_paise,
      currency: group.currency || 'INR',
      category: exp.category,
      date: exp.date ? new Date(exp.date).toISOString().split('T')[0] : '',
      splitMethod: exp.split_method,
      notes: exp.notes,
      isMultiPayer,
      paidBy: isMultiPayer ? null : singlePayer,
      payers: payersMap,
      splits: splitsMap,
      created_by: exp.created_by,
      created_at: exp.created_at,
    });
  }

  const stRes = await query(
    'SELECT * FROM settlements WHERE group_id = $1 ORDER BY date DESC, created_at DESC',
    [groupId]
  );
  const settlements = stRes.rows.map((st) => ({
    id: st.id,
    from: st.from_member,
    to: st.to_member,
    amount: Number(st.amount_paise) / 100,
    amount_paise: st.amount_paise,
    date: st.date ? new Date(st.date).toISOString().split('T')[0] : '',
    notes: st.notes,
    created_at: st.created_at,
  }));

  const actRes = await query(
    'SELECT * FROM activity WHERE group_id = $1 ORDER BY created_at DESC LIMIT 50',
    [groupId]
  );

  return {
    id: group.id,
    name: group.name,
    emoji: group.emoji,
    signatureColor: group.signature_color,
    accentColor: group.accent_color,
    currency: group.currency,
    inviteCode: group.invite_code,
    createdBy: group.created_by,
    createdAt: group.created_at,
    members: members.map((m) => ({
      id: m.id,
      userId: m.user_id,
      name: m.display_name,
      emoji: m.emoji,
      color: m.color,
      isUser: Boolean(m.user_id),
    })),
    expenses,
    settlements,
    activities: actRes.rows,
  };
}

// Start Server helper (export for tests, or listen when run directly)
export { app };

if (process.env.NODE_ENV !== 'test') {
  const start = async () => {
    try {
      if (process.env.DATABASE_URL) {
        await runMigrations();
      }
      app.listen(PORT, () => {
        console.log(`⚡ SPLIT//MAX API server running on port ${PORT}`);
      });
    } catch (err) {
      console.error('Server startup error:', err);
    }
  };
  start();
}
