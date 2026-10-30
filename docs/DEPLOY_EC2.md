# 🚀 SPLIT//MAX — EC2 Backend Deployment Guide

This guide walks you through deploying the **SPLIT//MAX Node.js / Express API Server** to an **AWS EC2** instance from scratch.

---

## 📋 Prerequisites
1. An active AWS Account.
2. Your Neon Postgres connection string:
   - `DATABASE_URL` (pooled connection string from your Neon dashboard or `.env`).
3. A secure random string for `JWT_SECRET` (e.g., `splitmax_super_secret_jwt_2026`).

---

## STEP 1: Launch an EC2 Instance

1. Open the [AWS EC2 Console](https://console.aws.amazon.com/ec2/).
2. Click **Launch Instance**.
3. Configure the following:
   - **Name:** `splitmax-backend-api`
   - **OS (AMI):** **Ubuntu 24.04 LTS** (Free tier eligible) or **Amazon Linux 2023**
   - **Instance Type:** `t3.micro` or `t4g.micro` (Free tier eligible)
   - **Key Pair:** Select an existing key pair or create a new one (e.g., `splitmax-key.pem`). Download and keep this file safe.

---

## STEP 2: Configure the Security Group (Firewall)

Under **Network Settings**, create or edit the Security Group with these **Inbound Rules**:

| Type | Protocol | Port Range | Source | Description |
| :--- | :--- | :--- | :--- | :--- |
| **SSH** | TCP | `22` | `My IP` (recommended) | Remote terminal access |
| **Custom TCP** | TCP | `3001` | `0.0.0.0/0` (Anywhere) | SplitMax Express API port |

> [!NOTE]
> Port `3001` must be open to `0.0.0.0/0` so that AWS Amplify's reverse proxy can reach your API.

Click **Launch Instance**.

---

## STEP 3: Connect to Your EC2 Instance

Open your local terminal and navigate to the folder containing your key pair file:

```bash
# Set key permissions (macOS / Linux / WSL)
chmod 400 splitmax-key.pem

# SSH into your EC2 instance (replace with your instance's Public IPv4 DNS or IP)
ssh -i "splitmax-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

*(On Windows PowerShell, you can run the same `ssh -i splitmax-key.pem ubuntu@YOUR_EC2_PUBLIC_IP` command directly).*

---

## STEP 4: Install Node.js (v20 LTS) & Git

Once connected to your EC2 instance, run:

```bash
# 1. Update package lists
sudo apt update && sudo apt upgrade -y

# 2. Install Git and curl
sudo apt install -y git curl

# 3. Install Node.js v20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Verify installation
node -v   # Should output v20.x
npm -v    # Should output 10.x
```

---

## STEP 5: Install PM2 (Process Manager)

PM2 keeps your server running forever, restarts it automatically if it crashes, and boots it when the EC2 instance restarts:

```bash
sudo npm install -g pm2
```

---

## STEP 6: Clone and Configure the Repository

```bash
# 1. Clone your SplitMax GitHub repository
git clone https://github.com/arun-kumarsb/SplitMax.git

# 2. Navigate into the project folder
cd SplitMax

# 3. Install production dependencies
npm install --production
```

---

## STEP 7: Create the Production Environment File (`.env`)

Create your server `.env` file on the EC2 machine:

```bash
nano .env
```

Paste the following configuration into the nano editor:

```env
# Neon Postgres Connection URL (from your Neon Console)
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-wispy-surf-aomxh8w6-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Port for Express API
PORT=3001

# Production Environment flag
NODE_ENV=production

# JWT signing secret (create a long, random key)
JWT_SECRET=splitmax_production_jwt_secret_key_2026_xyz
```

> [!TIP]
> To save and exit nano: Press `Ctrl + O`, then `Enter`, then `Ctrl + X`.

---

## STEP 8: Verify Database Connection & Start Server with PM2

1. **Test start the server manually to ensure database connection:**
   ```bash
   node server/server.js
   ```
   You should see:
   ```
   ⚡ [SPLIT//MAX API] Server listening on port 3001 (production)
   ```
   Press `Ctrl + C` to stop the manual process.

2. **Start the server with PM2:**
   ```bash
   pm2 start server/server.js --name "splitmax-api"
   ```

3. **Configure PM2 to restart automatically on server reboots:**
   ```bash
   pm2 startup
   ```
   *(Copy and run the `sudo env PATH=...` command that PM2 prints in the output).*
   
   Then save the current PM2 process list:
   ```bash
   pm2 save
   ```

---

## STEP 9: Test Your Running Backend

From your local computer or browser, verify the API is responding:

```bash
curl http://YOUR_EC2_PUBLIC_IP:3001/api/auth/me
```

You should receive a JSON response:
```json
{"user":null}
```
*(This confirms the Express server is online, connected to Neon, and properly rejecting unauthenticated sessions).*

---

## 🛠️ Useful PM2 Commands

- View live server logs:
  ```bash
  pm2 logs splitmax-api
  ```
- Restart the server:
  ```bash
  pm2 restart splitmax-api
  ```
- Stop the server:
  ```bash
  pm2 stop splitmax-api
  ```
- Check status / CPU / Memory usage:
  ```bash
  pm2 status
  ```

---

## Next Step
Now proceed to [DEPLOY_AMPLIFY.md](./DEPLOY_AMPLIFY.md) to deploy your frontend and connect it to this EC2 backend via Amplify's built-in reverse proxy!
