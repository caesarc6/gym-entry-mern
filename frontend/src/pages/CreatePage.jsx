import { Box, Button, Center, Container, Heading, VStack } from "@chakra-ui/react";
import { ButtonLoadingSpinner, LoadingIndicator } from "../components/loading";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProductStore } from "../store/product";
import { FileUploader } from "../components/FileUploader"; // Import the FileUploader component
import { ENTRY_POST_IMAGE_ASPECT } from "../constants/imageAspectRatios";
import { useThemeColors } from "../hooks/useThemeColors";
import { useCustomToast } from "../hooks/useCustomToast";
import { getCurrentAuthUser } from "../utils/auth";
import { supabase } from "../supabase/supabase";
import SignedOutTabPrompt from "../components/SignedOutTabPrompt";
import Card11 from "../components/ui/card-11";

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
  const didHydrateDraftRef = useRef(false);
  const saveDraftTimeoutRef = useRef(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate(); // Initialize useNavigate
  const colors = useThemeColors();

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
      if (!raw) {
        didHydrateDraftRef.current = true;
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        didHydrateDraftRef.current = true;
        return;
      }
      if (parsed.lastLocalSaveAt) {
        const age = Date.now() - new Date(parsed.lastLocalSaveAt).getTime();
        if (!Number.isFinite(age) || age > draftMaxAgeMs) {
          localStorage.removeItem(draftStorageKey);
          didHydrateDraftRef.current = true;
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
      didHydrateDraftRef.current = true;
    }
  }, [draftMaxAgeMs, draftStorageKey]);

  useEffect(() => {
    if (!didHydrateDraftRef.current) return;

    if (saveDraftTimeoutRef.current) {
      clearTimeout(saveDraftTimeoutRef.current);
    }

    // Debounce so we don't thrash localStorage while typing.
    saveDraftTimeoutRef.current = setTimeout(() => {
      const draft = {
        version: 1,
        lastLocalSaveAt: new Date().toISOString(),
        name: newPost?.name ?? "",
        description: newPost?.description ?? "",
        image: newPost?.image ?? "",
        postImage: newPost?.postImage ?? "",
        postImageName: newPost?.postImageName ?? "",
      };

      try {
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
    }, 350);

    return () => {
      if (saveDraftTimeoutRef.current) {
        clearTimeout(saveDraftTimeoutRef.current);
      }
    };
  }, [draftStorageKey, newPost]);

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
  } = useProductStore();
  const currentUserInfo = useProductStore((state) => state.currentUserInfo);

  const handleAddPost = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    let optimisticPostId = null;

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

      addOptimisticPost(optimisticEntry);
      setNewPost({ name: "", description: "", image: "", uid: "" });
      navigate("/");

      const { success, message, data } = await createPost(postWithUID);

      if (!success) {
        removeOptimisticPost(tempId);
        toast.error("Error", message);
      } else {
        replaceOptimisticPost(tempId, data);
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
      <Container maxW="container.sm">
        <Center minH="50vh">
          <LoadingIndicator variant="hero" chakraColor="blue.400" />
        </Center>
      </Container>
    );
  }

  if (!isSignedIn) {
    return <SignedOutTabPrompt variant="create" />;
  }

  return (
    <Container maxW={"container.sm"}>
      <VStack spacing={8}>
        <Heading
          color={colors.textPrimary}
          p={3}
          as={"h1"}
          size={"2xl"}
          textAlign={"center"}
          mb={8}
          mt={24}
        >
          Create New Post
        </Heading>

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
              />
            }
            previewSubtitle="Draft saves automatically while you type."
          />
          <Button
            mt={5}
            colorScheme="blue"
            onClick={() => {
              handleAddPost();
            }}
            isDisabled={!canSubmit || isSubmitting}
            isLoading={isSubmitting}
            loadingText="Adding..."
            spinner={<ButtonLoadingSpinner />}
            w="full"
          >
            Add Post
          </Button>
        </Box>
      </VStack>
    </Container>
  );
};
export default CreatePage;
