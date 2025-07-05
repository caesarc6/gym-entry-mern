/**
 * Gym Name Normalizer (Frontend)
 * Handles common gym abbreviations, typos, and variations
 */

// Gym name mappings: abbreviation/typo -> standardized name
const GYM_MAPPINGS = {
  // Equinox variations
  equinox: "Equinox",
  eq: "Equinox",
  "@equinox": "Equinox",
  "@eq": "Equinox",

  // Blink Fitness variations
  blink: "Blink Fitness",
  "blink fitness": "Blink Fitness",
  bloink: "Blink Fitness", // Common typo
  "@blink": "Blink Fitness",
  "@bloink": "Blink Fitness", // Typo
  "@bf": "Blink Fitness",

  // Crunch Fitness variations
  crunch: "Crunch Fitness",
  "crunch fitness": "Crunch Fitness",
  "@crunch": "Crunch Fitness",
  "@cf": "Crunch Fitness",

  // Planet Fitness variations
  "planet fitness": "Planet Fitness",
  planet: "Planet Fitness",
  "@planet": "Planet Fitness",
  "@pf": "Planet Fitness",

  // Chelsea Piers Fitness variations
  "chelsea piers": "Chelsea Piers Fitness",
  "chelsea piers fitness": "Chelsea Piers Fitness",
  cp: "Chelsea Piers Fitness",
  "@chelsea": "Chelsea Piers Fitness",
  "@cp": "Chelsea Piers Fitness",

  // Mid City Gym variations
  "mid city": "Mid City Gym",
  "mid city gym": "Mid City Gym",
  midcity: "Mid City Gym",
  "@midcity": "Mid City Gym",
  "@mcg": "Mid City Gym",

  // Solace New York variations
  solace: "Solace New York",
  "solace ny": "Solace New York",
  "solace new york": "Solace New York",
  "@solace": "Solace New York",
  "@sn": "Solace New York",

  // Tone House variations
  "tone house": "Tone House",
  tonehouse: "Tone House",
  "@tonehouse": "Tone House",
  "@th": "Tone House",

  // VITAL Climbing Gym variations
  vital: "VITAL Climbing Gym",
  "vital climbing": "VITAL Climbing Gym",
  "vital climbing gym": "VITAL Climbing Gym",
  "@vital": "VITAL Climbing Gym",
  "@vcg": "VITAL Climbing Gym",

  // Common abbreviations
  gym: "Gym",
  fitness: "Fitness",
  club: "Club",
  center: "Center",
  centre: "Center",
};

// List of all recognized gym names
export const RECOGNIZED_GYMS = [
  "Equinox",
  "Blink Fitness",
  "Crunch Fitness",
  "Planet Fitness",
  "Chelsea Piers Fitness",
  "Mid City Gym",
  "Solace New York",
  "Tone House",
  "VITAL Climbing Gym",
];

/**
 * Normalize a gym name by handling abbreviations and typos
 * @param {string} gymName - Raw gym name from user input
 * @returns {string} Normalized gym name or original if not recognized
 */
export const normalizeGymName = (gymName) => {
  if (!gymName) return null;

  // Convert to lowercase and trim for comparison
  const normalized = gymName.toLowerCase().trim();

  // Check if we have a direct mapping
  if (GYM_MAPPINGS[normalized]) {
    return GYM_MAPPINGS[normalized];
  }

  // Handle @ symbol variations
  if (normalized.startsWith("@")) {
    const withoutAt = normalized.substring(1);
    if (GYM_MAPPINGS[withoutAt]) {
      return GYM_MAPPINGS[withoutAt];
    }
  }

  // Handle common patterns
  // Remove @ symbol and check
  const withoutAt = normalized.replace(/^@/, "");
  if (GYM_MAPPINGS[withoutAt]) {
    return GYM_MAPPINGS[withoutAt];
  }

  // Try partial matches for common typos
  for (const [abbreviation, fullName] of Object.entries(GYM_MAPPINGS)) {
    if (
      normalized.includes(abbreviation) ||
      abbreviation.includes(normalized)
    ) {
      return fullName;
    }
  }

  // If no match found, return the original (capitalized)
  return gymName.charAt(0).toUpperCase() + gymName.slice(1).toLowerCase();
};

/**
 * Check if a gym name is recognized
 * @param {string} gymName - Gym name to check
 * @returns {boolean} True if recognized
 */
export const isRecognizedGym = (gymName) => {
  if (!gymName) return false;
  const normalized = normalizeGymName(gymName);
  return RECOGNIZED_GYMS.includes(normalized);
};

/**
 * Get all possible variations for a gym name
 * @param {string} gymName - Standardized gym name
 * @returns {Array} Array of possible variations
 */
export const getGymVariations = (gymName) => {
  const variations = [];
  for (const [abbreviation, fullName] of Object.entries(GYM_MAPPINGS)) {
    if (fullName === gymName) {
      variations.push(abbreviation);
    }
  }
  return variations;
};
