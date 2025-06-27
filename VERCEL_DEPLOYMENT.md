# 🚀 Vercel Deployment Guide - Monorepo Setup

This guide will walk you through deploying your MERN application to Vercel as a single project with both frontend and backend.

## 📋 Prerequisites

- [Vercel Account](https://vercel.com/signup)
- [GitHub Account](https://github.com)
- Your code pushed to GitHub
- MongoDB Atlas database
- Firebase project configured

## 🎯 Step-by-Step Deployment

### **Step 1: Prepare Environment Variables**

Before deploying, you'll need to set up your environment variables. Create a `.env` file in your root directory for local testing:

```env
# Backend Environment Variables
NODE_ENV=production
PORT=5001
MONGO_URI=your_mongodb_connection_string
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# Frontend Environment Variables
VITE_NODE_ENV=production
VITE_API_BASE_URL=https://your-project-name.vercel.app
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

### **Step 2: Push Code to GitHub**

```bash
# Make sure all changes are committed
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### **Step 3: Deploy to Vercel**

1. **Go to Vercel Dashboard**

   - Visit [vercel.com](https://vercel.com)
   - Sign in with your GitHub account

2. **Import Your Repository**

   - Click "New Project"
   - Select "Import Git Repository"
   - Choose your gym-entry-mern repository
   - Click "Import"

3. **Configure Project Settings**

   - **Project Name**: Choose a name (e.g., `gym-entry-mern`)
   - **Framework Preset**: Select "Other"
   - **Root Directory**: Leave as `./` (root)
   - **Build Command**: Leave empty (handled by vercel.json)
   - **Output Directory**: Leave empty (handled by vercel.json)
   - **Install Command**: Leave empty (handled by vercel.json)

4. **Set Environment Variables**

   - Click "Environment Variables" section
   - Add the following variables:

   **Backend Variables:**

   ```
   NODE_ENV=production
   MONGO_URI=your_mongodb_connection_string
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_PRIVATE_KEY=your_firebase_private_key
   FIREBASE_CLIENT_EMAIL=your_firebase_client_email
   ```

   **Frontend Variables:**

   ```
   VITE_NODE_ENV=production
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   ```

   **Important:** Don't set `VITE_API_BASE_URL` yet - we'll do this after deployment.

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete (this may take 2-3 minutes)

### **Step 4: Configure API Base URL**

After the initial deployment:

1. **Get Your Deployment URL**

   - Your app will be available at: `https://your-project-name.vercel.app`
   - Note this URL

2. **Set the API Base URL**

   - Go to your Vercel project dashboard
   - Navigate to "Settings" → "Environment Variables"
   - Add: `VITE_API_BASE_URL=https://your-project-name.vercel.app`
   - Click "Save"

3. **Redeploy**
   - Go to "Deployments" tab
   - Click "Redeploy" on your latest deployment

### **Step 5: Test Your Deployment**

1. **Test Frontend**

   - Visit `https://your-project-name.vercel.app`
   - Should load your React app

2. **Test Backend API**

   - Visit `https://your-project-name.vercel.app/api/`
   - Should show "Server deployed and running on vercel."

3. **Test Authentication**
   - Try signing in with Google
   - Check if API calls work

## 🔧 Troubleshooting

### **Build Failures**

1. **Check Build Logs**

   - Go to your deployment in Vercel dashboard
   - Click on the failed build
   - Review the error logs

2. **Common Issues:**
   - Missing environment variables
   - MongoDB connection issues
   - Firebase configuration problems

### **API Not Working**

1. **Check API Routes**

   - Ensure your `vercel.json` is correct
   - Test `/api/` endpoint directly

2. **CORS Issues**
   - Add your frontend URL to CORS origins
   - Update `ALLOWED_ORIGINS` environment variable

### **Frontend Not Loading**

1. **Check Build Output**

   - Verify the frontend build completed successfully
   - Check if `dist` folder was created

2. **Environment Variables**
   - Ensure all `VITE_*` variables are set
   - Check that `VITE_API_BASE_URL` is correct

## 📁 Project Structure After Deployment

```
your-project-name.vercel.app/
├── /                    # Frontend (React app)
├── /api/               # Backend API
├── /api/entrys         # API endpoints
├── /api/users          # User endpoints
└── /api/protected      # Auth endpoints
```

## 🔄 Updating Your Deployment

### **Automatic Deployments**

- Every push to your main branch will trigger a new deployment
- Vercel will automatically build and deploy your changes

### **Manual Deployments**

1. Go to your Vercel dashboard
2. Click "Deployments"
3. Click "Redeploy" on any deployment

### **Environment Variable Changes**

1. Go to "Settings" → "Environment Variables"
2. Update the variables
3. Redeploy your project

## 🎉 Success!

Once deployed successfully, your app will be available at:

- **Frontend**: `https://your-project-name.vercel.app`
- **Backend API**: `https://your-project-name.vercel.app/api/`

## 📞 Support

If you encounter issues:

1. Check the Vercel build logs
2. Verify all environment variables are set
3. Test your API endpoints directly
4. Check the browser console for frontend errors

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI](https://vercel.com/docs/cli)
- [Vercel Dashboard](https://vercel.com/dashboard)
