# Workout Claiming Feature Documentation

## Overview

This feature allows trainers to create workouts and assign them to clients by name. When a client creates an account with a matching name, those workouts are automatically claimed and linked to their account.

## How It Works

### For Trainers

1. **Create a Workout for a Client**

   - Go to Trainer Dashboard (`/trainer/dashboard`)
   - Click "Create Shared Workout"
   - Fill in the workout details:
     - **Client Name**: Enter the client's name (e.g., "John Smith")
     - **Workout Name**: Name of the workout
     - **Workout Description**: Details of exercises, sets, reps, etc.
     - **Date**: When the workout was created
     - **Tags**: Optional tags for organization
   - Click "Create Workout"

2. **What Happens Behind the Scenes**
   - A `SharedWorkout` is created with the client's name (normalized to lowercase)
   - A `WorkoutAssignment` is automatically created linking the workout to the client name
   - The assignment is marked as `isRegisteredUser: false` (name-only assignment)

### For Clients

1. **Sign Up / Log In**

   - When a client creates an account or logs in for the first time
   - The system automatically checks for any workouts assigned to their name or email

2. **Automatic Claiming**

   - If matching workouts are found:
     - All matching `WorkoutAssignment` records are updated with the user's UID
     - `isRegisteredUser` is set to `true`
     - The workouts are now linked to the user's account
   - A modal appears showing all claimed workouts
   - The modal displays:
     - Number of workouts claimed
     - Workout names and descriptions
     - Who assigned them (trainer name)
     - When they were assigned

3. **Accessing Claimed Workouts**
   - Clients can view their assigned workouts from the home page
   - Workouts appear in their workout assignments
   - They can complete, track progress, and interact with the workouts

## Technical Implementation

### Backend Endpoints

#### 1. Check Pending Workouts (Public)

```
POST /api/shared-workouts/check-pending
Body: { name: "John Smith", email: "john@example.com" }
```

- Checks if there are any workouts assigned to the given name or email
- Returns count and list of pending assignments

#### 2. Claim Pending Workouts (Authenticated)

```
POST /api/shared-workouts/claim-pending
Headers: Authorization: Bearer <token>
Body: { email: "john@example.com" }
```

- Claims all workouts assigned to the user's name or email
- Links them to the authenticated user's account

#### 3. User Creation with Auto-Claiming

```
GET /api/users/createUsers
Headers: Authorization: Bearer <token>
```

- Creates or retrieves a user
- **Automatically** searches for and claims pending workouts
- Returns user info plus claimed workouts

### Database Models

#### SharedWorkout Model

```javascript
{
  workoutName: String,
  description: String,
  clientName: String,  // Normalized (lowercase)
  creatorUid: String,
  creatorName: String,
  exercises: [Object],
  // ... other fields
}
```

#### WorkoutAssignment Model

```javascript
{
  sharedWorkoutId: ObjectId,
  assignedToUid: String (nullable),  // null until claimed
  assignedToName: String,             // Used for matching
  assignedToEmail: String (optional), // Alternative matching
  isRegisteredUser: Boolean,          // false until claimed
  sharedByUid: String,
  sharedByName: String,
  customLabel: String,
  status: String,  // 'shared', 'in_progress', 'completed'
  // ... other fields
}
```

### Frontend Components

#### ClaimedWorkoutsModal

- Displays a modal when a user claims workouts
- Shows workout details, trainer info, and assignment dates
- Provides navigation to home page to view workouts

#### Store Integration

- `claimedWorkouts`: Array of claimed workout objects
- `showClaimedWorkoutsModal`: Boolean to control modal visibility
- Auto-populated during authentication state change

## User Flow Example

### Scenario: Trainer assigns workout to "Jane Doe"

1. **Trainer Action**

   ```
   Trainer creates workout:
   - Client Name: "Jane Doe"
   - Workout: "Upper Body Strength"
   - Description: "Bench Press 3x10, Rows 3x12, ..."
   ```

2. **Database State**

   ```javascript
   SharedWorkout {
     _id: "abc123",
     workoutName: "Upper Body Strength",
     clientName: "jane doe",  // normalized
     creatorName: "Trainer Mike"
   }

   WorkoutAssignment {
     _id: "xyz789",
     sharedWorkoutId: "abc123",
     assignedToUid: null,
     assignedToName: "jane doe",
     isRegisteredUser: false,
     status: "shared"
   }
   ```

3. **Client Signs Up**

   ```
   Jane Doe creates account with:
   - Name: "Jane Doe"
   - Email: "jane@example.com"
   ```

