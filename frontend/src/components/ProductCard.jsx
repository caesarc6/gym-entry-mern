import { DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { HamburgerIcon } from "@chakra-ui/icons";
import { FiShare2 } from "react-icons/fi";
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  IconButton,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  useBreakpointValue,
  useDisclosure,
  VStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Skeleton,
  Badge,
  Divider,
  Stack,
} from "@chakra-ui/react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { ButtonLoadingSpinner } from "./loading";
import { FileUploader } from "./FileUploader";
import {
  ENTRY_POST_IMAGE_ASPECT,
  ENTRY_POST_MEDIA_ASPECT,
} from "../constants/imageAspectRatios";
import { useProductStore } from "../store/product";
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  memo,
} from "react";
import PropTypes from "prop-types";
import { supabase } from "../supabase/supabase";
import { API_ENDPOINTS, apiClient } from "../config/api"; // Import API configuration
import {
  parseWorkoutDescription,
  parseWorkoutTitle,
} from "../utils/workoutParser.js";
import ShareWorkoutModal from "./ShareWorkoutModal";
import { FeedEntryCard } from "./ui/feed-entry-card";
import EnhancedWorkoutEditor from "./EnhancedWorkoutEditor";
import { useThemeColors } from "../hooks/useThemeColors";
import { useCanvasShell } from "../contexts/CanvasShellContext.jsx";
import { useCustomToast } from "../hooks/useCustomToast";
import { getCurrentAuthUser } from "../utils/auth";
import {
  getProfileImageRequestDeduped,
  setCachedProfileSnippet,
} from "../utils/profileImageApi";
import {
  clearEditEntryDraft,
  readEditEntryDraft,
  writeEditEntryDraft,
} from "../utils/workoutDraftStorage";
import {
  THEME_SHELL_ARTWORK_DURATION_MS,
  THEME_SHELL_DELAY_MS,
  THEME_SHELL_EASING,
} from "../constants/themeShellTiming.js";

// Convert Vite asset imports to actual URLs
const lightUrl = new URL("../assets/light.jpg", import.meta.url).href;
const nightUrl = new URL("../assets/night.jpg", import.meta.url).href;
const defaultBgUrl = new URL("../assets/defaultBg.jpg", import.meta.url).href;
const defaultBgNightUrl = new URL(
  "../assets/defaultBgNight.jpg",
  import.meta.url
).href;
const LEGACY_DEFAULT_POST_IMAGE =
  "https://coffective.com/wp-content/uploads/2018/06/default-featured-image.png.jpg";

/** Wait this long after typing stops before hitting the server (batch keystrokes). */
const EDIT_SERVER_AUTOSAVE_DEBOUNCE_MS = 1400;
/** If the user keeps typing across a save, at most this many PUTs per “wave” (safety cap). */
const EDIT_SERVER_AUTOSAVE_MAX_CHAIN = 5;

/** Matches CanvasShell/CSS theme chrome timing; sx wins over stylesheet order for crossfade under Chakra/emotion */
const ENTRY_POST_THEME_TRANSITION_SX = {
  transitionDuration: "var(--theme-shell-duration, 0.45s)",
  transitionDelay: "var(--theme-shell-delay, 0s)",
  transitionTimingFunction:
    "var(--theme-shell-ease, cubic-bezier(0.42, 0, 0.58, 1))",
};

/**
 * Keep focused inputs/textareas visible inside an overflow modal when mobile
 * keyboards resize the Visual Viewport.
 */
function scrollFocusedFieldIntoEditableModalScroller(scroller, field, visualViewport, margin = 14) {
  if (!scroller || !field || !(field instanceof HTMLElement)) return;

  const vv =
    visualViewport ??
    (typeof window !== "undefined" ? window.visualViewport : undefined);

  const rect = field.getBoundingClientRect();

  let bottomCeiling =
    vv != null
      ? vv.offsetTop + vv.height - margin
      : typeof window !== "undefined"
      ? window.innerHeight - margin
      : NaN;

  if (!Number.isFinite(bottomCeiling)) return;

  const belowOverlap = rect.bottom - bottomCeiling;
  if (belowOverlap > 0) {
    scroller.scrollTop += belowOverlap + 8;
    return;
  }

  let topFloor;
  if (vv != null) {
    topFloor = vv.offsetTop + margin * 2;
  } else {
    const sr = scroller.getBoundingClientRect();
    topFloor = sr.top + margin * 2;
  }

  const aboveOverlap = topFloor - rect.top;
  if (aboveOverlap > 0) {
    scroller.scrollTop = Math.max(0, scroller.scrollTop - aboveOverlap - 8);
  }
}

/** Subdocument IDs from Mongoose/API may expose `_id` or `id` and may compare unequal if not stringified. */
function normalizeCommentMongoId(comment) {
  const raw = comment?._id ?? comment?.id;
  if (raw === undefined || raw === null) return null;
  const s = String(raw);
  return s.length ? s : null;
}

const EntryPostDefaultThemeArtwork = memo(function EntryPostDefaultThemeArtwork({
  alt,
  showLight,
  prefersReducedMotion,
  reveal = true,
  onLoaded,
  boxProps,
  imageStyle,
  decoding,
  fetchPriority,
  loading,
}) {
  const lightRef = useRef(null);
  const nightRef = useRef(null);
  const notifiedRef = useRef(false);

  /** Inline so `html.theme-chrome-transition *` cannot drop `opacity` from `transition-property`. */
  const placeholderOpacityTransition = prefersReducedMotion
    ? "none"
    : `opacity ${THEME_SHELL_ARTWORK_DURATION_MS}ms ${THEME_SHELL_EASING} ${THEME_SHELL_DELAY_MS}ms`;

  const lightOpacity = reveal ? (showLight ? 1 : 0) : 0;
  const nightOpacity = reveal ? (showLight ? 0 : 1) : 0;

  const notifyLoaded = useCallback(() => {
    if (notifiedRef.current) return;
    notifiedRef.current = true;
    onLoaded?.();
  }, [onLoaded]);

  // Cached theme assets often skip `onLoad` after remount (e.g. optimistic → real post id).
  useEffect(() => {
    notifiedRef.current = false;
    const active = showLight ? lightRef.current : nightRef.current;
    if (active?.complete) {
      notifyLoaded();
    }
  }, [showLight, notifyLoaded]);

  const imgShared = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    ...imageStyle,
  };

  return (
    <Box role="img" aria-label={alt} {...boxProps}>
      <Image
        ref={lightRef}
        src={defaultBgUrl}
        alt=""
        aria-hidden
        decoding={decoding}
        fetchpriority={fetchPriority}
        loading={loading}
        onLoad={notifyLoaded}
        onError={notifyLoaded}
        sx={{
          ...imgShared,
          opacity: lightOpacity,
        }}
        style={{ transition: placeholderOpacityTransition }}
      />
      <Image
        ref={nightRef}
        src={defaultBgNightUrl}
        alt=""
        aria-hidden
        decoding={decoding}
        fetchpriority={fetchPriority}
        loading={loading}
        onLoad={notifyLoaded}
        onError={notifyLoaded}
        sx={{
          ...imgShared,
          opacity: nightOpacity,
        }}
        style={{ transition: placeholderOpacityTransition }}
      />
    </Box>
  );
});

