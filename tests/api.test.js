import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// In-memory mock database state for route testing
const mockDb = {
  users: [],
  groups: [],
  group_members: [],
  expenses: [],
  settlements: [],
  activity: [],
};

vi.mock('../server/db.js', () => ({
  query: vi.fn(async (sql, params = []) => {
    const s = sql.trim().toUpperCase();

    // 1. Users queries
    if (s.startsWith('SELECT') && s.includes('FROM USERS WHERE LOWER(USERNAME) = $1')) {
      const u = mockDb.users.find((user) => user.username.toLowerCase() === params[0].toLowerCase());
      return { rows: u ? [u] : [] };
    }
    if (s.startsWith('SELECT') && s.includes('FROM USERS WHERE ID = $1')) {
      const u = mockDb.users.find((user) => user.id === params[0]);
      return { rows: u ? [u] : [] };
    }
    if (s.startsWith('INSERT INTO USERS')) {
      const newUser = {
        id: params[0],
        username: params[1],
        password_hash: params[2],
        display_name: params[3],
        emoji: params[4],
        color: params[5],
        created_at: new Date().toISOString(),
      };
      mockDb.users.push(newUser);
      return { rows: [newUser] };
    }

    // 2. Groups queries
    if (s.startsWith('INSERT INTO GROUPS')) {
      const g = {
        id: params[0],
        name: params[1],
        emoji: params[2],
        signature_color: params[3],
        accent_color: params[4],
        currency: params[5],
        invite_code: params[6],
        created_by: params[7],
        created_at: new Date().toISOString(),
      };
      mockDb.groups.push(g);
      return { rows: [g] };
    }
    if (s.startsWith('SELECT') && s.includes('FROM GROUPS WHERE ID = $1')) {
      const g = mockDb.groups.find((grp) => grp.id === params[0]);
      return { rows: g ? [g] : [] };
    }
    if (s.startsWith('SELECT') && s.includes('FROM GROUPS WHERE UPPER(INVITE_CODE) = UPPER($1)')) {
      const g = mockDb.groups.find((grp) => grp.invite_code.toUpperCase() === params[0].toUpperCase());
      return { rows: g ? [g] : [] };
    }
    if (s.startsWith('DELETE FROM GROUPS WHERE ID = $1')) {
      mockDb.groups = mockDb.groups.filter((g) => g.id !== params[0]);
      return { rowCount: 1 };
    }

    // 3. Group Members queries
    if (s.startsWith('INSERT INTO GROUP_MEMBERS')) {
      const m = {
        id: params[0],
        group_id: params[1],
        user_id: params[2],
        display_name: params[3],
        emoji: params[4],
        color: params[5],
        created_at: new Date().toISOString(),
      };
      mockDb.group_members.push(m);
      return { rows: [m] };
    }
    if (s.startsWith('SELECT') && s.includes('FROM GROUP_MEMBERS WHERE GROUP_ID = $1 AND USER_ID = $2')) {
      const m = mockDb.group_members.find((mem) => mem.group_id === params[0] && mem.user_id === params[1]);
      return { rows: m ? [m] : [] };
    }
    if (s.startsWith('SELECT') && s.includes('FROM GROUP_MEMBERS WHERE GROUP_ID = $1 ORDER BY')) {
      const list = mockDb.group_members.filter((mem) => mem.group_id === params[0]);
      return { rows: list };
    }
    if (s.startsWith('UPDATE GROUP_MEMBERS SET USER_ID = $1 WHERE ID = $2')) {
      const m = mockDb.group_members.find((mem) => mem.id === params[1]);
      if (m) m.user_id = params[0];
      return { rowCount: 1 };
    }

    // 4. Fallback queries for expenses, settlements, activity
    if (s.startsWith('SELECT') && s.includes('FROM EXPENSES WHERE GROUP_ID = $1')) {
      return { rows: [] };
    }
    if (s.startsWith('SELECT') && s.includes('FROM SETTLEMENTS WHERE GROUP_ID = $1')) {
      return { rows: [] };
    }
    if (s.startsWith('SELECT') && s.includes('FROM ACTIVITY WHERE GROUP_ID = $1')) {
      return { rows: [] };
    }

    return { rows: [] };
  }),
  runMigrations: vi.fn(),
  getPool: vi.fn(),
}));

// Import app after mocking
const { app } = await import('../server/server.js');

describe('Authentication & Group Membership API', () => {
  let authCookieAlice = '';
  let authCookieBob = '';
  let groupAlphaId = '';
  let inviteCodeAlpha = '';

  beforeEach(() => {
    // Reset DB for isolated runs
  });

  it('registers user Alice successfully and sets cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'alice',
        password: 'password123',
        display_name: 'Alice W',
      });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe('alice');
    expect(res.headers['set-cookie']).toBeDefined();
    authCookieAlice = res.headers['set-cookie'][0];
  });

  it('rejects duplicate username (case-insensitive) with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'ALICE',
        password: 'otherpassword',
        display_name: 'Alice Imposter',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already taken/i);
  });

  it('logs in user Alice with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'alice',
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('alice');
  });

  it('rejects invalid password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'alice',
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
  });

  it('registers user Bob', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'bob',
        password: 'password456',
        display_name: 'Bob K',
      });

    expect(res.status).toBe(201);
    authCookieBob = res.headers['set-cookie'][0];
  });

  it('Alice creates a new group and gets an invite code', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Cookie', [authCookieAlice])
      .send({
        name: 'Goa Trip 🏖️',
        emoji: '🏖️',
        currency: 'INR',
      });

    expect(res.status).toBe(201);
    expect(res.body.group.name).toBe('Goa Trip 🏖️');
    expect(res.body.group.inviteCode).toBeDefined();
    groupAlphaId = res.body.group.id;
    inviteCodeAlpha = res.body.group.inviteCode;
  });

  it('Bob gets 403 Forbidden when attempting to view Alice group before joining', async () => {
    const res = await request(app)
      .get(`/api/groups/${groupAlphaId}`)
      .set('Cookie', [authCookieBob]);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not a member/i);
  });

  it('Bob joins the group using the invite code', async () => {
    const res = await request(app)
      .post('/api/groups/join')
      .set('Cookie', [authCookieBob])
      .send({
        invite_code: inviteCodeAlpha,
      });

    expect(res.status).toBe(200);
    expect(res.body.group.id).toBe(groupAlphaId);
  });

  it('Bob can now view the group after joining', async () => {
    const res = await request(app)
      .get(`/api/groups/${groupAlphaId}`)
      .set('Cookie', [authCookieBob]);

    expect(res.status).toBe(200);
    expect(res.body.group.id).toBe(groupAlphaId);
  });

  it('Bob (non-creator) gets 403 Forbidden when trying to delete the group', async () => {
    const res = await request(app)
      .delete(`/api/groups/${groupAlphaId}`)
      .set('Cookie', [authCookieBob]);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/only the group creator/i);
  });

  it('Alice (creator) can delete the group', async () => {
    const res = await request(app)
      .delete(`/api/groups/${groupAlphaId}`)
      .set('Cookie', [authCookieAlice]);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted successfully/i);
  });

  it('logs out and clears cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
  });
});
