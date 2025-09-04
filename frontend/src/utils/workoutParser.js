import { normalizeGymName } from "./gymNormalizer.js";

/**
 * Workout Parser Utility (Frontend)
 * Parses workout descriptions like "DumbBell Curls 35lbs - 12 12 10 8"
 * and extracts structured data for analytics
 */

// More flexible exercise patterns to handle real-world variations
const EXERCISE_PATTERNS = [
  // Standard format: Exercise Weight - reps reps reps (with extra text allowed)
  /^([A-Za-z\s]+)\s+(\d+(?:\.\d+)?)\s*(lbs?|kg)\s*-\s*((?:\d+\s*[x,]\s*\d+\s*)+)$/i,

  // Alternative format: Exercise - Weight x reps reps reps
  /^([A-Za-z\s]+)\s*-\s*(\d+(?:\.\d+)?)\s*(lbs?|kg)\s*x\s*((?:\d+\s*)+)$/i,

  // Format with complex rep patterns: Exercise Weight - 8x2, 7x1, 8x1
  /^([A-Za-z\s]+)\s+(\d+(?:\.\d+)?)\s*(lbs?|kg)\s*-\s*((?:\d+\s*x\s*\d+\s*,?\s*)+)$/i,

  // Simple format: Exercise reps reps reps (assume bodyweight)
  /^([A-Za-z\s]+)\s*-\s*((?:\d+\s*)+)$/i,

  // Very flexible format: Exercise with any text Weight - reps
  /^([A-Za-z\s]+(?:\s+[A-Za-z\s]+)*)\s+(\d+(?:\.\d+)?)\s*(lbs?|kg)\s*-\s*((?:\d+\s*)+)$/i,
];

/**
 * Exercise name normalization mapping
 * Maps common variations and typos to standardized names
 */
