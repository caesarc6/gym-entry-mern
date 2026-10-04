const trimmed = (value) => String(value || "").trim();

/** Supabase id already stored on the account. Empty when this row has not been linked. */
export const canonicalSupabaseUid = (user) => trimmed(user?.supabaseUid);

/**
 * Ids other than the canonical Supabase id. Posts and workouts may still use these.
 * Rewriting them has to finish before firebaseUid can be dropped.
 */
export const legacyIdsToRewrite = (user, canonicalUid) => {
  const canonical = trimmed(canonicalUid);
  if (!canonical) return [];
  const seen = new Set();
  const legacy = [];
  for (const raw of [user?.uid, user?.firebaseUid, user?.supabaseUid]) {
    const id = trimmed(raw);
    if (!id || id === canonical || seen.has(id)) continue;
    seen.add(id);
    legacy.push(id);
  }
  return legacy;
};
