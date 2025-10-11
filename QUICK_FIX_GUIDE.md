# 🚀 Quick Fix Guide - Restore Your Workouts

## 🎯 Problem Summary

Your workouts **exist in the database** but are marked as `isActive: false` (soft-deleted), so they don't show up in the frontend.

The backend API filters out inactive workouts:

```javascript
const query = { creatorUid: uid, isActive: true }; // Only returns active workouts
```

---

## ⚡ FASTEST SOLUTION (3 Steps)

### Step 1: Check Status (30 seconds)

```bash
cd /Users/c/Developer/gym-entry-mern/backend
node scripts/check-workout-status.js
```

This shows:

- ✅ How many workouts are active (visible)
- ❌ How many workouts are inactive (hidden)
- 📋 List of all hidden workouts

### Step 2: Restore ALL Workouts (1 minute)

```bash
cd /Users/c/Developer/gym-entry-mern/backend
node scripts/bulk-restore-all-workouts.js
```

This will:

- Show you all inactive workouts
- Let you choose what to restore:
  1. ALL workouts
  2. Only workouts WITH client names
  3. Only workouts WITHOUT client names
- Ask for confirmation before restoring

### Step 3: Refresh Frontend (10 seconds)

- Refresh your trainer dashboard
- Your workouts should now appear! ✅

---

## 📊 What The Scripts Do

### `check-workout-status.js`

- **Safe to run** - Doesn't modify anything
- Shows you exactly what's in your database
- Tells you which workouts are hidden and why

**Example Output:**

```
📊 WORKOUT STATUS SUMMARY
======================================================================
Total Workouts in Database: 25
✅ Active (isActive: true):  10 - VISIBLE in frontend
❌ Inactive (isActive: false): 15 - HIDDEN from frontend
======================================================================
```

### `bulk-restore-all-workouts.js`

- **Interactive** - Asks for confirmation
- Restores multiple workouts at once
- Updates `isActive: true` and `updatedAt`

**What it does:**

1. Shows all inactive workouts
2. Lets you choose which ones to restore
3. Asks you to type `RESTORE` to confirm
4. Bulk updates the database
5. Shows results

---

## 🎯 Quick Commands Reference

```bash
# Check status (safe, read-only)
cd /Users/c/Developer/gym-entry-mern/backend
node scripts/check-workout-status.js

# Restore ALL at once (fastest)
node scripts/bulk-restore-all-workouts.js

# Restore selectively (more control)
node scripts/restore-deleted-workouts.js

# Investigate in detail
node scripts/investigate-deleted-workouts.js
```

---

## 🔍 Understanding the Issue

### How Soft Delete Works

**Active Workout (Visible):**

```json
{
  "_id": "...",
  "workoutName": "Chest Day",
  "clientName": "john",
  "isActive": true,    ← Shows in frontend
  "creatorUid": "..."
}
```

**Inactive Workout (Hidden):**

```json
{
  "_id": "...",
  "workoutName": "Leg Day",
  "clientName": "jane",
  "isActive": false,   ← Hidden from frontend
  "creatorUid": "..."
}
```

### Why They Were Hidden

The auto-delete feature in TrainerDashboard deleted workouts without a `clientName`. These workouts were soft-deleted (`isActive: false`) instead of being removed from the database.

**Good news:** They're still in the database and can be restored!

---

## 💡 Alternative Methods

### Method 1: MongoDB Shell (If you have access)

```javascript
// Connect to MongoDB
mongo your-connection-string
use gym-entry-mern

// Check inactive workouts
db.sharedworkouts.find({ isActive: false }).count()

// Restore ALL inactive workouts
db.sharedworkouts.updateMany(
  { isActive: false },
  { $set: { isActive: true, updatedAt: new Date() } }
)

// Restore specific workout by ID
db.sharedworkouts.updateOne(
  { _id: ObjectId("YOUR_WORKOUT_ID_HERE") },
  { $set: { isActive: true, updatedAt: new Date() } }
)
```

### Method 2: MongoDB Compass (GUI)

1. Open MongoDB Compass
2. Connect to your database
3. Navigate to `sharedworkouts` collection
4. Filter: `{ "isActive": false }`
5. Select all documents
6. Update: `{ "$set": { "isActive": true } }`

---

## ⚠️ Important Notes

### After Restoration

- **Refresh your browser** to see the restored workouts
- They should appear immediately in the trainer dashboard
- All workout data (exercises, clients, etc.) is preserved

### If Workouts Still Don't Appear

1. Check the browser console for errors
2. Verify the user UID matches the `creatorUid` in the workouts
3. Check that the backend is running
4. Clear browser cache

### Safety

- All scripts are **safe to run**
- `check-workout-status.js` is read-only
- Other scripts ask for confirmation
- No data is permanently deleted

---

## 🎬 Complete Workflow

```bash
# 1. Navigate to backend
cd /Users/c/Developer/gym-entry-mern/backend

# 2. Check what needs restoring (read-only, safe)
node scripts/check-workout-status.js

# 3. If you see inactive workouts, restore them
node scripts/bulk-restore-all-workouts.js

# 4. Choose option 1 to restore ALL
# 5. Type RESTORE to confirm

# 6. Done! Refresh your browser
```

---

## ✅ Success Checklist

After running the scripts:

- [ ] Ran `check-workout-status.js` - saw inactive workouts
- [ ] Ran `bulk-restore-all-workouts.js` - restored workouts
- [ ] Saw "Restoration complete!" message
- [ ] Refreshed trainer dashboard
- [ ] Workouts now appear in frontend
- [ ] Can view and edit workouts normally

---

## 🆘 Troubleshooting

### "No inactive workouts found"

- Your workouts might be permanently deleted
- Check if they exist: `db.sharedworkouts.find({}).count()`
- They might belong to a different user UID

### "Connection refused"

- Check `.env` file has correct `MONGODB_URI`
- Ensure MongoDB is running
- Try connecting with MongoDB Compass first

### "Permission denied"

- Run with proper permissions
- Check database user has write access
- Verify authentication credentials

### Scripts don't work

```bash
# Check Node.js version
node --version  # Should be 14+

# Reinstall dependencies
cd backend
npm install

# Check .env file exists
ls -la .env
```

---

## 📞 Need More Help?

1. **Check logs:** `cat logs/latest.log | grep -i "workout"`
2. **Verify database connection:** Try connecting with MongoDB Compass
3. **Check creator UID:** Make sure workouts belong to your user
4. **Browser console:** Look for API errors (F12 → Console)

---

**Last Updated:** October 10, 2025  
**Issue:** Workouts exist in DB but marked as `isActive: false`  
**Solution:** Run `bulk-restore-all-workouts.js` to restore them  
**Status:** ✅ Scripts ready, awaiting execution