const EXERCISE_NORMALIZATION = {
  // Pull exercises
  "pull ups": "Pull-Ups",
  "pull up": "Pull-Ups",
  "assisted pull ups": "Assisted Pull-Ups",
  "assisted pull up": "Assisted Pull-Ups",
  "assisted wg pull ups": "Assisted Wide Grip Pull-Ups",

  // Lat Pulldown variations
  "cable pulldown": "Lat Pulldown",
  "cable pull downs": "Lat Pulldown",
  "cable pulldown": "Lat Pulldown",
  "cable seated pulldown": "Lat Pulldown",
  "pull down seated mch": "Lat Pulldown",
  "front pulldown": "Lat Pulldown",
  "fronts pulldown": "Lat Pulldown",
  "lat pulldown mch": "Lat Pulldown",
  "lat wide chest": "Wide Grip Lat Pulldown",

  // Row variations
  "single arm cable row": "Seated Row",
  "single arm c row": "Seated Row",
  "single cable arm row": "Seated Row",
  "single arm row": "Seated Row",
  "single seated row": "Seated Row",
  "row machine": "Seated Row",
  "seat row machine": "Seated Row",
  "seated cable row": "Seated Row",
  "cable cls grp row": "Seated Row",
  "close grip row": "Seated Row",
  "seatd row cls grip": "Seated Row",
  "machine row": "Seated Row",

  // ISO Lateral Row
  "lat row machine": "ISO Lateral Row",
  "iso lat row hi grip": "ISO Lateral Row",
  "iso lat row": "ISO Lateral Row",
  "iso lateral row": "ISO Lateral Row",
  "iso row": "ISO Lateral Row",
  "iso lat row hg": "ISO Lateral Row",

  // Bent-Over Row
  "bent over row": "Bent-Over Row",
  "bent row row": "Bent-Over Row",
  "bent row": "Bent-Over Row",
  "db bentover row": "Bent-Over Row",
  "db bent row": "Bent-Over Row",
  "db bent over row": "Bent-Over Row",
  "bent over db row": "Bent-Over Row",

  // Bench Press variations
  "elevated bp": "Bench Press",
  "elated bp": "Bench Press",
  "db chest press": "Bench Press",
  "db bp": "Bench Press",
  "sublime press": "Bench Press",
  "supline press": "Bench Press",

  // Machine Chest Press
  "chest press": "Machine Chest Press",
  "cheat chest press": "Machine Chest Press",
  "iso seated chest press": "Machine Chest Press",
  "seated chest press": "Machine Chest Press",
  "seated chest machine": "Machine Chest Press",
  "seat chest p mch": "Machine Chest Press",
  "chest prss mchn": "Machine Chest Press",

  // Incline Bench Press
  "incline press": "Incline Bench Press",
  "incline bp": "Incline Bench Press",

  // Pec Fly
  "unilateral pec cable": "Pec Fly",
  "pec dec fly": "Pec Fly",
  "seated cable fly": "Pec Fly",
  "seat cable fly": "Pec Fly",
  "cable fly press": "Pec Fly",

  // Rear Delt Fly
  "rev pec fly": "Rear Delt Fly",
  "rev pec fly": "Rear Delt Fly",

  // Overhead Press (dumbbell variations)
  "overhead db press": "Overhead Press",
  "over head press": "Overhead Press",

  // Barbell Shoulder Press
  "bb should press": "Barbell Shoulder Press",
  "barbell shoulder press": "Barbell Shoulder Press",

  // Dumbbell Shoulder Press
  "shoulder press": "Dumbbell Shoulder Press",
  "db should press": "Dumbbell Shoulder Press",

  // Machine Shoulder Press
  "shoulder pres machine": "Machine Shoulder Press",

  // Dips - differentiate between bodyweight and weighted
  "machine dip": "Weighted Dips",
  "machine dips": "Weighted Dips",
  "dip seated mchne": "Weighted Dips",
  "assisted dip": "Assisted Dips",
  "dips": "Bodyweight Dips",
  "dip": "Bodyweight Dips",
  "dip machine": "Weighted Dips",
  "dips machine": "Weighted Dips",
  "seated dip": "Weighted Dips",
  "seated dips": "Weighted Dips",
  "assisted dips": "Assisted Dips",

  // Dumbbell Bicep Curl
  "db curl": "Dumbbell Bicep Curl",
  "db curls": "Dumbbell Bicep Curl",
  "db curl": "Dumbbell Bicep Curl",
  "db alt curls": "Dumbbell Bicep Curl",
  "alt curls": "Dumbbell Bicep Curl",
  "r db curls": "Dumbbell Bicep Curl",
  "db curls": "Dumbbell Bicep Curl",

  // Barbell Bicep Curl
  "bb curls": "Barbell Bicep Curl",
  "bb curl": "Barbell Bicep Curl",
  "barbell curls": "Barbell Bicep Curl",
  "barbell curl": "Barbell Bicep Curl",
  "ez bb curl": "Barbell Bicep Curl",
  "bb s curl": "Barbell Bicep Curl",
  "exbar curl": "Barbell Bicep Curl",

  // Reverse Bicep Curl
  "rev db curls": "Reverse Bicep Curl",
  "rev bb curls": "Reverse Bicep Curl",
  "rev bb curl": "Reverse Bicep Curl",
  "revrse bb curl": "Reverse Bicep Curl",
  "rev db curl": "Reverse Bicep Curl",
  "rev db curl": "Reverse Bicep Curl",
  "rev sbb curl": "Reverse Bicep Curl",

  // Preacher Curl
  "preach db curl": "Preacher Curl",
  "preacher db curl": "Preacher Curl",
  "machine curls": "Preacher Curl",
  "curl machine": "Preacher Curl",
  "machine curl": "Preacher Curl",
  "preacher curls": "Preacher Curl",
  "preacher curl m": "Preacher Curl",
  "sbb preacher c": "Preacher Curl",
  "seated curl machine": "Preacher Curl",

  // Cable Tricep Pulldown
  "tri cable pulldown": "Cable Tricep Pulldown",
  "tri cable pulldown": "Cable Tricep Pulldown",
  "cable tri pulldown": "Cable Tricep Pulldown",
  "tri cable pull down": "Cable Tricep Pulldown",
  "tri pull down": "Cable Tricep Pulldown",
  "handle tri pull down": "Cable Tricep Pulldown",
  "handle tri pull down": "Cable Tricep Pulldown",
  "cable tri pulldown": "Cable Tricep Pulldown",
  "cable pulldown tri": "Cable Tricep Pulldown",
  "tri cable push down": "Cable Tricep Pulldown",
  "cable tri pushdown": "Cable Tricep Pulldown",
  "cable push down": "Cable Tricep Pulldown",

  // Overhead Tricep Extension
  "overhead cable tri ext": "Overhead Tricep Extension",
  "overhead tri ext": "Overhead Tricep Extension",
  "overhead tri": "Overhead Tricep Extension",
  "overhead cable ext": "Overhead Tricep Extension",
  "over head cable ext": "Overhead Tricep Extension",
  "overhead cable tri": "Overhead Tricep Extension",
  "overhead tr ext": "Overhead Tricep Extension",
  "overhead ext": "Overhead Tricep Extension",
  "overhead tri extn": "Overhead Tricep Extension",
  "overhead db tri press": "Overhead Tricep Extension",
  "overhead tri db press": "Overhead Tricep Extension",
  "overhead db tri": "Overhead Tricep Extension",
  "db overhead ext": "Overhead Tricep Extension",

  // Side Tricep Extension
  "side ext": "Side Tricep Extension",
  "alt angle side ext": "Side Tricep Extension",
  "tri side ext": "Side Tricep Extension",
  "side tri ext": "Side Tricep Extension",
  "tri side cable ext": "Side Tricep Extension",
  "side cable ext": "Side Tricep Extension",

  // Machine Chest/Tricep Press
  "tri press machine": "Machine Tricep Press",
  "tri press mch": "Machine Tricep Press",
  "tri seat": "Machine Tricep Press",
  "tri press": "Machine Tricep Press",
  "dip machine": "Machine Chest Press",
  "chest press machine": "Machine Chest Press",

  // Incline Dumbbell Press
  "elevated db press": "Incline Dumbbell Press",
  "elav db press": "Incline Dumbbell Press",
  "elevated db press": "Incline Dumbbell Press",

  // Other exercises
  "farmers carry": "Farmers Carry",
  "leg raises": "Leg Raises",
  "cable side raise": "Cable Side Raise",
  "cable hammer curl": "Cable Hammer Curl",
  "db pullover": "Dumbbell Pullover",
  "db single arm pullovers": "Dumbbell Pullover",
  "seated tri ext": "Seated Tricep Extension",
  "seated tri curl": "Seated Tricep Extension",
  "smith mch": "Smith Machine Press",
  "seated cable cp": "Cable Chest Press",
  "seat cp cable": "Cable Chest Press",
  "seatd cble chst prss": "Cable Chest Press",
  "calf raises": "Calf Raises",
};

