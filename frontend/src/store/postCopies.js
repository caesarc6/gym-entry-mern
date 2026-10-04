const postKey = (id) => String(id ?? "");

const samePost = (entry, id) => postKey(entry?._id) === id;

export const pickPostFields = (source) => {
  if (!source || typeof source !== "object") return {};
  const fields = {};
  for (const key of [
    "name",
    "description",
    "image",
    "imageName",
    "likes",
    "comments",
    "createdAt",
    "trainerUid",
    "trainerName",
    "trainerUsername",
  ]) {
    if (source[key] !== undefined) fields[key] = source[key];
  }
  return fields;
};

const patchList = (list, id, fields) => {
  if (!Array.isArray(list)) return list;
  let changed = false;
  const next = list.map((entry) => {
    if (!samePost(entry, id)) return entry;
    changed = true;
    return { ...entry, ...fields };
  });
  return changed ? next : list;
};

const withoutPost = (list, id) => {
  if (!Array.isArray(list)) return list;
  if (!list.some((entry) => samePost(entry, id))) return list;
  return list.filter((entry) => !samePost(entry, id));
};

const pageLimit = (cache) => cache?.limit || cache?.pagination?.limit || 1;

const paginationAfterRemoval = (pagination, limit) => {
  if (!pagination) return pagination;
  const totalPosts = Math.max(0, (pagination.totalPosts || 0) - 1);
  return {
    ...pagination,
    totalPosts,
    totalPages: Math.max(1, Math.ceil(totalPosts / (limit || 1))),
  };
};

const patchFeedCache = (cache, id, fields) => {
  if (!cache) return cache;
  const entries = patchList(cache.entries, id, fields);
  if (entries === cache.entries) return cache;
  return { ...cache, entries };
};

const removeFeedCache = (cache, id) => {
  if (!cache || !Array.isArray(cache.entries)) return cache;
  const entries = withoutPost(cache.entries, id);
  if (entries === cache.entries) return cache;
  return {
    ...cache,
    entries,
    pagination: paginationAfterRemoval(cache.pagination, pageLimit(cache)),
  };
};

const findOwnerUid = (state, id) => {
  const lists = [
    state.entrys,
    state.posts,
    state.homeFeedCache?.entries,
    state.profileTabCache?.entries,
    state.analyticsTabCache?.userEntries,
  ];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    const found = list.find((entry) => samePost(entry, id));
    if (found) return found.ownerId || found.uid || null;
  }
  return null;
};

const removeProfilePost = (cache, id, ownerUid) => {
  if (!cache) return cache;
  const inList =
    Array.isArray(cache.entries) &&
    cache.entries.some((entry) => samePost(entry, id));
  const owns =
    ownerUid && cache.uid && postKey(ownerUid) === postKey(cache.uid);
  if (!inList && !owns) return cache;

  let next = inList ? removeFeedCache(cache, id) : cache;
  if (!inList && owns && cache.pagination) {
    next = {
      ...cache,
      pagination: paginationAfterRemoval(cache.pagination, pageLimit(cache)),
    };
  }
  if (owns && next?.userProfile) {
    next = {
      ...next,
      userProfile: {
        ...next.userProfile,
        postsCount: Math.max(0, (next.userProfile.postsCount || 0) - 1),
      },
    };
  }
  return next;
};

const patchAnalyticsCache = (cache, id, fields) => {
  if (!cache) return cache;
  const userEntries = patchList(cache.userEntries, id, fields);
  if (userEntries === cache.userEntries) return cache;
  return { ...cache, userEntries };
};

const removeAnalyticsEntry = (cache, id) => {
  if (!cache) return cache;
  const userEntries = withoutPost(cache.userEntries, id);
  if (userEntries === cache.userEntries) return cache;
  return { ...cache, userEntries };
};

const nextSnapshots = (snapshots, id, payload) => {
  const prev = snapshots?.[id];
  return {
    ...(snapshots || {}),
    [id]: { seq: (prev?.seq || 0) + 1, ...payload },
  };
};

export const applyPostPatch = (state, rawId, fields) => {
  const id = postKey(rawId);
  if (!id || !fields || Object.keys(fields).length === 0) return {};
  return {
    postSnapshots: nextSnapshots(state.postSnapshots, id, {
      removed: false,
      fields,
    }),
    entrys: patchList(state.entrys, id, fields),
    posts: patchList(state.posts, id, fields),
    homeFeedCache: patchFeedCache(state.homeFeedCache, id, fields),
    profileTabCache: patchFeedCache(state.profileTabCache, id, fields),
    analyticsTabCache: patchAnalyticsCache(state.analyticsTabCache, id, fields),
  };
};

export const applyPostRemoval = (state, rawId) => {
  const id = postKey(rawId);
  if (!id) return {};
  const ownerUid = findOwnerUid(state, id);
  return {
    postSnapshots: nextSnapshots(state.postSnapshots, id, {
      removed: true,
      ownerUid,
    }),
    entrys: withoutPost(state.entrys, id),
    posts: withoutPost(state.posts, id),
    homeFeedCache: removeFeedCache(state.homeFeedCache, id),
    profileTabCache: removeProfilePost(state.profileTabCache, id, ownerUid),
    analyticsTabCache: removeAnalyticsEntry(state.analyticsTabCache, id),
  };
};
