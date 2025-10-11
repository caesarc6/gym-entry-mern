# Workout Deletion Investigation Guide

## 🔍 Issue Identified

Your client workouts are being deleted due to an **auto-delete function** in the Trainer Dashboard that removes workouts without a `clientName`.

---

## 🎯 Root Cause

**Location:** `frontend/src/pages/TrainerDashboard.jsx` (lines 80-147)

**What happens:**

1. When the trainer dashboard loads, it checks for workouts without a `clientName`
2. After 1 second, it shows a confirmation dialog
3. If "OK" is clicked (even accidentally), all those workouts are permanently soft-deleted

**Code responsible:**

```javascript
const handleGeneralWorkouts = async () => {
  const generalWorkouts = sharedWorkouts.filter(
    (workout) => !workout.clientName || !workout.clientName.trim()
  );

  if (generalWorkouts.length > 0) {
    const shouldDelete = window.confirm(
      `You have ${generalWorkouts.length} general workouts that are no longer supported. Would you like to delete them?`
    );

    if (shouldDelete) {
      // Deletes all workouts without clientName
      for (const workout of generalWorkouts) {
        await apiClient.delete(
          `${API_ENDPOINTS.DELETE_SHARED_WORKOUT(workout._id)}`
        );
      }
    }
  }
};
```

---

## 🛠️ Immediate Actions

### Step 1: Investigate What Was Deleted

Run the investigation script to see:

- Which workouts are at risk
- Which workouts were recently deleted
- Orphaned workout assignments

```bash
cd backend
node scripts/investigate-deleted-workouts.js
```

**What it shows:**

- ✅ Workouts at risk of deletion (missing clientName)
- ✅ Recently deleted workouts (last 30 days)
- ✅ Orphaned workout assignments
- ✅ Summary statistics and recommendations

---

### Step 2: Restore Deleted Workouts

If workouts were deleted, restore them:

```bash
cd backend
node scripts/restore-deleted-workouts.js
```

**Restoration options:**

1. Restore ALL deleted workouts
2. Restore specific workouts by ID
3. Restore only workouts with clients
4. Cancel

The script is **interactive** and will ask for confirmation before making changes.

---

## 🔧 Permanent Solutions

### Option 1: Disable Auto-Delete (Recommended)

**Edit:** `frontend/src/pages/TrainerDashboard.jsx`

**Remove or comment out lines 138-147:**

```javascript
// DISABLED: Automatic deletion of general workouts
// Uncomment the code below if you want to re-enable
/*
const generalWorkouts = sharedWorkoutsData.filter(
  (workout) => !workout.clientName || !workout.clientName.trim()
);
if (generalWorkouts.length > 0) {
  setTimeout(() => {
    handleGeneralWorkouts();
  }, 1000);
}
*/
```

This will **prevent** the auto-delete dialog from appearing.

---

### Option 2: Make the Dialog More Explicit

**Edit:** `frontend/src/pages/TrainerDashboard.jsx` (line 87-89)

**Change the confirmation message to be more explicit:**

```javascript
const shouldDelete = window.confirm(
  `⚠️ DANGER: You have ${generalWorkouts.length} workouts without a client name.\n\n` +
    `These will be PERMANENTLY DELETED if you click OK.\n\n` +
    `Are you ABSOLUTELY SURE you want to delete them?\n\n` +
    `Click Cancel to keep them.`
);
```

---

### Option 3: Require Manual Deletion

**Edit:** `frontend/src/pages/TrainerDashboard.jsx`

**Remove the automatic trigger (lines 138-147) and add a manual button:**

1. Remove the automatic trigger:

```javascript
// Remove this code block at lines 138-147
```

2. Add a manual button in the dashboard JSX:

```javascript
{
  stats.generalWorkouts > 0 && (
    <Button colorScheme="red" variant="outline" onClick={handleGeneralWorkouts}>
      Clean Up {stats.generalWorkouts} General Workouts
    </Button>
  );
}
```

This gives you **control** over when to delete workouts.

---

## 📊 Understanding the Database

### Soft Delete vs Hard Delete

Your app uses **soft delete**:

- Deleted workouts are marked `isActive: false`
- They remain in the database
- Can be restored using the restoration script

### Workout Structure

```javascript
{
  _id: ObjectId,
  workoutName: String,
  clientName: String,        // ⚠️ If missing/empty, workout is at risk
  creatorUid: String,
  creatorName: String,
  isActive: Boolean,         // false = deleted
  createdAt: Date,
  updatedAt: Date,
  exercises: Array,
  category: String,
  difficulty: String
}
```

---

## 🔮 Prevention Tips

1. **Always set a clientName** when creating workouts
2. **Don't rush through confirmation dialogs** - read them carefully
3. **Backup your database regularly**
4. **Test changes in development** before production
5. **Monitor logs** for unexpected deletions

---

## 📝 Check Database Directly

If you have MongoDB access, you can check directly:

```bash
# Connect to MongoDB
mongo your-connection-string

# Switch to your database
use gym-entry-mern

# Find deleted workouts
db.sharedworkouts.find({ isActive: false }).sort({ updatedAt: -1 })

# Count at-risk workouts
db.sharedworkouts.count({
  isActive: true,
  $or: [
    { clientName: { $exists: false } },
    { clientName: null },
    { clientName: "" }
  ]
})

# Restore a specific workout
db.sharedworkouts.updateOne(
  { _id: ObjectId("YOUR_WORKOUT_ID") },
  { $set: { isActive: true } }
)
```

---

## 🆘 Need More Help?

### If workouts are still missing:

1. Check the logs:

   ```bash
   cat logs/latest.log | grep -i "delete"
   ```

2. Check for cascade deletes in models:

   ```bash
   grep -r "pre.*delete" backend/models/
   ```

3. Check API calls:
   ```bash
   grep -r "DELETE" frontend/src/
   ```

### If you need to add clientName to existing workouts:

```bash
# Create a migration script
node backend/scripts/add-client-names.js
```

---

## ✅ Recommended Next Steps

1. **Run investigation script** to see what's affected
2. **Restore deleted workouts** if needed
3. **Disable auto-delete** or make it more explicit
4. **Add validation** to require clientName when creating workouts
5. **Backup your database** before making changes

---

## 📧 Script Output Examples

### Investigation Script Output:

```
🔍 Starting workout investigation...

============================================================
📋 WORKOUTS AT RISK OF DELETION
============================================================
Found 5 workouts at risk:

1. Workout: "Upper Body Strength"
   ID: 6756abc123def...
   Creator: John Trainer (uid123)
   Client Name: "NONE"
   Created: 2025-10-08
   Shares: 3

============================================================
🗑️  SOFT-DELETED WORKOUTS (Recently)
============================================================
Found 3 recently deleted workouts:

1. Workout: "Leg Day"
   ID: 6756xyz789abc...
   Creator: John Trainer (uid123)
   Client Name: "NONE"
   Created: 2025-10-05
   Deleted: 2025-10-10
   Had Shares: 2
```

---

## 🔐 Safety Notes

- Both scripts connect to your production database
- Restoration script requires confirmation before making changes
- Always backup before running scripts
- Test in development first if possible
- Keep a log of what you restore

---

**Created:** October 10, 2025  
**Issue:** Auto-deletion of workouts without clientName  
**Status:** Investigation tools provided, awaiting user action