/**
 * Clean and normalize exercise name by removing common extra text and standardizing names
 * @param {string} name - Raw exercise name
 * @param {number} weight - Weight value (0 for bodyweight)
 * @returns {string} Cleaned and normalized exercise name
 */
const cleanExerciseName = (name, weight = 0) => {
  let cleaned = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/\d+(?:st|nd|rd|th)\s+(?:tile|floor|level)/gi, "") // Remove "6th tile", "1st floor", etc.
    .replace(/\s+-\s*$/, "") // Remove trailing dash
    .replace(/^(machine|mchne|seat)\s+/i, "") // Remove common prefixes
    .replace(/\s+(machine|mchne|seat)$/i, "") // Remove common suffixes
    .trim();

  // Apply normalization mapping - exact match first
  if (EXERCISE_NORMALIZATION[cleaned]) {
    let normalizedName = EXERCISE_NORMALIZATION[cleaned];

    // Special handling for dips based on weight
    if (normalizedName === "Bodyweight Dips" && weight > 0) {
      return "Weighted Dips";
    } else if (normalizedName === "Weighted Dips" && weight === 0) {
      return "Bodyweight Dips";
    }

    return normalizedName;
  }

  // Enhanced partial matching with word-based matching
  const words = cleaned.split(/\s+/);
  const specificMatches = [];

  for (const [pattern, normalized] of Object.entries(EXERCISE_NORMALIZATION)) {
    const patternWords = pattern.split(/\s+/);

    // Check if any word in the cleaned name matches any word in the pattern
    let matchScore = 0;
    let totalWords = Math.max(words.length, patternWords.length);

    for (const word of words) {
      for (const patternWord of patternWords) {
        // Exact word match
        if (word === patternWord) {
          matchScore += 2;
        }
        // Partial word match (one contains the other)
        else if (word.includes(patternWord) || patternWord.includes(word)) {
          matchScore += 1;
        }
      }
    }

    // Calculate match percentage
    const matchPercentage = matchScore / totalWords;

    // If we have a good match (at least 50% of words match)
    if (matchPercentage >= 0.5) {
      specificMatches.push({
        pattern,
        normalized,
        length: pattern.length,
        score: matchScore,
        percentage: matchPercentage,
      });
    }
  }

  // Sort by match percentage first, then by pattern length for tie-breaking
  if (specificMatches.length > 0) {
    specificMatches.sort((a, b) => {
      if (Math.abs(a.percentage - b.percentage) < 0.1) {
        // If percentages are close, prefer longer patterns (more specific)
        return b.length - a.length;
      }
      return b.percentage - a.percentage;
    });

    let normalizedName = specificMatches[0].normalized;

    // Special handling for dips based on weight
    if (normalizedName === "Bodyweight Dips" && weight > 0) {
      return "Weighted Dips";
    } else if (normalizedName === "Weighted Dips" && weight === 0) {
      return "Bodyweight Dips";
    }

    return normalizedName;
  }

  // If no normalization found, return the original name with proper capitalization
  return name.trim().replace(/\s+/g, " ");
};

