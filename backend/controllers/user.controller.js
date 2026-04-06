import { User, Post, Comment, FollowRequest } from "../models/user.model.js";
import Entry from "../models/entry.model.js";
import { supabase, supabaseAdmin } from "../supabase/supabase.js";
import { admin } from "../firebase.js";
import multer from "multer";
import path from "path";
import mongoose from "mongoose";
import {
  filterEntriesForPublicView,
  filterUserDataForPublicView,
} from "../utils/userUtils.js";
import { generateSafeFilePath } from "../utils/fileUtils.js";
import WorkoutAssignment from "../models/workoutAssignment.model.js";

const buildUidQuery = (uid) => ({
  $or: [{ uid }, { firebaseUid: uid }, { supabaseUid: uid }],
});

const findUserByAnyUid = (uid, select) => {
  const query = User.findOne(buildUidQuery(uid));
  return select ? query.select(select) : query;
};

const PROFILE_IMAGE_SELECT = "picture name username email";

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findUserByEmailCaseInsensitive = (email, select = PROFILE_IMAGE_SELECT) => {
  const trimmed = String(email || "").trim();
  if (!trimmed) return null;
  let q = User.findOne({
    email: new RegExp(`^${escapeRegex(trimmed)}$`, "i"),
  });
  if (select != null) q = q.select(select);
  return q;
};

/**
 * When the client passes a Supabase UUID but Mongo still only has the legacy
 * Firebase-backed row (supabaseUid not set yet), resolve via Auth API + email.
 */
const resolveMongoUserByAuthUid = async (uid) => {
  if (!uid || typeof uid !== "string") return null;
  const trimmed = uid.trim();
  if (!trimmed) return null;

  let user = await User.findOne(buildUidQuery(trimmed));
  if (user) return user;

  try {
    const fbUser = await admin.auth().getUser(trimmed);
    if (fbUser?.email) {
      user = await findUserByEmailCaseInsensitive(fbUser.email, null);
      if (user) return user;
    }
  } catch {
    // Not a Firebase Auth uid or user deleted from Auth
  }

  if (supabaseAdmin) {
    try {
      const { data, error } =
        await supabaseAdmin.auth.admin.getUserById(trimmed);
      const email = data?.user?.email;
      if (!error && email) {
        user = await findUserByEmailCaseInsensitive(email, null);
        if (user) return user;
      }
    } catch {
      // Invalid id for Supabase or admin unavailable
    }
  }

  return null;
};

/** All string ids that can refer to the same Mongo user (Firebase ↔ Supabase migration). */
const linkedUidStrings = (userDoc) => {
  if (!userDoc) return [];
  return [userDoc.uid, userDoc.firebaseUid, userDoc.supabaseUid].filter(Boolean);
};

const accountsMatch = (a, b) => {
  if (!a || !b) return false;
  const ua = linkedUidStrings(a);
  const ub = linkedUidStrings(b);
  return ua.some((id) => ub.includes(id));
};

// Multer configuration
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB file size limit
    fieldSize: 20 * 1024 * 1024, // 20MB field size limit
  },
});

// Middleware to handle file upload errors
export const handleFileUpload = (req, res, next) => {

  upload.single("profileImage")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: "File too large. Please upload a smaller image (max 20MB).",
        });
      }
    } else if (err) {
      return res.status(400).json({
        error: err.message,
      });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    next();
  });
};

// Middleware to handle optional file uploads (for profile updates)
export const handleOptionalFileUpload = (req, res, next) => {
  upload.single("profileImage")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: "File too large. Please upload a smaller image (max 20MB).",
        });
      }
    } else if (err) {
      return res.status(400).json({
        error: err.message,
      });
    }
    // Allow the request to proceed even if no file is uploaded
    next();
  });
};

