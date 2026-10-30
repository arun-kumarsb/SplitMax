# ⚡ SPLIT//MAX — AWS Amplify Frontend Deployment Guide

This guide walks you through deploying the **SPLIT//MAX React + Vite** frontend to **AWS Amplify Hosting**, and connecting it to your EC2 backend using Amplify's **Zero-CORS Reverse Proxy**.

---

## 🌟 Why AWS Amplify + Reverse Proxy?

Deploying the frontend on AWS Amplify and using Amplify's built-in **Rewrites (Reverse Proxy)** gives you two major advantages:
1. **No Mixed Content Errors:** Your frontend is served over HTTPS (`https://yourapp.amplifyapp.com`). The browser talks *only* to this HTTPS URL. Amplify internally proxies calls to your EC2 IP.
2. **No CORS / Cookie Headaches:** Because both the frontend and `/api/*` share the same domain origin, session cookies (`httpOnly`) work automatically without third-party cookie restrictions.

---

## METHOD A: Deploy via GitHub (Recommended: Automated CI/CD)

Whenever you push commits to GitHub, Amplify automatically builds and redeploys the new code.

### Step 1: Create the Amplify App
1. Open the [AWS Amplify Console](https://console.aws.amazon.com/amplify/).
2. Click **Create new app** (or **Deploy an app**).
3. Select **GitHub** as the source repository and click **Next**.
4. Authenticate your GitHub account and select your repository:
   - **Repository:** `arun-kumarsb/SplitMax`
   - **Branch:** `main`
5. Click **Next**.

### Step 2: Configure Build Settings
Amplify automatically detects Vite. Ensure the build configuration matches:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

Click **Next**, review the settings, and click **Save and deploy**.

Amplify will provision the environment, build the frontend, and provide your live HTTPS URL (e.g., `https://main.d123456789.amplifyapp.com`).

---

## METHOD B: Deploy via Direct Zip Upload (Fast Manual Deploy)

If you don't want to connect GitHub:

1. Build the production bundle on your computer:
   ```bash
   npm run build
   ```
   This creates the `dist` directory with `dist/index.html`.
2. Zip the contents of the `dist` directory (or zip the folder).
3. In the [AWS Amplify Console](https://console.aws.amazon.com/amplify/), click **Deploy an app without Git**.
4. Set an **App Name** (e.g., `splitmax-web`), choose **Drag and drop**, upload your zip file, and click **Save and deploy**.

---

## 🔑 CRITICAL STEP: Configure Amplify Rewrites & Reverse Proxy

To route API calls from your Amplify frontend directly to your EC2 backend without CORS or mixed-content issues:

1. In the AWS Amplify Console, select your app.
2. In the left navigation menu, navigate to **Hosting** &rarr; **Rewrites and redirects** (or **Custom rules**).
3. Click **Add rule** (or **Edit**).

### Add Rule 1: The API Reverse Proxy (Must be at the TOP)
- **Source address:** `/api/<*>`
- **Target address:** `http://YOUR_EC2_PUBLIC_IP:3001/api/<*>`
- **Type:** `200 (Rewrite)`

*(Replace `YOUR_EC2_PUBLIC_IP` with your actual EC2 Public IPv4 address from Step 2 of the EC2 guide).*

### Add Rule 2: Single-Page Application (SPA) Fallback
If not already present, ensure the SPA fallback rule is below Rule 1:
- **Source address:** `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
- **Target address:** `/index.html`
- **Type:** `200 (Rewrite)`

### The Rules Table Should Look Exactly Like This:

| Order | Source address | Target address | Type | Country |
| :---: | :--- | :--- | :---: | :---: |
| **1** | `/api/<*>` | `http://YOUR_EC2_PUBLIC_IP:3001/api/<*>` | `200 (Rewrite)` | - |
| **2** | `</^[^.]+$.../>` | `/index.html` | `200 (Rewrite)` | - |

4. Click **Save**.

---

## STEP 4: Test & Verify the Live Application

1. Open your live Amplify URL (e.g., `https://main.d123456789.amplifyapp.com`).
2. Click **SIGN IN** &rarr; Switch to **Register** tab.
3. Create a new user (e.g., `arun`, password, display name).
4. **Verification checks:**
   - User account is created and automatically logged in.
   - Header shows your avatar emoji and username.
   - Open Developer Tools (**F12**) &rarr; **Network Tab**:
     - Requests to `/api/auth/register` and `/api/auth/me` return status `200 OK`.
     - The requests are sent to `https://main.d123456789.amplifyapp.com/api/...` and proxied behind the scenes to your EC2!
5. Create a group, add an expense, and test the full cloud-synced workflow across multiple devices!

---

## 💡 Troubleshooting Checklist

- **"Failed to fetch" on Register/Login:**
  - Verify your EC2 security group allows Inbound traffic on port `3001` from `0.0.0.0/0`.
  - On EC2, run `pm2 status` to ensure `splitmax-api` is `online`.
  - Verify that the target address in Amplify Rewrites includes `http://` and port `:3001` (e.g., `http://13.233.12.34:3001/api/<*>`).
- **Cannot connect to database:**
  - On EC2, run `pm2 logs splitmax-api` to view server logs and verify your Neon `DATABASE_URL` is valid.
