import express from "express";
import multer from "multer";
import {
  createEntry,
  deleteEntry,
  getEntrys,
  updateEntry,
  likeEntry,
  commentEntry,
  handleFileUpload,
} from "../controllers/entry.controller.js";
import { verifyIdToken } from "../middleware/auth.js"; //
const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/", getEntrys);
router.post("/", createEntry);
router.post(
  "/:id",
  verifyIdToken,
  updateEntry,
  upload.single("image"),
  handleFileUpload
);
router.delete("/:id", deleteEntry);
router.post("/:id/like", likeEntry);
router.post("/:id/comment", commentEntry);

router.post(
  "/:id",
  verifyIdToken,
  upload.single("image"),
  handleFileUpload,
  async (req, res) => {
    console.log("Request received");
    // console.log("req.body", req.body);
    const imageUrl = req.imageUrl; // Get the image URL from handleFileUpload
    const { pid, name, description, image } = req.body; // Extract fields directly from req.body
    const { uid } = req.user;

    if (!name && !description) {
      console.log("Missing fields:", { name, description });
      return res.status(400).json({ error: "Missing required fields" });
    }
    await new Promise((resolve, reject) => {
      uploadMiddleware(req, res, (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    try {
      let postImageUrl = null;

      if (image) {
        const base64Data = image.split(";base64,").pop();
        const imageBuffer = Buffer.from(base64Data, "base64");
        const timestamp = Date.now();
        const filePath = `images/image_${uid}_${timestamp}.jpg`;

        const { data: file, error } = await supabase.storage
          .from("post_images")
          .upload(filePath, imageBuffer, {
            contentType: "image/jpeg",
            cacheControl: "3600",
            upsert: true,
          });

        if (error) {
          console.error("Supabase upload error details:", error);
          return res.status(500).json({
            error: "Failed to upload image",
            details: error.message,
          });
        }

        postImageUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/post_images/${filePath}`;
        // console.log("Generated URL:", postImageUrl);
      }
      // console.log("post URL", entryData.postImageUrl);
      // Update the entry in the database
      const entryData = await Entry.findByIdAndUpdate(
        pid,
        {
          name,
          description,
          ...(postImageUrl && { image: postImageUrl }), // Only update image if it exists
        },
        { new: true }
      );

      res.status(200).json({ success: true, data: entryData });
    } catch (error) {
      console.error("Error in updating entry:", error.message);
      res.status(500).json({ success: false, message: "Server Error" });
    }
  }
);

export default router;
