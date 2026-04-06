# Quick Test Guide: Migrate Your Current Account

Since you're currently signed in with Firebase, here's the fastest way to test the migration:

## Step 1: Get Your Firebase UID

**Option A: Browser Console** (Easiest)
1. Open your app in the browser
2. Press F12 to open developer console
3. Run this:
   ```javascript
   // If Firebase is available
   import { auth } from './firebase';
   console.log('Firebase UID:', auth.currentUser?.uid);
   ```

**Option B: Check Your MongoDB**
```bash
# Connect to MongoDB
mongosh your-connection-string

# Find your user
use your-database-name
db.users.find({ email: "your-email@example.com" }, { uid: 1, email: 1 })
```

## Step 2: Run the Test Script

```bash
node backend/scripts/test-migration.js <your-firebase-uid> <your-email>
```

Example:
```bash
node backend/scripts/test-migration.js abc123xyz user@example.com
```

This will show you:
- ✅ Your current user data
- ✅ How many entries/posts you have
- ✅ Whether Supabase account exists

## Step 3: Create Supabase Account

You need a Supabase account with the **same email** as your Firebase account.

### Quick Method: Use Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Authentication > Users
4. Click "Add User" > "Create new user"
5. Enter your email (same as Firebase)
6. Set password or use "Send magic link"
7. **Note the Supabase UID** that gets created

## Step 4: Link Accounts & Migrate Data

### Method 1: Using API Endpoint (Recommended)

1. **Sign in with Supabase** in your app (or get your Supabase session token)

2. **Call the migration endpoint** from browser console or Postman:

```javascript
// In browser console (after signing in with Supabase)
const response = await fetch('/api/migration/link', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseSession.access_token}`
  },
  body: JSON.stringify({
    firebaseUid: 'your-firebase-uid-here'
  })
});

const result = await response.json();
console.log(result);
```

This will automatically:
- ✅ Link your Firebase and Supabase accounts
- ✅ Update all your entries to use Supabase UID
- ✅ Switch your auth provider to Supabase

### Method 2: Using Migration Script

```bash
node backend/scripts/migrate-user-data.js <firebase-uid> <supabase-uid>
```

Example:
```bash
node backend/scripts/migrate-user-data.js abc123xyz def456uvw
```

## Step 5: Verify Migration

### Check User Record
```bash
node backend/scripts/test-migration.js <firebase-uid> <your-email>
```

You should see:
- ✅ Supabase UID is set
- ✅ Auth provider is "supabase"
- ✅ Entries count matches

### Test in Your App

1. **Sign out** completely
2. **Sign in with Supabase** (not Firebase)
3. **Verify**:
   - ✅ You can see your profile
   - ✅ All your entries/posts are visible
   - ✅ All your data is accessible

## Quick Test Checklist

- [ ] Got Firebase UID
- [ ] Ran test script
- [ ] Created Supabase account (same email)
- [ ] Got Supabase UID
- [ ] Linked accounts (API or script)
- [ ] Verified entries updated
- [ ] Tested sign-in with Supabase
- [ ] Confirmed all data accessible

## Troubleshooting

### "User not found"
- Make sure you're using the correct Firebase UID
- Check MongoDB: `db.users.find({ email: "your-email" })`

### "Supabase account not found"
- Make sure you created the Supabase user with the same email
- Check Supabase dashboard: Authentication > Users

### "Entries not showing"
- Run the migration script to update entry UIDs
- Check: `db.entrys.find({ uid: "your-supabase-uid" })`

### "Can't sign in with Supabase"
- Check Supabase environment variables are set
- Verify OAuth is configured in Supabase dashboard
- Check browser console for errors

## What Gets Migrated

When you link accounts, the system automatically updates:
- ✅ User record (uid, supabaseUid, authProvider)
- ✅ All entries/posts (uid field)
- ✅ Preserves Firebase UID for reference

**Your data is safe** - Firebase UID is preserved, so you can always reference it.

## Next Steps After Testing

Once you've verified the migration works for your account:
1. Test with a few more users
2. Create a migration plan for all users
3. Consider automating the migration process
4. Update frontend to use Supabase by default
