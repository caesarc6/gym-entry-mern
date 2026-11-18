import { normalizeGymName } from "./gymNormalizer.js";

/**
 * "@pg", "@blink", and anything after "@" is a gym or location tag,
 * not part of the workout or exercise name.
 */
export const stripGymOrLocationTag = (text) => {
  if (!text || typeof text !== "string") {
    return { name: "", tag: null };
  }
  const atIndex = text.indexOf("@");
  if (atIndex === -1) {
    return { name: text.trim(), tag: null };
  }
  return {
    name: text.slice(0, atIndex).replace(/\s+/g, " ").trim(),
    tag: text.slice(atIndex + 1).replace(/\s+/g, " ").trim() || null,
  };
};

export const stripGymOrLocationTagsFromLine = (text) => {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/@[^\s,;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Workout Parser Utility
 * Parses workout descriptions like "DumbBell Curls 35lbs - 12 12 10 8"
 * and extracts structured data for analytics
 */

// Optional leading number ("45 Degree…"), letters, spaces, hyphens, apostrophes,
// and a trailing parenthetical ("Lat Pulldown (wide)"). Digits are not allowed to
// run into the weight token so "35lbs" cannot be swallowed as part of the name.
const EXERCISE_NAME = String.raw`(?:\d+\s+)?[A-Za-z](?:[A-Za-z\s\-']|\([^)]*\))*`;

// Rep tokens: plain "12", multiply "8x2", or colon schemes "6:2" / "4:1:1"
// (assisted working:assist or multi-part drop sets), space/comma separated.
const REPS_SEQUENCE = String.raw`(?:\d+(?:\s*[:x]\s*\d+)*(?:\s*,\s*|\s+))*\d+(?:\s*[:x]\s*\d+)*`;

// More flexible exercise patterns to handle real-world variations
const EXERCISE_PATTERNS = [
  // Standard format: Exercise Weight - reps reps reps (with extra text allowed)
  new RegExp(
    `^(${EXERCISE_NAME})\\s+(\\d+(?:\\.\\d+)?)\\s*(lbs?|kg)\\s*-\\s*(${REPS_SEQUENCE})$`,
    "i",
  ),

  // Alternative format: Exercise - Weight x reps reps reps
  new RegExp(
    `^(${EXERCISE_NAME})\\s*-\\s*(\\d+(?:\\.\\d+)?)\\s*(lbs?|kg)\\s*x\\s*(${REPS_SEQUENCE})$`,
    "i",
  ),

  // Format with complex rep patterns: Exercise Weight - 8x2, 7x1, 8x1
  new RegExp(
    `^(${EXERCISE_NAME})\\s+(\\d+(?:\\.\\d+)?)\\s*(lbs?|kg)\\s*-\\s*((?:\\d+\\s*x\\s*\\d+\\s*,?\\s*)+)$`,
    "i",
  ),

  // Weight x reps without a dash: Exercise 185 lbs x 8 8 8
  new RegExp(
    `^(${EXERCISE_NAME})\\s+(\\d+(?:\\.\\d+)?)\\s*(lbs?|kg)\\s*x\\s*(${REPS_SEQUENCE})$`,
    "i",
  ),

  // Simple format: Exercise reps reps reps (assume bodyweight)
  new RegExp(`^(${EXERCISE_NAME})\\s*-\\s*(${REPS_SEQUENCE})$`, "i"),

  // Very flexible format: Exercise with any text Weight - reps
  new RegExp(
    `^(${EXERCISE_NAME})\\s+(\\d+(?:\\.\\d+)?)\\s*(lbs?|kg)\\s*-\\s*(${REPS_SEQUENCE})$`,
    "i",
  ),

  // Missing dash between weight and reps: Exercise 135lbs 5 5 5
  new RegExp(
    `^(${EXERCISE_NAME})\\s+(\\d+(?:\\.\\d+)?)\\s*(lbs?|kg)\\s+(${REPS_SEQUENCE})$`,
    "i",
  ),
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

  // Bent-Over Row — keep DB distinct from plain/barbell
  "bent over row": "Bent-Over Row",
  "bent row row": "Bent-Over Row",
  "bent row": "Bent-Over Row",
  "db bentover row": "Dumbbell Bent-Over Row",
  "db bent row": "Dumbbell Bent-Over Row",
  "db bent over row": "Dumbbell Bent-Over Row",
  "bent over db row": "Dumbbell Bent-Over Row",

  // Bench Press variations
  "elevated bp": "Bench Press",
  "elated bp": "Bench Press",
  "db chest press": "Dumbbell Bench Press",
  "db bp": "Dumbbell Bench Press",
  "db bench": "Dumbbell Bench Press",
  "db bench press": "Dumbbell Bench Press",
  "dumbbell bench": "Dumbbell Bench Press",
  "dumbbell bench press": "Dumbbell Bench Press",
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

  // Incline Bench Press (plain / barbell); DB variants stay under Incline Dumbbell Press
  "incline press": "Incline Bench Press",
  "incline bp": "Incline Bench Press",
  "incline bench": "Incline Bench Press",
  "incline bench press": "Incline Bench Press",
  "bb incline press": "Incline Barbell Press",
  "bb incline bench": "Incline Barbell Press",
  "bb incline bench press": "Incline Barbell Press",
  "barbell incline press": "Incline Barbell Press",
  "barbell incline bench": "Incline Barbell Press",
  "barbell incline bench press": "Incline Barbell Press",
  "incline bb press": "Incline Barbell Press",
  "incline barbell press": "Incline Barbell Press",

  // Incline Dumbbell Press — bench and press are the same movement
  "db incline press": "Incline Dumbbell Press",
  "db incline bench": "Incline Dumbbell Press",
  "db incline bench press": "Incline Dumbbell Press",
  "db incline bench incline": "Incline Dumbbell Press",
  "db incline bench inline": "Incline Dumbbell Press",
  "incline db press": "Incline Dumbbell Press",
  "incline db bench": "Incline Dumbbell Press",
  "incline db bench press": "Incline Dumbbell Press",
  "incline dumbbell press": "Incline Dumbbell Press",
  "incline dumbbell bench": "Incline Dumbbell Press",
  "incline dumbbell bench press": "Incline Dumbbell Press",
  "dumbbell incline press": "Incline Dumbbell Press",
  "dumbbell incline bench": "Incline Dumbbell Press",

  // Pec Fly
  "unilateral pec cable": "Pec Fly",
  "pec dec fly": "Pec Fly",
  "seated cable fly": "Pec Fly",
  "seat cable fly": "Pec Fly",
  "cable fly press": "Pec Fly",

  // Rear Delt Fly
  "rev pec fly": "Rear Delt Fly",
  "rev pec fly": "Rear Delt Fly",

  // Overhead Press — keep DB/BB/machine distinct
  "overhead press": "Overhead Press",
  "overhead db press": "Dumbbell Overhead Press",
  "over head press": "Overhead Press",
  "db overhead press": "Dumbbell Overhead Press",
  "db shoulder press": "Dumbbell Overhead Press",
  "dumbbell shoulder press": "Dumbbell Overhead Press",
  "dumbbell overhead press": "Dumbbell Overhead Press",

  // Barbell Shoulder Press
  "bb should press": "Barbell Shoulder Press",
  "barbell shoulder press": "Barbell Shoulder Press",

  // Plain "shoulder press" stays generic; DB variants stay dumbbell
  "shoulder press": "Overhead Press",
  "db should press": "Dumbbell Overhead Press",

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

  // Reverse curls — DB and BB stay distinct
  "rev db curls": "Reverse Dumbbell Curl",
  "rev db curl": "Reverse Dumbbell Curl",
  "rev bb curls": "Reverse Barbell Curl",
  "rev bb curl": "Reverse Barbell Curl",
  "revrse bb curl": "Reverse Barbell Curl",
  "rev sbb curl": "Reverse Barbell Curl",

  // Preacher Curl (keep equipment when present — machine ≠ preacher)
  "preach db curl": "Dumbbell Preacher Curl",
  "preacher db curl": "Dumbbell Preacher Curl",
  "machine curls": "Machine Curl",
  "curl machine": "Machine Curl",
  "machine curl": "Machine Curl",
  "bicep curl machine": "Bicep Curl Machine",
  "preacher curls": "Preacher Curl",
  "preacher curl": "Preacher Curl",
  "preacher curl m": "Preacher Curl",
  "sbb preacher c": "Barbell Preacher Curl",
  "seated curl machine": "Machine Curl",

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
  "cable side raise": "Cable Lateral Raise",
  "cable side raises": "Cable Lateral Raise",
  "cable lateral raise": "Cable Lateral Raise",
  "cable lateral raises": "Cable Lateral Raise",
  "cable hammer curl": "Cable Hammer Curl",
  "db hammer curl": "Dumbbell Hammer Curl",
  "db hammer curls": "Dumbbell Hammer Curl",
  "dumbbell hammer curl": "Dumbbell Hammer Curl",
  "hammer curl": "Dumbbell Hammer Curl",
  "hammer curls": "Dumbbell Hammer Curl",
  "cable curl": "Cable Curl",
  "cable curls": "Cable Curl",
  "cable bicep curl": "Cable Curl",
  "cable bicep curls": "Cable Curl",
  "lat pulldown": "Lat Pulldown",
  "wide grip lat pulldown": "Wide Grip Lat Pulldown",
  "wide lat pulldown": "Wide Grip Lat Pulldown",
  "bench press": "Bench Press",
  "bb bench press": "Bench Press",
  "barbell bench press": "Bench Press",
  "barbell bench": "Bench Press",
  "bb bench": "Bench Press",
  "db pullover": "Dumbbell Pullover",
  "db single arm pullovers": "Dumbbell Pullover",
  "seated tri ext": "Seated Tricep Extension",
  "seated tri curl": "Seated Tricep Extension",
  "smith mch": "Smith Machine Press",
  "smith mach press": "Smith Chest Press",
  "smith machine press": "Smith Chest Press",
  "smith chest press": "Smith Chest Press",
  "seated cable cp": "Cable Chest Press",
  "seat cp cable": "Cable Chest Press",
  "seatd cble chst prss": "Cable Chest Press",
  "calf raises": "Calf Raises",

  // Tier A/B — Caesar audit: punctuation, typos, word-order twins (equipment-safe)
  treadmill: "Treadmill",
  treadmills: "Treadmill",
  "stair master": "Stair Master",
  stairmaster: "Stair Master",
  stairmasters: "Stair Master",
  "stair masters": "Stair Master",
  "chess press": "Machine Chest Press",
  "played lunge": "Plated Lunge",
  "played lunges": "Plated Lunge",
  "played squat": "Plated Squat",
  "played squats": "Plated Squat",
  "plated lunge": "Plated Lunge",
  "plated lunges": "Plated Lunge",
  "plated squat": "Plated Squat",
  "seater row": "Seated Row",
  "converting chest press": "Converging Chest Press",
  "converging chest press": "Converging Chest Press",
  "reverse per fly": "Rear Delt Fly",
  "rev per fly": "Rear Delt Fly",
  "overhead cable extension": "Cable Overhead Extension",
  "overhead cable ext": "Cable Overhead Extension",
  "overhead cable tri ext": "Cable Overhead Extension",
  "overhead cable tricep extension": "Cable Overhead Extension",
  "overhead tricep cable extension": "Cable Overhead Extension",
  "overhead tri cable ext": "Cable Overhead Extension",
  "cable overhead extension": "Cable Overhead Extension",
  "cable overhead ext": "Cable Overhead Extension",
  "overhead dumbbell extension": "Dumbbell Overhead Extension",
  "overhead db extension": "Dumbbell Overhead Extension",
  "overhead db ext": "Dumbbell Overhead Extension",
  "overhead db tri ext": "Dumbbell Overhead Extension",
  "overhead dumbbell tricep extension": "Dumbbell Overhead Extension",
  "dumbbell overhead extension": "Dumbbell Overhead Extension",
  "dumbbell overhead tricep": "Dumbbell Overhead Extension",
  "db overhead ext": "Dumbbell Overhead Extension",
  "db overhead extension": "Dumbbell Overhead Extension",
  "tricep cable extension": "Cable Tricep Extension",
  "tri cable ext": "Cable Tricep Extension",
  "tri cable extension": "Cable Tricep Extension",
  "cable tricep extension": "Cable Tricep Extension",
  "cable tri ext": "Cable Tricep Extension",
  "cable extension": "Cable Tricep Extension",
  "cable ext": "Cable Tricep Extension",
  "cable cable extension": "Cable Tricep Extension",
  "cable bar extension": "Cable Tricep Extension",
  "cable bar ext": "Cable Tricep Extension",
  "bar cable curl": "Cable Bar Curl",
  "cable bar curl": "Cable Bar Curl",
  "jm press": "Jm Press",
  "jm bench press": "Jm Press",
  "reverse barbell": "Reverse Barbell Curl",
  "reverse bar curl": "Reverse Barbell Curl",
  "rev bar curl": "Reverse Barbell Curl",
  "db row": "Dumbbell Bent-Over Row",
  "db rows": "Dumbbell Bent-Over Row",
  "dumbbell row": "Dumbbell Bent-Over Row",
  "dumbbell rows": "Dumbbell Bent-Over Row",
  "barbell bent row": "Barbell Bent-Over Row",
  "barbell bentover row": "Barbell Bent-Over Row",
  "bb bent row": "Barbell Bent-Over Row",
  "bb bentover row": "Barbell Bent-Over Row",
  "barbell row": "Barbell Bent-Over Row",
  "bb row": "Barbell Bent-Over Row",
  "cable sbar curl": "Cable S-Bar Curl",
  "cable s bar curl": "Cable S-Bar Curl",
  "cable sbar cg curl": "Cable Close-Grip S-Bar Curl",
  "cable cgb curl": "Cable Close-Grip Bar Curl",
  "cable close bar curl": "Cable Close-Grip Bar Curl",
  "cable inner bar curl": "Cable Close-Grip Bar Curl",
  "s bar curl": "S-Bar Curl",
  "sbb curl": "S-Bar Curl",
  "sbb cg curl": "Close-Grip S-Bar Curl",
  "iso lat chest press": "ISO Lateral Chest Press",
  "iso lat chest": "ISO Lateral Chest Press",
  "chest iso lateral": "ISO Lateral Chest Press",
  "iso lat press": "ISO Lateral Chest Press",
  "iso lat wide chest": "ISO Lateral Wide Chest Press",
  "iso lat wide chest press": "ISO Lateral Wide Chest Press",
  "iso lat decline press": "ISO Lateral Decline Press",
  "close grip pulldown": "Close-Grip Lat Pulldown",
  "close grip pulldowns": "Close-Grip Lat Pulldown",
  "cable close grip pulldown": "Close-Grip Lat Pulldown",
  "cable close grip pulldowns": "Close-Grip Lat Pulldown",
  "cable cg pulldown": "Close-Grip Lat Pulldown",
  "db incline": "Incline Dumbbell Press",
  "dumbbell incline": "Incline Dumbbell Press",
  "db press's press": "Dumbbell Press",
  "db presss press": "Dumbbell Press",
  "dumbbell press s press": "Dumbbell Press",
  "bb bb overhead ext incline": "Barbell Overhead Extension",
  "barbell barbell overhead extension incline": "Barbell Overhead Extension",
  "barbell overhead extension": "Barbell Overhead Extension",
};

const NAME_ABBREVIATIONS = {
  db: "dumbbell",
  bb: "barbell",
  cble: "cable",
  chst: "chest",
  prss: "press",
  ext: "extension",
  extn: "extension",
  tri: "tricep",
  bi: "bicep",
  mch: "machine",
  mchn: "machine",
  mchne: "machine",
  rev: "reverse",
  revrse: "reverse",
  inline: "incline",
  inlne: "incline",
  inclne: "incline",
  elated: "elevated",
  elav: "elevated",
  sublime: "supine",
  supline: "supine",
  bp: "bench",
  ohp: "overhead",
};

const NAME_FILLER = new Set([
  "the",
  "a",
  "an",
  "of",
  "and",
  "seated",
  "seat",
  "seatd",
]);

const stemNameToken = (token) => {
  if (token === "press" || token === "plus") return token;
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) {
    return token.slice(0, -1);
  }
  return token;
};

const mergeCompoundTokens = (tokens) => {
  const merged = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const current = tokens[i];
    const next = tokens[i + 1];
    if (current === "pull" && next === "down") {
      merged.push("pulldown");
      i += 1;
      continue;
    }
    if (current === "push" && next === "down") {
      merged.push("pushdown");
      i += 1;
      continue;
    }
    if (current === "over" && next === "head") {
      merged.push("overhead");
      i += 1;
      continue;
    }
    if (current === "bent" && next === "over") {
      merged.push("bent");
      i += 1;
      continue;
    }
    merged.push(current);
  }
  return merged;
};

