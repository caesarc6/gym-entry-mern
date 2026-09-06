import { Box, Center, Container, VStack } from "@chakra-ui/react";
import { ButtonLoadingSpinner, LoadingIndicator } from "../components/loading";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProductStore } from "../store/product";
import { FileUploader } from "../components/FileUploader"; // Import the FileUploader component
import { ENTRY_POST_IMAGE_ASPECT } from "../constants/imageAspectRatios";
import { useCustomToast } from "../hooks/useCustomToast";
import { getCurrentAuthUser } from "../utils/auth";
import {
  fetchWorkoutHabitSummary,
  syncWorkoutHabitWidget,
} from "../utils/workoutHabitWidget";
import { supabase } from "../supabase/supabase";
import SignedOutTabPrompt from "../components/SignedOutTabPrompt";
import Card11 from "../components/ui/card-11";
import { cn } from "../lib/utils";
import { isCapacitorNative as getIsCapacitorNative } from "../utils/isNativePlatform";

const isCapacitorNative = getIsCapacitorNative();

const CreatePage = () => {
  const draftStorageKey = useMemo(() => "gym-entry:create-post-draft:v1", []);
  const draftMaxAgeMs = useMemo(() => 30 * 24 * 60 * 60 * 1000, []);
  const [newPost, setNewPost] = useState({
    name: "",
    description: "",
    image: "",
    uid: "",
  });
  const [isPostImageActive, setIsPostImageActive] = useState(false);
  const postImagePreviewRef = useRef(null);
  const [fileUploaderKey, setFileUploaderKey] = useState(0);
  const [draftReady, setDraftReady] = useState(false);
  const skipDraftSaveRef = useRef(false);
  const newPostRef = useRef(newPost);
  newPostRef.current = newPost;
  const [sessionResolved, setSessionResolved] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate(); // Initialize useNavigate

  const persistDraft = (post) => {
    if (skipDraftSaveRef.current) return;

    const draft = {
      version: 1,
      lastLocalSaveAt: new Date().toISOString(),
      name: post?.name ?? "",
      description: post?.description ?? "",
      image: post?.image ?? "",
      postImage: post?.postImage ?? "",
      postImageName: post?.postImageName ?? "",
    };

    const hasContent =
      String(draft.name).trim() ||
      String(draft.description).trim() ||
      String(draft.postImage).trim() ||
      String(draft.image).trim();

    try {
      if (!hasContent) {
        localStorage.removeItem(draftStorageKey);
        return;
      }
      localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    } catch {
      // Best-effort: localStorage may be full (especially with images).
      try {
        const { postImage, ...withoutImage } = draft;
        localStorage.setItem(draftStorageKey, JSON.stringify(withoutImage));
      } catch {
        // ignore save errors
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await getCurrentAuthUser();
      if (cancelled) return;
      setAuthUser(user);
      setIsSignedIn(Boolean(user));
      setSessionResolved(true);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(
        session?.user
          ? {
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
            }
          : null
      );
      setIsSignedIn(Boolean(session?.user));
      setSessionResolved(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      if (parsed.lastLocalSaveAt) {
        const age = Date.now() - new Date(parsed.lastLocalSaveAt).getTime();
        if (!Number.isFinite(age) || age > draftMaxAgeMs) {
          localStorage.removeItem(draftStorageKey);
          return;
        }
      }
      setNewPost((prev) => ({
        ...prev,
        name: typeof parsed.name === "string" ? parsed.name : prev.name,
        description:
          typeof parsed.description === "string"
            ? parsed.description
            : prev.description,
        image: typeof parsed.image === "string" ? parsed.image : prev.image,
        postImage:
          typeof parsed.postImage === "string" ? parsed.postImage : prev.postImage,
        postImageName:
          typeof parsed.postImageName === "string"
            ? parsed.postImageName
            : prev.postImageName,
      }));
    } catch {
      // ignore draft hydration errors
    } finally {
      setDraftReady(true);
    }
  }, [draftMaxAgeMs, draftStorageKey]);

  useEffect(() => {
    if (!draftReady) return;
    if (skipDraftSaveRef.current) return;

    const timeoutId = setTimeout(() => {
      persistDraft(newPostRef.current);
    }, 350);

    return () => {
      clearTimeout(timeoutId);
    };
    // persistDraft closes over draftStorageKey only; newPostRef holds latest fields
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftReady, draftStorageKey, newPost]);

  // Flush draft on leave / background so a cancelled debounce cannot drop recent typing.
  useEffect(() => {
    if (!draftReady) return undefined;

    const flush = () => {
      persistDraft(newPostRef.current);
    };

    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftReady, draftStorageKey]);

  const handleFileUpload = (file) => {
    const reader = new FileReader();

    reader.onloadstart = () => {};

    reader.onloadend = () => {
      setNewPost((prev) => ({
        ...prev,
        postImage: reader.result,
        postImageName: file?.name,
      }));
    };

    reader.onerror = (error) => {};

    if (file) {
      reader.readAsDataURL(file);
    } else {
      setNewPost((prev) => ({
        ...prev,
        postImage: "",
        postImageName: "",
      }));
      setIsPostImageActive(false);
      setFileUploaderKey((k) => k + 1); // reset uploader UI (compression info, etc.)
    }
  };

  // Un-highlight preview when clicking outside it
  useEffect(() => {
    if (!isPostImageActive || !newPost?.postImage) return;

    const onPointerDown = (e) => {
      const el = postImagePreviewRef.current;
      if (!el) return;
      if (el.contains(e.target)) return;
      setIsPostImageActive(false);
    };

    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("touchstart", onPointerDown, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("touchstart", onPointerDown, true);
    };
  }, [isPostImageActive, newPost?.postImage]);

  const toast = useCustomToast();

  const {
    createPost,
    addOptimisticPost,
    replaceOptimisticPost,
    removeOptimisticPost,
    beginOptimisticWorkoutHabit,
    confirmWorkoutHabitSummary,
    rollbackOptimisticWorkoutHabit,
    clearOptimisticWorkoutHabit,
  } = useProductStore();
  const currentUserInfo = useProductStore((state) => state.currentUserInfo);

  const handleAddPost = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    let optimisticPostId = null;
    let previousHabitSummary = null;
    let didOptimisticHabit = false;

    // get current user from auth
    try {
      const currentUser = authUser || (await getCurrentAuthUser());
      if (!currentUser) {
        toast.error("Error", "You must be signed in to create a post.");
        return;
      }
      const currUser = currentUser.uid;

      const postWithUID = { ...newPost, uid: currUser };
      const tempId = `optimistic-${Date.now()}`;
      optimisticPostId = tempId;
      const optimisticEntry = {
        _id: tempId,
        uid: currUser,
        ownerId: currUser,
        name: newPost.name,
        description: newPost.description,
        image: newPost.postImage || newPost.image || null,
        likes: [],
        comments: [],
        createdAt: new Date().toISOString(),
        authorProfile: {
          uid: currUser,
          profileImage:
            currentUserInfo?.picture || currentUser.picture || "",
          displayName:
            currentUserInfo?.username ||
            currentUserInfo?.name ||
            currentUser.name ||
            "You",
          isUsername: Boolean(currentUserInfo?.username),
        },
        isOptimistic: true,
      };

      previousHabitSummary =
        useProductStore.getState().workoutHabitSummary;
      beginOptimisticWorkoutHabit({
        _id: optimisticEntry._id,
        name: optimisticEntry.name,
        description: optimisticEntry.description,
        image: optimisticEntry.image,
        createdAt: optimisticEntry.createdAt,
        uid: optimisticEntry.uid,
      });
      didOptimisticHabit = true;
      const optimisticHabitSummary =
        useProductStore.getState().workoutHabitSummary;
      void syncWorkoutHabitWidget(optimisticHabitSummary).catch(() => {});

      addOptimisticPost(optimisticEntry);
      // Keep the submitted content in localStorage until the request succeeds so a
      // failed create can restore it. Skipping saves prevents the cleared form from
      // wiping that draft.
      skipDraftSaveRef.current = true;
      try {
        localStorage.setItem(
          draftStorageKey,
          JSON.stringify({
            version: 1,
            lastLocalSaveAt: new Date().toISOString(),
            name: postWithUID.name ?? "",
            description: postWithUID.description ?? "",
            image: postWithUID.image ?? "",
            postImage: postWithUID.postImage ?? "",
            postImageName: postWithUID.postImageName ?? "",
          }),
        );
      } catch {
        // ignore
      }
      setNewPost({ name: "", description: "", image: "", uid: "" });
      navigate("/");

      const { success, message, data } = await createPost(postWithUID);

      if (!success) {
        removeOptimisticPost(tempId);
        if (didOptimisticHabit) {
          rollbackOptimisticWorkoutHabit(previousHabitSummary);
          void syncWorkoutHabitWidget(previousHabitSummary).catch(() => {});
        }
        skipDraftSaveRef.current = false;
        toast.error("Error", message);
      } else {
        replaceOptimisticPost(tempId, data);
        try {
          const confirmedSummary = await fetchWorkoutHabitSummary();
          confirmWorkoutHabitSummary(confirmedSummary);
          void syncWorkoutHabitWidget(confirmedSummary).catch(() => {});
        } catch {
          clearOptimisticWorkoutHabit();
        }
        try {
          localStorage.removeItem(draftStorageKey);
        } catch {
          // ignore
        }
        toast.success("Success", message);
      }
    } catch (error) {
      if (optimisticPostId) {
        removeOptimisticPost(optimisticPostId);
      }
      if (didOptimisticHabit) {
        rollbackOptimisticWorkoutHabit(previousHabitSummary);
        void syncWorkoutHabitWidget(previousHabitSummary).catch(() => {});
      }
      skipDraftSaveRef.current = false;
      toast.error("Error", error?.message || "Failed to create post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    String(newPost?.name || "").trim().length > 0 &&
    String(newPost?.description || "").trim().length > 0;

  const cardProfile = useMemo(() => {
    const displayName =
      currentUserInfo?.username ||
      currentUserInfo?.name ||
      authUser?.name ||
      "You";
    const handleStem =
      currentUserInfo?.username ||
      authUser?.email?.split("@")[0] ||
      "you";
    const picture = currentUserInfo?.picture || authUser?.picture || "";
    const initials = displayName.trim().slice(0, 2).toUpperCase() || "YO";
    return {
      name: displayName,
      handle: `@${handleStem}`,
      imageSrc: picture,
      imageAlt: displayName,
      fallback: initials,
    };
  }, [authUser, currentUserInfo]);

  if (!sessionResolved) {
    return (
      <Container
        maxW="container.sm"
        className={cn(
          isCapacitorNative &&
            "flex min-h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom,0px))] flex-col justify-center",
        )}
      >
        <Center minH={isCapacitorNative ? undefined : "50vh"}>
          <LoadingIndicator variant="hero" chakraColor="blue.400" />
        </Center>
      </Container>
    );
  }

  if (!isSignedIn) {
    return <SignedOutTabPrompt variant="create" />;
  }

  return (
    <Container
      maxW={"container.sm"}
      className={cn(
        isCapacitorNative
          ? "flex min-h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom,0px))] flex-col justify-center py-6 pt-[max(1.5rem,env(safe-area-inset-top,0px))]"
          : "pt-[6.5rem] md:pt-28",
      )}
    >
      <VStack spacing={8} w="full">
        <Box w="full" maxW="md" mx="auto">
          <Card11
            profile={cardProfile}
            sessionTitle={newPost.name}
            onSessionTitleChange={(value) =>
              setNewPost((prev) => ({ ...prev, name: value }))
            }
            description={newPost.description}
            onDescriptionChange={(value) =>
              setNewPost((prev) => ({ ...prev, description: value }))
            }
            imagePreviewSrc={newPost.postImage}
            imageAlt="Post image preview"
            isImageHighlight={isPostImageActive}
            imagePreviewRef={postImagePreviewRef}
            onImagePreviewClick={() =>
              setIsPostImageActive((active) => !active)
            }
            onRemoveImage={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFileUpload(null);
            }}
            uploadSlot={
              <FileUploader
                key={fileUploaderKey}
                handleFile={handleFileUpload}
                maxSizeMB={5}
                showSelectedPreview={false}
                cropAspect={ENTRY_POST_IMAGE_ASPECT}
                variant="subtle"
              />
            }
            previewSubtitle="Draft saves automatically while you type."
          />
          <button
            type="button"
            onClick={() => {
              handleAddPost();
            }}
            disabled={!canSubmit || isSubmitting}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-3.5 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <ButtonLoadingSpinner />
                <span>Adding…</span>
              </>
            ) : (
              <span>Add post</span>
            )}
          </button>
        </Box>
      </VStack>
    </Container>
  );
};
export default CreatePage;