4. **Auto-Claiming Process**

   ```javascript
   // Backend automatically:
   1. Normalizes "Jane Doe" → "jane doe"
   2. Searches WorkoutAssignments where:
      - assignedToName = "jane doe"
      - isRegisteredUser = false
   3. Updates found assignments:
      - assignedToUid = jane's UID
      - isRegisteredUser = true
      - assignedToEmail = "jane@example.com"
   ```

5. **Client Experience**
   ```
   - Modal appears: "Welcome! You have 1 workout assigned to you!"
   - Shows workout details
   - Can click "Go to Home" to view workout
   ```

## API Integration Examples

### Frontend: Create Workout for Client

```javascript
import { apiClient, API_ENDPOINTS } from "../config/api";

const createWorkoutForClient = async (clientName, workoutData) => {
  const response = await apiClient.post(API_ENDPOINTS.CREATE_SHARED_WORKOUT, {
    ...workoutData,
    clientName: clientName, // System normalizes this
  });
  return response.data;
};
```

### Frontend: Check Pending Workouts (Before Signup)

```javascript
const checkPendingWorkouts = async (name, email) => {
  const response = await apiClient.post(API_ENDPOINTS.CHECK_PENDING_WORKOUTS, {
    name,
    email,
  });
  return response.data;
};
```

### Frontend: Manual Claiming (If Needed)

```javascript
const claimWorkouts = async (email) => {
  const response = await apiClient.post(API_ENDPOINTS.CLAIM_PENDING_WORKOUTS, {
    email,
  });
  return response.data;
};
```

## Key Features

✅ **Automatic Claiming**: Workouts are automatically linked when a user signs up
✅ **Name Matching**: Case-insensitive matching ensures "John Smith" = "john smith"
✅ **Email Fallback**: Can also match by email address
✅ **Trainer Tracking**: Clients see who assigned each workout
✅ **Status Tracking**: Track workout completion status
✅ **Modal Notification**: Users are notified of claimed workouts immediately

## Edge Cases Handled

1. **Multiple Workouts**: If multiple workouts are assigned to the same name, all are claimed
2. **Case Sensitivity**: Names are normalized to lowercase for matching
3. **Already Claimed**: Once claimed, workouts won't be re-claimed
4. **No Match**: If no workouts match, user creation proceeds normally
5. **Claim Failure**: If claiming fails, user creation still succeeds

## Testing the Feature

### Test Scenario 1: Basic Flow

1. As Trainer:

   - Create workout for "Test Client"
   - Verify workout appears in dashboard

2. As New User:
   - Sign up with name "Test Client"
   - Verify modal appears with claimed workout
   - Check home page shows the workout

### Test Scenario 2: Multiple Workouts

1. As Trainer:

   - Create 3 workouts for "John Doe"

2. As New User:
   - Sign up with name "John Doe"
   - Verify modal shows all 3 workouts
   - Check all workouts are accessible

### Test Scenario 3: Case Insensitivity

1. As Trainer:

   - Create workout for "JANE DOE"

2. As New User:
   - Sign up with name "jane doe"
   - Verify workout is still claimed

## Future Enhancements

- [ ] Email notifications when workouts are assigned
- [ ] Client invitation system with unique links
- [ ] Bulk workout assignment to multiple clients
- [ ] Workout scheduling with due dates
- [ ] Progress tracking and reporting for trainers
- [ ] Client feedback and ratings on workouts

## Troubleshooting

### Workouts Not Claiming

1. Check name spelling matches exactly (case-insensitive)
2. Verify `isRegisteredUser` is `false` in database
3. Check backend logs for claiming errors
4. Ensure user creation endpoint is being called

### Modal Not Showing

1. Check if `claimedWorkouts` is populated in store
2. Verify `showClaimedWorkoutsModal` is set to `true`
3. Check console for authentication state changes
4. Ensure modal component is imported correctly

### Duplicate Claims

1. This shouldn't happen as claims only work on `isRegisteredUser: false`
2. Check for race conditions in authentication flow
3. Verify database constraints on WorkoutAssignment

## Summary

This feature creates a seamless experience for trainers and clients:

- **Trainers** can easily create and assign workouts by name
- **Clients** automatically receive their workouts when they sign up
- **System** handles all the matching and linking automatically
- **Everyone** benefits from a smooth, automated workflow

The implementation is robust, handles edge cases, and provides immediate feedback to users about their claimed workouts.

