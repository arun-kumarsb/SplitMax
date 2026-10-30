# ⚡ SPLIT//MAX — Maximalist Shared Expense Tracker
> **Multi-user expense sharing with Neon Serverless Postgres, Node + Express API, and pure maximalist delight.**

---

## ⚡ Neon Setup Complete
```
-------------------------------------------
✓ Project twilight-smoke-80308826 created in aws-ap-southeast-1
✓ Organization: Arun (org-round-rice-66933255)
✓ Env variables populated in .env (.gitignore protected)
✓ Neon SQL Migrations applied successfully (8 tables, BIGINT paise)
✓ Neon Skills and MCP configured (agent: antigravity)

⚡ Restart your agent to load the Neon MCP server
```

🔗 **View Project in Neon Console**:  
[https://console.neon.tech/app/projects/twilight-smoke-80308826/](https://console.neon.tech/app/projects/twilight-smoke-80308826/)

---

## 🚀 How to Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
A `.env` file is automatically linked with your Neon database credentials. See `.env.example` for reference:
```env
DATABASE_URL=postgresql://neondb_owner:***@ep-***.aws-ap-southeast-1.neon.tech/neondb?sslmode=require
JWT_SECRET=splitmax_neon_secure_jwt_secret_2026
PORT=3001
NODE_ENV=development
```

### 3. Start the Backend API Server
```bash
npm run server
```
Runs the Express API on [http://localhost:3001](http://localhost:3001).

### 4. Start the Frontend Dev Server
In a second terminal:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Running the Automated Test Suite

All unit and API tests are configured with **Vitest**:
```bash
npm test
```
Tests cover:
- **Equal, Exact, Percentage, and Shares Split calculation**
- **Paise Rounding**: 1-each deterministic remainder distribution (e.g., 0.05 split 3 ways yields 0.02, 0.02, 0.01; sum is strictly zero-loss).
- **Greedy Net-Balance Matching (Simplify Debts)**: Guarantees all net balances reach zero with minimized transactions.
- **CSV Formula Injection Prevention**: Sanitizes cells starting with `=, +, -, @, \t, \r` by prefixing a single quote `'` and escaping quotes.
- **Amount Cap Rules**: Enforces ₹1,00,00,000 maximum and at most 2 decimal places.
- **API Authentication**: Registration, bcrypt password hashing, login rate limiting, session cookies.
- **Group Authorization**: Membership verification (returns 403 on foreign groups, 404 on missing groups).
- **Invite Code Joining**: Multi-user join flow.
- **Role Permissions**: Only the group creator can delete a group.
- **Live Neon Database Round-Trip**: Schema verification and `BIGINT` paise arithmetic on Neon Postgres.

---

## 🗄️ Database Architecture & Migration

The schema is maintained in [`server/migrations/001_initial_schema.sql`](server/migrations/001_initial_schema.sql):
- `users`: `id`, `username` (unique, lowercase), `password_hash`, `display_name`, `emoji`, `color`, `created_at`
- `groups`: `id`, `name`, `emoji`, `signature_color`, `accent_color`, `currency`, `invite_code` (unique), `created_by`, `created_at`
- `group_members`: `id`, `group_id`, `user_id` (NULL for placeholders like "Maya"), `display_name`, `emoji`, `color`, `created_at`
- `expenses`: `id`, `group_id`, `description`, `amount_paise` (`BIGINT`), `category`, `date`, `split_method`, `notes`, `created_by`, `created_at`
- `expense_payers`: `id`, `expense_id`, `member_id`, `amount_paise` (`BIGINT`)
- `expense_splits`: `id`, `expense_id`, `member_id`, `amount_paise` (`BIGINT`), `share_value`
- `settlements`: `id`, `group_id`, `from_member`, `to_member`, `amount_paise` (`BIGINT`), `date`, `notes`, `created_at`
- `activity`: `id`, `group_id`, `type`, `description`, `payload` (`JSONB`), `actor`, `created_at`

All currency values are stored as **integer paise** (`BIGINT`).

---

## 🔒 Security & Client Bundle Verification

- The frontend never connects directly to Postgres and never stores `DATABASE_URL` or secret keys.
- Production bundle verification (`dist/index.html`):
  ```bash
  Select-String -Path "dist/index.html" -Pattern "DATABASE_URL|postgresql://|password_hash|JWT_SECRET"
  ```
  Returns **0 occurrences**.

---

## 🚢 Deployment Guide

1. **Deploy Backend (e.g. Render, Railway, Fly.io, or AWS)**:
   - Command: `npm start`
   - Set Environment Variables:
     - `DATABASE_URL`: Your Neon Postgres connection string
     - `JWT_SECRET`: Random 32+ character secret string
     - `NODE_ENV`: `production`
2. **Deploy Frontend (e.g. Vercel, Netlify, Cloudflare Pages)**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Configure proxy or rewrite for `/api/*` pointing to your backend service.
