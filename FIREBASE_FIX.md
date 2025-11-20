# Firebase Connection Fix Guide

## Issue
Firebase Admin SDK is failing with "Invalid JWT Signature" error. This prevents the backend server from starting.

## Quick Fix Steps

### Option 1: Regenerate Firebase Service Account Key (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **ethereal-gains**
3. Go to **Project Settings** (gear icon) → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the new JSON file
6. Replace `backend/ethereal-gains-firebase-adminsdk-ipqvh-32d83a52d2.json` with the new file
7. Restart your server

### Option 2: Check System Time

If your system time is incorrect, Firebase will reject the JWT:

```bash
# Check current time
date

# Sync time on macOS
sudo sntp -sS time.apple.com
```

### Option 3: Verify Key Still Exists

1. Go to [Firebase Console IAM](https://console.firebase.google.com/iam-admin/serviceaccounts/project)
2. Check if the service account key ID `32d83a52d22eb83d9374e9c282300845de7bfabb` still exists
3. If not, regenerate the key (Option 1)

## Test Connection

After fixing, test the connection:

```bash
cd backend
node --require ./polyfills/buffer.cjs test-connections.js
```

## Supabase Note

Supabase connection is working, but the `users` table might not exist or have a different name. This won't prevent the server from starting, but you may need to check your Supabase schema.

