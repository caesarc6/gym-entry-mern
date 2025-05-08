// utils/userUtils.js

/**
 * Filter user data based on privacy settings and viewer relationship
 * @param {Object} user - Complete user object
 * @param {Object|null} viewerUser - User viewing the profile (null if not logged in)
 * @returns {Object} - Filtered user data
 */
// utils/userUtils.js
export const filterUserDataForPublicView = (user, viewerUser = null) => {
  // Create a base public user object with allowed fields
  const publicUserData = {
    _id: user._id,
    username: user.username,
    name: user.name,
    picture: user.picture,
    bio: user.bio,
    goal: user.goal,
    gymName: user.gymName,
    followersCount: user.followers ? user.followers.length : 0,
    followingCount: user.following ? user.following.length : 0,
    isPrivate: user.privacy?.isPrivate || false,
  };

  // If the viewer is the profile owner, include additional fields
  if (viewerUser && viewerUser._id.toString() === user._id.toString()) {
    return {
      ...publicUserData,
      email: user.email, // Add fields only the owner should see
      // Optionally include simplified followers/following arrays
      followers: user.followers.map((follower) => ({
        _id: follower._id,
        username: follower.username,
        name: follower.name,
        picture: follower.picture,
      })),
      following: user.following.map((following) => ({
        _id: following._id,
        username: following.username,
        name: following.name,
        picture: following.picture,
      })),
    };
  }

  // Check if viewer is a follower
  const isFollower =
    viewerUser &&
    user.followers &&
    user.followers.some(
      (followerId) => followerId.toString() === viewerUser._id.toString()
    );

  // If the profile is not private or viewer is a follower, return public data
  if (!user.privacy?.isPrivate || isFollower) {
    return publicUserData;
  }

  // For private profiles where the viewer is not a follower, return minimal data
  return {
    username: user.username,
    isPrivate: true,
  };
};

// export const filterUserDataForPublicView = (user, viewerUser = null) => {
//   // If the profile is the viewer's own profile, return full data
//   if (viewerUser && viewerUser._id.toString() === user._id.toString()) {
//     return user;
//   }

//   // Check if viewer is a follower
//   const isFollower =
//     viewerUser &&
//     user.followers.some(
//       (followerId) => followerId.toString() === viewerUser._id.toString()
//     );

//   // Create a base public user object with allowed fields
//   const publicUserData = {
//     _id: user._id,
//     username: user.username,
//     name: user.name,
//     picture: user.picture,
//     bio: user.bio,
//     goal: user.goal,
//     gymName: user.gymName,
//     followersCount: user.followers.length,
//     followingCount: user.following.length,
//     isPrivate: user.privacy.isPrivate, // Include isPrivate flag
//   };

//   // If the profile is not private or viewer is a follower, return more data
//   if (!user.privacy.isPrivate || isFollower) {
//     return publicUserData;
//   }

//   // For private profiles where the viewer is not a follower, return minimal data
//   return {
//     username: user.username,
//     isPrivate: true, // Explicitly indicate the profile is private
//   };
// };

/**
 * Filter entry data based on user privacy settings
 * @param {Array} entries - Array of entry objects
 * @param {Object} entryOwner - User who owns the entries
 * @param {Object|null} viewerUser - User viewing the entries
 * @returns {Array} - Filtered entries
 */
// export const filterEntriesForPublicView = (
//   entries,
//   entryOwner,
//   viewerUser = null
// ) => {
//   // If viewing own profile, return all entries
//   if (viewerUser && viewerUser._id.toString() === entryOwner._id.toString()) {
//     return entries;
//   }

//   // Check if viewer is a follower
//   const isFollower =
//     viewerUser &&
//     entryOwner.followers.some(
//       (followerId) => followerId.toString() === viewerUser._id.toString()
//     );

//   // If profile is private and viewer is not a follower, return empty array
//   if (entryOwner.privacy.isPrivate && !isFollower) {
//     return [];
//   }

//   // If showEntries is false, return empty array (even for followers)
//   if (!entryOwner.privacy.showEntries) {
//     return [];
//   }

//   // For public entries, return limited data
//   return entries.map((entry) => ({
//     _id: entry._id,
//     name: entry.name,
//     image: entry.image,
//     likes: entry.likes,
//     createdAt: entry.createdAt,
//     uid: entry.uid,
//   }));
// };

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
    entryOwner.followers &&
    entryOwner.followers.some(
      (followerId) => followerId.toString() === viewerUser._id.toString()
    );

  // If profile is private and viewer is not a follower, return empty array
  if (entryOwner.privacy.isPrivate && !isFollower) {
    return [];
  }

  // If showEntries is false, return empty array (even for followers)
  if (!entryOwner.privacy.showEntries) {
    return [];
  }

  // For public entries or followers, return limited data
  return entries.map((entry) => ({
    _id: entry._id,
    name: entry.name,
    description: entry.description, // Include description
    image: entry.image,
    likes: entry.likes, // Number, not an array
    createdAt: entry.createdAt,
    uid: entry.uid,
    comments: entry.comments, // Include comments if needed
  }));
};
