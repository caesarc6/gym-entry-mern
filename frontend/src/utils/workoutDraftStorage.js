/** Local device backup while editing an already-saved workout post (Entry edit modal). */
export const EDIT_ENTRY_DRAFT_VERSION = 2;

/** Drop very old drafts so storage does not grow forever. */
export const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const IDB_NAME = "gym-entry-edit-drafts";
const IDB_STORE = "photos";
const IDB_VERSION = 1;

const LEGACY_DEFAULT_POST_IMAGE =
  "https://coffective.com/wp-content/uploads/2018/06/default-featured-image.png.jpg";

export function editEntryDraftKey(uid, entryId) {
  return `draft:editEntry:v1:${uid || "anon"}:${entryId}`;
}

export function editEntryPhotoIdbKey(uid, entryId) {
  return `editEntryPhoto:v1:${uid || "anon"}:${entryId}`;
}

const isInlineImage = (value) =>
  typeof value === "string" && value.startsWith("data:");

/** Treat empty / theme-default / legacy placeholder strings as “no photo”. */
export function isEditDraftPlaceholderImage(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") return true;
  if (imageUrl === LEGACY_DEFAULT_POST_IMAGE) return true;
  if (
    imageUrl.includes("data:image/svg+xml") &&
    (imageUrl.includes("No Image") || imageUrl.includes("%3ENo Image%3C"))
  ) {
    return true;
  }
  return false;
}

export function normalizeEditDraftImage(imageUrl) {
  if (isEditDraftPlaceholderImage(imageUrl)) return "";
  return imageUrl;
}

/**
 * Compare draft vs published without getting stuck on placeholder URL quirks
 * or leftover imageName when both sides have no real photo.
 */
export function editDraftMatchesPublished(draft, published) {
  const draftName = typeof draft?.name === "string" ? draft.name : "";
  const draftDesc =
    typeof draft?.description === "string" ? draft.description : "";
  const pubName = typeof published?.name === "string" ? published.name : "";
  const pubDesc =
    typeof published?.description === "string" ? published.description : "";

  if (draftName !== pubName || draftDesc !== pubDesc) return false;

  const draftClear = Boolean(draft?.clearImage);
  const pubImage = normalizeEditDraftImage(published?.image);
  const draftImage = normalizeEditDraftImage(draft?.image);

  if (draftClear) {
    // Clearing when the published post already has no photo is a no-op.
    return !pubImage;
  }

  return draftImage === pubImage;
}

function openDraftIdb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onerror = () => reject(request.error || new Error("idb open failed"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function idbReq(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("idb request failed"));
  });
}

async function putDraftPhotoBlob(key, blob) {
  const db = await openDraftIdb();
  try {
    const tx = db.transaction(IDB_STORE, "readwrite");
    await idbReq(tx.objectStore(IDB_STORE).put(blob, key));
  } finally {
    db.close();
  }
}

async function getDraftPhotoBlob(key) {
  const db = await openDraftIdb();
  try {
    const tx = db.transaction(IDB_STORE, "readonly");
    return await idbReq(tx.objectStore(IDB_STORE).get(key));
  } finally {
    db.close();
  }
}

async function deleteDraftPhotoBlob(key) {
  try {
    const db = await openDraftIdb();
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      await idbReq(tx.objectStore(IDB_STORE).delete(key));
    } finally {
      db.close();
    }
  } catch {
    // ignore
  }
}

function dataUrlToBlob(dataUrl) {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const header = dataUrl.slice(0, comma);
  const data = dataUrl.slice(comma + 1);
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch?.[1] || "application/octet-stream";
  const isBase64 = /;base64/i.test(header);
  try {
    if (isBase64) {
      const binary = atob(data);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i += 1) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    }
    return new Blob([decodeURIComponent(data)], { type: mime });
  } catch {
    return null;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Persist text (+ durable photo ref) for crash recovery.
 * Inline data: URLs go to IndexedDB when possible; localStorage keeps a key + remote URLs only.
 */
export async function writeEditEntryDraft(uid, entryId, fields) {
  const key = editEntryDraftKey(uid, entryId);
  const photoKey = editEntryPhotoIdbKey(uid, entryId);
  const image = fields.image ?? "";
  const inlineImage = isInlineImage(image);
  const clearImage = Boolean(fields.clearImage);

  let storedImage = "";
  let storedImageName = "";
  let hasPhotoBlob = false;

  if (clearImage) {
    await deleteDraftPhotoBlob(photoKey);
  } else if (inlineImage) {
    const blob = dataUrlToBlob(image);
    if (blob) {
      try {
        await putDraftPhotoBlob(photoKey, blob);
        hasPhotoBlob = true;
        storedImageName = fields.imageName ?? "";
      } catch {
        await deleteDraftPhotoBlob(photoKey);
        hasPhotoBlob = false;
      }
    }
  } else {
    await deleteDraftPhotoBlob(photoKey);
    const normalized = normalizeEditDraftImage(image);
    storedImage = normalized;
    storedImageName = normalized ? fields.imageName ?? "" : "";
  }

  const base = {
    version: EDIT_ENTRY_DRAFT_VERSION,
    lastLocalSaveAt: new Date().toISOString(),
    name: fields.name ?? "",
    description: fields.description ?? "",
    image: storedImage,
    imageName: storedImageName,
    clearImage,
    hasPhotoBlob,
  };

  try {
    localStorage.setItem(key, JSON.stringify(base));
    return true;
  } catch {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          ...base,
          image: "",
          imageName: hasPhotoBlob ? storedImageName : "",
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
}

export async function readEditEntryDraft(uid, entryId) {
  try {
    const key = editEntryDraftKey(uid, entryId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      (parsed.version !== EDIT_ENTRY_DRAFT_VERSION &&
        parsed.version !== 1)
    ) {
      return null;
    }
    if (parsed.lastLocalSaveAt) {
      const age = Date.now() - new Date(parsed.lastLocalSaveAt).getTime();
      if (!Number.isFinite(age) || age > DRAFT_MAX_AGE_MS) {
        await clearEditEntryDraft(uid, entryId);
        return null;
      }
    }

    const draft = {
      version: parsed.version,
      lastLocalSaveAt: parsed.lastLocalSaveAt,
      name: typeof parsed.name === "string" ? parsed.name : "",
      description: typeof parsed.description === "string" ? parsed.description : "",
      image: typeof parsed.image === "string" ? parsed.image : "",
      imageName: typeof parsed.imageName === "string" ? parsed.imageName : "",
      clearImage: Boolean(parsed.clearImage),
      hasPhotoBlob: Boolean(parsed.hasPhotoBlob),
    };

    if (draft.clearImage) {
      draft.image = "";
      draft.imageName = "";
      return draft;
    }

    if (draft.hasPhotoBlob) {
      try {
        const blob = await getDraftPhotoBlob(editEntryPhotoIdbKey(uid, entryId));
        if (blob instanceof Blob) {
          draft.image = await blobToDataUrl(blob);
        } else {
          draft.hasPhotoBlob = false;
        }
      } catch {
        draft.hasPhotoBlob = false;
      }
    }

    draft.image = normalizeEditDraftImage(draft.image);
    if (!draft.image) draft.imageName = "";
    return draft;
  } catch {
    return null;
  }
}

export async function clearEditEntryDraft(uid, entryId) {
  try {
    localStorage.removeItem(editEntryDraftKey(uid, entryId));
  } catch {
    // ignore
  }
  await deleteDraftPhotoBlob(editEntryPhotoIdbKey(uid, entryId));
}
