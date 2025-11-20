# Admin Setup Guide

This guide explains how to set up admin access for the trainer dashboard approval system.

## Setting Yourself as Admin

You have two options to set yourself as an admin:

### Option 1: Using the Script (Recommended)

1. Make sure your `.env` file has `MONGODB_URI` configured
2. Run the script with your email or Firebase UID:

```bash
cd backend
npm run set-admin your-email@example.com
```

Or with your Firebase UID:

```bash
npm run set-admin your-firebase-uid-here
```

### Option 2: Manual Database Update

If you prefer to update the database directly:

1. Connect to your MongoDB database
2. Find your user document in the `users` collection
3. Update the `isAdmin` field to `true`:

```javascript
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { isAdmin: true } }
)
```

Or using MongoDB Compass or any MongoDB GUI:
- Find your user document
- Edit the `isAdmin` field and set it to `true`
- Save the document

## Accessing the Admin Dashboard

Once you're set as admin:

1. Log in to your account
2. Navigate to: `http://localhost:3000/admin/dashboard` (or your production URL)
3. You'll see:
   - **Pending Requests**: Users who have requested trainer dashboard access
   - **Approved Users**: Users who already have access

## Admin Features

- **View Pending Requests**: See all users who have requested trainer dashboard access
- **Approve Requests**: Click "Approve" to grant access to a user
- **Reject Requests**: Click "Reject" to deny access (removes the request)
- **Revoke Access**: For approved users, you can revoke their access by clicking "Revoke Access"

## Security Notes

- Only users with `isAdmin: true` can access the admin dashboard
- All admin endpoints are protected and verify admin status
- The admin dashboard route (`/admin/dashboard`) is protected and will redirect non-admin users

## Troubleshooting

**Can't access admin dashboard?**
- Verify your `isAdmin` field is set to `true` in the database
- Make sure you're logged in with the correct account
- Check the browser console for any errors

**Script not working?**
- Ensure `MONGODB_URI` is set in your `.env` file
- Make sure you're in the `backend` directory when running the script
- Verify the email/UID you're using exists in the database