/**
 * Parse complex rep patterns like "8x2, 7x1, 8x1" or "12 12 10 8"
 * @param {string} repsStr - String containing rep information
 * @returns {Array} Array of rep numbers
 */
const parseReps = (repsStr) => {
  const reps = [];

  // Handle complex patterns like "8x2, 7x1, 8x1"
  if (repsStr.includes("x")) {
    const parts = repsStr.split(/[,\s]+/).filter((part) => part.trim());
    for (const part of parts) {
      const match = part.match(/(\d+)\s*x\s*(\d+)/i);
      if (match) {
        const [, repsPerSet, sets] = match;
        const repsNum = parseInt(repsPerSet);
        const setsNum = parseInt(sets);
        for (let i = 0; i < setsNum; i++) {
          reps.push(repsNum);
        }
      }
    }
  } else {
    // Handle simple patterns like "12 12 10 8"
    const parts = repsStr.split(/\s+/).filter((part) => part.trim());
    for (const part of parts) {
      const repNum = parseInt(part);
      if (!isNaN(repNum)) {
        reps.push(repNum);
      }
    }
  }

  return reps;
};

/**
 * Parse a single exercise line
 * @param {string} line - Exercise description line
 * @returns {Object|null} Parsed exercise data or null if can't parse
 */
export const parseExerciseLine = (line) => {
  const trimmedLine = line.trim();

  for (const pattern of EXERCISE_PATTERNS) {
    const match = trimmedLine.match(pattern);
    if (match) {
      try {
        // Handle different pattern types based on the number of capture groups
        if (match.length === 5) {
          // Standard format: Exercise Weight - reps reps reps
          const [, exerciseName, weight, unit, repsStr] = match;

          // Parse reps using the flexible parser
          const reps = parseReps(repsStr);
          if (reps.length === 0) continue;

          const weightNum = parseFloat(weight);
          const unitLower = unit.toLowerCase();
          const finalUnit = unitLower === "lb" ? "lbs" : unitLower;

          return {
            name: cleanExerciseName(exerciseName, weightNum),
            sets: reps.map((rep) => ({
              reps: rep,
              weight: weightNum,
              unit: finalUnit,
              completed: true,
            })),
            totalVolume: weightNum * reps.reduce((sum, rep) => sum + rep, 0),
            maxWeight: weightNum,
            totalReps: reps.reduce((sum, rep) => sum + rep, 0),
          };
        } else if (match.length === 4) {
          // Alternative format: Exercise - Weight x reps reps reps
          const [, exerciseName, weight, unit, repsStr] = match;

          // Parse reps using the flexible parser
          const reps = parseReps(repsStr);
          if (reps.length === 0) continue;

          const weightNum = parseFloat(weight);
          const unitLower = unit.toLowerCase();
          const finalUnit = unitLower === "lb" ? "lbs" : unitLower;

          return {
            name: cleanExerciseName(exerciseName, weightNum),
            sets: reps.map((rep) => ({
              reps: rep,
              weight: weightNum,
              unit: finalUnit,
              completed: true,
            })),
            totalVolume: weightNum * reps.reduce((sum, rep) => sum + rep, 0),
            maxWeight: weightNum,
            totalReps: reps.reduce((sum, rep) => sum + rep, 0),
          };
        } else if (match.length === 3) {
          // Simple format: Exercise reps reps reps (bodyweight)
          const [, exerciseName, repsStr] = match;

          // Parse reps using the flexible parser
          const reps = parseReps(repsStr);
          if (reps.length === 0) continue;

          return {
            name: cleanExerciseName(exerciseName, 0),
            sets: reps.map((rep) => ({
              reps: rep,
              weight: 0,
              unit: "bodyweight",
              completed: true,
            })),
            totalVolume: reps.reduce((sum, rep) => sum + rep, 0),
            maxWeight: 0,
            totalReps: reps.reduce((sum, rep) => sum + rep, 0),
          };
        }
      } catch (error) {
        console.error(`Error parsing exercise line "${trimmedLine}":`, error);
        continue;
      }
    }
  }

  return null;
};

