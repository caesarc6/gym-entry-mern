# Testing Migration: Firebase to Supabase

This guide will help you test the migration of your current Firebase account to Supabase Auth.

## Step 1: Get Your Current Firebase UID

Since you're currently signed in, you can get your Firebase UID in several ways:

### Option A: Browser Console
1. Open your browser's developer console (F12)
2. Run:
   ```javascript
   // If you have Firebase auth available
   import { auth } from './firebase';
   console.log(auth.currentUser?.uid);
   ```

### Option B: Check MongoDB
```bash
# Connect to your MongoDB and run:
db.users.find({}, { uid: 1, email: 1, name: 1 })
```

### Option C: Use the Test Script
The script will help you find it if you know your email.

## Step 2: Check Your Current Data

Run the test script to see your current setup:

```bash
node backend/scripts/test-migration.js <your-firebase-uid> <your-email>
```

Example:
```bash
node backend/scripts/test-migration.js abc123xyz user@example.com
```

This will show you:
- Your current user data
- How many entries/posts are linked to your Firebase UID
- Whether a Supabase account exists with the same email

## Step 3: Sign Up with Supabase

### Option A: Using Supabase Dashboard (Manual)
1. Go to your Supabase Dashboard
2. Navigate to Authentication > Users
3. Click "Add User" > "Create new user"
4. Enter your email (same as Firebase account)
5. Set a password or use "Send magic link"
6. Note the Supabase UID that gets created

### Option B: Using Frontend (Recommended)
1. Make sure Supabase OAuth is configured in your Supabase dashboard
2. Update your frontend to use Supabase sign-up
3. Sign up with the same email as your Firebase account

## Step 4: Link Your Accounts

After you have both Firebase and Supabase accounts:

### Method 1: Using the API Endpoint

1. **Sign in with Supabase** (using the same email)
2. **Call the migration link endpoint**:

```javascript
// In browser console or your app
const response = await fetch('/api/migration/link', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseSession.access_token}` // Your Supabase token
  },
  body: JSON.stringify({
    firebaseUid: 'your-firebase-uid-here'
  })
});

const result = await response.json();
console.log(result);
```

### Method 2: Using the Migration Script

```bash
node backend/scripts/migrate-user-data.js <firebase-uid> <supabase-uid>
```

This will:
- Update your user record to use Supabase UID
- Update all entries to use the new Supabase UID
- Preserve your Firebase UID for reference

## Step 5: Verify Migration

### Check User Record
```bash
node backend/scripts/test-migration.js <firebase-uid> <your-email>
```

You should see:
- ✅ Supabase UID is set
- ✅ Auth provider is "supabase"
- ✅ Firebase UID is preserved

### Check Data Associations

Verify your entries are still accessible:

```javascript
// In your app, after signing in with Supabase
const entries = await apiClient.get(API_ENDPOINTS.POSTS(supabaseUid));
console.log('Entries:', entries.data);
```

### Test Authentication

1. **Sign out** completely
2. **Sign in with Supabase** (not Firebase)
3. **Verify** you can:
   - See your profile
   - See your entries/posts
   - Access all your data

## Step 6: Update Entry UIDs (If Needed)

If your entries are still linked to Firebase UID, update them:

```bash
node backend/scripts/migrate-user-data.js <firebase-uid> <supabase-uid>
```

This script will:
- Update all entries from Firebase UID to Supabase UID
- Update the user record
- Preserve Firebase UID for reference

## Quick Test Checklist

- [ ] Got your Firebase UID
- [ ] Ran test script to see current data
- [ ] Created Supabase account with same email
- [ ] Linked accounts (via API or script)
- [ ] Verified user record updated
- [ ] Verified entries still accessible
- [ ] Tested sign-in with Supabase
- [ ] Confirmed all data accessible

## Troubleshooting

### Issue: Can't find Firebase UID
**Solution**: Check MongoDB directly:
```bash
mongosh
use your-database-name
db.users.find({ email: "your-email@example.com" })
```

### Issue: Supabase user not found
**Solution**: Make sure you've signed up with Supabase using the same email

### Issue: Entries not showing after migration
**Solution**: Run the migrate-user-data script to update entry UIDs:
```bash
node backend/scripts/migrate-user-data.js <firebase-uid> <supabase-uid>
```

### Issue: Can't sign in with Supabase
**Solution**: 
1. Check Supabase environment variables are set
2. Verify OAuth is configured in Supabase dashboard
3. Check browser console for errors

## Testing Your Current Account

Since you're currently signed in, here's the fastest way to test:

1. **Get your Firebase UID** from browser console or MongoDB
2. **Run the test script**:
   ```bash
   node backend/scripts/test-migration.js <your-firebase-uid> <your-email>
   ```
3. **Follow the output** - it will tell you what to do next

The script will guide you through:
- Checking your current data
- Finding/creating Supabase account
- Linking the accounts
- Verifying the migration

## Important Notes

1. **Data Preservation**: Your Firebase UID is preserved in the database, so you can always rollback
2. **Gradual Migration**: You can test with one account first before migrating all users
3. **No Data Loss**: All your entries, posts, and data remain linked via the UID field
4. **Backward Compatible**: The system still supports Firebase auth during migration