const EQUIPMENT_TOKENS = new Set([
  "dumbbell",
  "barbell",
  "cable",
  "machine",
  "smith",
  "kettlebell",
]);

const equipmentOf = (tokens) =>
  [...new Set(tokens.filter((token) => EQUIPMENT_TOKENS.has(token)))].sort();

/** Reject aliases that drop or swap DB/BB/machine/cable/etc. */
const equipmentCompatible = (inputTokens, canonicalName) => {
  const inputEq = equipmentOf(inputTokens);
  if (inputEq.length === 0) return true;
  const canonicalEq = equipmentOf(nameTokens(canonicalName));
  if (inputEq.length !== canonicalEq.length) return false;
  return inputEq.every((token, index) => token === canonicalEq[index]);
};

const canonicalizeNameTokens = (tokens) => {
  const has = (word) => tokens.includes(word);
  const isTricep = has("tricep") || has("extension") || has("pushdown");
  const isShoulderPress =
    !isTricep &&
    (has("overhead") ||
      has("military") ||
      (has("shoulder") && has("press")));

  if (isShoulderPress) {
    if (has("machine")) return ["machine", "shoulder", "press"];
    if (has("barbell")) return ["barbell", "shoulder", "press"];
    if (has("dumbbell")) return ["dumbbell", "overhead", "press"];
    if (has("cable")) return ["cable", "shoulder", "press"];
    if (has("smith")) return ["smith", "shoulder", "press"];
    return ["overhead", "press"];
  }

  const angle = has("decline")
    ? "decline"
    : has("incline") || has("elevated")
      ? "incline"
      : null;
  const chestCue = has("bench") || has("chest") || (Boolean(angle) && has("press"));
  if (
    angle &&
    chestCue &&
    !has("shoulder") &&
    !has("tricep") &&
    !has("fly")
  ) {
    const equipment = has("dumbbell")
      ? "dumbbell"
      : has("barbell")
        ? "barbell"
        : has("machine")
          ? "machine"
          : has("cable")
            ? "cable"
            : has("smith")
              ? "smith"
              : null;
    return equipment ? [angle, equipment, "press"] : [angle, "press"];
  }

  if (
    !angle &&
    has("dumbbell") &&
    (has("bench") || (has("chest") && has("press"))) &&
    !has("fly")
  ) {
    return ["dumbbell", "bench", "press"];
  }

  return tokens;
};

