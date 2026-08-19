# SEHR LIVE — Enterprise Production Deployment & App Store Release Guide

This production manual outlines the precise, verified blueprints for separating the **Sehr Live Mobile App** from the **Web Admin Dashboard**, compiling the signed Android **APK/AAB** files, configuring production APIs, and establishing persistent cloud database infrastructure.

---

## 📂 System Architecture Overview

Sehr Live has been engineered with a unified codebase that builds into separate production artifacts using Vite's Multi-Page Application (MPA) bundling pipeline:

```
                          ┌───────────────────────────┐
                          │     Vite Build Pipeline   │
                          └─────────────┬─────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
     ┌──────────────────────┐                       ┌──────────────────────┐
     │  index.html (Client) │                       │  admin.html (Admin)  │
     │  Mounted: App.tsx    │                       │  Mounted: AdminApp.tsx│
     └──────────┬───────────┘                       └──────────┬───────────┘
                │ (Capacitor/Cordova)                          │ (Static Hosting)
                ▼                                              ▼
     ┌──────────────────────┐                       ┌──────────────────────┐
     │ Android APK / AAB    │                       │  Web Admin Portal    │
     │ (Google Play Store)  │                       │ (admin.sehrlive.com) │
     └──────────────────────┘                       └──────────────────────┘
```

---

## 🛠️ Phase 1 — Android APK & App Bundle (.AAB) Generation

The mobile application is a high-performance web client configured to run flawlessly inside native mobile containers. To package it for the Google Play Store, we use **CapacitorJS** (recommended) or **Cordova**.

### Step 1: Initialize Capacitor in the Client Directory
Run the following commands in your local directory containing the source files:

```bash
# 1. Install Capacitor Core and CLI dependencies
npm install @capacitor/core @capacitor/cli

# 2. Initialize Capacitor configuration (Enter App Name: "Sehr Live", App ID: "com.sehr.live")
npx cap init "Sehr Live" "com.sehr.live" --web-dir=dist

# 3. Add the native Android platform layer
npm install @capacitor/android
npx cap add android
```

### Step 2: Configure `capacitor.config.json`
Verify or update the generated configuration file to point to your live backend server and enable advanced permissions:

```json
{
  "appId": "com.sehr.live",
  "appName": "Sehr Live",
  "webDir": "dist",
  "bundledWebRuntime": false,
  "server": {
    "cleartext": true,
    "allowNavigation": [
      "*.sehrlive.com",
      "*.run.app"
    ]
  },
  "plugins": {
    "PushNotifications": {
      "presentationOptions": ["badge", "sound", "alert"]
    }
  }
}
```

### Step 3: Configure Android Permissions (`AndroidManifest.xml`)
Navigate to `android/app/src/main/AndroidManifest.xml` and insert the required high-tier permissions for live-streaming, video broadcasting, and audio room capture:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.sehr.live">
    <!-- Camera for video streams & PK battles -->
    <uses-permission android:name="android.permission.CAMERA" />
    <!-- Microphone for audio lounges & multi-guests -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <!-- Network & Internet -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <!-- Storage and Notifications -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application ...>
        ...
    </application>
</manifest>
```

### Step 4: Separate Build & Synchronize Assets
To ensure **zero Web Admin components** make it into your Android package, generate a targeted client-only production bundle:

```bash
# 1. Build the production build (Vite generates optimized web resources in /dist)
npm run build

