// utils/userUtils.js

/**
 * Filter user data based on privacy settings and viewer relationship
 * @param {Object} user - Complete user object
 * @param {Object|null} viewerUser - User viewing the profile (null if not logged in)
 * @returns {Object} - Filtered user data
 */
export const filterUserDataForPublicView = (user, viewerUser = null) => {
  // If the profile is the viewer's own profile, return full data
  if (viewerUser && viewerUser._id.toString() === user._id.toString()) {
    return user;
  }

  // Check if viewer is a follower
  const isFollower =
    viewerUser &&
    user.followers.some(
      (followerId) => followerId.toString() === viewerUser._id.toString()
    );

  // Create a base public user object with allowed fields
  const publicUserData = {
    _id: user._id,
    username: user.username,
    name: user.name,
    picture: user.picture,
    bio: user.bio,
    goal: user.goal,
    gymName: user.gymName,
    followersCount: user.followers.length,
    followingCount: user.following.length,
  };

  // If the profile is not private or viewer is a follower, return more data
  if (!user.privacy.isPrivate || isFollower) {
    return publicUserData;
  }

  // For private profiles where the viewer is not a follower,
  // return a more limited set of data
  return {
    _id: user._id,
    username: user.username,
    name: user.name,
    picture: user.picture,
    followersCount: user.followers.length,
    followingCount: user.following.length,
  };
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
  // If viewing own profile, return all entries
  if (viewerUser && viewerUser._id.toString() === entryOwner._id.toString()) {
    return entries;
  }

  // Check if viewer is a follower
  const isFollower =
    viewerUser &&
    entryOwner.followers.some(
      (followerId) => followerId.toString() === viewerUser._id.toString()
    );

  // If profile is private and viewer is not a follower, return empty array
  if (entryOwner.privacy.isPrivate && !isFollower) {
    return [];
  }

  // If showEntries is false and the viewer is not a follower, return empty array
  if (!entryOwner.privacy.showEntries && !isFollower) {
    return [];
  }

  // For public entries, return limited data
  return entries.map((entry) => ({
    _id: entry._id,
    name: entry.name,
    image: entry.image,
    likes: entry.likes,
    createdAt: entry.createdAt,
    uid: entry.uid,
  }));
};