const nameTokens = (value) => {
  const raw = String(value || "")
    .toLowerCase()
    .split(/[\s\-–—']+/)
    .filter(Boolean)
    .flatMap((token) => {
      if (token === "wg") return ["wide", "grip"];
      return [NAME_ABBREVIATIONS[token] || token];
    })
    .map(stemNameToken)
    .filter((token) => !NAME_FILLER.has(token));

  return canonicalizeNameTokens(mergeCompoundTokens(raw));
};

const tokenSetKey = (value) => [...new Set(nameTokens(value))].sort().join(" ");

const titleCaseExerciseName = (value) =>
  nameTokens(value)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");

const applyDipWeightRule = (normalizedName, weight) => {
  if (normalizedName === "Bodyweight Dips" && weight > 0) return "Weighted Dips";
  if (normalizedName === "Weighted Dips" && weight === 0) return "Bodyweight Dips";
  return normalizedName;
};

const CANONICAL_BY_TOKEN_KEY = Object.fromEntries(
  Object.entries(EXERCISE_NORMALIZATION).map(([pattern, canonical]) => [
    tokenSetKey(pattern),
    canonical,
  ])
);

/**
 * Clean and normalize exercise name by removing common extra text and standardizing names.
 * Keeps equipment/modifiers (DB, BB, machine, cable, …) so similar names stay distinct.
 * Unknown names become title-cased tokens and are still tracked for Progress.
 * @param {string} name - Raw exercise name
 * @param {number} weight - Weight value (0 for bodyweight)
 * @returns {string} Cleaned and normalized exercise name
 */
export const cleanExerciseName = (name, weight = 0) => {
  const withoutLocation = stripGymOrLocationTagsFromLine(name);
  const cleaned = withoutLocation
    .trim()
    .toLowerCase()
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\d+(?:st|nd|rd|th)\s+(?:tile|floor|level)/gi, "")
    .replace(/\s+-\s*$/, "")
    .trim();

  const inputTokens = nameTokens(cleaned);
  const acceptCanonical = (canonical) => {
    if (!canonical) return null;
    if (!equipmentCompatible(inputTokens, canonical)) return null;
    return applyDipWeightRule(canonical, weight);
  };

  const exact = acceptCanonical(EXERCISE_NORMALIZATION[cleaned]);
  if (exact) return exact;

  const expandedKey = inputTokens.join(" ");
  const expanded = acceptCanonical(EXERCISE_NORMALIZATION[expandedKey]);
  if (expanded) return expanded;

  const tokenMatch = acceptCanonical(CANONICAL_BY_TOKEN_KEY[tokenSetKey(cleaned)]);
  if (tokenMatch) return tokenMatch;

  // New or unmatched name: track as written (abbreviations expanded, equipment kept).
  return titleCaseExerciseName(cleaned) || withoutLocation.trim().replace(/\s+/g, " ");
};

/**
 * Parse complex rep patterns like "8x2, 7x1, 8x1", "12 12 10 8",
 * or colon set schemes "6:2" / "4:1:1" (assisted / drop-set parts).
 * Colon segments become separate sets at the line weight — no invented drop weights.
 * @param {string} repsStr - String containing rep information
 * @returns {Array} Array of rep numbers
 */
const parseReps = (repsStr) => {
  const reps = [];
  const parts = String(repsStr || "")
    .split(/[,\s]+/)
    .filter((part) => part.trim());

  for (const part of parts) {
    // Assisted / drop-set schemes: "6:2", "10:1", "4:1:1"
    if (part.includes(":")) {
      const segments = part.split(":").map((seg) => Number.parseInt(seg, 10));
      if (
        segments.length >= 2 &&
        segments.every((n) => Number.isFinite(n) && n >= 0)
      ) {
        for (const n of segments) {
          if (n > 0) reps.push(n);
        }
        continue;
      }
    }

    // Multiply notation: "8x2" → two sets of 8
    const xMatch = part.match(/^(\d+)\s*x\s*(\d+)$/i);
    if (xMatch) {
      const repsNum = Number.parseInt(xMatch[1], 10);
      const setsNum = Number.parseInt(xMatch[2], 10);
      for (let i = 0; i < setsNum; i += 1) {
        reps.push(repsNum);
      }
      continue;
    }

    // Plain rep count: "12"
    const repNum = Number.parseInt(part, 10);
    if (!Number.isNaN(repNum)) {
      reps.push(repNum);
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
  // Normalize en/em dashes so "120 lbs — 12 12" matches the hyphen patterns.
  const trimmedLine = stripGymOrLocationTagsFromLine(line).replace(
    /[–—]/g,
    "-",
  );

  for (const pattern of EXERCISE_PATTERNS) {
    const match = trimmedLine.match(pattern);
    if (match) {
      try {
        // Handle different pattern types based on the number of capture groups
        if (match.length === 5) {
          // Weighted format: Exercise + weight + unit + reps
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
        continue;
      }
    }
  }

  return null;
};

const minutesFromUnit = (amount, unit) => {
  const value = Number(amount);
  if (!value) return 0;
  return /^h/i.test(unit) ? value * 60 : value;
};

/**
 * After pulling minutes/incline/level out of a cardio line, strip leftovers so
 * commas, speed, orphan numbers, and param labels never become the exercise id.
 * ("Treadmill - 20mins , lvl 4.5" → "Treadmill", not "Treadmill , ,")
 */
const cardioNameFromLine = (cleaned, timePattern) =>
  cleaned
    .replace(timePattern, " ")
    .replace(/\bincline\s*\d+(?:\.\d+)?/gi, " ")
    .replace(/\b\d+(?:\.\d+)?\s*incline\b/gi, " ")
    .replace(/\b(?:lvl|level)\s*\d+(?:\.\d+)?/gi, " ")
    .replace(/\b\d+(?:\.\d+)?\s*(?:lvl|level)\b/gi, " ")
    .replace(/\bspeed\s*\d+(?:\.\d+)?/gi, " ")
    .replace(/\b\d+(?:\.\d+)?\s*speed\b/gi, " ")
    .replace(/\b(?:incline|speed|lvl|level)\b/gi, " ")
    .replace(/\b\d+:\d+(?::\d+)?\b/g, " ")
    .replace(/\b\d+(?:\.\d+)?\b/g, " ")
    .replace(/[,:;]+/g, " ")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Lines like "Treadmill 20 min incline 5 lvl 8" are not weighted sets.
 * Matches the client parser so server analytics keep the same cardio lines.
 */
export const parseCardioLine = (line) => {
  const cleaned = stripGymOrLocationTagsFromLine(line);
  if (!cleaned || /\d+(?:\.\d+)?\s*(?:lbs?|kg)\b/i.test(cleaned)) return null;

  const timePattern = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)\b/gi;
  // "25:09mins" = 25 min + 9 sec (not "09mins" alone, which undercounts).
  const clockTimePattern =
    /(\d+)\s*:\s*(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)\b/gi;
  let minutes = 0;
  let sawTime = false;
  let withoutClock = cleaned;
  for (const match of cleaned.matchAll(clockTimePattern)) {
    sawTime = true;
    const whole = Number(match[1]);
    const frac = Number(match[2]);
    if (/^h/i.test(match[3])) {
      minutes += whole * 60 + frac;
    } else {
      minutes += whole + (Number.isFinite(frac) ? frac / 60 : 0);
    }
    withoutClock = withoutClock.replace(match[0], " ");
  }
  for (const match of withoutClock.matchAll(timePattern)) {
    sawTime = true;
    minutes += minutesFromUnit(match[1], match[2]);
  }

  const inclineMatch =
    cleaned.match(/\bincline\s*(\d+(?:\.\d+)?)/i) ||
    cleaned.match(/\b(\d+(?:\.\d+)?)\s*incline\b/i);
  const levelMatch =
    cleaned.match(/\b(?:lvl|level)\s*(\d+(?:\.\d+)?)/i) ||
    cleaned.match(/\b(\d+(?:\.\d+)?)\s*(?:lvl|level)\b/i);
  if (!sawTime && !inclineMatch && !levelMatch) return null;

  const name = cardioNameFromLine(withoutClock, timePattern);
  if (!name) return null;

  const roundedMinutes = sawTime ? Math.round(minutes) : 0;
  return {
    name: cleanExerciseName(name, 0),
    sets: [
      {
        reps: roundedMinutes,
        weight: 0,
        unit: "min",
        completed: true,
      },
    ],
    totalVolume: 0,
    maxWeight: 0,
    totalReps: roundedMinutes,
    minutes: sawTime ? minutes : null,
    incline: inclineMatch ? Number(inclineMatch[1] || inclineMatch[2]) : null,
    level: levelMatch ? Number(levelMatch[1] || levelMatch[2]) : null,
  };
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
      continue;
    }
    const cardio = parseCardioLine(line);
    if (cardio) exercises.push(cardio);
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

  const { name, tag } = stripGymOrLocationTag(title);
  let split = name || title.replace(/@[\s\S]*$/, "").trim();

  // Normalize split
  const splitLower = split.toLowerCase();
  let normalizedSplit = split;
  if (splitLower.includes("push")) {
    normalizedSplit = "Push";
  } else if (splitLower.includes("pull")) {
    normalizedSplit = "Pull";
  } else if (splitLower.includes("legs")) {
    normalizedSplit = "Legs";
  } else if (split) {
    normalizedSplit = split.charAt(0).toUpperCase() + split.slice(1);
  } else {
    normalizedSplit = null;
  }

  const gymToken = tag ? tag.split(/[\s,;/]+/).filter(Boolean)[0] : null;
  const normalizedGym = gymToken ? normalizeGymName(gymToken) : null;

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