# 2. Sync client static assets to the native Android folder
npx cap sync android
```

### Step 5: Compile Signed APK & AAB in Android Studio
1. Launch **Android Studio** and import the `./android` folder directory.
2. In Android Studio, go to **Build** > **Generate Signed Bundle / APK...**
3. Select **Android App Bundle (.aab)** for Google Play uploads, or **APK** for direct testing distribution.
4. Set up your secure Keystore file (`sehr-keystore.jks`), define password credentials, select `release` variant, and click **Finish**.
5. Your optimized production release `.apk` is built in `android/app/release/app-release.apk`.

---

## 🌐 Phase 2 — Web Admin Separation & Deployment

The Web Admin is decoupled from the mobile app's native compilation and is served independently via static web hosting pipelines (e.g., Cloudflare Pages, Netlify, Vercel, or custom Nginx).

### Option A: Serverless Static Deployment (Recommended)
You can configure Vercel or Cloudflare Pages to serve only `admin.html`.

**Build Settings on Hosting Dashboard:**
* **Build Command:** `npm run build`
* **Output Directory:** `dist`
* **Custom Route Rewrites:** Redirect `/*` to `admin.html` if routing is active.

### Option B: Dedicated Admin Domain Nginx Conf
To serve the Admin portal from a sub-domain (e.g., `admin.sehrlive.com`), use this clean Nginx server block:

```nginx
server {
    listen 80;
    server_name admin.sehrlive.com;

    root /var/www/sehr-live-build/dist;
    index admin.html;

    location / {
        try_files $uri $uri/ /admin.html;
    }

    # Proxy to Backend API Server
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## ⚡ Phase 3 — Production API Server Deployment

The Express.js backend acts as the secure central sync-engine managing Coins, Wallets, Transactions, Live Streams catalog, Agency margins, and Families.

### 1. Production Package Installation
Ensure all modules are compiled in your server environment:
```bash
npm install express dotenv cors helmet compression morgan
```

### 2. Launching via PM2 (Process Manager)
Keep the Express engine running forever with automatic crash recovery, logging, and load balancing on port `3000`:

```bash
# Install PM2 globally on the host
npm install -g pm2

# Start the server process
pm2 start dist/server.cjs --name "sehr-live-api"

# Configure PM2 startup to resurrect process on server restart
pm2 startup
pm2 save
```

---

## 🔐 Phase 4 — Production Environment Configuration (`.env`)

Create a `.env` file inside your server execution root with these parameters:

```env
# =========================================================================
# SEHR LIVE SYSTEM ENVIRONMENT CONFIGURATION (PRODUCTION)
# =========================================================================
NODE_ENV=production
PORT=3000

# Backend API Endpoint Url
APP_URL="https://api.sehrlive.com"

# Secured Server Keys
GEMINI_API_KEY="AIzaSyA_PRODUCTION_SECURED_GEMINI_KEY"

# Database Configuration (Firebase / Cloud SQL Postgres)
# If using Firebase Admin SDK:
FIREBASE_PROJECT_ID="sehr-live-prod"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@sehr-live-prod.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...=-----END PRIVATE KEY-----\n"

# If using SQL Backend:
DATABASE_URL="postgresql://db_user:db_password@host:5432/sehr_live_prod?sslmode=require"
```

---

## 📈 Phase 5 — Production Database Verification Checklist

To secure and verify all systems before public distribution:

### 1. Active Collections Schema Mapping
| Collection | Primary Key | Critical Rules | Real-Time Sync |
|---|---|---|---|
| `/users` | `userId` | User coins & premium diamond wallets | Real-time |
| `/hosts` | `hostId` | Active stream configurations, live nodes | Real-time |
| `/gifts` | `giftId` | Global active gift catalogue | Static / Cached |
| `/agencies`| `agencyId` | Commision formulas and parent relationships | Real-time |
| `/families`| `familyId` | User group alliances and rankings | Real-time |
| `/transactions`| `txId` | Ledger records of gift transfers | Strict write-only |

### 2. Push Notifications & PK Events Brokerage
* Configure Firebase Cloud Messaging (FCM) credentials in `server.ts` to trigger push alerts when a user starts streaming or registers a PK Battle.
* Set up real-time listener intervals (default 3 seconds poll on fallback) on the Mobile Client to sync active coin updates.

---

## 🚀 Post-Deployment Play Store Check
1. Make sure your native apps do not expose administrative assets by building client bundle via `vite.config.ts` targeting only client routes.
2. Build separate web admin files for your support staff.
3. Validate API server latency and test stream bandwidth on a CDN.

**Your Sehr Live application is now fully prepared for public store launch!**
