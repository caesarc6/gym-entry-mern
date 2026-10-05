import mongoose from "mongoose";
import { sanitizeTextInput } from "../utils/sanitizeInput.js";

const SUPPORT_EMAIL = "support@etherealgains.com";

const reportSchema = new mongoose.Schema(
  {
    reporterUid: { type: String, required: true },
    targetType: {
      type: String,
      enum: ["workout", "comment"],
      required: true,
    },
    entryId: { type: String, required: true },
    commentId: { type: String, default: null },
    replyId: { type: String, default: null },
    targetUid: { type: String, default: null },
    note: { type: String, default: "", set: sanitizeTextInput },
    supportEmail: { type: String, default: SUPPORT_EMAIL },
  },
  { timestamps: true },
);

const Report = mongoose.model("Report", reportSchema);

export { Report, SUPPORT_EMAIL };
