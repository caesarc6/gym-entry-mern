/** Local device backup while editing an already-saved workout post (Entry edit modal). */
export const EDIT_ENTRY_DRAFT_VERSION = 1;

/** Drop very old drafts so storage does not grow forever. */
export const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function editEntryDraftKey(uid, entryId) {
  return `draft:editEntry:v${EDIT_ENTRY_DRAFT_VERSION}:${uid || "anon"}:${entryId}`;
}

export function writeEditEntryDraft(uid, entryId, fields) {
  const payload = {
    version: EDIT_ENTRY_DRAFT_VERSION,
    lastLocalSaveAt: new Date().toISOString(),
    name: fields.name ?? "",
    description: fields.description ?? "",
    image: fields.image ?? "",
    imageName: fields.imageName ?? "",
  };
  localStorage.setItem(editEntryDraftKey(uid, entryId), JSON.stringify(payload));
}

export function readEditEntryDraft(uid, entryId) {
  try {
    const key = editEntryDraftKey(uid, entryId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== EDIT_ENTRY_DRAFT_VERSION) return null;
    if (parsed.lastLocalSaveAt) {
      const age = Date.now() - new Date(parsed.lastLocalSaveAt).getTime();
      if (!Number.isFinite(age) || age > DRAFT_MAX_AGE_MS) {
        localStorage.removeItem(key);
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearEditEntryDraft(uid, entryId) {
  try {
    localStorage.removeItem(editEntryDraftKey(uid, entryId));
  } catch {
    // ignore
  }
}
