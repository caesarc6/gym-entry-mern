# ✅ Deployment Checklist

Use this checklist to ensure your MERN application is ready for Vercel deployment.

## 🔧 Pre-Deployment Checklist

### **Code Preparation**

- [ ] All code is committed and pushed to GitHub
- [ ] `vercel.json` is in the root directory
- [ ] Individual `vercel.json` files are removed from backend/ and frontend/
- [ ] `vercel-build` script is added to frontend/package.json
- [ ] Backend exports the app for Vercel

### **Environment Variables Ready**

- [ ] MongoDB Atlas connection string
- [ ] Firebase project configuration
- [ ] Firebase service account credentials
- [ ] Supabase credentials (if using)

### **Database Setup**

- [ ] MongoDB Atlas cluster is running
- [ ] Database user has proper permissions
- [ ] IP whitelist includes Vercel's IPs (or 0.0.0.0/0 for all)
- [ ] Test database connection locally

### **Firebase Setup**

- [ ] Firebase project is created
- [ ] Authentication is enabled (Google sign-in)
- [ ] Service account key is generated
- [ ] Firebase config is ready for frontend

## 🚀 Deployment Steps

### **Step 1: Vercel Setup**

- [ ] Create Vercel account
- [ ] Connect GitHub account
- [ ] Import your repository

### **Step 2: Project Configuration**

- [ ] Set project name
- [ ] Choose "Other" framework preset
- [ ] Leave build/output directories empty
- [ ] Set root directory to `./`

### **Step 3: Environment Variables**

- [ ] Add `NODE_ENV=production`
- [ ] Add `MONGO_URI=your_connection_string`
- [ ] Add `FIREBASE_PROJECT_ID=your_project_id`
- [ ] Add `FIREBASE_PRIVATE_KEY=your_private_key`
- [ ] Add `FIREBASE_CLIENT_EMAIL=your_client_email`
- [ ] Add all `VITE_FIREBASE_*` variables
- [ ] Add `VITE_NODE_ENV=production`

### **Step 4: Initial Deployment**

- [ ] Click "Deploy"
- [ ] Wait for build to complete
- [ ] Note the deployment URL

### **Step 5: Configure API URL**

- [ ] Add `VITE_API_BASE_URL=https://your-project.vercel.app`
- [ ] Redeploy the project

## 🧪 Post-Deployment Testing

### **Frontend Testing**

- [ ] Visit the main URL - loads React app
- [ ] Check browser console for errors
- [ ] Verify environment variables are loaded
- [ ] Test navigation between pages

### **Backend Testing**

- [ ] Visit `/api/` - shows server message
- [ ] Test authentication endpoints
- [ ] Verify database connections
- [ ] Check API responses

### **Integration Testing**

- [ ] Test Google sign-in
- [ ] Create a test post/entry
- [ ] Test CRUD operations
- [ ] Verify file uploads work
- [ ] Test user profile features

## 🔍 Troubleshooting Checklist

### **Build Failures**

- [ ] Check Vercel build logs
- [ ] Verify all dependencies are in package.json
- [ ] Check for syntax errors
- [ ] Ensure environment variables are set

### **Runtime Errors**

- [ ] Check browser console
- [ ] Check Vercel function logs
- [ ] Verify API endpoints are accessible
- [ ] Test database connectivity

### **CORS Issues**

- [ ] Add frontend URL to CORS origins
- [ ] Check environment variable format
- [ ] Verify protocol (http vs https)
- [ ] Test with different browsers

## 📊 Monitoring Setup

### **Vercel Analytics**

- [ ] Enable Vercel Analytics
- [ ] Set up performance monitoring
- [ ] Configure error tracking

### **Database Monitoring**

- [ ] Set up MongoDB Atlas alerts
- [ ] Monitor connection usage
- [ ] Check for slow queries

### **Application Monitoring**

- [ ] Set up error logging
- [ ] Monitor API response times
- [ ] Track user authentication

## 🎯 Success Criteria

Your deployment is successful when:

- [ ] Frontend loads without errors
- [ ] Backend API responds correctly
- [ ] Authentication works
- [ ] Database operations succeed
- [ ] File uploads work
- [ ] All features function as expected

## 📞 If You Need Help

1. **Check the logs first**
2. **Verify environment variables**
3. **Test endpoints individually**
4. **Review the VERCEL_DEPLOYMENT.md guide**
5. **Check Vercel documentation**

## 🔗 Useful Commands

```bash
# Test local build
npm run build

# Test frontend build
cd frontend && npm run build

# Test backend locally
cd backend && npm run dev

# Check environment variables
echo $NODE_ENV
echo $MONGO_URI
```

## 📝 Notes

- Keep your environment variables secure
- Monitor your deployment regularly
- Set up automatic deployments for main branch
- Consider setting up staging environment
- Document any custom configurations
