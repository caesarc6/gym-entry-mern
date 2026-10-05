import { User, FollowRequest } from "../models/user.model.js";
import Entry from "../models/entry.model.js";
import { Report, SUPPORT_EMAIL } from "../models/report.model.js";
import { sanitizeTextInput } from "../utils/sanitizeInput.js";

const findUserByAnyUid = (uid) =>
  User.findOne({
    $or: [{ uid }, { firebaseUid: uid }, { supabaseUid: uid }],
  });

const linkedUidStrings = (userDoc) => {
  if (!userDoc) return [];
  return [userDoc.uid, userDoc.firebaseUid, userDoc.supabaseUid].filter(Boolean);
};

const refIdEquals = (ref, otherId) => {
  if (ref == null || otherId == null) return false;
  try {
    const rid = ref._id != null ? ref._id : ref;
    if (rid && typeof rid.equals === "function") return rid.equals(otherId);
    return String(rid) === String(otherId);
  } catch {
    return false;
  }
};

const withoutRef = (list, otherId) =>
  (list || []).filter((ref) => !refIdEquals(ref, otherId));

export const createReport = async (req, res) => {
  try {
    const reporterUid = String(req.user?.uid || "").trim();
    if (!reporterUid) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: User information not found",
      });
    }

    const targetType = req.body?.targetType === "comment" ? "comment" : "workout";
    const entryId = String(req.body?.entryId || "").trim();
    const commentId = String(req.body?.commentId || "").trim() || null;
    const replyId = String(req.body?.replyId || "").trim() || null;
    const note = sanitizeTextInput(req.body?.note || "");

    if (!entryId) {
      return res.status(400).json({
        success: false,
        message: "A workout is required",
      });
    }
    if (targetType === "comment" && !commentId && !replyId) {
      return res.status(400).json({
        success: false,
        message: "A comment is required",
      });
    }

    const entry = await Entry.findById(entryId).select("uid comments").lean();
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Workout not found",
      });
    }

    let targetUid = entry.uid || null;
    if (targetType === "comment") {
      const comment = (entry.comments || []).find(
        (item) => String(item._id) === commentId,
      );
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: "Comment not found",
        });
      }
      if (replyId) {
        const reply = (comment.replies || []).find(
          (item) => String(item._id) === replyId,
        );
        if (!reply) {
          return res.status(404).json({
            success: false,
            message: "Comment not found",
          });
        }
        targetUid = reply.uid || targetUid;
      } else {
        targetUid = comment.uid || targetUid;
      }
    }

    await Report.create({
      reporterUid,
      targetType,
      entryId,
      commentId,
      replyId,
      targetUid,
      note,
      supportEmail: SUPPORT_EMAIL,
    });

    return res.status(201).json({
      success: true,
      message: `Report received. We'll review it at ${SUPPORT_EMAIL}.`,
      data: { supportEmail: SUPPORT_EMAIL },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Could not send report",
    });
  }
};

export const blockUser = async (req, res) => {
  try {
    const me = await findUserByAnyUid(req.user?.uid);
    const them = await findUserByAnyUid(req.params.userId);
    if (!me || !them) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (me._id.equals(them._id)) {
      return res.status(400).json({
        success: false,
        message: "You can't block yourself",
      });
    }

    const ids = linkedUidStrings(them);
    me.blockedUids = [...new Set([...(me.blockedUids || []), ...ids])];
    me.following = withoutRef(me.following, them._id);
    me.followers = withoutRef(me.followers, them._id);
    them.following = withoutRef(them.following, me._id);
    them.followers = withoutRef(them.followers, me._id);

    await FollowRequest.deleteMany({
      $or: [
        { requester: me._id, recipient: them._id },
        { requester: them._id, recipient: me._id },
      ],
    });
    await me.save();
    await them.save();

    return res.status(200).json({ success: true, blocked: true });
  } catch {
    return res.status(500).json({ success: false, message: "Could not block" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const me = await findUserByAnyUid(req.user?.uid);
    const them = await findUserByAnyUid(req.params.userId);
    if (!me || !them) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const remove = new Set(linkedUidStrings(them));
    me.blockedUids = (me.blockedUids || []).filter((id) => !remove.has(id));
    await me.save();

    return res.status(200).json({ success: true, blocked: false });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Could not unblock",
    });
  }
};
