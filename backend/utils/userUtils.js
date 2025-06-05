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
    backgroundPicture: user.backgroundPicture,
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
  // console.log("Filtering entries for:", entryOwner.username);
  // console.log("Viewer _id:", viewerUser?._id?.toString());
  // console.log("Owner privacy:", entryOwner.privacy);
  // console.log("Entries count:", entries.length);
  // console.log("EntryOwner followers:", entryOwner.followers);
  // console.log(
  //   "EntryOwner followers _ids:",
  //   entryOwner.followers?.map((f) => f._id?.toString() || f.toString())
  // );

  // If viewing own profile, return all entries
  if (viewerUser && viewerUser._id.toString() === entryOwner._id.toString()) {
    // console.log("Returning all entries for owner");
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
      // console.log(
      //   `Comparing followerId: ${followerStr} with viewer _id: ${viewerStr}`
      // );
      return followerStr === viewerStr;
    });
  // console.log("Is viewer a follower in filterEntries:", isFollower);

  // If profile is private and viewer is not a follower, return empty array
  if (entryOwner.privacy?.isPrivate && !isFollower) {
    // console.log("Returning no entries for private profile");
    return [];
  }

  // If showEntries is false, return empty array (even for followers)
  if (!entryOwner.privacy?.showEntries) {
    // console.log("Returning no entries due to showEntries: false");
    return [];
  }

  // For public entries or followers, return limited data
  // console.log("Returning filtered entries");
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
