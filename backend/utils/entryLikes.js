import mongoose from "mongoose";
import { User } from "../models/user.model.js";

const OID_HEX = /^[a-fA-F0-9]{24}$/;

/**
 * Entry.likes is supposed to be ObjectId[] but legacy/bad data can include
 * numbers (e.g. 0) or non-arrays. Mongoose populate() then throws CastError.
 */
export function coerceEntryLikeIds(likesRaw) {
  if (likesRaw == null) return [];
  const arr = Array.isArray(likesRaw) ? likesRaw : [likesRaw];
  const out = [];
  for (const id of arr) {
    if (id == null) continue;
    const s =
      id instanceof mongoose.Types.ObjectId
        ? id.toString()
        : typeof id === "string" && OID_HEX.test(id)
          ? id
          : null;
    if (!s) continue;
    out.push(s);
  }
  return out;
}

/** Mutates each entry's `likes` into populated user subdocs (lean), order preserved. */
export async function attachPopulatedLikesToEntries(
  entries,
  select = "uid name username picture",
) {
  if (!entries?.length) return;
  const orderedIdsPerPost = entries.map((e) => coerceEntryLikeIds(e.likes));
  const unique = [...new Set(orderedIdsPerPost.flat())];
  if (unique.length === 0) {
    entries.forEach((e) => {
      e.likes = [];
    });
    return;
  }
  const oids = unique.map((s) => new mongoose.Types.ObjectId(s));
  const users = await User.find({ _id: { $in: oids } }).select(select).lean();
  const byId = new Map(users.map((u) => [u._id.toString(), u]));
  for (let i = 0; i < entries.length; i++) {
    const ids = orderedIdsPerPost[i];
    entries[i].likes = ids.map((sid) => byId.get(sid)).filter(Boolean);
  }
}
