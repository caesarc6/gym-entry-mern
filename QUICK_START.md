# Quick Start Guide

This guide will help you get the Gym Entry MERN application running locally for development.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB Atlas account
- Firebase project

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd gym-entry-mern

# Install all dependencies (root, backend, and frontend)
npm run install:all
```

### 2. Environment Configuration

#### Backend Environment

Create a `.env` file in the `backend/` directory:

```env
NODE_ENV=development
PORT=5001
MONGO_URI=your_mongodb_connection_string
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend-domain.vercel.app
```

#### Frontend Environment

Create a `.env` file in the `frontend/` directory:

```env
VITE_NODE_ENV=development
VITE_API_BASE_URL=http://localhost:5001
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

### 3. Start Development Servers

#### Option 1: Start Both Frontend and Backend

```bash
# This will start both servers concurrently
npm run dev
```

#### Option 2: Start Servers Separately

```bash
# Terminal 1 - Start backend
npm run dev:backend

# Terminal 2 - Start frontend
npm run dev:frontend
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5001

## Available Scripts

### Root Directory Scripts

```bash
npm run dev                    # Start both frontend and backend
npm run dev:backend           # Start only backend
npm run dev:frontend          # Start only frontend
npm run dev:frontend:local    # Start frontend with local API
npm run dev:frontend:prod     # Start frontend with production API
npm run build                 # Build both frontend and backend
npm run start                 # Start production server
npm run install:all           # Install all dependencies
```

### Backend Scripts

```bash
cd backend
npm run dev                   # Start development server
npm run start                 # Start production server
npm run build                 # Build for production
```

### Frontend Scripts

```bash
cd frontend
npm run dev                   # Start development server
npm run build                 # Build for production
npm run preview               # Preview production build
npm run dev:local             # Start with local API
npm run dev:prod              # Start with production API
```

## Development Workflow

1. **Make changes** to your code
2. **Backend changes** will auto-reload with nodemon
3. **Frontend changes** will auto-reload with Vite
4. **Test your changes** in the browser
5. **Commit and push** your changes

## API Configuration

The application uses a centralized API configuration system:

- **Development**: Automatically uses `http://localhost:5001`
- **Production**: Uses the `VITE_API_BASE_URL` environment variable

All API calls are now handled through the `apiClient` in `frontend/src/config/api.js`, which:

- Automatically adds authentication headers
- Handles environment-specific URLs
- Provides consistent error handling

## Troubleshooting

### Common Issues

1. **Port already in use:**

   ```bash
   # Kill process using port 5001
   lsof -ti:5001 | xargs kill -9

   # Kill process using port 5173
   lsof -ti:5173 | xargs kill -9
   ```

2. **Environment variables not loading:**

   - Ensure `.env` files are in the correct directories
   - Restart the development servers
   - Check that variable names match exactly

3. **MongoDB connection issues:**

   - Verify your MongoDB Atlas connection string
   - Check that your IP is whitelisted in MongoDB Atlas
   - Ensure the database user has proper permissions

4. **Firebase authentication issues:**
   - Verify your Firebase configuration
   - Check that your Firebase project is properly set up
   - Ensure authentication methods are enabled in Firebase console

### Getting Help

1. Check the browser console for frontend errors
2. Check the terminal for backend errors
3. Review the `DEPLOYMENT.md` file for more detailed information
4. Check the API configuration in `frontend/src/config/api.js`

## Next Steps

Once you have the application running locally:

1. **Set up your database** with some test data
2. **Configure Firebase** authentication
3. **Test all features** to ensure everything works
4. **Review the deployment guide** when ready to deploy
5. **Set up monitoring** and error tracking for production
