/** How long a raced insert still counts as this sign-in creating the account. */
export const FRESH_ACCOUNT_MS = 30_000;

/**
 * Which unique field a Mongo duplicate-key error refers to.
 * Username collisions are retries. Identity and email collisions mean the
 * account row already exists (often because a parallel sign-in just inserted it).
 */
export const duplicateKeyField = (error) => {
  if (error?.code !== 11000) return null;
  const pattern = error.keyPattern || {};
  if (pattern.username) return "username";
  if (pattern.uid || pattern.supabaseUid || pattern.firebaseUid) return "identity";
  if (pattern.email) return "email";

  const message = String(error?.message || "");
  if (/index:\s*username_/i.test(message) || /dup key:\s*\{\s*username:/i.test(message)) {
    return "username";
  }
  if (/index:\s*(uid|supabaseUid|firebaseUid)_/i.test(message)) return "identity";
  if (/index:\s*email_/i.test(message) || /dup key:\s*\{\s*email:/i.test(message)) {
    return "email";
  }
  return "unknown";
};

/**
 * `created` must mean this sign-in created the account.
 * A parallel request can insert the row first; the loser then sees a duplicate
 * key and must still report created when that row is brand new.
 * An account that was already there at the start of the request stays created:false.
 */
export const shouldReportCreated = ({
  foundBefore,
  inserted,
  recoveredCreatedAt,
  now = Date.now(),
  freshMs = FRESH_ACCOUNT_MS,
}) => {
  if (inserted) return true;
  if (foundBefore) return false;
  if (!recoveredCreatedAt) return false;
  const createdAtMs = new Date(recoveredCreatedAt).getTime();
  if (!Number.isFinite(createdAtMs)) return false;
  const age = now - createdAtMs;
  return age >= 0 && age < freshMs;
};
