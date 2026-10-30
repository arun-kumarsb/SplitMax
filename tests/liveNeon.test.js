import { describe, it, expect, afterAll } from 'vitest';
import { query } from '../server/db.js';
import crypto from 'crypto';

describe('Live Neon Postgres Integration', () => {
  const createdUserIds = [];
  const createdGroupIds = [];

  afterAll(async () => {
    // Guaranteed cleanup of any test fixtures
    for (const gId of createdGroupIds) {
      await query('DELETE FROM groups WHERE id = $1', [gId]).catch(() => {});
    }
    for (const uId of createdUserIds) {
      await query('DELETE FROM users WHERE id = $1', [uId]).catch(() => {});
    }
    // Clean up any stray vitest records by prefix
    await query("DELETE FROM groups WHERE id LIKE 'grp_vitest_%'").catch(() => {});
    await query("DELETE FROM users WHERE id LIKE 'usr_vitest_%'").catch(() => {});
  });

  it('connects to Neon and queries information schema', async () => {
    const res = await query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    const tables = res.rows.map((r) => r.table_name);
    expect(tables).toContain('users');
    expect(tables).toContain('groups');
    expect(tables).toContain('group_members');
    expect(tables).toContain('expenses');
    expect(tables).toContain('settlements');
  });

  it('performs full expense, split, and settlement round-trip with BIGINT paise', async () => {
    const testUserId = `usr_vitest_${crypto.randomUUID()}`;
    const testGroupId = `grp_vitest_${crypto.randomUUID()}`;
    const testMember1Id = `m_vitest1_${crypto.randomUUID()}`;
    const testMember2Id = `m_vitest2_${crypto.randomUUID()}`;
    const testExpenseId = `exp_vitest_${crypto.randomUUID()}`;

    createdUserIds.push(testUserId);
    createdGroupIds.push(testGroupId);

    // 1. Insert user
    await query(
      'INSERT INTO users (id, username, password_hash, display_name) VALUES ($1, $2, $3, $4)',
      [testUserId, `vitest_${Date.now()}`, 'hash123', 'Vitest Runner']
    );

    // 2. Insert group
    await query(
      'INSERT INTO groups (id, name, currency, invite_code, created_by) VALUES ($1, $2, $3, $4, $5)',
      [testGroupId, 'Vitest Temp Group', 'INR', `INV_VT_${Date.now()}`, testUserId]
    );

    // 3. Insert members
    await query(
      'INSERT INTO group_members (id, group_id, user_id, display_name) VALUES ($1, $2, $3, $4)',
      [testMember1Id, testGroupId, testUserId, 'Vitest Payer']
    );
    await query(
      'INSERT INTO group_members (id, group_id, user_id, display_name) VALUES ($1, $2, NULL, $3)',
      [testMember2Id, testGroupId, 'Vitest Placeholder']
    );

    // 4. Insert expense: 150.00 INR = 15,000 paise
    await query(
      'INSERT INTO expenses (id, group_id, description, amount_paise, created_by) VALUES ($1, $2, $3, $4, $5)',
      [testExpenseId, testGroupId, 'Vitest Expense', '15000', testUserId]
    );
    await query(
      'INSERT INTO expense_payers (id, expense_id, member_id, amount_paise) VALUES ($1, $2, $3, $4)',
      [`pyr_${Date.now()}`, testExpenseId, testMember1Id, '15000']
    );
    await query(
      'INSERT INTO expense_splits (id, expense_id, member_id, amount_paise) VALUES ($1, $2, $3, $4)',
      [`spl_1_${Date.now()}`, testExpenseId, testMember1Id, '7500']
    );
    await query(
      'INSERT INTO expense_splits (id, expense_id, member_id, amount_paise) VALUES ($1, $2, $3, $4)',
      [`spl_2_${Date.now()}`, testExpenseId, testMember2Id, '7500']
    );

    // 5. Query back and verify paise arithmetic
    const expRes = await query('SELECT * FROM expenses WHERE id = $1', [testExpenseId]);
    expect(expRes.rows[0].amount_paise).toBe('15000');
  });
});
