import { User, Post, Comment, FollowRequest } from "../models/user.model.js";
import Entry from "../models/entry.model.js";
import { supabase } from "../supabase/supabase.js";
import multer from "multer";
import path from "path";
import {
  filterEntriesForPublicView,
  filterUserDataForPublicView,
} from "../utils/userUtils.js";
import { generateSafeFilePath } from "../utils/fileUtils.js";

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
    const { isPrivate, showEmail, showEntries } = req.body;

    // Validate input
    if (
      isPrivate === undefined &&
      showEmail === undefined &&
      showEntries === undefined
    ) {
      return res.status(400).json({ message: "No privacy settings provided" });
    }

    // Update only the provided fields
    const updateFields = {};
    if (isPrivate !== undefined) updateFields["privacy.isPrivate"] = isPrivate;
    if (showEmail !== undefined) updateFields["privacy.showEmail"] = showEmail;
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
    console.error("Error updating privacy settings:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get batch profile images for multiple users (optimized for mobile)
export const getBatchProfileImages = async (req, res) => {
  try {
    const { uids } = req.body;

    if (!uids || !Array.isArray(uids) || uids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No UIDs provided",
      });
    }

    // Limit the number of UIDs to prevent abuse
    const limitedUids = uids.slice(0, 20);

    const users = await User.find(
      { uid: { $in: limitedUids } },
      { uid: 1, name: 1, username: 1, picture: 1 }
    );

    const profileData = users.map((user) => ({
      uid: user.uid,
      profileImage: user.picture,
      displayName: user.username || user.name || "Unknown User",
      isUsername: !!user.username,
    }));

    res.status(200).json({
      success: true,
      data: profileData,
    });
  } catch (error) {
    console.error("Error fetching batch profile images:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get user profile by username (for public viewing)
export const getUserProfileByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    let viewerUser = null;
    if (req.user && req.user.uid) {
      viewerUser = await User.findOne({ uid: req.user.uid });
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
    console.error("Error fetching user profile:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Check if a user is following another user
export const checkFollowing = async (req, res) => {
  try {
    const { targetUserId } = req.params;

    const user = await User.findOne({ uid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFollowing = user.following.some(
      (id) => id.toString() === targetUserId
    );

    return res.status(200).json({ isFollowing });
  } catch (error) {
    console.error("Error checking follow status:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Existing controller functions (abridged for brevity)
export const getCurrentMongoDBUser = async (req, res) => {
  const { uid } = req.user;

  try {
    const user = await User.findOne({ uid });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve user" });
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
          console.error("Supabase upload error details:", error);
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
        console.error("Detailed upload error:", error);
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
    console.error("Update user profile error:", error);
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
      console.error("Bucket Listing Error:", error);
      return false;
    }
    console.log(
      "Available Buckets:",
      data.map((bucket) => bucket.name)
    );
    return true;
  } catch (err) {
    console.error("Supabase Connection Check Failed:", err);
    return false;
  }
};

export const createUser = async (req, res) => {
  const { uid, name, email, picture } = req.user;

  try {
    let user = await User.findOne({ uid });
    if (!user) {
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
    }
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" });
  }
};

export const createPost = async (req, res) => {
  const { name, description, image } = req.body;
  const { uid } = req.user;

  if (!name || !description) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all fields" });
  }

  try {
    const post = new Entry({ uid, name, description, image });
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
    const user = await User.findOne({ uid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if profile is private and requester is a follower
    const isFollower = user.followers.some((followerId) =>
      followerId.equals(req.user._id)
    );
    if (user.isPrivate && !isFollower && requesterUid !== uid) {
      return res.status(403).json({
        success: false,
        message:
          "Private profile: You must follow this user to see their posts",
      });
    }

    const posts = await Entry.find({ uid })
      .populate("likes", "uid name username picture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalPosts = await Entry.countDocuments({ uid });
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
    console.error("Error fetching posts by UID:", error);
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

    const currentUser = await User.findOne({ uid: currentUserUid });
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "Current user not found",
      });
    }

    const targetUser = await User.findOne({ uid: userId });
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
    console.error("Error checking follow status:", error);
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
    const user = await User.findOne({ uid }).select("uid name email picture");
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve user" });
  }
};

export const getUser = async (req, res) => {
  const { uid } = req.params;

  try {
    const user = await User.findOne({ uid }).select(
      "name picture bio gymName goal followers following"
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
    console.error("Error retrieving user:", error);
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
      viewerUser = await User.findOne({ uid: req.user.uid });
    }

    // Find users matching the search query
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { username: { $regex: query, $options: "i" } },
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

      // Check if viewer is a follower
      const isFollower =
        viewerUser &&
        user.followers &&
        user.followers.some((follower) => follower.uid === viewerUser.uid);

      // Check if viewer is the profile owner
      const isOwner = viewerUser && viewerUser.uid === user.uid;

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
    console.error("Error searching users:", error);
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
        console.error("Supabase upload error:", error);
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
      console.error("Upload error:", error);
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
        console.error("Supabase upload error:", error);
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
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message });
    }
  },
];

export const followUser = async (req, res) => {
  try {
    const { uid } = req.user;
    const userToFollow = await User.findOne({ uid: req.params.userId });
    const currentUser = await User.findOne({ uid });

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
    console.error("Error in followUser:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    const { uid } = req.user;
    const userToUnfollow = await User.findOne({ uid: req.params.userId });
    const currentUser = await User.findOne({ uid });

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
    console.error("Error in unfollowUser:", error);
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
      viewerUser = await User.findOne({ uid: req.user.uid });
      if (!viewerUser) {
        console.warn(`Viewer user not found for uid: ${req.user.uid}`);
      }
    }

    const user = await User.findOne({ uid: userId })
      .populate("followers", "username name picture")
      .populate("following", "username name picture");

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
    const isOwner = viewerUser && viewerUser.uid === userId;
    const canViewPosts =
      isOwner ||
      !user.privacy.isPrivate ||
      (user.privacy.isPrivate && isFollower);

    // Fetch posts only if allowed
    let posts = [];
    if (canViewPosts && user.privacy.showEntries) {
      posts = await Entry.find({ uid: userId }).populate(
        "likes",
        "uid name username picture"
      );
    }

    // Get total posts count (unfiltered) for display purposes
    const totalPostsCount = await Entry.countDocuments({ uid: userId });

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
    }));

    const responseData = {
      success: true,
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
    console.error("Error fetching user profile:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Send follow request
export const sendFollowRequest = async (req, res) => {
  try {
    const { uid } = req.user;
    const { userId } = req.params;

    console.log("sendFollowRequest called with:", { uid, userId });

    const requester = await User.findOne({ uid });
    const recipient = await User.findOne({ uid: userId });

    console.log("Found users:", {
      requester: requester ? { _id: requester._id, uid: requester.uid } : null,
      recipient: recipient ? { _id: recipient._id, uid: recipient.uid } : null,
    });

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

    console.log("Profile privacy check:", {
      recipientPrivacy: recipient.privacy,
      isPrivate: recipient.privacy?.isPrivate,
    });

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

    console.log("Creating follow request...");

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

    console.log("Follow request result:", followRequest);

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
    console.error("Error sending follow request:", error);
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

    const user = await User.findOne({ uid });
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
    console.error("Error accepting follow request:", error);
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

    const user = await User.findOne({ uid });
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
    console.error("Error rejecting follow request:", error);
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
    const user = await User.findOne({ uid });

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
    console.error("Error getting pending follow requests:", error);
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

    const requester = await User.findOne({ uid });
    const recipient = await User.findOne({ uid: userId });

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
    console.error("Error checking follow request status:", error);
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
    console.error("Error fetching feed posts:", error);
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

export const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ uid: userId }).populate({
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
    console.error("Get followers error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ uid: userId }).populate({
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
    console.error("Get following error:", error);
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

    console.log("cancelFollowRequest called with:", { uid, userId });

    const requester = await User.findOne({ uid });
    const recipient = await User.findOne({ uid: userId });

    console.log("Found users:", {
      requester: requester ? { _id: requester._id, uid: requester.uid } : null,
      recipient: recipient ? { _id: recipient._id, uid: recipient.uid } : null,
    });

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

    console.log("Follow request cancelled:", deletedRequest);

    res.status(200).json({
      success: true,
      message: "Follow request cancelled",
      isFollowing: false,
      hasRequest: false,
    });
  } catch (error) {
    console.error("Error cancelling follow request:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
