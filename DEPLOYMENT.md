# Deployment Guide for Gym Entry MERN Application

This guide will help you deploy your MERN stack application to Vercel with proper environment configuration.

## Prerequisites

- Vercel account
- MongoDB Atlas account
- Firebase project
- Supabase project (if using)

## Environment Setup

### 1. Backend Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
NODE_ENV=production
PORT=5001
MONGO_URI=your_mongodb_connection_string
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app,http://localhost:5173

# Supabase Configuration (if using)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. Frontend Environment Variables

Create a `.env` file in the `frontend/` directory with the following variables:

```env
VITE_NODE_ENV=production
VITE_API_BASE_URL=https://your-backend-domain.vercel.app

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

# Supabase Configuration (if using)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Deployment Steps

### 1. Deploy Backend to Vercel

1. **Push your code to GitHub** (if not already done)

2. **Connect to Vercel:**

   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set the root directory to `backend/`
   - Set the build command to: `npm run build`
   - Set the output directory to: `../frontend/dist`

3. **Configure Environment Variables in Vercel:**

   - Go to your project settings in Vercel
   - Navigate to "Environment Variables"
   - Add all the backend environment variables listed above

4. **Deploy:**
   - Click "Deploy"
   - Note the deployment URL (e.g., `https://your-backend.vercel.app`)

### 2. Deploy Frontend to Vercel

1. **Create a new Vercel project for the frontend:**

   - Import the same GitHub repository
   - Set the root directory to `frontend/`
   - Set the build command to: `npm run build`
   - Set the output directory to: `dist`

2. **Configure Environment Variables:**

   - Add all the frontend environment variables
   - Make sure `VITE_API_BASE_URL` points to your backend deployment URL

3. **Deploy:**
   - Click "Deploy"
   - Note the frontend deployment URL

### 3. Update CORS Configuration

After both deployments are complete:

1. **Update the backend environment variable:**

   - Go to your backend Vercel project settings
   - Update `ALLOWED_ORIGINS` to include your frontend URL:

   ```
   ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app,http://localhost:5173
   ```

2. **Redeploy the backend** to apply the CORS changes

## Development vs Production

### Development Commands

```bash
# Run both frontend and backend in development
npm run dev

# Run only backend in development
npm run dev:backend

# Run only frontend in development (with local API)
npm run dev:frontend:local

# Run only frontend in development (with production API)
npm run dev:frontend:prod
```

### Production Commands

```bash
# Build both frontend and backend
npm run build

# Start production server
npm start
```

## Environment-Specific Configuration

The application automatically detects the environment and uses appropriate URLs:

- **Development**: Uses `http://localhost:5001` for API calls
- **Production**: Uses the `VITE_API_BASE_URL` environment variable

## Troubleshooting

### Common Issues

1. **CORS Errors:**

   - Ensure `ALLOWED_ORIGINS` includes your frontend domain
   - Check that the frontend URL is exactly correct (including protocol)

2. **Environment Variables Not Loading:**

   - Verify all environment variables are set in Vercel
   - Check that variable names match exactly (case-sensitive)
   - Redeploy after adding new environment variables

3. **API Calls Failing:**

   - Verify `VITE_API_BASE_URL` is set correctly in frontend
   - Check that the backend is deployed and accessible
   - Review browser console for specific error messages

4. **Build Failures:**
   - Ensure all dependencies are installed
   - Check that all required environment variables are set
   - Review build logs for specific error messages

### Debugging

1. **Check Environment Variables:**

   ```javascript
   // In your frontend code, you can log the API base URL
   console.log("API Base URL:", import.meta.env.VITE_API_BASE_URL);
   ```

2. **Verify API Endpoints:**

   - Test your backend API directly using tools like Postman
   - Check that all routes are working as expected

3. **Monitor Logs:**
   - Use Vercel's function logs to debug backend issues
   - Check browser console for frontend errors

## Security Considerations

1. **Environment Variables:**

   - Never commit `.env` files to version control
   - Use Vercel's environment variable system for production
   - Rotate sensitive keys regularly

2. **CORS:**

   - Only allow necessary origins
   - Avoid using `*` in production

3. **API Security:**
   - Implement proper authentication
   - Validate all inputs
   - Use HTTPS in production

## Monitoring and Maintenance

1. **Set up monitoring:**

   - Use Vercel Analytics
   - Monitor API response times
   - Set up error tracking

2. **Regular updates:**
   - Keep dependencies updated
   - Monitor for security vulnerabilities
   - Test deployments in staging environment

## Support

If you encounter issues during deployment:

1. Check the troubleshooting section above
2. Review Vercel's documentation
3. Check the application logs
4. Verify all environment variables are correctly set
