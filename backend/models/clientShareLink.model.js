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

const ClientShareLink = mongoose.model("ClientShareLink", clientShareLinkSchema);

export default ClientShareLink;
