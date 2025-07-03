# Deployment Debug Guide

## Issues Identified

Your deployed Vercel server is returning 500 Internal Server Errors for several API endpoints:

- `GET /api/getCurrentUser`
- `GET /api/users/{uid}/following`
- `GET /api/posts/{uid}`

## Root Causes & Solutions

### 1. Database Connection Issues

**Problem**: The server was trying to connect to MongoDB twice and had insufficient error handling.

**Solution**: ✅ Fixed in `backend/api/index.js`

- Removed duplicate database connection
- Added database connection checks in all controller functions
- Improved error handling with proper status codes

### 2. Environment Variables

**Problem**: Missing Firebase environment variables in production.

**Required Environment Variables for Vercel**:

```bash
MONGO_URI=your_mongodb_connection_string
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
ALLOWED_ORIGINS=https://gym-entry-mern.vercel.app,http://localhost:5173
NODE_ENV=production
```

### 3. CORS Configuration

**Problem**: CORS was blocking requests from your Vercel domain.

**Solution**: ✅ Fixed in `backend/api/index.js`

- Added your Vercel domain to allowed origins
- Improved CORS error handling

### 4. Error Handling

**Problem**: Generic 500 errors without proper debugging information.

**Solution**: ✅ Fixed in controller functions

- Added database connection checks
- Improved error messages
- Added logging for debugging

## Testing Your Deployment

### 1. Test Environment Variables

Run this locally to test your environment setup:

```bash
cd backend
node test-deployment.js
```

### 2. Test API Endpoints

After deployment, test these endpoints:

**Health Check**:

```bash
curl https://gym-entry-mern.vercel.app/api/health
```

**Database Test**:

```bash
curl https://gym-entry-mern.vercel.app/api/db-test
```

**API Test**:

```bash
curl https://gym-entry-mern.vercel.app/api/test
```

### 3. Check Vercel Logs

1. Go to your Vercel dashboard
2. Select your project
3. Go to "Functions" tab
4. Check the logs for any errors

## Deployment Steps

### 1. Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to "Settings" → "Environment Variables"
3. Add these variables:
   - `MONGO_URI`: Your MongoDB connection string
   - `FIREBASE_PROJECT_ID`: Your Firebase project ID
   - `FIREBASE_PRIVATE_KEY`: Your Firebase private key (with newlines)
   - `FIREBASE_CLIENT_EMAIL`: Your Firebase client email
   - `ALLOWED_ORIGINS`: `https://gym-entry-mern.vercel.app,http://localhost:5173`
   - `NODE_ENV`: `production`

### 2. Redeploy

After setting environment variables:

1. Go to "Deployments" tab
2. Click "Redeploy" on your latest deployment
3. Or push new changes to trigger a new deployment

### 3. Verify Deployment

1. Check the health endpoint: `https://gym-entry-mern.vercel.app/api/health`
2. Check the database test: `https://gym-entry-mern.vercel.app/api/db-test`
3. Test authentication with a valid Firebase token

## Common Issues & Solutions

### Issue: "Database connection error"

**Solution**: Check your `MONGO_URI` environment variable in Vercel

### Issue: "Firebase configuration error"

**Solution**: Verify all Firebase environment variables are set correctly

### Issue: "CORS error"

**Solution**: Check that your domain is in the `ALLOWED_ORIGINS` list

### Issue: "User not found"

**Solution**: This is expected for new users - they need to be created first via the `/api/protected` endpoint

## Debugging Tips

1. **Check Vercel Function Logs**: Look for specific error messages
2. **Test Environment Variables**: Use the test script to verify configuration
3. **Check Network Tab**: Look at the actual response from failed requests
4. **Verify Firebase Token**: Ensure tokens are being sent correctly from frontend

## Expected Behavior After Fixes

- ✅ `/api/health` should return success
- ✅ `/api/db-test` should show database connection status
- ✅ `/api/getCurrentUser` should work with valid Firebase token
- ✅ `/api/users/{uid}/following` should return following list or empty array
- ✅ `/api/posts/{uid}` should return posts or empty array

## Next Steps

1. Set all environment variables in Vercel
2. Redeploy your application
3. Test the health endpoints
4. Try logging in with Google authentication
5. Check if the 500 errors are resolved

If issues persist, check the Vercel function logs for specific error messages and update this guide accordingly.
