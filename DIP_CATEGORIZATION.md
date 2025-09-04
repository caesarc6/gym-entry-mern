# Dip Exercise Categorization

## Overview

The workout parser now automatically categorizes dip exercises based on whether they are performed with weight or as bodyweight exercises. This provides better analysis capabilities by treating bodyweight dips and weighted dips as separate exercises.

## Categories

### 1. Bodyweight Dips

- **Description**: Traditional dips performed using only body weight
- **Examples**:
  - "Dips - 12 10 8"
  - "Dips - 15 12 10"
- **Weight**: 0 (bodyweight)
- **Unit**: "bodyweight"

### 2. Weighted Dips

- **Description**: Dips performed with additional weight (machine or weighted vest)
- **Examples**:
  - "Dips 45lbs - 12 10 8"
  - "Machine Dips 90lbs - 10 8 6"
  - "Seated Dips 60lbs - 12 10 8"
- **Weight**: > 0 (actual weight used)
- **Unit**: "lbs" or "kg"

### 3. Assisted Dips

- **Description**: Dips performed with assistance (resistance bands, assisted machine)
- **Examples**:
  - "Assisted Dips - 15 12 10"
- **Weight**: 0 (assistance reduces body weight)
- **Unit**: "bodyweight"

## Implementation Details

### Automatic Categorization Logic

The system automatically determines the dip category based on:

1. **Exercise Name Matching**: Looks for dip-related keywords in the exercise name
2. **Weight Detection**: Checks if weight is specified in the workout entry
3. **Smart Override**: If a dip exercise has weight > 0, it's categorized as "Weighted Dips" regardless of the original name

### Exercise Name Normalization

The following variations are automatically normalized:

#### Bodyweight Dips

- "dips"
- "dip"

#### Weighted Dips

- "machine dip"
- "machine dips"
- "dip seated mchne"
- "dip machine"
- "dips machine"
- "seated dip"
- "seated dips"

#### Assisted Dips

- "assisted dip"
- "assisted dips"

## Benefits for Analysis

### 1. Separate Progress Tracking

- Bodyweight dips and weighted dips can be tracked separately
- Progress in one doesn't interfere with the other
- Better understanding of strength development

### 2. More Accurate Analytics

- Volume calculations are more meaningful
- PR tracking is exercise-specific
- Workout analysis can distinguish between different dip variations

### 3. Better Workout Planning

- Users can see their progress in both bodyweight and weighted variations
- Helps in planning progressive overload
- Identifies areas for improvement

## Usage Examples

### Workout Entry Format

```
Push @Gym

Dips - 12 10 8
Machine Dips 45lbs - 10 8 6
Assisted Dips - 15 12 10
```

### Parsed Results

```javascript
[
  {
    name: "Bodyweight Dips",
    maxWeight: 0,
    unit: "bodyweight",
    totalReps: 30,
  },
  {
    name: "Weighted Dips",
    maxWeight: 45,
    unit: "lbs",
    totalReps: 24,
  },
  {
    name: "Assisted Dips",
    maxWeight: 0,
    unit: "bodyweight",
    totalReps: 37,
  },
];
```

## Technical Implementation

### Files Modified

- `frontend/src/utils/workoutParser.js`
- `backend/utils/workoutParser.js`

### Key Changes

1. Enhanced `cleanExerciseName()` function to accept weight parameter
2. Updated exercise normalization mapping for dip variations
3. Modified `parseExerciseLine()` to pass weight to name cleaning
4. Added weight-based categorization logic

### Backward Compatibility

- Existing workout data will be re-categorized when processed
- No breaking changes to the API
- All existing functionality remains intact
