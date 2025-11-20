# Manual Admin Update Guide

This guide shows you how to manually update your account to admin using MongoDB commands through the terminal.

## Prerequisites

- MongoDB installed locally OR access to your MongoDB database
- Your MongoDB connection string (from `.env` file: `MONGO_URI` or `MONGODB_URI`)
- Your user email or Firebase UID

## Method 1: Using MongoDB Shell (mongosh) - Recommended

### Step 1: Connect to MongoDB

If you have MongoDB installed locally:

```bash
mongosh
```

Or connect directly to your database using the connection string:

```bash
mongosh "your-mongodb-connection-string"
```

For example:

```bash
mongosh "mongodb+srv://username:password@cluster.mongodb.net/database-name"
```

### Step 2: Switch to Your Database

```javascript
use gym-entry-mern
```

(Replace `gym-entry-mern` with your actual database name if different)

### Step 3: Find Your User

First, find your user document to verify:

```javascript
// By email
db.users.findOne({ email: "your-email@example.com" });

// Or by Firebase UID
db.users.findOne({ uid: "your-firebase-uid-here" });
```

### Step 4: Update to Admin

Once you've confirmed the user document, update it:

```javascript
// By email
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { isAdmin: true } }
);

// Or by Firebase UID
db.users.updateOne(
  { uid: "your-firebase-uid-here" },
  { $set: { isAdmin: true } }
);
```

### Step 5: Verify the Update

```javascript
db.users.findOne(
  { email: "your-email@example.com" },
  { isAdmin: 1, email: 1, name: 1 }
);
```

You should see `isAdmin: true` in the result.

---

## Method 2: One-Line Command (If Already Connected)

If you're already connected to MongoDB, you can do it in one command:

```javascript
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { isAdmin: true } }
);
```

---

## Method 3: Using MongoDB Compass (GUI)

1. Open MongoDB Compass
2. Connect to your database using your connection string
3. Navigate to your database → `users` collection
4. Find your user document (use the filter: `{ email: "your-email@example.com" }`)
5. Click on the document to edit it
6. Add or modify the `isAdmin` field and set it to `true`
7. Click "Update"

---

## Method 4: Using MongoDB Atlas Web Interface

1. Log in to MongoDB Atlas
2. Go to your cluster → Browse Collections
3. Select your database → `users` collection
4. Find your user document
5. Click "Edit Document"
6. Add/modify `isAdmin: true`
7. Click "Update"

---

## Method 5: Using Node.js Script (Quick Terminal Command)

You can also create a quick one-liner script:

```bash
cd backend
node -e "
import('mongoose').then(async ({ default: mongoose }) => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const { User } = await import('./models/user.model.js');
  const user = await User.findOneAndUpdate(
    { email: 'your-email@example.com' },
    { \$set: { isAdmin: true } },
    { new: true }
  );
  console.log('Admin updated:', user ? 'Success' : 'User not found');
  process.exit(0);
});
"
```

---

## Complete Example Session

Here's a complete example of what a MongoDB shell session would look like:

```javascript
// Connect to MongoDB
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/gym-entry-mern"

// Switch to database (if needed)
use gym-entry-mern

// Find your user
db.users.findOne({ email: "your-email@example.com" })

// Update to admin
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { isAdmin: true } }
)

// Verify
db.users.findOne(
  { email: "your-email@example.com" },
  { isAdmin: 1, email: 1, name: 1, uid: 1 }
)

// Expected output:
// {
//   _id: ObjectId('...'),
//   email: 'your-email@example.com',
//   name: 'Your Name',
//   uid: 'firebase-uid',
//   isAdmin: true
// }
```

---

## Troubleshooting

**"Collection 'users' not found"**

- Make sure you're using the correct database name
- Check if your collection is named differently (might be `Users` with capital U)

**"No documents matched"**

- Double-check your email address or UID
- Try searching without filters first: `db.users.find().limit(5)`

**"Connection refused"**

- Check your MongoDB connection string
- Ensure MongoDB is running (if local)
- Verify network access (if remote)

**"Authentication failed"**

- Check your MongoDB credentials
- Verify your connection string includes username and password

---

## Quick Reference Commands

```javascript
// List all databases
show dbs

// Use a database
use gym-entry-mern

// List collections
show collections

// Find all users
db.users.find().limit(10)

// Find your user
db.users.findOne({ email: "your-email@example.com" })

// Update to admin
db.users.updateOne({ email: "your-email@example.com" }, { $set: { isAdmin: true } })

// Verify admin status
db.users.findOne({ email: "your-email@example.com" }, { isAdmin: 1 })

// Remove admin (if needed)
db.users.updateOne({ email: "your-email@example.com" }, { $set: { isAdmin: false } })
```

---

## Security Note

After updating, make sure to:

1. Log out and log back in to refresh your session
2. Navigate to `/admin/dashboard` to verify access
3. Keep your admin credentials secure