// Update user privacy settings
export const updateUserPrivacy = async (req, res) => {
  try {
    const { isPrivate, showEntries } = req.body;

    // Validate input
    if (isPrivate === undefined && showEntries === undefined) {
      return res.status(400).json({ message: "No privacy settings provided" });
    }

    // Update only the provided fields
    const updateFields = {};
    if (isPrivate !== undefined) updateFields["privacy.isPrivate"] = isPrivate;
    if (showEntries !== undefined)
      updateFields["privacy.showEntries"] = showEntries;

    const updatedUser = await User.findOneAndUpdate(
      { uid: req.user.uid },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // If profile is being changed from private to public, auto-approve pending follow requests
    if (isPrivate === false) {
      // Find all pending follow requests for this user
      const pendingRequests = await FollowRequest.find({
        recipient: updatedUser._id,
        status: "pending",
      }).populate("requester", "uid name username picture");

      const autoApprovedRequests = [];

      if (pendingRequests.length > 0) {
        // Auto-approve all pending requests
        for (const request of pendingRequests) {
          const requester = await User.findById(request.requester._id);

          if (requester) {
            // Add to followers/following
            if (!updatedUser.followers.includes(requester._id)) {
              updatedUser.followers.push(requester._id);
            }
            if (!requester.following.includes(updatedUser._id)) {
              requester.following.push(updatedUser._id);
            }

            // Update the follow request status
            request.status = "approved";
            await request.save();
            await requester.save();

            autoApprovedRequests.push({
              requesterId: requester.uid,
              requesterName: requester.name || requester.username,
              requestId: request._id,
            });
          }
        }

        // Save the updated user with new followers
        await updatedUser.save();
      }

      return res.status(200).json({
        message: "Privacy settings updated successfully",
        privacy: updatedUser.privacy,
        autoApprovedRequests: autoApprovedRequests.length,
        autoApprovedDetails: autoApprovedRequests,
      });
    }

    return res.status(200).json({
      message: "Privacy settings updated successfully",
      privacy: updatedUser.privacy,
      autoApprovedRequests: 0,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Get batch profile images for multiple users (optimized for mobile)
export const getBatchProfileImages = async (req, res) => {
  try {
    // Check if req.user exists (should be set by verifyIdToken middleware)
    if (!req.user || !req.user.uid) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: User information not found",
      });
    }

    const { uids } = req.body;

    if (!uids || !Array.isArray(uids) || uids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No UIDs provided",
      });
    }

    // Check database connection and wait if connecting
    const dbState = mongoose.connection.readyState;
    if (dbState === 0) {
      // Disconnected - try to reconnect
      const { connectDB } = await import("../config/db.js");
      try {
        await connectDB();
      } catch (reconnectError) {
        return res.status(500).json({
          success: false,
          message: "Database connection error",
        });
      }
    } else if (dbState === 2) {
      // Connecting - wait a bit for connection to establish
      let waitTime = 0;
      const maxWait = 5000; // 5 seconds max wait
      while (mongoose.connection.readyState === 2 && waitTime < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        waitTime += 100;
      }
      if (mongoose.connection.readyState !== 1) {
        return res.status(500).json({
          success: false,
          message: "Database connection timeout",
        });
      }
    } else if (dbState !== 1) {
      return res.status(500).json({
        success: false,
        message: "Database connection error",
      });
    }

    const limitedUids = [...new Set(uids.slice(0, 20).filter(Boolean))];

    const users = await User.find(
      {
        $or: [
          { uid: { $in: limitedUids } },
          { firebaseUid: { $in: limitedUids } },
          { supabaseUid: { $in: limitedUids } },
        ],
      },
      { uid: 1, firebaseUid: 1, supabaseUid: 1, name: 1, username: 1, picture: 1 }
    );

    const variantToUser = new Map();
    for (const u of users) {
      for (const v of linkedUidStrings(u)) {
        variantToUser.set(v, u);
      }
    }

    const profileData = limitedUids
      .map((requestedUid) => {
        const user = variantToUser.get(requestedUid);
        if (!user) return null;
        return {
          uid: requestedUid,
          profileImage: user.picture,
          displayName: user.username || user.name || "Unknown User",
          isUsername: !!user.username,
        };
      })
      .filter(Boolean);

    res.status(200).json({
      success: true,
      data: profileData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Public profile snippet for avatars. Resolves legacy Firebase UIDs even when
 * Mongo only has matching email (firebaseUid not backfilled).
 */
export const getProfileImageByUid = async (req, res) => {
  try {
    const raw = req.params.uid;
    const uid = typeof raw === "string" ? raw.trim() : "";
    if (!uid) {
      return res.status(400).json({ success: false, message: "Missing uid" });
    }

    let user = await resolveMongoUserByAuthUid(uid);

    if (!user) {
      const entry = await Entry.findOne({
        $or: [{ uid }, { trainerUid: uid }],
      })
        .select("uid trainerUid")
        .lean();
      if (entry) {
        const pool = [
          ...new Set([uid, entry.uid, entry.trainerUid].filter(Boolean)),
        ];
        for (const id of pool) {
          user = await findUserByAnyUid(id).select(PROFILE_IMAGE_SELECT);
          if (user) break;
        }
      }
    }

    if (!user) {
      return res.status(200).json({
        success: true,
        data: {
          picture: null,
          name: "Unknown User",
          username: null,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        picture: user.picture || null,
        name: user.name || "Unknown User",
        username: user.username || null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user profile image",
    });
  }
};

// Get user profile by username (for public viewing)
export const getUserProfileByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    let viewerUser = null;
    if (req.user && req.user.uid) {
      viewerUser = await findUserByAnyUid(req.user.uid);
    }
    const user = await User.findOne({ username }).populate(
      "followers following"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { filterUserDataForPublicView, filterEntriesForPublicView } =
      await import("../utils/userUtils.js");
    const filteredUserData = filterUserDataForPublicView(user, viewerUser);

    // Fetch all entries and let filterEntriesForPublicView handle restrictions
    const entries = await Entry.find({ uid: user.uid });
    const filteredEntries = filterEntriesForPublicView(
      entries,
      user,
      viewerUser
    );

    return res.set("Cache-Control", "no-store").status(200).json({
      user: filteredUserData,
      entries: filteredEntries,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Check if a user is following another user
export const checkFollowing = async (req, res) => {
  try {
    const { targetUserId } = req.params;

    const user = await findUserByAnyUid(req.user.uid);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFollowing = user.following.some(
      (id) => id.toString() === targetUserId
    );

    return res.status(200).json({ isFollowing });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Existing controller functions (abridged for brevity)
export const getCurrentMongoDBUser = async (req, res) => {
  try {
    // Check if req.user exists (should be set by verifyIdToken middleware)
    if (!req.user || !req.user.uid) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: User information not found",
      });
    }

    const { uid } = req.user;

    // Check database connection and wait if connecting
    const dbState = mongoose.connection.readyState;
    if (dbState === 0) {
      // Disconnected - try to reconnect
      const { connectDB } = await import("../config/db.js");
      try {
        await connectDB();
      } catch (reconnectError) {
        return res.status(500).json({
          success: false,
          message: "Database connection error",
        });
      }
    } else if (dbState === 2) {
      // Connecting - wait a bit for connection to establish
      let waitTime = 0;
      const maxWait = 5000; // 5 seconds max wait
      while (mongoose.connection.readyState === 2 && waitTime < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        waitTime += 100;
      }
      if (mongoose.connection.readyState !== 1) {
        return res.status(500).json({
          success: false,
          message: "Database connection timeout",
        });
      }
    } else if (dbState !== 1) {
      return res.status(500).json({
        success: false,
        message: "Database connection error",
      });
    }

    const user = await findUserByAnyUid(uid);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { uid } = req.user;

    const {
      name,
      username,
      goal,
      gymName,
      bio,
      profileImageName,
      profileImage,
    } = req.body;

    if (!name && !username && !goal && !gymName && !bio && !profileImage) {
      return res.status(400).json({
        success: false,
        message: "No data provided for update",
      });
    }

    let profileImageUrl = null;
    if (profileImageName && profileImageName !== "undefined") {
      try {
        const base64Data = profileImage.split(";base64,").pop();
        const imageBuffer = Buffer.from(base64Data, "base64");
        const filePath = generateSafeFilePath(
          uid,
          profileImageName,
          "profiles"
        );

        const { error } = await supabase.storage
          .from("user_profiles")
          .upload(filePath, imageBuffer, {
            contentType: "image/jpeg",
            cacheControl: "3600",
            upsert: true,
          });

        if (error) {
          return res.status(500).json({
            error: "Failed to upload image",
            details: error.message,
          });
        }

        profileImageUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/user_profiles/${filePath}`;
        await User.findOneAndUpdate(
          { uid: uid.trim() },
          { $set: { picture: profileImageUrl } },
          { new: true }
        );
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload image",
          details: error.message,
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (username) updateData.username = username;
    if (goal) updateData.goal = goal;
    if (gymName) updateData.gymName = gymName;
    if (bio) updateData.bio = bio;

    const user = await User.findOneAndUpdate(
      { uid },
      { $set: updateData },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
};

export const createUser = async (req, res) => {
  const { uid, name, email, picture } = req.user;

  try {
    let user = await findUserByAnyUid(uid);
    let claimedWorkouts = [];
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      // Generate username from name: remove spaces and convert to lowercase
      const generatedUsername = name
        ? name.replace(/\s+/g, "").toLowerCase()
        : `user${Date.now()}`;

      user = new User({
        uid,
        name,
        email,
        picture,
        username: generatedUsername,
      });
      await user.save();

      // Automatically claim any pending workouts assigned to this name or email
      const normalizedName = name ? name.trim().toLowerCase() : null;
      const normalizedEmail = email ? email.trim().toLowerCase() : null;

      // Build query to find assignments by name or email
      const query = {
        isRegisteredUser: false, // Only claim name-only assignments
        assignedToUid: null,
        $or: [],
      };

      if (normalizedName) {
        query.$or.push({ assignedToName: normalizedName });
      }
      if (normalizedEmail) {
        query.$or.push({ assignedToEmail: normalizedEmail });
      }

      if (query.$or.length > 0) {
        try {
          // Find all pending assignments that match
          const pendingAssignments = await WorkoutAssignment.find(query);

          if (pendingAssignments.length > 0) {
            // Update all matching assignments to link them to the user
            const updatePromises = pendingAssignments.map((assignment) =>
              WorkoutAssignment.findByIdAndUpdate(
                assignment._id,
                {
                  assignedToUid: uid,
                  isRegisteredUser: true,
                  assignedToEmail:
                    normalizedEmail || assignment.assignedToEmail,
                },
                { new: true }
              ).populate("sharedWorkoutId")
            );

            claimedWorkouts = await Promise.all(updatePromises);
          }
        } catch (claimError) {
          // Don't fail user creation if claiming workouts fails
        }
      }
    }

    res.status(201).json({
      user,
      claimedWorkouts: claimedWorkouts.length,
      workouts: claimedWorkouts,
      isNewUser,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" });
  }
};

export const createPost = async (req, res) => {

  const { name, description, image, imageName } = req.body;
  const { uid } = req.user;


  if (!name || !description) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all fields" });
  }

  try {
    const post = new Entry({ uid, name, description, image, imageName });

    await post.save();

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: "Failed to create post" });
  }
};

// user.controller.jsx

export const getPostsByUID = async (req, res) => {
  try {
    // Handle both uid and userId parameters
    const uid = req.params.uid || req.params.userId;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Get requester's UID from Firebase token
    const requesterUid = req.user.uid; // Set by verifyIdToken middleware
    let user = await resolveMongoUserByAuthUid(uid);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if profile is private and requester is a follower
    const requesterUser = await resolveMongoUserByAuthUid(requesterUid);
    const isFollower =
      requesterUser &&
      user.followers.some((followerId) => followerId.equals(requesterUser._id));
    const requesterIsOwner =
      requesterUser && user._id.equals(requesterUser._id);
    const isPrivate = user.privacy?.isPrivate === true;
    const targetUids = [user.uid, user.firebaseUid, user.supabaseUid].filter(
      Boolean
    );
    if (isPrivate && !isFollower && !requesterIsOwner) {
      return res.status(403).json({
        success: false,
        message:
          "Private profile: You must follow this user to see their posts",
      });
    }

    const posts = await Entry.find({ uid: { $in: targetUids } })
      .populate("likes", "uid name username picture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalPosts = await Entry.countDocuments({ uid: { $in: targetUids } });
    const totalPages = Math.ceil(totalPosts / limit);

    const normalizedPosts = posts.map((post) => ({
      _id: post._id.toString(),
      uid: post.uid,
      name: post.name || "Untitled",
      description: post.description || "No description",
      image: post.image || null,
      likes: (post.likes || []).map((user) => ({
        _id: user._id,
        uid: user.uid,
        name: user.name,
        username: user.username,
        picture: user.picture,
      })),
      comments: post.comments || [],
      createdAt: post.createdAt || new Date().toISOString(),
      trainerUid: post.trainerUid || null,
      trainerName: post.trainerName || null,
      trainerUsername: post.trainerUsername || null,
    }));

    res.status(200).json({
      success: true,
      data: normalizedPosts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPosts,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const isFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserUid = req.user.uid;

    const currentUser = await findUserByAnyUid(currentUserUid);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "Current user not found",
      });
    }

    const targetUser = await findUserByAnyUid(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Target user not found",
      });
    }

    const isFollowing = targetUser.followers.includes(currentUser._id);

    res.status(200).json({
      success: true,
      isFollowing,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error checking follow status",
      error: error.message,
    });
  }
};

export const getCurrentUser = async (req, res) => {
  const { uid } = req.user;

  try {
    const user = await findUserByAnyUid(
      uid,
      "uid firebaseUid supabaseUid name email picture username"
    );
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve user" });
  }
};

export const getUser = async (req, res) => {
  const { uid } = req.params;

  try {
    const user = await findUserByAnyUid(
      uid,
      "uid firebaseUid supabaseUid name picture bio gymName goal followers following"
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({
      success: true,
      data: {
        uid: user.uid,
        name: user.name,
        profileImage: user.picture, // Map `picture` to `profileImage` for frontend compatibility
        bio: user.bio,
        gymName: user.gymName,
        goal: user.goal,
        followersCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve user" });
  }
};

export const searchUsers = async (req, res) => {
  const { query } = req.query;

  if (!query || query.trim() === "") {
    return res
      .status(400)
      .json({ success: false, message: "Search query is required" });
  }

  try {
    // Get the current user (viewer) for privacy filtering
    let viewerUser = null;
    if (req.user?.uid) {
      viewerUser = await findUserByAnyUid(req.user.uid);
    }

    // Find users matching the search query (only match from the beginning)
    const users = await User.find({
      $or: [
        { name: { $regex: `^${query}`, $options: "i" } },
        { username: { $regex: `^${query}`, $options: "i" } },
      ],
    })
      .populate("followers", "uid")
      .limit(10);

    // Apply privacy filtering to search results
    const filteredUsers = users.map((user) => {
      // Ensure privacy object exists
      const privacy = user.privacy || {
        isPrivate: false,
        showEntries: true,
        showEmail: false,
      };

      const viewerIdStr = viewerUser ? viewerUser._id.toString() : null;
      const isFollower =
        viewerUser &&
        user.followers &&
        user.followers.some((follower) => {
          const fid = follower._id
            ? follower._id.toString()
            : follower.toString();
          return viewerIdStr && fid === viewerIdStr;
        });

      const isOwner = viewerUser && accountsMatch(viewerUser, user);

      // For search results, always show basic info (name, username, picture)
      // but indicate if the profile is private
      const searchResult = {
        uid: user.uid,
        name: user.name || "User",
        username: user.username || user.name || "User",
        picture: user.picture,
        isPrivate: privacy.isPrivate,
        // Only show bio if profile is public or viewer is follower/owner
        bio: !privacy.isPrivate || isFollower || isOwner ? user.bio || "" : "",
        // Only show goal/gymName if profile is public or viewer is follower/owner
        goal:
          !privacy.isPrivate || isFollower || isOwner ? user.goal || "" : "",
        gymName:
          !privacy.isPrivate || isFollower || isOwner ? user.gymName || "" : "",
      };

      return searchResult;
    });

    res.status(200).json({ success: true, data: filteredUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to search users" });
  }
};

export const uploadBackgroundPicture = [
  handleFileUpload,
  async (req, res) => {

    try {
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        return res.status(500).json({ error: "Supabase connection failed" });
      }

      const user = req.user;
      const fileName = generateSafeFilePath(
        user.uid,
        req.file.originalname,
        "backgrounds"
      );
      const filePath = fileName;


      const { error } = await supabase.storage
        .from("user_backgrounds")
        .upload(filePath, req.file.buffer, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        return res.status(500).json({ error: "Failed to upload image" });
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("user_backgrounds").getPublicUrl(filePath);

      const updatedUser = await User.findOneAndUpdate(
        { uid: user.uid },
        { backgroundPicture: publicUrl },
        { new: true }
      );


      res.json({
        url: publicUrl,
        path: filePath,
        user: updatedUser,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
];

export const uploadProfilePic = [
  handleFileUpload,
  async (req, res) => {

    try {
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        return res.status(500).json({ error: "Supabase connection failed" });
      }

      const user = req.user;
      const fileName = generateSafeFilePath(
        user.uid,
        req.file.originalname,
        "profiles"
      );
      const filePath = fileName;


      const { error } = await supabase.storage
        .from("user_profiles")
        .upload(filePath, req.file.buffer, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        return res.status(500).json({ error: "Failed to upload image" });
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("user_profiles").getPublicUrl(filePath);

      const updatedUser = await User.findOneAndUpdate(
        { uid: user.uid },
        { picture: publicUrl },
        { new: true }
      );


      res.json({
        url: publicUrl,
        path: filePath,
        user: updatedUser,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
];

export const followUser = async (req, res) => {
  try {
    const { uid } = req.user;
    const userToFollow = await findUserByAnyUid(req.params.userId);
    const currentUser = await findUserByAnyUid(uid);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentUser._id.equals(userToFollow._id)) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    if (!currentUser.following.includes(userToFollow._id)) {
      currentUser.following.push(userToFollow._id);
      userToFollow.followers.push(currentUser._id);
      await currentUser.save();
      await userToFollow.save();
      return res.status(200).json({ message: "Followed successfully" });
    }

    return res.status(200).json({ message: "Already following" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    const { uid } = req.user;
    const userToUnfollow = await findUserByAnyUid(req.params.userId);
    const currentUser = await findUserByAnyUid(uid);

    if (!userToUnfollow || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentUser.following.includes(userToUnfollow._id)) {
      currentUser.following = currentUser.following.filter(
        (id) => !id.equals(userToUnfollow._id)
      );
      userToUnfollow.followers = userToUnfollow.followers.filter(
        (id) => !id.equals(currentUser._id)
      );
      await currentUser.save();
      await userToUnfollow.save();
      return res.status(200).json({ message: "Unfollowed successfully" });
    }

    return res.status(200).json({ message: "Not following" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    const user = await User.findById(req.body.userId);

    if (!post || !user) {
      return res.status(404).json({ message: "Post or user not found" });
    }

    if (!post.likes.includes(user._id)) {
      post.likes.push(user._id);
      await post.save();
    }
    res.status(200).json({ message: "Post liked" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const commentOnPost = async (req, res) => {
  try {
    const comment = new Comment({
      user: req.body.userId,
      post: req.params.postId,
      content: req.body.content,
    });
    await comment.save();
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// user.controller.jsx

export const getUserProfile = async (req, res) => {
  try {
    // Handle both uid and userId parameters
    const userId = req.params.uid || req.params.userId;

    let viewerUser = null;
    if (req.user?.uid) {
      viewerUser = await findUserByAnyUid(req.user.uid);
      if (!viewerUser) {
        viewerUser = await resolveMongoUserByAuthUid(req.user.uid);
      }
    }

    let user = await findUserByAnyUid(userId)
      .populate("followers", "username name picture")
      .populate("following", "username name picture");

    if (!user) {
      const resolved = await resolveMongoUserByAuthUid(userId);
      if (resolved) {
        user = await User.findById(resolved._id)
          .populate("followers", "username name picture")
          .populate("following", "username name picture");
      }
    }

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: `User with uid ${userId} not found` });
    }

    // Ensure privacy object exists
    user.privacy = user.privacy || {
      isPrivate: false,
      showEntries: true,
      showEmail: false,
    };

    // Check if the viewer is allowed to see posts
    const isFollower =
      viewerUser &&
      user.followers.some((follower) => follower._id.equals(viewerUser._id));
    const isOwner = viewerUser && accountsMatch(viewerUser, user);
    const canViewPosts =
      isOwner ||
      !user.privacy.isPrivate ||
      (user.privacy.isPrivate && isFollower);

    // Fetch posts only if allowed
    let posts = [];
    const targetUids = [user.uid, user.firebaseUid, user.supabaseUid].filter(
      Boolean
    );
    if (canViewPosts && user.privacy.showEntries) {
      posts = await Entry.find({ uid: { $in: targetUids } }).populate(
        "likes",
        "uid name username picture"
      );
    }

    // Get total posts count (unfiltered) for display purposes
    const totalPostsCount = await Entry.countDocuments({
      uid: { $in: targetUids },
    });

    const userData = filterUserDataForPublicView(user, viewerUser);
    const filteredPosts = filterEntriesForPublicView(posts, user, viewerUser);

    // Normalize posts to include ownerId
    const normalizedPosts = filteredPosts.map((post) => ({
      ownerId: userId, // Ensure ownerId is included
      _id: post._id.toString(),
      name: post.name || "Untitled",
      description: post.description || "No description",
      image: post.image || null,
      likes: (post.likes || []).map((user) => ({
        _id: user._id,
        uid: user.uid,
        name: user.name,
        username: user.username,
        picture: user.picture,
      })),
      comments: post.comments || [],
      createdAt: post.createdAt || new Date().toISOString(),
      trainerUid: post.trainerUid || null,
      trainerName: post.trainerName || null,
      trainerUsername: post.trainerUsername || null,
    }));

    const responseData = {
      success: true,
      viewerIsOwner: !!(viewerUser && accountsMatch(viewerUser, user)),
      data: {
        user: userData,
        posts: normalizedPosts,
        postsCount: totalPostsCount, // Use total posts count, not filtered count
        followersCount: user.followers ? user.followers.length : 0,
        followingCount: user.following ? user.following.length : 0,
      },
    };

    res.status(200).json(responseData);
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Send follow request
export const sendFollowRequest = async (req, res) => {
  try {
    const { uid } = req.user;
    const { userId } = req.params;


    const requester = await findUserByAnyUid(uid);
    const recipient = await findUserByAnyUid(userId);


    if (!requester || !recipient) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (requester._id.equals(recipient._id)) {
      return res.status(400).json({
        success: false,
        message: "Cannot send follow request to yourself",
      });
    }

    // Check if already following
    if (requester.following.includes(recipient._id)) {
      return res.status(400).json({
        success: false,
        message: "Already following this user",
      });
    }


    // Check if profile is private
    if (!recipient.privacy?.isPrivate) {
      // If public profile, follow directly
      requester.following.push(recipient._id);
      recipient.followers.push(requester._id);
      await requester.save();
      await recipient.save();

      return res.status(200).json({
        success: true,
        message: "Followed successfully",
        isFollowing: true,
      });
    }


    // Use findOneAndUpdate with upsert to handle existing requests properly
    const followRequest = await FollowRequest.findOneAndUpdate(
      {
        requester: requester._id,
        recipient: recipient._id,
      },
      {
        $setOnInsert: {
          requester: requester._id,
          recipient: recipient._id,
          createdAt: new Date(),
        },
        $set: {
          status: "pending",
          updatedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );


    // Check if this was an existing request that was updated
    if (
      followRequest.createdAt.getTime() !== followRequest.updatedAt.getTime()
    ) {
      return res.status(400).json({
        success: false,
        message: "Follow request already sent",
      });
    }

    res.status(200).json({
      success: true,
      message: "Follow request sent",
      isFollowing: false,
      hasRequest: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Accept follow request
export const acceptFollowRequest = async (req, res) => {
  try {
    const { uid } = req.user;
    const { requestId } = req.params;

    const user = await findUserByAnyUid(uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const followRequest = await FollowRequest.findById(requestId)
      .populate("requester", "uid name username picture")
      .populate("recipient", "uid name username picture");

    if (!followRequest) {
      return res.status(404).json({
        success: false,
        message: "Follow request not found",
      });
    }

    // Check if the current user is the recipient
    if (!followRequest.recipient._id.equals(user._id)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to accept this request",
      });
    }

    if (followRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Request is not pending",
      });
    }

    // Update request status
    followRequest.status = "approved";
    await followRequest.save();

    // Add to followers/following
    const requester = await User.findById(followRequest.requester._id);
    const recipient = await User.findById(followRequest.recipient._id);

    if (!requester.following.includes(recipient._id)) {
      requester.following.push(recipient._id);
    }
    if (!recipient.followers.includes(requester._id)) {
      recipient.followers.push(requester._id);
    }

    await requester.save();
    await recipient.save();

    res.status(200).json({
      success: true,
      message: "Follow request accepted",
      requester: {
        uid: requester.uid,
        name: requester.name,
        username: requester.username,
        picture: requester.picture,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Reject follow request
export const rejectFollowRequest = async (req, res) => {
  try {
    const { uid } = req.user;
    const { requestId } = req.params;

    const user = await findUserByAnyUid(uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const followRequest = await FollowRequest.findById(requestId).populate(
      "requester",
      "uid name username picture"
    );

    if (!followRequest) {
      return res.status(404).json({
        success: false,
        message: "Follow request not found",
      });
    }

    // Check if the current user is the recipient
    if (!followRequest.recipient.equals(user._id)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to reject this request",
      });
    }

    if (followRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Request is not pending",
      });
    }

    // Update request status
    followRequest.status = "rejected";
    await followRequest.save();

    res.status(200).json({
      success: true,
      message: "Follow request rejected",
      requester: {
        uid: followRequest.requester.uid,
        name: followRequest.requester.name,
        username: followRequest.requester.username,
        picture: followRequest.requester.picture,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get pending follow requests for a user
export const getPendingFollowRequests = async (req, res) => {
  try {
    const { uid } = req.user;
    const user = await findUserByAnyUid(uid);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const pendingRequests = await FollowRequest.find({
      recipient: user._id,
      status: "pending",
    }).populate("requester", "uid name username picture bio");

    res.status(200).json({
      success: true,
      data: pendingRequests.map((request) => ({
        _id: request._id,
        requester: request.requester,
        createdAt: request.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Check if user has sent a follow request
export const checkFollowRequestStatus = async (req, res) => {
  try {
    const { uid } = req.user;
    const { userId } = req.params;

    let requester = await findUserByAnyUid(uid);
    if (!requester) requester = await resolveMongoUserByAuthUid(uid);
    let recipient = await findUserByAnyUid(userId);
    if (!recipient) recipient = await resolveMongoUserByAuthUid(userId);

    if (!requester || !recipient) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already following
    const isFollowing = requester.following.includes(recipient._id);

    // Check for pending follow request
    const followRequest = await FollowRequest.findOne({
      requester: requester._id,
      recipient: recipient._id,
      status: "pending",
    });

    res.status(200).json({
      success: true,
      isFollowing,
      hasRequest: !!followRequest,
      requestId: followRequest?._id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const getFeedPosts = async (req, res) => {
  try {
    const { uids } = req.body;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    if (!uids || !Array.isArray(uids) || uids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No UIDs provided",
      });
    }

    const posts = await Entry.find({ uid: { $in: uids } })
      .populate("likes", "uid name username picture")
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(parseInt(limit));

    const totalPosts = await Entry.countDocuments({ uid: { $in: uids } });
    const totalPages = Math.ceil(totalPosts / limit);

    const normalizedPosts = posts.map((post) => ({
      ownerId: post.uid,
      _id: post._id.toString(),
      name: post.name || "Untitled",
      description: post.description || "No description",
      image: post.image || null,
      likes: (post.likes || []).map((user) => ({
        _id: user._id,
        uid: user.uid,
        name: user.name,
        username: user.username,
        picture: user.picture,
      })),
      comments: post.comments || [],
      createdAt: post.createdAt || new Date().toISOString(),
      trainerUid: post.trainerUid || null,
      trainerName: post.trainerName || null,
      trainerUsername: post.trainerUsername || null,
    }));

    res.status(200).json({
      success: true,
      data: normalizedPosts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPosts,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const collectUserUidVariants = (user, intoSet) => {
  if (!user) return;
  [user.uid, user.firebaseUid, user.supabaseUid]
    .filter(Boolean)
    .forEach((u) => intoSet.add(u));
};

/**
 * Single-query home feed: current user + everyone they follow (server-side, privacy-safe).
 * Paginated globally by createdAt (newest first).
 */
export const getHomeFeed = async (req, res) => {
  try {
    const requesterUid = req.user.uid;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 6));
    const skip = (page - 1) * limit;

    const requester = await findUserByAnyUid(requesterUid).populate({
      path: "following",
      select: "uid firebaseUid supabaseUid",
    });

    if (!requester) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const allowedUids = new Set();
    collectUserUidVariants(requester, allowedUids);
    (requester.following || []).forEach((followed) =>
      collectUserUidVariants(followed, allowedUids)
    );

    const uidArray = [...allowedUids];

    if (uidArray.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 1,
          totalPosts: 0,
          limit,
        },
      });
    }

    const query = { uid: { $in: uidArray } };

    const [posts, totalPosts] = await Promise.all([
      Entry.find(query)
        .populate("likes", "uid name username picture")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Entry.countDocuments(query),
    ]);

    const normalizedPosts = posts.map((post) => ({
      _id: post._id.toString(),
      uid: post.uid,
      ownerId: post.uid,
      name: post.name || "Untitled",
      description: post.description || "No description",
      image: post.image || null,
      likes: (post.likes || []).map((user) => ({
        _id: user._id,
        uid: user.uid,
        name: user.name,
        username: user.username,
        picture: user.picture,
      })),
      comments: post.comments || [],
      createdAt: post.createdAt || new Date().toISOString(),
      trainerUid: post.trainerUid || null,
      trainerName: post.trainerName || null,
      trainerUsername: post.trainerUsername || null,
    }));

    const totalPages =
      totalPosts === 0 ? 1 : Math.ceil(totalPosts / limit);

    res.status(200).json({
      success: true,
      data: normalizedPosts,
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("uid name username picture")
      .sort({ name: 1 });

    if (!users || users.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No users found" });
    }

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Request trainer dashboard access
export const requestTrainerDashboardAccess = async (req, res) => {
  try {
    const { uid } = req.user;
    const user = await findUserByAnyUid(uid);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already approved
    if (user.trainerDashboardAccess === "approved") {
      return res.status(200).json({
        success: true,
        message: "You already have trainer dashboard access",
        accessStatus: "approved",
      });
    }

    // Update to requested status
    user.trainerDashboardAccess = "requested";
    await user.save();

    res.status(200).json({
      success: true,
      message: "Trainer dashboard access requested successfully",
      accessStatus: "requested",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Check trainer dashboard access status
export const checkTrainerDashboardAccess = async (req, res) => {
  try {
    const { uid } = req.user;
    const user = await findUserByAnyUid(uid, "trainerDashboardAccess");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const accessStatus = user.trainerDashboardAccess || "none";
    const hasAccess = accessStatus === "approved";

    res.status(200).json({
      success: true,
      accessStatus,
      hasAccess,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Admin: Check if user is admin
export const checkIsAdmin = async (req, res) => {
  try {
    const { uid } = req.user;
    const user = await findUserByAnyUid(uid, "isAdmin");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      isAdmin: user.isAdmin || false,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Admin: Get all trainer dashboard access requests
export const getTrainerDashboardRequests = async (req, res) => {
  try {
    const { uid } = req.user;
    const currentUser = await findUserByAnyUid(uid, "isAdmin");

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!currentUser.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Admin access required",
      });
    }

    // Get all users with requested or approved status
    const requests = await User.find({
      trainerDashboardAccess: { $in: ["requested", "approved"] },
    })
      .select("uid name email username picture trainerDashboardAccess createdAt")
      .sort({ createdAt: -1 });

    // Separate pending requests and approved users
    const pendingRequests = requests.filter(
      (user) => user.trainerDashboardAccess === "requested"
    );
    const approvedUsers = requests.filter(
      (user) => user.trainerDashboardAccess === "approved"
    );

    res.status(200).json({
      success: true,
      data: {
        pendingRequests,
        approvedUsers,
        totalPending: pendingRequests.length,
        totalApproved: approvedUsers.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Admin: Approve trainer dashboard access
export const approveTrainerDashboardAccess = async (req, res) => {
  try {
    const { uid } = req.user;
    const { userId } = req.params; // The user ID to approve

    const currentUser = await findUserByAnyUid(uid, "isAdmin");
    if (!currentUser || !currentUser.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Admin access required",
      });
    }

    const userToApprove = await findUserByAnyUid(userId);
    if (!userToApprove) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    userToApprove.trainerDashboardAccess = "approved";
    await userToApprove.save();

    res.status(200).json({
      success: true,
      message: "Trainer dashboard access approved successfully",
      data: {
        uid: userToApprove.uid,
        name: userToApprove.name,
        email: userToApprove.email,
        accessStatus: userToApprove.trainerDashboardAccess,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Admin: Reject trainer dashboard access
export const rejectTrainerDashboardAccess = async (req, res) => {
  try {
    const { uid } = req.user;
    const { userId } = req.params; // The user ID to reject

    const currentUser = await findUserByAnyUid(uid, "isAdmin");
    if (!currentUser || !currentUser.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Admin access required",
      });
    }

    const userToReject = await findUserByAnyUid(userId);
    if (!userToReject) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    userToReject.trainerDashboardAccess = "none";
    await userToReject.save();

    res.status(200).json({
      success: true,
      message: "Trainer dashboard access rejected successfully",
      data: {
        uid: userToReject.uid,
        name: userToReject.name,
        email: userToReject.email,
        accessStatus: userToReject.trainerDashboardAccess,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await findUserByAnyUid(userId).populate({
      path: "followers",
      select: "uid name picture bio",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user.followers || [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await findUserByAnyUid(userId).populate({
      path: "following",
      select: "uid name picture bio",
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      data: user.following || [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Cancel follow request
export const cancelFollowRequest = async (req, res) => {
  try {
    const { uid } = req.user;
    const { userId } = req.params;


    const requester = await findUserByAnyUid(uid);
    const recipient = await findUserByAnyUid(userId);


    if (!requester || !recipient) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (requester._id.equals(recipient._id)) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel follow request to yourself",
      });
    }

    // Check if already following
    if (requester.following.includes(recipient._id)) {
      return res.status(400).json({
        success: false,
        message: "Already following this user",
      });
    }

    // Find and delete the follow request
    const deletedRequest = await FollowRequest.findOneAndDelete({
      requester: requester._id,
      recipient: recipient._id,
      status: "pending",
    });

    if (!deletedRequest) {
      return res.status(404).json({
        success: false,
        message: "No pending follow request found",
      });
    }


    res.status(200).json({
      success: true,
      message: "Follow request cancelled",
      isFollowing: false,
      hasRequest: false,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