/**
 * Parse workout description and extract exercises
 * @param {string} description - Full workout description
 * @returns {Array} Array of parsed exercises
 */
export const parseWorkoutDescription = (description) => {
  if (!description) return [];

  const lines = description
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const exercises = [];

  for (const line of lines) {
    const exercise = parseExerciseLine(line);
    if (exercise) {
      exercises.push(exercise);
    }
  }

  return exercises;
};

/**
 * Parse workout title to extract split and gym
 * @param {string} title - Workout title like "Push @blink"
 * @returns {Object} { split, gym }
 */
export const parseWorkoutTitle = (title) => {
  if (!title) return { split: null, gym: null };

  // Pattern: "Split @gym" or "Split"
  const match = title.match(/^([A-Za-z\s]+)(?:\s*@\s*([A-Za-z\s@]+))?$/);

  let split = null;
  let rawGym = null;
  if (match) {
    split = match[1].trim();
    rawGym = match[2] ? match[2].trim() : null;
  } else {
    split = title.trim();
  }

  // Normalize split
  const splitLower = split.toLowerCase();
  let normalizedSplit = split;
  if (splitLower.includes("push")) {
    normalizedSplit = "Push";
  } else if (splitLower.includes("pull")) {
    normalizedSplit = "Pull";
  } else if (splitLower.includes("legs")) {
    normalizedSplit = "Legs";
  } else {
    // Capitalize first letter
    normalizedSplit = split.charAt(0).toUpperCase() + split.slice(1);
  }

  const normalizedGym = rawGym ? normalizeGymName(rawGym) : null;

  return {
    split: normalizedSplit,
    gym: normalizedGym,
  };
};

/**
 * Calculate total volume for all exercises
 * @param {Array} exercises - Array of parsed exercises
 * @returns {number} Total volume
 */
export const calculateTotalVolume = (exercises) => {
  return exercises.reduce((total, exercise) => total + exercise.totalVolume, 0);
};

/**
 * Extract PR (Personal Record) data from exercises
 * @param {Array} exercises - Array of parsed exercises
 * @returns {Object} PR data by exercise name
 */
export const extractPRs = (exercises) => {
  const prs = {};

  exercises.forEach((exercise) => {
    const { name, maxWeight, totalReps } = exercise;

    if (!prs[name]) {
      prs[name] = { maxWeight: 0, maxReps: 0, maxVolume: 0 };
    }

    const currentPR = prs[name];
    const volume = exercise.totalVolume;

    if (maxWeight > currentPR.maxWeight) currentPR.maxWeight = maxWeight;
    if (totalReps > currentPR.maxReps) currentPR.maxReps = totalReps;
    if (volume > currentPR.maxVolume) currentPR.maxVolume = volume;
  });

  return prs;
};
