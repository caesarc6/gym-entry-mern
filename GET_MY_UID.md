# How to Get Your Firebase UID

Since you're currently signed in, here are the easiest ways to get your Firebase UID:

## Method 1: Browser Console (Easiest)

1. Open your app in the browser
2. Press **F12** to open Developer Tools
3. Go to the **Console** tab
4. Run one of these:

```javascript
// If Firebase auth is available globally
console.log('Firebase UID:', auth.currentUser?.uid);

// Or if you need to import
import { auth } from './firebase';
console.log('Firebase UID:', auth.currentUser?.uid);
```

## Method 2: Check Your App's API Response

1. Open your app
2. Open Developer Tools (F12) > Network tab
3. Look for any API call that returns user data
4. Check the response - it should include your `uid`

## Method 3: Use the Migration Status Endpoint

If you're signed in, call this endpoint:

```javascript
// In browser console
const response = await fetch('/api/migration/status', {
  headers: {
    'Authorization': `Bearer ${your-firebase-token}`
  }
});
const data = await response.json();
console.log('Your UID:', data.data.firebaseUid || data.data.uid);
```

## Method 4: Check MongoDB Directly

```bash
# Connect to MongoDB
mongosh your-connection-string

# Find your user
use your-database-name
db.users.find({ email: "your-email@example.com" }, { uid: 1, email: 1, name: 1 })
```

## Method 5: Use the Test Script

If you know your email:

```bash
# First, let's find your user
node -e "
const mongoose = require('mongoose');
mongoose.connect('your-mongodb-uri').then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const user = await User.findOne({ email: 'your-email@example.com' });
  console.log('UID:', user?.uid);
  process.exit(0);
});
"
```

## Quick Test

Once you have your Firebase UID, test the migration:

```bash
node backend/scripts/test-migration.js <your-firebase-uid> <your-email>
```

This will show you everything you need to know about migrating your account!
