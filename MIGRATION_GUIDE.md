# Migration Guide: Firebase Auth to Supabase Auth

This guide explains how to migrate from Firebase Auth to Supabase Auth while maintaining support for existing Firebase users.

## Overview

The application now supports **dual authentication**:
- **Firebase Auth**: For existing users (backward compatibility)
- **Supabase Auth**: For new users and migrated users

## Backend Changes

### 1. User Model Updates
The User model now includes:
- `firebaseUid`: Firebase UID (for existing users)
- `supabaseUid`: Supabase UID (for new/migrated users)
- `authProvider`: Either "firebase" or "supabase"
- `uid`: Primary UID (can be either Firebase or Supabase)

### 2. Dual Auth Middleware
The `verifyIdToken` middleware now:
1. Tries Supabase authentication first
2. Falls back to Firebase authentication if Supabase fails
3. Sets `req.user.authProvider` to indicate which provider was used

### 3. Migration Endpoints
- `POST /api/migration/link`: Link Firebase and Supabase accounts
- `GET /api/migration/status`: Check migration status for current user

## Frontend Changes

### 1. Dual Auth Utility
Created `frontend/src/utils/auth.js` with helpers:
- `getAuthToken()`: Gets token from either provider
- `getCurrentAuthUser()`: Gets current user from either provider
- `signOutAll()`: Signs out from both providers

### 2. API Client Updates
The API client interceptor now uses the dual-auth utility to get tokens from either provider.

## Migration Process

### For Existing Firebase Users

1. **Continue using Firebase** (no action required)
   - Your existing Firebase account will continue to work
   - All your data remains accessible

2. **Optional: Migrate to Supabase** (when ready)
   - Sign up with Supabase using the same email address
   - Call the migration link endpoint to link accounts
   - Future logins will use Supabase

### For New Users

- New users will sign up with Supabase Auth
- Their accounts will be created with `authProvider: "supabase"`

## Migration Script

Use the migration script to check migration status:

```bash
# Show migration statistics
node backend/scripts/migrate-to-supabase.js stats

# List all Firebase users
node backend/scripts/migrate-to-supabase.js list
```

## Environment Variables

### Backend
Add to your `.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Frontend
Add to your `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Linking Accounts (For Existing Firebase Users)

If you want to migrate your Firebase account to Supabase:

1. Sign up with Supabase using the same email as your Firebase account
2. After signing in with Supabase, call the migration endpoint:
   ```javascript
   await apiClient.post(API_ENDPOINTS.MIGRATION_LINK, {
     firebaseUid: "your-firebase-uid"
   });
   ```

This will:
- Link your Firebase UID to your Supabase UID
- Update your primary auth provider to Supabase
- Keep both UIDs for backward compatibility

## Testing

1. **Test Firebase Auth** (existing users):
   - Sign in with Firebase
   - Verify you can access your data
   - Check that `authProvider` is "firebase"

2. **Test Supabase Auth** (new users):
   - Sign up with Supabase
   - Verify account creation
   - Check that `authProvider` is "supabase"

3. **Test Migration**:
   - Sign in with Firebase
   - Sign up with Supabase (same email)
   - Link accounts
   - Verify both UIDs are stored

## Rollback Plan

If you need to rollback:
1. Remove Supabase environment variables
2. The middleware will automatically fall back to Firebase-only
3. Existing Firebase users will continue to work

## Notes

- Both auth providers can coexist during the migration period
- Users can have both `firebaseUid` and `supabaseUid` set
- The `uid` field is the primary identifier (can be either)
- All existing data remains accessible regardless of auth provider
