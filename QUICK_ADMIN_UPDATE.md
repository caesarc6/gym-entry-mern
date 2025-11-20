# Quick One-Line Admin Update

This guide shows you how to update your account to admin using a single MongoDB command.

## Step 1: Find Your MongoDB Connection String

Your MongoDB connection string is in your `.env` file. Look for one of these:

- `MONGO_URI=...`
- `MONGODB_URI=...`

**Location:** `backend/.env` file

The connection string will look like one of these:

```
mongodb+srv://username:password@cluster.mongodb.net/database-name
mongodb://localhost:27017/database-name
mongodb://username:password@host:port/database-name
```

## Step 2: Get Your Email or Firebase UID

You'll need either:

- Your email address (the one you use to log in)
- Your Firebase UID (found in Firebase console or browser dev tools)

## Step 3: Run the One-Line Command

Open your terminal and run this command (replace the placeholders):

### Option A: Using Email

```bash
mongosh "YOUR_MONGODB_CONNECTION_STRING" --eval 'db.users.updateOne({ email: "your-email@example.com" }, { $set: { isAdmin: true } })'
```

### Option B: Using Firebase UID

```bash
mongosh "YOUR_MONGODB_CONNECTION_STRING" --eval 'db.users.updateOne({ uid: "your-firebase-uid" }, { $set: { isAdmin: true } })'
```

## Complete Example

Here's what it would look like with real values:

```bash
mongosh "mongodb+srv://myuser:mypass@cluster0.abc123.mongodb.net/gym-entry-mern" --eval 'db.users.updateOne({ email: "john@example.com" }, { $set: { isAdmin: true } })'
```

## Step 4: Verify It Worked

After running the command, you should see output like:

```
{
  acknowledged: true,
  insertedId: null,
  matchedCount: 1,
  modifiedCount: 1,
  upsertedCount: 0
}
```

If `matchedCount: 1` and `modifiedCount: 1`, it worked!

## Troubleshooting

**"mongosh: command not found"**

- Install MongoDB Shell: https://www.mongodb.com/try/download/shell
- Or use `mongo` instead of `mongosh` (older versions)

**"Authentication failed"**

- Check your connection string has correct username/password
- Make sure special characters in password are URL-encoded

**"matchedCount: 0"**

- Your email/UID doesn't match any user
- Try finding your user first: `mongosh "CONNECTION_STRING" --eval 'db.users.find({ email: "your-email@example.com" })'`

**Connection timeout**

- Check your IP is whitelisted in MongoDB Atlas (if using Atlas)
- Verify your connection string is correct

## Installing mongosh

### Option 1: Using Homebrew (Recommended for macOS)

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install mongosh
brew install mongosh
```

### Option 2: Direct Download (macOS)

1. Go to: https://www.mongodb.com/try/download/shell
2. Select:
   - **Platform:** macOS
   - **Package:** .tgz (or .zip)
3. Download and extract
4. Add to your PATH, or run directly from the extracted folder

### Option 3: Using npm (If you have Node.js)

```bash
npm install -g mongosh
```

### Verify Installation

After installing, verify it works:

```bash
mongosh --version
```

You should see something like: `mongosh 2.x.x`

---

## Alternative: If You Don't Want to Install mongosh

If you prefer not to install `mongosh`, you can use these alternatives:

### Option A: Use the Node.js Script (Easiest!)

```bash
cd backend
npm run set-admin your-email@example.com
```

This uses your existing Node.js setup and doesn't require installing anything new.

### Option B: Use MongoDB Compass (GUI Tool)

1. Download MongoDB Compass: https://www.mongodb.com/try/download/compass
2. Connect using your connection string
3. Navigate to `users` collection
4. Find your user and edit `isAdmin: true`

### Option C: Use MongoDB Atlas Web Interface

1. Log in to MongoDB Atlas: https://cloud.mongodb.com
2. Go to your cluster → Browse Collections
3. Find your user document and edit it directly

## After Updating

1. Log out and log back in to your app
2. Navigate to: `http://localhost:3000/admin/dashboard` (or your production URL)
3. You should now see the admin dashboard!
