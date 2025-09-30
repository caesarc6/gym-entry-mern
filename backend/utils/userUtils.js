// utils/userUtils.js

/**
 * Filter user data based on privacy settings and viewer relationship
 * @param {Object} user - Complete user object
 * @param {Object|null} viewerUser - User viewing the profile (null if not logged in)
 * @returns {Object} - Filtered user data
 */
export const filterUserDataForPublicView = (user, viewerUser = null) => {
  // Ensure privacy object exists
  const privacy = user.privacy || {
    isPrivate: true,
    showEntries: true,
  };

  // Create a base public user object with allowed fields
  const publicUserData = {
    _id: user._id,
    username: user.username || user.name || "User", // Fallback to name or "User" if username is undefined
    name: user.name,
    picture: user.picture,
    bio: user.bio,
    goal: user.goal,
    gymName: user.gymName,
    backgroundPicture: user.backgroundPicture,
    followersCount: user.followers ? user.followers.length : 0,
    followingCount: user.following ? user.following.length : 0,
    isPrivate: privacy.isPrivate,
  };

  // If the viewer is the profile owner, include additional fields
  if (viewerUser && viewerUser._id.toString() === user._id.toString()) {
    return {
      ...publicUserData,
      email: user.email, // Always show email to the user themselves
      // Optionally include simplified followers/following arrays
      followers: user.followers
        ? user.followers.map((follower) => ({
            _id: follower._id,
            username: follower.username,
            name: follower.name,
            picture: follower.picture,
          }))
        : [],
      following: user.following
        ? user.following.map((following) => ({
            _id: following._id,
            username: following.username,
            name: following.name,
            picture: following.picture,
          }))
        : [],
    };
  }

  // Check if viewer is a follower
  const isFollower =
    viewerUser &&
    user.followers &&
    user.followers.some((followerId) => {
      const followerStr = followerId._id
        ? followerId._id.toString()
        : followerId.toString();
      const viewerStr = viewerUser._id.toString();
      return followerStr === viewerStr;
    });

  // If the profile is not private or viewer is a follower, return public data
  if (!privacy.isPrivate || isFollower) {
    return publicUserData;
  }

  // For private profiles where the viewer is not a follower, return basic profile data
  // (but not posts - those are handled separately)
  const basicProfileData = {
    _id: user._id,
    username: user.username || user.name || "User", // Fallback to name or "User" if username is undefined
    name: user.name,
    picture: user.picture,
    bio: user.bio,
    goal: user.goal,
    gymName: user.gymName,
    backgroundPicture: user.backgroundPicture,
    followersCount: user.followers ? user.followers.length : 0,
    followingCount: user.following ? user.following.length : 0,
    isPrivate: true,
  };
  return basicProfileData;
};

/**
 * Filter entry data based on user privacy settings
 * @param {Array} entries - Array of entry objects
 * @param {Object} entryOwner - User who owns the entries
 * @param {Object|null} viewerUser - User viewing the entries
 * @returns {Array} - Filtered entries
 */
export const filterEntriesForPublicView = (
  entries,
  entryOwner,
  viewerUser = null
) => {
  // Ensure privacy object exists
  const privacy = entryOwner.privacy || {
    isPrivate: true,
    showEntries: true,
  };

  // If viewing own profile, return all entries
  if (viewerUser && viewerUser._id.toString() === entryOwner._id.toString()) {
    return entries;
  }

  // Check if viewer is a follower
  const isFollower =
    viewerUser &&
    entryOwner.followers &&
    entryOwner.followers.some((followerId) => {
      const followerStr = followerId._id
        ? followerId._id.toString()
        : followerId.toString();
      const viewerStr = viewerUser._id.toString();
      return followerStr === viewerStr;
    });

  // If profile is private and viewer is not a follower, return empty array
  if (privacy.isPrivate && !isFollower) {
    return [];
  }

  // If showEntries is false, return empty array (even for followers)
  if (!privacy.showEntries) {
    return [];
  }

  // For public entries or followers, return limited data
  return entries.map((entry) => ({
    _id: entry._id,
    name: entry.name,
    description: entry.description,
    image: entry.image,
    likes: entry.likes,
    createdAt: entry.createdAt,
    uid: entry.uid,
    comments: entry.comments,
  }));
};
