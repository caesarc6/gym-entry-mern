import mongoose from "mongoose";

const clientShareLinkSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    creatorUid: { type: String, required: true },
    clientName: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

clientShareLinkSchema.index({ creatorUid: 1, expiresAt: -1 });
// Auto-remove expired claim tokens.
clientShareLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ClientShareLink = mongoose.model("ClientShareLink", clientShareLinkSchema);

export default ClientShareLink;