const ProductCard = memo(function ProductCard({
  entry,
  isOwner: propIsOwner,
  onUpdate,
  onDelete,
  profileCache,
  priority = false,
  detailOpen,
  onDetailOpenChange,
}) {
  const navigate = useNavigate();
  const globalCurrentUser = useProductStore((state) => state.currentUser);
  const [currentUser, setCurrentUser] = useState(globalCurrentUser);
  const isOwner = propIsOwner ?? currentUser?.uid === entry.uid;
  const colors = useThemeColors();

  const handleAuthorProfileClick = useCallback(() => {
    const ownerUid = entry.uid;
    if (!ownerUid) return;
    if (currentUser?.uid && ownerUid === currentUser.uid) {
      navigate("/profile");
      return;
    }
    navigate(`/user/${ownerUid}`);
  }, [currentUser?.uid, entry.uid, navigate]);
  const { prefersReducedMotion } = useCanvasShell();
  const profileImageFallback =
    colors.currentTheme === "light" ? lightUrl : nightUrl;
  const postImageFallback =
    colors.currentTheme === "light" ? defaultBgUrl : defaultBgNightUrl;

  const [updatedEntry, setUpdatedEntry] = useState({
    _id: entry._id || "",
    name: entry.name || "Untitled",
    description: entry.description || "No description",
    image: entry.image || "",
    likes: Array.isArray(entry.likes) ? entry.likes : [],
    comments: Array.isArray(entry.comments) ? entry.comments : [],
    createdAt: entry.createdAt || new Date().toISOString(),
    trainerUid: entry.trainerUid || null,
    trainerName: entry.trainerName || null,
    trainerUsername: entry.trainerUsername || null,
  });

  // Use profile cache if available, otherwise use defaults
  const cachedProfile = useMemo(() => {
    if (profileCache && profileCache.has(entry.uid)) {
      return profileCache.get(entry.uid);
    }
    if (entry.authorProfile) {
      return entry.authorProfile;
    }
    return null;
  }, [profileCache, entry.uid, entry.authorProfile]);

  const [profileImage, setProfileImage] = useState(() => {
    // Initialize with cached profile image if available, otherwise use default
    return cachedProfile?.profileImage || profileImageFallback;
  });
  const [userDisplayName, setUserDisplayName] = useState(
    cachedProfile?.displayName || "Unknown User"
  );
  const [isUsername, setIsUsername] = useState(
    cachedProfile?.isUsername || false
  );

  // Trainer profile info for shared workouts
  const [trainerProfileImage, setTrainerProfileImage] = useState(
    entry.trainerProfile?.profileImage || profileImageFallback
  );
  const [trainerDisplayName, setTrainerDisplayName] = useState(() => {
    // Initialize from entry data if available
    return (
      entry.trainerProfile?.displayName ||
      entry.trainerName ||
      entry.trainerUsername ||
      null
    );
  });
  const [trainerIsUsername, setTrainerIsUsername] = useState(() => {
    // Initialize from entry data if available
    return entry.trainerProfile?.isUsername || !!entry.trainerUsername;
  });
  const [trainerProfileImageLoaded, setTrainerProfileImageLoaded] =
    useState(false);
  const [isLiked, setIsLiked] = useState(false); // Track if current user has liked this post
  const [imageLoaded, setImageLoaded] = useState(false);
  const [profileImageLoaded, setProfileImageLoaded] = useState(false);

  const [comment, setComment] = useState("");
  const [editingComment, setEditingComment] = useState(null);
  const [replyToComment, setReplyToComment] = useState(null);
  const [replyText, setReplyText] = useState("");
  const {
    deleteEntry,
    updateEntry,
    likeEntry,
    commentEntry,
    saveEntryDraft,
    getEntryDraft,
    deleteEntryDraft,
  } = useProductStore();
  const currentUserInfo = useProductStore((state) => state.currentUserInfo);

  // Parent pages often pass an inline onUpdate; if it were in the autosave effect deps,
  // every parent re-render would clear the debounce timer and the status would stay "Saving…".
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const prevEditModalOpenRef = useRef(false);
  const editLocalDraftTimerRef = useRef(null);
  const updatedEntryRef = useRef(updatedEntry);
  updatedEntryRef.current = updatedEntry;

  useEffect(() => {
    if (entry.authorProfile) {
      setCachedProfileSnippet(entry.uid, entry.authorProfile);
    }
    if (entry.trainerUid && entry.trainerProfile) {
      setCachedProfileSnippet(entry.trainerUid, entry.trainerProfile);
    }
  }, [entry.uid, entry.authorProfile, entry.trainerUid, entry.trainerProfile]);

  useEffect(() => {
    if (globalCurrentUser) {
      setCurrentUser(globalCurrentUser);
    }
  }, [globalCurrentUser]);

  useEffect(() => {
    if (globalCurrentUser) return undefined;

    const syncAuth = async () => {
      const user = await getCurrentAuthUser();
      setCurrentUser(user);
    };

    syncAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setCurrentUser({
            uid: session.user.id,
            email: session.user.email,
            name:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              session.user.email?.split("@")[0],
            picture:
              session.user.user_metadata?.avatar_url ||
              session.user.user_metadata?.picture ||
              "",
            authProvider: "supabase",
          });
        } else {
          syncAuth();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [globalCurrentUser]);

  // Debug currentUserInfo changes
  useEffect(() => {
    // currentUserInfo changes tracked
  }, [currentUserInfo]);

  // Get current user's display name for comments
  const getCurrentUserDisplayName = () => {
    if (!currentUserInfo) {
      // Check if user is authenticated but info not loaded yet
      if (currentUser) {
        return "Loading...";
      }
      return "Anonymous";
    }
    return currentUserInfo.username
      ? `@${currentUserInfo.username}`
      : currentUserInfo.name || "User";
  };

  // Get current user's profile picture for comments
  const getCurrentUserProfilePicture = () => {
    if (!currentUserInfo) return profileImageFallback;
    return currentUserInfo.picture || profileImageFallback;
  };

  const { showToast, success: toastSuccess, error: toastError } = useCustomToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();
  const {
    isOpen: isDetailOpen,
    onOpen: onDetailOpen,
    onClose: onDetailClose,
  } = useDisclosure();

  useEffect(() => {
    if (detailOpen === true && !isDetailOpen) {
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      onDetailOpen();
      const restore = () => window.scrollTo(scrollX, scrollY);
      restore();
      requestAnimationFrame(() => {
        restore();
        requestAnimationFrame(restore);
      });
    } else if (detailOpen === false && isDetailOpen) {
      onDetailClose();
    }
  }, [detailOpen, isDetailOpen, onDetailOpen, onDetailClose]);

  const handleDetailClose = useCallback(() => {
    setFocusCommentOnOpen(false);
    onDetailClose();
    onDetailOpenChange?.(false);
  }, [onDetailClose, onDetailOpenChange]);

  // Open detail without letting focus management scroll the feed behind the modal.
  const handleDetailOpen = useCallback(() => {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    onDetailOpen();
    const restore = () => window.scrollTo(scrollX, scrollY);
    restore();
    requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });
  }, [onDetailOpen]);
  const {
    isOpen: isShareOpen,
    onOpen: onShareOpen,
    onClose: onShareClose,
  } = useDisclosure();
  const {
    isOpen: isEnhancedEditOpen,
    onOpen: onEnhancedEditOpen,
    onClose: onEnhancedEditClose,
  } = useDisclosure();

  const commentsAnchorId = `post-detail-comments-${entry._id}`;
  const feedCommentInputRef = useRef(null);
  const detailCommentInputRef = useRef(null);
  const [focusCommentOnOpen, setFocusCommentOnOpen] = useState(false);

  const focusCommentInput = useCallback((input) => {
    if (!input) return;
    try {
      input.focus({ preventScroll: false });
    } catch {
      input.focus();
    }
  }, []);

  const handleCommentCompose = useCallback(() => {
    setFocusCommentOnOpen(true);
    handleDetailOpen();
  }, [handleDetailOpen]);

  useEffect(() => {
    if (!isDetailOpen || !focusCommentOnOpen) return;
    const focus = () => focusCommentInput(detailCommentInputRef.current);
    focus();
    const frame = requestAnimationFrame(focus);
    const timer = window.setTimeout(focus, 80);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [isDetailOpen, focusCommentOnOpen, focusCommentInput]);

  /** Scroll container for Edit workout modal (viewport + keyboard). */
  const editModalScrollRef = useRef(null);
  const editModalCentered =
    useBreakpointValue({ base: false, md: true }, { fallback: false }) === true;

  const ensureEditableFieldVisibleInEditModal = useCallback((element) => {
    if (!(element instanceof HTMLElement)) return;
    const scroller = editModalScrollRef.current;
    const vv = typeof window !== "undefined" ? window.visualViewport : undefined;
    const run = () => {
      scrollFocusedFieldIntoEditableModalScroller(scroller, element, vv ?? undefined);
    };
    requestAnimationFrame(run);
    setTimeout(run, 64);
    setTimeout(run, 220);
    setTimeout(run, 520);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      const el = editModalScrollRef.current;
      if (el) el.style.maxHeight = "";
      return undefined;
    }

    const vv = typeof window !== "undefined" ? window.visualViewport : undefined;

    function scrollActiveFocusedFieldIntoView() {
      const ae = document.activeElement;
      if (!(ae instanceof HTMLInputElement || ae instanceof HTMLTextAreaElement)) {
        return;
      }
      if (!editModalScrollRef.current?.contains(ae)) return;
      scrollFocusedFieldIntoEditableModalScroller(editModalScrollRef.current, ae, vv);
    }

    function syncEditModalViewport() {
      const content = editModalScrollRef.current;
      if (!content) return;
      const pad = 20;
      if (vv && typeof vv.height === "number") {
        content.style.maxHeight = `${Math.max(240, Math.round(vv.height - pad))}px`;
      } else {
        content.style.maxHeight = "";
      }

      scrollActiveFocusedFieldIntoView();
      window.requestAnimationFrame(() => {
        scrollActiveFocusedFieldIntoView();
      });
    }

    syncEditModalViewport();
    vv?.addEventListener("resize", syncEditModalViewport);
    vv?.addEventListener("scroll", syncEditModalViewport);
    window.addEventListener("orientationchange", syncEditModalViewport);

    return () => {
      vv?.removeEventListener("resize", syncEditModalViewport);
      vv?.removeEventListener("scroll", syncEditModalViewport);
      window.removeEventListener("orientationchange", syncEditModalViewport);
      const el = editModalScrollRef.current;
      if (el) el.style.maxHeight = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (cachedProfile) {
      // Only update profile image if we have a valid cached profile image
      if (cachedProfile.profileImage) {
        setProfileImage(cachedProfile.profileImage);
      }
      setUserDisplayName(cachedProfile.displayName || "Unknown User");
      setIsUsername(cachedProfile.isUsername || false);
    }
  }, [cachedProfile]);

  // Fetch profile image only if not in cache
  useEffect(() => {
    const fetchProfileImage = async () => {
      // If we have cached data, use it
      if (cachedProfile) {
        return;
      }

      try {
        const response = await getProfileImageRequestDeduped(entry.uid);

        // Check if the response has the expected structure
        if (response.data?.success && response.data?.data) {
          if (response.data.data.picture) {
            setProfileImage(response.data.data.picture);
          }
          // Set display name: username if available, otherwise name, otherwise fallback
          const displayName =
            response.data.data.username ||
            response.data.data.name ||
            "Unknown User";
          const isUsernameValue = !!response.data.data.username;
          setUserDisplayName(displayName);
          setIsUsername(isUsernameValue);
        } else {
          setProfileImage(profileImageFallback);
          setUserDisplayName("Unknown User");
        }
      } catch (error) {
        setProfileImage(profileImageFallback);
        setUserDisplayName("Unknown User");
      }
    };

    const fetchTrainerProfile = async () => {
      if (entry.trainerProfile) {
        if (entry.trainerProfile.profileImage) {
          setTrainerProfileImage(entry.trainerProfile.profileImage);
          setTrainerProfileImageLoaded(true);
        }
        setTrainerDisplayName(entry.trainerProfile.displayName || "Trainer");
        setTrainerIsUsername(Boolean(entry.trainerProfile.isUsername));
        return;
      }

      // If we already have trainer name/username from entry, use those
      if (entry.trainerName || entry.trainerUsername) {
        setTrainerDisplayName(entry.trainerName || entry.trainerUsername);
        setTrainerIsUsername(!!entry.trainerUsername);
      }

      // Always try to fetch profile image even if we have name/username
      if (!entry.trainerUid) return;

      try {
        const response = await getProfileImageRequestDeduped(entry.trainerUid);

        if (response.data.success) {
          const data = response.data.data;
          if (data.picture) {
            setTrainerProfileImage(data.picture);
            setTrainerProfileImageLoaded(true);
          }
          if (data.name || data.username) {
            setTrainerDisplayName(data.name || data.username);
            setTrainerIsUsername(!!data.username);
          }
        }
      } catch (error) {
        // If we have trainer name/username from entry, still show it
        if (entry.trainerName || entry.trainerUsername) {
          setTrainerDisplayName(entry.trainerName || entry.trainerUsername);
          setTrainerIsUsername(!!entry.trainerUsername);
        }
      }
    };

    if (entry.uid && !cachedProfile) {
      fetchProfileImage();
    }

    // Fetch trainer profile only as a fallback when the feed did not include it.
    if (entry.trainerUid) {
      fetchTrainerProfile();
    }
  }, [
    entry.uid,
    entry.trainerUid,
    entry.trainerName,
    entry.trainerUsername,
    entry.trainerProfile,
    cachedProfile,
    profileImageFallback,
  ]);

  const handleTrainerProfileImageError = () => {
    setTrainerProfileImage(profileImageFallback);
    setTrainerProfileImageLoaded(true);
  };

  const handleTrainerProfileImageLoad = () => {
    setTrainerProfileImageLoaded(true);
  };

  // Update profile image when color mode changes
  useEffect(() => {
    // Only update to default if we truly have no profile image and no cached profile
    if (
      (!profileImage || profileImage === lightUrl || profileImage === nightUrl) &&
      !cachedProfile?.profileImage
    ) {
      setProfileImage(profileImageFallback);
    }
  }, [profileImage, profileImageFallback, cachedProfile]);

  // Check if current user has liked this post
  useEffect(() => {
    if (currentUser && Array.isArray(updatedEntry.likes)) {
      const userLiked = updatedEntry.likes.some(
        (user) => user && user.uid === currentUser.uid
      );
      setIsLiked(userLiked);
    }
  }, [currentUser, updatedEntry.likes]);

  // Optimized image loading handlers
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleProfileImageLoad = useCallback(() => {
    setProfileImageLoaded(true);
  }, []);

  const handleImageError = useCallback((e) => {
    e.target.src = postImageFallback;
    setImageLoaded(true);
  }, [postImageFallback]);

  const handleProfileImageError = useCallback(
    (e) => {
      e.target.src = profileImageFallback;
      setProfileImageLoaded(true);
    },
    [profileImageFallback]
  );

  // Helper function to check if image is a generated/default placeholder.
  const isPlaceholderImage = useCallback((imageUrl) => {
    if (!imageUrl) return true;
    if (imageUrl === LEGACY_DEFAULT_POST_IMAGE) {
      return true;
    }
    // Check if it's the "No Image" placeholder SVG
    if (imageUrl.includes("data:image/svg+xml") && imageUrl.includes("No Image")) {
      return true;
    }
    // Check if it's a data URL that's not a real image (just the placeholder)
    if (imageUrl.startsWith("data:image/svg+xml") && imageUrl.includes("%3ENo Image%3C")) {
      return true;
    }
    return false;
  }, []);

  // Reset image loading states when entry changes
  useEffect(() => {
    setImageLoaded(false);
    setProfileImageLoaded(false);
  }, [entry._id, entry.image, entry.uid]);

  // Reveal media after mount. Empty/placeholder posts use theme default artwork —
  // previously we only auto-revealed when `updatedEntry.image` was truthy, so
  // create-without-photo cards stayed blank after the optimistic → server id swap.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setImageLoaded(true);
    }, updatedEntry.image && !isPlaceholderImage(updatedEntry.image) ? 100 : 0);

    return () => clearTimeout(timeout);
  }, [updatedEntry.image, isPlaceholderImage]);

  // Reset profile image loading state when profile image URL changes
  useEffect(() => {
    setProfileImageLoaded(false);
  }, [profileImage]);

  // Timeout fallback for profile images
  useEffect(() => {
    if (profileImage) {
      // For external URLs (Supabase), use a shorter timeout since onLoad might not fire
      const isExternalUrl =
        profileImage.includes("supabase.co") || profileImage.includes("http");
      const timeoutDuration = isExternalUrl ? 1000 : 3000;

      const timeout = setTimeout(() => {
        setProfileImageLoaded(true);
      }, timeoutDuration);

      return () => clearTimeout(timeout);
    }
  }, [profileImage]);

  const [editAutosaveMeta, setEditAutosaveMeta] = useState({
    status: "idle", // idle | saving | saved | error
    lastSavedAt: null,
  });
  const [isUpdateSubmitting, setIsUpdateSubmitting] = useState(false);
  /** Stringified baseline for Revert; state (not ref) so the Revert button re-renders when it updates. */
  const [editBaselineSnapshot, setEditBaselineSnapshot] = useState("");
  const editAutosaveTimerRef = useRef(null);
  const lastEditAutosavedSnapshotRef = useRef("");
  const lastEditAutosavedEntryRef = useRef(null);
  /** JSON.stringify(payload) of the last successful server save — skip redundant identical PUTs. */
  const lastEditServerPayloadHashRef = useRef("");

  const buildUpdatePayload = useCallback(
    (candidate) => {
      const payload = {
        name: candidate.name,
        description: candidate.description,
      };

      // Only include image fields if:
      // 1. imageName exists (new image was uploaded)
      // 2. AND image is not the placeholder SVG
      if (
        candidate.imageName &&
        candidate.imageName !== "undefined" &&
        candidate.image &&
        !isPlaceholderImage(candidate.image)
      ) {
        payload.image = candidate.image;
        payload.imageName = candidate.imageName;
      }

      return payload;
    },
    [isPlaceholderImage]
  );

  const currentEditSnapshot = useMemo(() => {
    return JSON.stringify({
      name: updatedEntry?.name || "",
      description: updatedEntry?.description || "",
      image: updatedEntry?.image || "",
      imageName: updatedEntry?.imageName || "",
    });
  }, [
    updatedEntry?.name,
    updatedEntry?.description,
    updatedEntry?.image,
    updatedEntry?.imageName,
  ]);

  // Sync entry.image to updatedEntry.image when entry changes
  // This ensures we always use the actual entry image, not the placeholder
  useEffect(() => {
    // Only update if:
    // 1. entry has an image
    // 2. entry image is not the placeholder
    // 3. entry image is different from current updatedEntry image
    if (
      entry.image &&
      !isPlaceholderImage(entry.image) &&
      entry.image !== updatedEntry.image
    ) {
      // Check if current updatedEntry image is placeholder or missing before updating
      setUpdatedEntry((prev) => {
        // Only update if current image is placeholder or missing
        if (isPlaceholderImage(prev.image) || !prev.image) {
          return {
            ...prev,
            image: entry.image,
          };
        }
        return prev;
      });
    }
  }, [entry.image, entry._id]);

  const flushEditDraftBackup = useCallback(() => {
    if (!isOwner) return;
    const current = updatedEntryRef.current;
    const nameTrim = (current?.name || "").trim();
    const descTrim = (current?.description || "").trim();
    const hasNewImage = !!(
      current?.imageName && current.imageName !== "undefined"
    );
    const hasDisplayImage =
      current?.image && !isPlaceholderImage(current.image);
    if (!nameTrim && !descTrim && !hasNewImage && !hasDisplayImage) return;

    const snap = JSON.stringify({
      name: current?.name || "",
      description: current?.description || "",
      image: current?.image || "",
      imageName: current?.imageName || "",
    });
    // Nothing pending vs last successful publish/autosave.
    if (snap === lastEditAutosavedSnapshotRef.current) return;

    (async () => {
      try {
        const user = await getCurrentAuthUser();
        const uid = user?.uid || "anon";
        writeEditEntryDraft(uid, entry._id, {
          name: current?.name || "",
          description: current?.description || "",
          image: current?.image || "",
          imageName: current?.imageName || "",
        });
        await saveEntryDraft(entry._id, {
          name: current?.name ?? "",
          description: current?.description ?? "",
        });
      } catch {
        // ignore quota / network
      }
    })();
  }, [entry._id, isOwner, saveEntryDraft]);

  // Edit modal: server baseline for Revert + recover device draft if the app died mid-edit.
  useEffect(() => {
    if (!isOpen) {
      // Closing cancels debounce timers — flush so drafts survive quick dismiss.
      if (prevEditModalOpenRef.current) {
        flushEditDraftBackup();
      }
      if (editAutosaveTimerRef.current) {
        clearTimeout(editAutosaveTimerRef.current);
        editAutosaveTimerRef.current = null;
      }
      if (editLocalDraftTimerRef.current) {
        clearTimeout(editLocalDraftTimerRef.current);
        editLocalDraftTimerRef.current = null;
      }
      prevEditModalOpenRef.current = false;
      setEditAutosaveMeta({ status: "idle", lastSavedAt: null });
      setEditBaselineSnapshot("");
      lastEditAutosavedSnapshotRef.current = "";
      lastEditAutosavedEntryRef.current = null;
      lastEditServerPayloadHashRef.current = "";
      return;
    }

    if (prevEditModalOpenRef.current) {
      return;
    }
    prevEditModalOpenRef.current = true;

    const serverImage =
      entry?.image && !isPlaceholderImage(entry.image) ? entry.image : "";
    const serverBaseline = {
      name: entry?.name || "",
      description: entry?.description || "",
      image: serverImage,
      imageName: "",
    };
    const serverSnap = JSON.stringify(serverBaseline);
    lastEditAutosavedSnapshotRef.current = serverSnap;
    setEditBaselineSnapshot(serverSnap);
    lastEditAutosavedEntryRef.current = { ...serverBaseline };
    lastEditServerPayloadHashRef.current = JSON.stringify(
      buildUpdatePayload(serverBaseline),
    );
    setEditAutosaveMeta({ status: "idle", lastSavedAt: null });

    (async () => {
      try {
        const user = await getCurrentAuthUser();
        const uid = user?.uid || "anon";
        const draftRes = await getEntryDraft(entry._id);
        const serverDraft =
          draftRes?.success && draftRes.data ? draftRes.data : null;
        const localDraft = readEditEntryDraft(uid, entry._id);

        if (!serverDraft && !localDraft) return;

        const serverTs = serverDraft?.updatedAt
          ? new Date(serverDraft.updatedAt).getTime()
          : -1;
        const localTs = localDraft?.lastLocalSaveAt
          ? new Date(localDraft.lastLocalSaveAt).getTime()
          : -1;

        let mergedName;
        let mergedDesc;
        if (serverDraft && localDraft) {
          if (serverTs >= localTs) {
            mergedName = serverDraft.name;
            mergedDesc = serverDraft.description;
          } else {
            mergedName = localDraft.name;
            mergedDesc = localDraft.description;
          }
        } else if (serverDraft) {
          mergedName = serverDraft.name;
          mergedDesc = serverDraft.description;
        } else {
          mergedName = localDraft.name;
          mergedDesc = localDraft.description;
        }

        const mergedImage =
          localDraft?.image &&
          typeof localDraft.image === "string" &&
          localDraft.image
            ? localDraft.image
            : serverBaseline.image;
        const mergedImageName =
          localDraft && typeof localDraft.imageName === "string"
            ? localDraft.imageName
            : "";

        const draftSnap = JSON.stringify({
          name: typeof mergedName === "string" ? mergedName : "",
          description: typeof mergedDesc === "string" ? mergedDesc : "",
          image: mergedImage || "",
          imageName: mergedImageName || "",
        });

        if (draftSnap === serverSnap) {
          clearEditEntryDraft(uid, entry._id);
          deleteEntryDraft(entry._id).catch(() => {});
          return;
        }

        setUpdatedEntry((prev) => ({
          ...prev,
          name: typeof mergedName === "string" ? mergedName : prev.name,
          description:
            typeof mergedDesc === "string" ? mergedDesc : prev.description,
          image: mergedImage || prev.image,
          imageName:
            typeof mergedImageName === "string" && mergedImageName
              ? mergedImageName
              : prev.imageName,
        }));

        const fromServer =
          serverDraft && (!localDraft || serverTs >= localTs);
        toastSuccess(
          "Edits recovered",
          fromServer
            ? "Unsaved text was restored from your account; images, when present, came from this device."
            : "Unsaved changes from your last edit session on this device were restored."
        );
      } catch (e) {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per open; entry is read at open time
  }, [isOpen]);

  // Device-local + server text backup while editing (survives crash / battery dying before publish autosave).
  useEffect(() => {
    if (!isOpen || !isOwner) return;

    const nameTrim = (updatedEntry?.name || "").trim();
    const descTrim = (updatedEntry?.description || "").trim();
    const hasNewImage = !!(
      updatedEntry?.imageName &&
      updatedEntry.imageName !== "undefined"
    );
    const hasDisplayImage =
      updatedEntry?.image && !isPlaceholderImage(updatedEntry.image);

    if (!nameTrim && !descTrim && !hasNewImage && !hasDisplayImage) return;

    if (editLocalDraftTimerRef.current) {
      clearTimeout(editLocalDraftTimerRef.current);
    }

    editLocalDraftTimerRef.current = setTimeout(() => {
      (async () => {
        try {
          const current = updatedEntryRef.current;
          const user = await getCurrentAuthUser();
          const uid = user?.uid || "anon";
          writeEditEntryDraft(uid, entry._id, {
            name: current?.name || "",
            description: current?.description || "",
            image: current?.image || "",
            imageName: current?.imageName || "",
          });
          saveEntryDraft(entry._id, {
            name: current?.name ?? "",
            description: current?.description ?? "",
          }).catch(() => {});
        } catch (e) {
          // ignore quota / private mode
        }
      })();
    }, 400);

    return () => {
      if (editLocalDraftTimerRef.current) {
        clearTimeout(editLocalDraftTimerRef.current);
      }
    };
  }, [
    isOpen,
    isOwner,
    entry._id,
    updatedEntry?.name,
    updatedEntry?.description,
    updatedEntry?.image,
    updatedEntry?.imageName,
    saveEntryDraft,
  ]);

  // Flush local draft when the tab goes away or the phone backgrounds the browser.
  useEffect(() => {
    if (!isOpen || !isOwner) return;

    const flushLocalDraft = () => {
      flushEditDraftBackup();
    };

    const onVis = () => {
      if (document.visibilityState === "hidden") flushLocalDraft();
    };
    window.addEventListener("pagehide", flushLocalDraft);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flushLocalDraft);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [isOpen, isOwner, flushEditDraftBackup]);

  // Autosave edits to the real server: one debounced wave, then at most one extra PUT if you typed during the request (no overlapping calls).
  useEffect(() => {
    if (!isOpen) return;
    if (!isOwner) return;

    const nameTrimmed = (updatedEntry?.name || "").trim();
    if (!nameTrimmed) return; // backend requires name

    if (currentEditSnapshot === lastEditAutosavedSnapshotRef.current) return;

    if (editAutosaveTimerRef.current) {
      clearTimeout(editAutosaveTimerRef.current);
    }

    setEditAutosaveMeta((m) =>
      m.status === "saved" ? m : { ...m, status: "saving" },
    );

    editAutosaveTimerRef.current = setTimeout(() => {
      (async () => {
        try {
          for (let wave = 0; wave < EDIT_SERVER_AUTOSAVE_MAX_CHAIN; wave += 1) {
            const candidate = updatedEntryRef.current;
            const nameOk = (candidate?.name || "").trim();
            if (!nameOk) break;

            const snap = JSON.stringify({
              name: candidate?.name || "",
              description: candidate?.description || "",
              image: candidate?.image || "",
              imageName: candidate?.imageName || "",
            });

            if (snap === lastEditAutosavedSnapshotRef.current) break;

            const payload = buildUpdatePayload(candidate);
            const payloadHash = JSON.stringify(payload);
            if (payloadHash === lastEditServerPayloadHashRef.current) {
              lastEditAutosavedSnapshotRef.current = snap;
              break;
            }

            setEditAutosaveMeta((m) => ({ ...m, status: "saving" }));
            const { success, data } = await updateEntry(entry._id, payload);

            if (!success) {
              setEditAutosaveMeta((m) => ({ ...m, status: "error" }));
              return;
            }

            lastEditServerPayloadHashRef.current = payloadHash;

            // Never write server name/description back into the open form — that
            // races with typing and makes characters disappear mid-keystroke.
            const sentName = candidate?.name || "";
            const sentDesc = candidate?.description || "";
            const sentImage = candidate?.image || "";
            const sentImageName = candidate?.imageName || "";
            const didSendNewImage = Boolean(
              sentImageName && sentImageName !== "undefined",
            );
            const publishedImage =
              data?.image && didSendNewImage ? data.image : sentImage;
            const publishedImageName =
              data?.image && didSendNewImage ? "" : sentImageName;

            lastEditAutosavedEntryRef.current = {
              name: sentName,
              description: sentDesc,
              image: publishedImage,
              imageName: publishedImageName,
            };
            const savedSnap = JSON.stringify({
              name: sentName,
              description: sentDesc,
              image: publishedImage,
              imageName: publishedImageName,
            });
            lastEditAutosavedSnapshotRef.current = savedSnap;
            setEditBaselineSnapshot(savedSnap);

            setUpdatedEntry((prevEntry) => {
              const next = {
                ...prevEntry,
                likes: data?.likes ?? prevEntry.likes,
                comments: data?.comments ?? prevEntry.comments,
              };
              const imageUnchangedSinceSend =
                (prevEntry.image || "") === sentImage &&
                (prevEntry.imageName || "") === sentImageName;
              if (imageUnchangedSinceSend && data?.image && didSendNewImage) {
                next.image = data.image;
                next.imageName = "";
              }
              return next;
            });

            if (data) {
              onUpdateRef.current(entry._id, data);
            }

            // updatedEntryRef is still pre-setState; if the user typed or swapped
            // the image during the request, keep drafts for recovery.
            const latest = updatedEntryRef.current;
            const formMatchesSent =
              (latest?.name || "") === sentName &&
              (latest?.description || "") === sentDesc &&
              (latest?.image || "") === sentImage &&
              (latest?.imageName || "") === sentImageName;
            if (formMatchesSent) {
              try {
                const user = await getCurrentAuthUser();
                clearEditEntryDraft(user?.uid || "anon", entry._id);
              } catch (clearErr) {
                // ignore
              }
              deleteEntryDraft(entry._id).catch(() => {});
            } else {
              // updateEntry $unsets editDraft — restore the newer in-progress text.
              try {
                const user = await getCurrentAuthUser();
                writeEditEntryDraft(user?.uid || "anon", entry._id, {
                  name: latest?.name || "",
                  description: latest?.description || "",
                  image: latest?.image || "",
                  imageName: latest?.imageName || "",
                });
              } catch {
                // ignore
              }
              saveEntryDraft(entry._id, {
                name: latest?.name ?? "",
                description: latest?.description ?? "",
              }).catch(() => {});
            }
          }

          setEditAutosaveMeta({
            status: "saved",
            lastSavedAt: new Date().toISOString(),
          });
        } catch (e) {
          setEditAutosaveMeta((m) => ({ ...m, status: "error" }));
        }
      })();
    }, EDIT_SERVER_AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (editAutosaveTimerRef.current) {
        clearTimeout(editAutosaveTimerRef.current);
      }
    };
  }, [
    isOpen,
    isOwner,
    entry._id,
    updatedEntry?.name,
    updatedEntry?.description,
    updatedEntry?.image,
    updatedEntry?.imageName,
    buildUpdatePayload,
    updateEntry,
    deleteEntryDraft,
    saveEntryDraft,
    currentEditSnapshot,
  ]);

  const handleRevertEdits = useCallback(() => {
    const baseline = lastEditAutosavedEntryRef.current;
    if (!baseline) return;
    setUpdatedEntry((prev) => ({
      ...prev,
      name: baseline.name ?? "",
      description: baseline.description ?? "",
      image: baseline.image ?? prev.image,
      imageName: baseline.imageName ?? prev.imageName,
    }));
    lastEditServerPayloadHashRef.current = JSON.stringify(
      buildUpdatePayload(baseline),
    );
    setEditAutosaveMeta((m) => ({ ...m, status: "idle" }));
  }, [buildUpdatePayload]);

  const handleFileUpload = async (file) => {
    try {
      // Use the image compression utility
      const { handleImageUploadWithCompression } = await import(
        "../utils/imageCompression"
      );

      await handleImageUploadWithCompression(
        file,
        (result) => {
          // Success callback
          const reader = new FileReader();
          reader.onloadend = () => {
            setUpdatedEntry({
              ...updatedEntry,
              image: reader.result,
              imageName: result.file.name,
            });
          };
          reader.readAsDataURL(result.file);

          // Show compression info if image was compressed
          if (result.wasCompressed) {
            toastSuccess(
              "Image Compressed",
              `Image compressed from ${result.originalSize} to ${result.compressedSize}`
            );
          }
        },
        (error) => {
          // Error callback
          toastError("Upload Error", error);
        },
        { maxSizeMB: 5 }
      );
    } catch (error) {
      toastError("Error", "Failed to process image. Please try again.");
    }
  };

  const handleDeleteEntry = async (pid) => {
    const { success, message } = await deleteEntry(pid);
    if (!success) {
      toastError("Error", message);
    } else {
      toastSuccess("Success", message);
      onDelete?.(pid);
      onDeleteClose();
      try {
        const user = await getCurrentAuthUser();
        clearEditEntryDraft(user?.uid || "anon", pid);
      } catch (e) {
        // ignore
      }
    }
  };

  const handleUpdateEntry = async (pid, updatedEntry) => {
    if (isUpdateSubmitting) return;
    if (editAutosaveTimerRef.current) {
      clearTimeout(editAutosaveTimerRef.current);
      editAutosaveTimerRef.current = null;
    }

    const previousEntry = { ...updatedEntry };
    setUpdatedEntry((prevEntry) => ({ ...prevEntry, ...updatedEntry }));
    
    // Prepare the payload - only include image/imageName if a new image was uploaded
    const payload = {
      name: updatedEntry.name,
      description: updatedEntry.description,
    };
    
    // Only include image fields if:
    // 1. imageName exists (new image was uploaded)
    // 2. AND image is not the placeholder SVG
    if (updatedEntry.imageName && updatedEntry.imageName !== "undefined" && 
        updatedEntry.image && !isPlaceholderImage(updatedEntry.image)) {
      payload.image = updatedEntry.image;
      payload.imageName = updatedEntry.imageName;
    }

    setIsUpdateSubmitting(true);
    try {
      const { success, message, data } = await updateEntry(pid, payload);

      onClose();
      if (!success) {
        setUpdatedEntry(previousEntry);
        toastError("Error", message);
      } else {
        lastEditServerPayloadHashRef.current = JSON.stringify(payload);
        if (data) {
          const { name, description, likes, comments, image } = data;
          setUpdatedEntry((prevEntry) => {
            const newUpdatedEntry = {
              ...prevEntry,
              name,
              description,
              likes,
              comments,
              image, // Add the image field to update the UI
            };
            const savedSnap = JSON.stringify({
              name: name ?? "",
              description: description ?? "",
              image: image ?? "",
              imageName: prevEntry?.imageName || "",
            });
            lastEditAutosavedSnapshotRef.current = savedSnap;
            setEditBaselineSnapshot(savedSnap);
            lastEditAutosavedEntryRef.current = {
              name: name ?? "",
              description: description ?? "",
              image: image ?? "",
              imageName: prevEntry?.imageName || "",
            };
            return newUpdatedEntry;
          });
          onUpdate(pid, data);
        }
        toastSuccess("Success", "Entry updated successfully");
        (async () => {
          try {
            const user = await getCurrentAuthUser();
            clearEditEntryDraft(user?.uid || "anon", pid);
          } catch (e) {
            // ignore
          }
        })();
      }
    } catch (error) {
      setUpdatedEntry(previousEntry);
      toastError("Update failed", error.message || "Unable to update post.");
    } finally {
      setIsUpdateSubmitting(false);
    }
  };

  const handleLikeEntry = async (pid) => {
    // Save previous state for rollback
    const prevIsLiked = isLiked;
    const prevLikes = Array.isArray(updatedEntry.likes)
      ? [...updatedEntry.likes]
      : [];

    // Optimistically update
    let newLikes;
    if (!isLiked) {
      // Like: add current user
      newLikes = [
        ...prevLikes,
        currentUserInfo && {
          _id: currentUserInfo._id,
          uid: currentUserInfo.uid,
          name: currentUserInfo.name,
          username: currentUserInfo.username,
          picture: currentUserInfo.picture,
        },
      ].filter(Boolean);
    } else {
      // Unlike: remove current user
      newLikes = prevLikes.filter(
        (user) => user && user.uid !== currentUserInfo?.uid
      );
    }
    setIsLiked(!isLiked);
    setUpdatedEntry((prevEntry) => ({
      ...prevEntry,
      likes: newLikes,
    }));

    // Make API call
    try {
      const { success, message, liked, likes } = await likeEntry(pid);
      if (!success) {
        // Rollback on error
        setIsLiked(prevIsLiked);
        setUpdatedEntry((prevEntry) => ({
          ...prevEntry,
          likes: prevLikes,
        }));
        showToast({ title: "Error", description: message, status: "error" });
      } else if (Array.isArray(likes)) {
        // Update with server response for consistency
        setUpdatedEntry((prevEntry) => ({
          ...prevEntry,
          likes: likes,
        }));
      }
    } catch (error) {
      // Rollback on error
      setIsLiked(prevIsLiked);
      setUpdatedEntry((prevEntry) => ({
        ...prevEntry,
        likes: prevLikes,
      }));
      toastError("Error", error.message);
    }
  };

  const handleCommentEntry = async (pid, comment) => {
    try {
      const { success, message, comments: nextComments } = await commentEntry(
        pid,
        comment
      );
      if (!success) {
        showToast({
          title: "Error",
          description: message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      if (Array.isArray(nextComments)) {
        setUpdatedEntry((prevEntry) => ({
          ...prevEntry,
          comments: nextComments,
        }));
      }
      setComment("");
      showToast({
        title: "Success",
        description: "Comment added successfully",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      showToast({
        title: "Error",
        description:
          error?.message || "Failed to comment on entry",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Handle comment like
  const handleCommentLike = async (commentId) => {
    const cid = commentId != null ? String(commentId).trim() : "";
    if (!cid) return;

    try {
      const response = await apiClient.post(
        API_ENDPOINTS.LIKE_COMMENT(String(entry._id), cid),
      );

      if (response.data.success) {
        setUpdatedEntry((prevEntry) => ({
          ...prevEntry,
          comments: prevEntry.comments.map((comment) => {
            if (normalizeCommentMongoId(comment) === cid) {
              const isLiked = comment.likes?.some(
                (like) => like.uid === currentUserInfo?.uid
              );
              const newLikes = isLiked
                ? comment.likes.filter(
                    (like) => like.uid !== currentUserInfo?.uid
                  )
                : [
                    ...(comment.likes || []),
                    {
                      uid: currentUserInfo?.uid,
                      username: currentUserInfo?.username,
                      name: currentUserInfo?.name,
                      picture: currentUserInfo?.picture,
                    },
                  ];
              return { ...comment, likes: newLikes };
            }
            return comment;
          }),
        }));
      }
    } catch (error) {
      toastError("Error", "Failed to like comment");
    }
  };

  // Handle comment reply
  const handleCommentReply = async (commentId, replyDraft) => {
    const rawId = commentId != null ? String(commentId).trim() : "";
    const text = (replyDraft ?? "").trim();
    if (!rawId || !text) return;

    try {
      const response = await apiClient.post(
        API_ENDPOINTS.REPLY_TO_COMMENT(String(entry._id), rawId),
        { text },
      );

      const ok = Boolean(response?.data?.success);

      if (ok) {
        const nextComments = response?.data?.data?.comments;

        if (Array.isArray(nextComments)) {
          setUpdatedEntry((prevEntry) => ({
            ...prevEntry,
            comments: nextComments,
          }));
        } else {
          // Fallback if response shape omits comments (should not happen)
          setUpdatedEntry((prevEntry) => ({
            ...prevEntry,
            comments: prevEntry.comments.map((c) => {
              if (normalizeCommentMongoId(c) === rawId) {
                return {
                  ...c,
                  replies: [
                    ...(c.replies || []),
                    {
                      text,
                      createdAt: new Date().toISOString(),
                      username: currentUserInfo?.username || null,
                      name: currentUserInfo?.name || "User",
                      picture: currentUserInfo?.picture || null,
                      uid: currentUserInfo?.uid || null,
                    },
                  ],
                };
              }
              return c;
            }),
          }));
        }

        setReplyText("");
        setReplyToComment(null);
        showToast({
          title: "Success",
          description: "Reply added successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toastError(
          "Error",
          response?.data?.message || "Failed to add reply",
        );
      }
    } catch (error) {
      toastError(
        "Error",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to add reply",
      );
    }
  };

  // Handle comment edit
  const handleCommentEdit = async (commentId, newText) => {
    const cid = commentId != null ? String(commentId).trim() : "";
    if (!cid) return;

    try {
      const response = await apiClient.put(
        API_ENDPOINTS.EDIT_COMMENT(String(entry._id), cid),
        { text: newText }
      );

      if (response.data.success) {
        setUpdatedEntry((prevEntry) => ({
          ...prevEntry,
          comments: prevEntry.comments.map((comment) => {
            if (normalizeCommentMongoId(comment) === cid) {
              return { ...comment, text: newText, edited: true };
            }
            return comment;
          }),
        }));

        setEditingComment(null);
        showToast({
          title: "Success",
          description: "Comment updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toastError("Error", "Failed to edit comment");
    }
  };

  // Handle comment delete
  const handleCommentDelete = async (commentId) => {
    const cid = commentId != null ? String(commentId).trim() : "";
    if (!cid) return;

    try {
      const response = await apiClient.delete(
        API_ENDPOINTS.DELETE_COMMENT(String(entry._id), cid)
      );

      if (response.data.success) {
        const nextComments = Array.isArray(response.data.comments)
          ? response.data.comments
          : (updatedEntry.comments || []).filter(
              (c) => normalizeCommentMongoId(c) !== cid,
            );
        setUpdatedEntry((prevEntry) => ({
          ...prevEntry,
          comments: nextComments,
        }));
        onUpdate?.(entry._id, { comments: nextComments });

        showToast({
          title: "Success",
          description: "Comment deleted successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toastError(
          "Error",
          response.data.message || "Failed to delete comment"
        );
      }
    } catch (error) {
      toastError(
        "Error",
        error.response?.data?.message ||
          error.message ||
          "Failed to delete comment"
      );
    }
  };

  // Check if user can edit/delete a comment
  const canEditComment = (comment) => {
    return currentUserInfo?.uid === comment.uid || isOwner;
  };

  // Check if user has liked a comment
  const hasLikedComment = (comment) => {
    return (
      comment.likes?.some((like) => like.uid === currentUserInfo?.uid) || false
    );
  };

  const handleProcessWorkout = async () => {
    try {
      // Check if this looks like a workout post
      const exercises = parseWorkoutDescription(updatedEntry.description);
      const { split } = parseWorkoutTitle(updatedEntry.name);

      if (exercises.length === 0) {
        showToast({
          title: "Not a workout post",
          description:
            "This post doesn't contain workout data in the expected format.",
          status: "warning",
        });
        return;
      }

      const response = await apiClient.post(
        API_ENDPOINTS.PROCESS_WORKOUT(entry._id)
      );

      if (response.data.success) {
        toastSuccess(
          "Success",
          `Workout data processed! Found ${exercises.length} exercises.`
        );
      }
    } catch (error) {
      showToast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to process workout data",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const isOlderThanYear = now.getFullYear() - date.getFullYear() > 0;

    const options = {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };

    if (isOlderThanYear) {
      options.year = "numeric";
    }

    return date.toLocaleString("en-US", options);
  };

  const formatDateHour = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const ordinal =
      day % 10 === 1 && day !== 11
        ? "st"
        : day % 10 === 2 && day !== 12
          ? "nd"
          : day % 10 === 3 && day !== 13
            ? "rd"
            : "th";
    const monthName = date.toLocaleString("en-US", { month: "long" });
    const sameYear = date.getFullYear() === new Date().getFullYear();
    const datePart = sameYear
      ? `${monthName} ${day}${ordinal}`
      : `${monthName} ${day}${ordinal}, ${date.getFullYear()}`;
    const timePart = date.toLocaleString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
    return `${datePart} · ${timePart}`;
  };

  const formatDateTitleTime = (dateString) => {
    const date = new Date(dateString);
    const options = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    return date.toLocaleString("en-US", options);
  };

  const rawEntryImage = updatedEntry.image || entry.image;
  const usesThemeDefaultPostArt = isPlaceholderImage(rawEntryImage);
  const displayEntryImage = usesThemeDefaultPostArt
    ? postImageFallback
    : rawEntryImage;
  const showLightDefaultBg = colors.currentTheme === "light";

  const captionHandle = isUsername ? `@${userDisplayName}` : userDisplayName;
  const profileFallbackLetters =
    userDisplayName.trim().slice(0, 2).toUpperCase() || "??";
  const trainerDisplayLabel =
    trainerIsUsername && trainerDisplayName
      ? `@${trainerDisplayName}`
      : trainerDisplayName || "Trainer";
  const feedSubtitle =
    updatedEntry.trainerUid &&
    updatedEntry.trainerUid !== entry.uid &&
    trainerDisplayName
      ? `${trainerDisplayLabel} · ${updatedEntry.name}`
      : `${updatedEntry.name} · ${formatDateHour(updatedEntry.createdAt)}`;

  const ownerPostMenu = (
    <Menu>
      <MenuButton
        as={IconButton}
        icon={<HamburgerIcon />}
        aria-label="Post actions"
        variant="ghost"
        size="sm"
        borderRadius="full"
        color="white"
        bg="blackAlpha.500"
        _hover={{ bg: "blackAlpha.600" }}
      />
      <MenuList>
        <MenuItem
          icon={<EditIcon />}
          onClick={onEnhancedEditOpen}
          color="green.500"
          _hover={{
            bg: colors.editBg,
          }}
        >
          Enhanced Edit
        </MenuItem>
        <MenuItem
          onClick={handleProcessWorkout}
          color="blue.500"
          _hover={{
            bg: colors.processBg,
          }}
        >
          Process Workout Data
        </MenuItem>
        <MenuItem
          icon={<FiShare2 />}
          onClick={onShareOpen}
          color="green.500"
          _hover={{
            bg: colors.editBg,
          }}
        >
          Share Workout
        </MenuItem>
        <MenuItem
          icon={<DeleteIcon />}
          onClick={onDeleteOpen}
          color="red.500"
          _hover={{
            bg: colors.deleteBg,
          }}
        >
          Delete Post
        </MenuItem>
      </MenuList>
    </Menu>
  );

  const getSquareEntryMedia = (preferHighPriority, { compact = false } = {}) => (
    <Box
      position="relative"
      aspectRatio={ENTRY_POST_MEDIA_ASPECT}
      overflow="hidden"
      {...(compact
        ? {
            sx: {
              width: "min(max(236px, 58vw), 100%)",
              maxWidth: "100%",
              mx: "auto",
              borderRadius: "lg",
            },
          }
        : { w: "full" })}
    >
      {!imageLoaded && (
        <Skeleton
          position="absolute"
          inset={0}
          w="full"
          h="full"
          borderRadius="0"
          startColor={colors.borderColor}
          endColor={colors.borderColorInput}
        />
      )}
      {usesThemeDefaultPostArt ? (
        <EntryPostDefaultThemeArtwork
          key={`${entry._id}-default-art`}
          alt={entry.name}
          showLight={showLightDefaultBg}
          prefersReducedMotion={prefersReducedMotion}
          reveal={imageLoaded}
          onLoaded={handleImageLoad}
          decoding="async"
          fetchPriority={preferHighPriority ? "high" : "auto"}
          loading={preferHighPriority ? "eager" : "lazy"}
          boxProps={{
            position: "absolute",
            inset: 0,
            w: "100%",
            h: "100%",
          }}
        />
      ) : (
        <Image
          src={displayEntryImage}
          alt={entry.name}
          w="full"
          h="full"
          objectFit="cover"
          objectPosition="center"
          onError={handleImageError}
          fallbackSrc={postImageFallback}
          onLoad={handleImageLoad}
          decoding="async"
          fetchpriority={preferHighPriority ? "high" : "auto"}
          style={{
            position: "absolute",
            inset: 0,
            opacity: imageLoaded ? 1 : 0,
            transition: "opacity 0.3s ease-in-out",
            width: "100%",
            height: "100%",
            pointerEvents: imageLoaded ? "auto" : "none",
          }}
          loading={preferHighPriority ? "eager" : "lazy"}
        />
      )}
    </Box>
  );

  return (
    <>
      <Box alignSelf="center" w="full" maxW="448px" mx="auto">
        <FeedEntryCard
          profile={{
            displayName: captionHandle,
            imageSrc: profileImage,
            imageAlt: "User Profile",
            fallback: profileFallbackLetters,
          }}
          subtitle={feedSubtitle}
          image={getSquareEntryMedia(priority)}
          liked={isLiked}
          onToggleLike={() => handleLikeEntry(entry._id)}
          onCommentClick={handleCommentCompose}
          onProfileClick={handleAuthorProfileClick}
          likesCount={
            Array.isArray(updatedEntry.likes) ? updatedEntry.likes.length : 0
          }
          commentsCount={
            Array.isArray(updatedEntry.comments)
              ? updatedEntry.comments.length
              : 0
          }
          description={updatedEntry.description}
          headerTrailing={isOwner ? ownerPostMenu : undefined}
          toolbarExtra={
            isOwner ? (
              <IconButton
                aria-label="Edit post"
                icon={<EditIcon />}
                variant="ghost"
                size="sm"
                borderRadius="full"
                color={colors.currentTheme === "light" ? "gray.800" : "white"}
                _hover={{
                  bg:
                    colors.currentTheme === "light"
                      ? "blackAlpha.100"
                      : "whiteAlpha.200",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen();
                }}
              />
            ) : undefined
          }
          onCardClick={handleDetailOpen}
          footer={
            <VStack spacing={2} w="full">
              <Box w="full" px={0}>
                <HStack spacing={2} w="full">
                  <Input
                    ref={feedCommentInputRef}
                    aria-label="Add a comment"
                    placeholder="Add a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      focusCommentInput(e.currentTarget);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && comment.trim()) {
                        e.preventDefault();
                        handleCommentEntry(entry._id, comment);
                      }
                    }}
                    enterKeyHint="send"
                    inputMode="text"
                    autoComplete="off"
                    size="sm"
                    fontSize="11px"
                    borderRadius="4px"
                    borderColor={colors.borderColor}
                    _focus={{
                      borderColor: "blue.400",
                      boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                    }}
                    h="28px"
                    flex={1}
                  />
                  <Button
                    onClick={() => handleCommentEntry(entry._id, comment)}
                    px={3}
                    py={1}
                    size="sm"
                    fontSize="11px"
                    borderRadius="4px"
                    fontWeight="500"
                    h="28px"
                    bg={colors.bgMuted}
                    color={colors.textPrimary}
                    borderWidth="1px"
                    borderColor={colors.borderColor}
                    _hover={{ bg: colors.bgHover }}
                    isDisabled={!comment.trim()}
                    _disabled={{
                      opacity: 0.6,
                      cursor: "not-allowed",
                    }}
                  >
                    Post
                  </Button>
                </HStack>
              </Box>
            </VStack>
          }
        />
      </Box>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={handleDetailClose}
        size="xl"
        isCentered
        scrollBehavior="inside"
        blockScrollOnMount
        autoFocus={focusCommentOnOpen}
        initialFocusRef={focusCommentOnOpen ? detailCommentInputRef : undefined}
        returnFocusOnClose={false}
      >
        <ModalOverlay
          bg="transparent"
          backdropFilter="blur(1px)"
          style={{ background: "hsl(var(--workout-modal-overlay) / 0.72)" }}
        />
        <ModalContent
          position="relative"
          bg="transparent"
          boxShadow="none"
          maxW="min(440px, 92vw)"
          w="full"
          mx="auto"
          my={{ base: 4, md: 6 }}
          maxH="calc(100dvh - 2rem)"
          minH={0}
          overflowY="auto"
          sx={{
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
            overscrollBehavior: "contain",
          }}
          px={{ base: 1, md: 2 }}
          py={{ base: 2, md: 3 }}
        >
          <FeedEntryCard
            clipCardShell={false}
            clampDescription={false}
            className={cn("mx-auto w-full max-w-[448px]")}
            profile={{
              displayName: captionHandle,
              imageSrc: profileImage,
              imageAlt: "User Profile",
              fallback: profileFallbackLetters,
            }}
            subtitle={feedSubtitle}
            image={getSquareEntryMedia(false)}
            liked={isLiked}
            onToggleLike={() => handleLikeEntry(entry._id)}
            onProfileClick={handleAuthorProfileClick}
            onCommentClick={() => {
              const input = detailCommentInputRef.current;
              const anchor = document.getElementById(commentsAnchorId);
              const scroller = anchor?.closest(".chakra-modal__content");
              if (anchor && scroller instanceof HTMLElement) {
                const top =
                  anchor.getBoundingClientRect().top -
                  scroller.getBoundingClientRect().top +
                  scroller.scrollTop -
                  12;
                scroller.scrollTo({ top, behavior: "smooth" });
              }
              focusCommentInput(input);
            }}
            likesCount={
              Array.isArray(updatedEntry.likes) ? updatedEntry.likes.length : 0
            }
            commentsCount={
              Array.isArray(updatedEntry.comments)
                ? updatedEntry.comments.length
                : 0
            }
            description={updatedEntry.description}
            headerTrailing={isOwner ? ownerPostMenu : undefined}
            toolbarExtra={
              isOwner ? (
                <IconButton
                  aria-label="Edit post"
                  icon={<EditIcon />}
                  variant="ghost"
                  size="sm"
                  borderRadius="full"
                  color={colors.currentTheme === "light" ? "gray.800" : "white"}
                  _hover={{
                    bg:
                      colors.currentTheme === "light"
                        ? "blackAlpha.100"
                        : "whiteAlpha.200",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen();
                  }}
                />
              ) : undefined
            }
            footer={
              <VStack spacing={3} align="stretch" w="full">
                {Array.isArray(updatedEntry.likes) &&
                  updatedEntry.likes.length > 0 && (
                    <Box w="full">
                      <Text
                        fontWeight="semibold"
                        fontSize="sm"
                        mb={1}
                        color={colors.textDesc}
                      >
                        Liked by {updatedEntry.likes.length}{" "}
                        {updatedEntry.likes.length === 1
                          ? "person"
                          : "people"}
                      </Text>
                      <Box
                        fontSize="xs"
                        color={colors.textMuted}
                        lineHeight="1.35"
                      >
                        {updatedEntry.likes.map((user, idx) => (
                          <span key={user.uid || user._id}>
                            <Link
                              to={
                                user.uid === currentUser?.uid
                                  ? "/profile"
                                  : `/user/${user.uid}`
                              }
                            >
                              {user.username
                                ? `@${user.username}`
                                : user.name || "User"}
                            </Link>
                            {idx < updatedEntry.likes.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </Box>
                    </Box>
                  )}
                <Box w="full" id={commentsAnchorId}>
                  <HStack spacing={2} w="full">
                    <Input
                      ref={detailCommentInputRef}
                      aria-label="Add a comment"
                      placeholder="Add a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        focusCommentInput(e.currentTarget);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && comment.trim()) {
                          e.preventDefault();
                          handleCommentEntry(entry._id, comment);
                        }
                      }}
                      enterKeyHint="send"
                      inputMode="text"
                      autoComplete="off"
                      size="sm"
                      fontSize="11px"
                      borderRadius="4px"
                      borderColor={colors.borderColor}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow:
                          "0 0 0 1px var(--chakra-colors-blue-400)",
                      }}
                      bg={colors.bgCard}
                      flex={1}
                      h="28px"
                    />
                    <Button
                      onClick={() =>
                        handleCommentEntry(entry._id, comment)
                      }
                      px={3}
                      py={1}
                      size="sm"
                      fontSize="11px"
                      borderRadius="4px"
                      fontWeight="500"
                      h="28px"
                      bg={colors.bgMuted}
                      color={colors.textPrimary}
                      borderWidth="1px"
                      borderColor={colors.borderColor}
                      _hover={{ bg: colors.bgHover }}
                      isDisabled={!comment.trim()}
                      _disabled={{
                        opacity: 0.6,
                        cursor: "not-allowed",
                      }}
                    >
                      Post
                    </Button>
                  </HStack>

                  {Array.isArray(updatedEntry.comments) &&
                  updatedEntry.comments.length > 0 ? (
                    <Stack
                      divider={<Divider borderColor={colors.borderColor} />}
                      spacing={4}
                      pt={4}
                      w="full"
                    >
                      {updatedEntry.comments.map((cmt, index) => {
                        const commentIdStr = normalizeCommentMongoId(cmt);
                        const commentPicSrc =
                          cmt.picture || getCurrentUserProfilePicture();

                        return (
                          <Box key={commentIdStr ?? `legacy-comment-${index}`}>
                            <HStack spacing={2} align="flex-start">
                              <Image
                                src={commentPicSrc}
                                fallbackSrc={postImageFallback}
                                alt=""
                                boxSize="22px"
                                borderRadius="full"
                                objectFit="cover"
                                mt="4px"
                                flexShrink={0}
                              />
                              <VStack spacing={2} align="stretch" flex={1}>
                                <Flex
                                  justify="space-between"
                                  gap={2}
                                  wrap="wrap"
                                  align="flex-start"
                                  w="full"
                                >
                                  <HStack
                                    spacing={2}
                                    wrap="wrap"
                                    align="baseline"
                                    flex={1}
                                  >
                                    <Text
                                      fontWeight="600"
                                      fontSize="xs"
                                      color={colors.textDesc}
                                      noOfLines={1}
                                    >
                                      {cmt.username
                                        ? `@${cmt.username}`
                                        : cmt.name ||
                                          getCurrentUserDisplayName()}
                                    </Text>
                                    <Text fontSize="xs" color={colors.textMuted}>
                                      {formatDate(cmt.createdAt)}
                                    </Text>
                                    {cmt.edited ? (
                                      <Text
                                        fontSize="xs"
                                        color={colors.textMuted}
                                      >
                                        (edited)
                                      </Text>
                                    ) : null}
                                  </HStack>
                                  {commentIdStr &&
                                  canEditComment(cmt) ? (
                                    <Menu>
                                      <MenuButton
                                        as={IconButton}
                                        aria-label="Comment actions"
                                        icon={<HamburgerIcon />}
                                        variant="ghost"
                                        size="xs"
                                        borderRadius="full"
                                        color={colors.textMuted}
                                      />
                                      <MenuList fontSize="sm">
                                        <MenuItem
                                          icon={<EditIcon />}
                                          onClick={() =>
                                            setEditingComment(commentIdStr)
                                          }
                                        >
                                          Edit
                                        </MenuItem>
                                        <MenuItem
                                          icon={<DeleteIcon />}
                                          color="red.500"
                                          onClick={() =>
                                            handleCommentDelete(commentIdStr)
                                          }
                                        >
                                          Delete
                                        </MenuItem>
                                      </MenuList>
                                    </Menu>
                                  ) : null}
                                </Flex>

                                {commentIdStr &&
                                editingComment === commentIdStr ? (
                                  <VStack spacing={2} align="stretch">
                                    <Textarea
                                      value={cmt.text}
                                      onChange={(e) => {
                                        setUpdatedEntry((prevEntry) => ({
                                          ...prevEntry,
                                          comments:
                                            prevEntry.comments.map((c) =>
                                              normalizeCommentMongoId(c) ===
                                              commentIdStr
                                                ? {
                                                    ...c,
                                                    text: e.target.value,
                                                  }
                                                : c,
                                            ),
                                        }));
                                      }}
                                      rows={3}
                                      size="sm"
                                      resize="none"
                                      fontSize="11px"
                                      borderRadius="4px"
                                      borderColor={colors.borderColor}
                                      bg={colors.bgCard}
                                      _focus={{
                                        borderColor: "blue.400",
                                        boxShadow:
                                          "0 0 0 1px var(--chakra-colors-blue-400)",
                                      }}
                                    />
                                    <HStack spacing={2}>
                                      <Button
                                        size="sm"
                                        px={3}
                                        fontSize="11px"
                                        h="28px"
                                        borderRadius="4px"
                                        bg={colors.bgMuted}
                                        color={colors.textPrimary}
                                        borderWidth="1px"
                                        borderColor={colors.borderColor}
                                        _hover={{ bg: colors.bgHover }}
                                        onClick={() =>
                                          handleCommentEdit(
                                            commentIdStr,
                                            cmt.text,
                                          )
                                        }
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        px={3}
                                        fontSize="11px"
                                        h="28px"
                                        borderRadius="4px"
                                        onClick={() =>
                                          setEditingComment(null)
                                        }
                                      >
                                        Cancel
                                      </Button>
                                    </HStack>
                                  </VStack>
                                ) : (
                                  <Text
                                    whiteSpace="pre-wrap"
                                    wordBreak="break-word"
                                    fontSize="xs"
                                    lineHeight="1.35"
                                    color={colors.textDesc}
                                  >
                                    {cmt.text}
                                  </Text>
                                )}

                                <HStack spacing={5} mt={2} wrap="wrap">
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    minW="unset"
                                    h="auto"
                                    minH={0}
                                    py={1}
                                    px={0}
                                    fontSize="11px"
                                    fontWeight="normal"
                                    isDisabled={!commentIdStr}
                                    color={
                                      hasLikedComment(cmt)
                                        ? "red.500"
                                        : colors.textMuted
                                    }
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (!commentIdStr) return;
                                      handleCommentLike(commentIdStr);
                                    }}
                                  >
                                    Like · {cmt.likes?.length || 0}
                                  </Button>
                                  {commentIdStr ? (
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      minW="unset"
                                      h="auto"
                                      minH={0}
                                      py={1}
                                      px={0}
                                      fontSize="11px"
                                      fontWeight="normal"
                                      color={
                                        replyToComment === commentIdStr
                                          ? colors.textDesc
                                          : colors.textMuted
                                      }
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setReplyToComment((current) =>
                                          current === commentIdStr
                                            ? null
                                            : commentIdStr,
                                        );
                                      }}
                                    >
                                      Reply
                                    </Button>
                                  ) : null}
                                </HStack>

                                {commentIdStr &&
                                replyToComment === commentIdStr ? (
                                  <HStack spacing={2} w="full" mt={3}>
                                    <Input
                                      aria-label="Write a reply"
                                      placeholder="Write a reply..."
                                      value={replyText}
                                      flex={1}
                                      minW={0}
                                      onChange={(e) =>
                                        setReplyText(e.target.value)
                                      }
                                      size="sm"
                                      fontSize="11px"
                                      borderRadius="4px"
                                      borderColor={colors.borderColor}
                                      _focus={{
                                        borderColor: "blue.400",
                                        boxShadow:
                                          "0 0 0 1px var(--chakra-colors-blue-400)",
                                      }}
                                      bg={colors.bgCard}
                                      h="28px"
                                    />
                                    <Button
                                      px={3}
                                      py={1}
                                      size="sm"
                                      fontSize="11px"
                                      borderRadius="4px"
                                      fontWeight="500"
                                      h="28px"
                                      bg={colors.bgMuted}
                                      color={colors.textPrimary}
                                      borderWidth="1px"
                                      borderColor={colors.borderColor}
                                      _hover={{ bg: colors.bgHover }}
                                      isDisabled={!replyText.trim()}
                                      _disabled={{
                                        opacity: 0.6,
                                        cursor: "not-allowed",
                                      }}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleCommentReply(
                                          commentIdStr,
                                          replyText,
                                        );
                                      }}
                                    >
                                      Reply
                                    </Button>
                                    <Button
                                      variant="outline"
                                      px={3}
                                      py={1}
                                      size="sm"
                                      fontSize="11px"
                                      borderRadius="4px"
                                      h="28px"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setReplyToComment(null);
                                        setReplyText("");
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </HStack>
                                ) : null}

                                {cmt.replies && cmt.replies.length > 0 ? (
                                  <VStack
                                    spacing={2}
                                    align="stretch"
                                    pl={3}
                                    ml={3}
                                    pt={3}
                                    borderLeftWidth="1px"
                                    borderLeftColor={colors.borderColor}
                                  >
                                    {cmt.replies.map((reply, replyIndex) => (
                                      <HStack
                                        key={reply._id || replyIndex}
                                        spacing={2}
                                        align="flex-start"
                                      >
                                        <Image
                                          src={
                                            reply.picture ||
                                            getCurrentUserProfilePicture()
                                          }
                                          fallbackSrc={postImageFallback}
                                          alt=""
                                          boxSize="18px"
                                          borderRadius="full"
                                          objectFit="cover"
                                          mt="4px"
                                          flexShrink={0}
                                        />
                                        <VStack
                                          spacing={0.5}
                                          align="stretch"
                                          minW={0}
                                          flex={1}
                                        >
                                          <HStack spacing={2} wrap="wrap">
                                            <Text
                                              fontWeight="600"
                                              fontSize="xs"
                                              color={colors.textDesc}
                                              noOfLines={1}
                                            >
                                              {reply.username
                                                ? `@${reply.username}`
                                                : reply.name ||
                                                  "User"}
                                            </Text>
                                            <Text
                                              fontSize="11px"
                                              color={colors.textMuted}
                                            >
                                              {formatDate(reply.createdAt)}
                                            </Text>
                                          </HStack>
                                          <Text
                                            whiteSpace="pre-wrap"
                                            wordBreak="break-word"
                                            fontSize="xs"
                                            lineHeight="1.35"
                                            color={colors.textDesc}
                                          >
                                            {reply.text}
                                          </Text>
                                        </VStack>
                                      </HStack>
                                    ))}
                                  </VStack>
                                ) : null}
                              </VStack>
                            </HStack>
                          </Box>
                        );
                      })}
                    </Stack>
                  ) : null}
                </Box>
              </VStack>
            }
          />
        </ModalContent>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="xl"
        isCentered={editModalCentered}
        scrollBehavior="inside"
      >
        <ModalOverlay
          bg="transparent"
          backdropFilter="blur(1px)"
          style={{ background: "hsl(var(--workout-modal-overlay) / 0.72)" }}
        />
        <ModalContent
          ref={editModalScrollRef}
          position="relative"
          bg="transparent"
          boxShadow="none"
          maxW="min(440px, 92vw)"
          w="full"
          mx="auto"
          my={{ base: 4, md: 6 }}
          maxH="calc(100dvh - 2rem)"
          minH={0}
          overflowY="auto"
          sx={{
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
            overscrollBehavior: "contain",
          }}
          px={{ base: 1, md: 2 }}
          py={{ base: 2, md: 3 }}
          onFocusCapture={(event) => {
            const node = event.target;
            if (
              node instanceof HTMLInputElement ||
              node instanceof HTMLTextAreaElement
            ) {
              ensureEditableFieldVisibleInEditModal(node);
            }
          }}
        >
          <ModalCloseButton
            size="md"
            borderRadius="full"
            zIndex={10}
            bg={colors.bgMuted}
            color={colors.textPrimary}
            borderWidth="1px"
            borderColor={colors.borderColor}
            _hover={{ bg: colors.bgHover }}
          />
          <FeedEntryCard
            clipCardShell={false}
            className={cn("mx-auto w-full max-w-[448px]")}
            profile={{
              displayName: captionHandle,
              imageSrc: profileImage,
              imageAlt: "User Profile",
              fallback: profileFallbackLetters,
            }}
            subtitle={`Edit · ${feedSubtitle}`}
            image={getSquareEntryMedia(false, { compact: true })}
            liked={isLiked}
            onToggleLike={() => {}}
            onProfileClick={handleAuthorProfileClick}
            likesCount={
              Array.isArray(updatedEntry.likes) ? updatedEntry.likes.length : 0
            }
            commentsCount={
              Array.isArray(updatedEntry.comments)
                ? updatedEntry.comments.length
                : 0
            }
            description=""
            showSocialToolbar={false}
            captionReplacement={
              <VStack spacing={3} align="stretch" w="full">
                <Input
                  placeholder="Entry Name"
                  name="name"
                  value={updatedEntry.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setUpdatedEntry((prev) => ({ ...prev, name: value }));
                  }}
                  fontFamily="Arial, sans-serif"
                  bg={colors.bgMuted}
                  color={colors.textPrimary}
                  borderColor={colors.border}
                  _placeholder={{ color: colors.textMuted }}
                  _focus={{ borderColor: colors.border, bg: colors.bgMuted }}
                />
                <Textarea
                  placeholder="Workout Split"
                  minH="160px"
                  name="description"
                  value={updatedEntry.description}
                  onChange={(e) => {
                    const value = e.target.value;
                    setUpdatedEntry((prev) => ({
                      ...prev,
                      description: value,
                    }));
                  }}
                  fontFamily="Arial, sans-serif"
                  bg={colors.bgMuted}
                  color={colors.textPrimary}
                  borderColor={colors.border}
                  _placeholder={{ color: colors.textMuted }}
                  _focus={{ borderColor: colors.border, bg: colors.bgMuted }}
                />
                {(editAutosaveMeta.status === "saving" ||
                  editAutosaveMeta.status === "saved" ||
                  editAutosaveMeta.status === "error") && (
                  <Text
                    fontSize="sm"
                    color={colors.textMuted}
                    w="full"
                    noOfLines={2}
                    minH="2.6em"
                    lineHeight="1.3"
                    display="flex"
                    alignItems="center"
                  >
                    {editAutosaveMeta.status === "saving"
                      ? "Saving to your post…"
                      : editAutosaveMeta.status === "saved"
                      ? `Saved to your post${editAutosaveMeta.lastSavedAt ? ` (${new Date(editAutosaveMeta.lastSavedAt).toLocaleTimeString()})` : ""}`
                      : "Could not save to your post. Check your connection."}
                  </Text>
                )}
              </VStack>
            }
            footer={
              <VStack spacing={2} align="stretch" w="full">
                <FileUploader
                  handleFile={handleFileUpload}
                  cropAspect={ENTRY_POST_IMAGE_ASPECT}
                  compact
                />
                <HStack spacing={3} justify="flex-end" flexWrap="wrap" w="full">
                  <Button
                    variant="outline"
                    onClick={handleRevertEdits}
                    isDisabled={
                      !editBaselineSnapshot ||
                      currentEditSnapshot === editBaselineSnapshot
                    }
                    fontFamily="Arial, sans-serif"
                    color={colors.textPrimary}
                    borderColor={colors.borderColor}
                    _hover={{ bg: colors.bgHover }}
                  >
                    Revert
                  </Button>
                  <Button
                    colorScheme="blue"
                    onClick={() => handleUpdateEntry(entry._id, updatedEntry)}
                    isLoading={isUpdateSubmitting}
                    spinner={<ButtonLoadingSpinner />}
                    loadingText="Updating"
                    fontFamily="Arial, sans-serif"
                  >
                    Update
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={onClose}
                    fontFamily="Arial, sans-serif"
                    color={colors.textSecondary}
                    _hover={{ bg: colors.bgHover }}
                  >
                    Cancel
                  </Button>
                </HStack>
              </VStack>
            }
          />
        </ModalContent>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalOverlay />
        <ModalContent bg={colors.bgCard}>
          <ModalHeader color={colors.textPrimary}>Confirm Delete</ModalHeader>
          <ModalCloseButton color={colors.textMuted} />
          <ModalBody>
            <Text color={colors.textPrimary}>
              Are you sure you want to delete this entry?
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="red"
              onClick={() => handleDeleteEntry(entry._id)}
            >
              Delete
            </Button>
            <Button
              variant="ghost"
              onClick={onDeleteClose}
              color={colors.textPrimary}
              _hover={{ bg: colors.bgHover }}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Share Workout Modal */}
      <ShareWorkoutModal
        isOpen={isShareOpen}
        onClose={onShareClose}
        entry={updatedEntry}
      />

      {/* Enhanced Workout Editor */}
      <EnhancedWorkoutEditor
        isOpen={isEnhancedEditOpen}
        onClose={onEnhancedEditClose}
        entry={entry}
        onUpdate={handleUpdateEntry}
        onSuccess={() => {
          toastSuccess("Success", "Workout updated successfully");
        }}
      />
    </>
  );
});

ProductCard.propTypes = {
  entry: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    image: PropTypes.string,
    likes: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.arrayOf(PropTypes.string),
      PropTypes.arrayOf(
        PropTypes.shape({
          uid: PropTypes.string,
          name: PropTypes.string,
          username: PropTypes.string,
          picture: PropTypes.string,
        })
      ),
    ]),
    comments: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string.isRequired,
        createdAt: PropTypes.string.isRequired,
      })
    ),
    createdAt: PropTypes.string,
    uid: PropTypes.string,
  }).isRequired,
  isOwner: PropTypes.bool,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func,
  profileCache: PropTypes.instanceOf(Map),
  priority: PropTypes.bool,
  detailOpen: PropTypes.bool,
  onDetailOpenChange: PropTypes.func,
};

export default ProductCard;
