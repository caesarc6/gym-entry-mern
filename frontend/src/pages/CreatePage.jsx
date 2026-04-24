import {
  Alert,
  AlertDescription,
  Box,
  Button,
  Center,
  Container,
  FormControl,
  FormLabel,
  Heading,
  IconButton,
  Input,
  Image,
  Spinner,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProductStore } from "../store/product";
import { FileUploader } from "../components/FileUploader"; // Import the FileUploader component
import night from "../assets/night.jpg";
import day from "../assets/light.jpg";
import defaultBg from "../assets/defaultBg.jpg";
import defaultBgNight from "../assets/defaultBgNight.jpg";
import { useThemeColors } from "../hooks/useThemeColors";
import { useCustomToast } from "../hooks/useCustomToast";
import { getCurrentAuthUser } from "../utils/auth";
import { supabase } from "../supabase/supabase";
import SignedOutTabPrompt from "../components/SignedOutTabPrompt";

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

  const navigate = useNavigate(); // Initialize useNavigate
  const colors = useThemeColors();
  const bgColorMode =
    colors.currentTheme === "light" ? defaultBg : defaultBgNight;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await getCurrentAuthUser();
      if (cancelled) return;
      setIsSignedIn(Boolean(user));
      setSessionResolved(true);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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

  const { createPost } = useProductStore();

  const handleAddPost = async () => {
    // get current user from auth
    const currentUser = await getCurrentAuthUser();
    if (!currentUser) {
      toast.error("Error", "You must be signed in to create a post.");
      return;
    }
    const currUser = currentUser.uid;

    const postWithUID = { ...newPost, uid: currUser };

    const { success, message } = await createPost(postWithUID);

    if (!success) {
      toast.error("Error", message);
    } else {
      toast.success("Success", message);
      try {
        localStorage.removeItem(draftStorageKey);
      } catch {
        // ignore
      }
      // Redirect to the main page after successful entry creation
      navigate("/"); // Replace "/" with the path to your main page
      setNewPost({ name: "", description: "", image: "", uid: "" });
    }
  };

  const canSubmit =
    String(newPost?.name || "").trim().length > 0 &&
    String(newPost?.description || "").trim().length > 0;

  if (!sessionResolved) {
    return (
      <Container maxW="container.sm">
        <Center minH="50vh">
          <Spinner size="lg" color="blue.400" />
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

        <Box w={"full"} bg={colors.bgCard} p={6} rounded={"lg"} shadow={"md"}>
          <VStack spacing={5} w="full" align="stretch">
            <Alert
              status="info"
              variant="subtle"
              bg={colors.bgMuted}
              color={colors.textPrimary}
              rounded="md"
            >
              <AlertDescription>
                Draft saves automatically while you type.
              </AlertDescription>
            </Alert>

            <FormControl isRequired>
              <FormLabel color={colors.textPrimary} mb={2}>
                Workout session name
              </FormLabel>
              <Input
                placeholder="e.g. Arm Day"
                name="title"
                value={newPost.name}
                onChange={(e) => {
                  setNewPost({ ...newPost, name: e.target.value });
                }}
                w="full"
                color={colors.textPrimary}
                borderColor={colors.borderColorInput}
                _placeholder={{ color: colors.textMuted }}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel color={colors.textPrimary} mb={2}>
                Workout description
              </FormLabel>
              <Textarea
                minH="185px"
                placeholder={`E.g.\nDumbbell curls 6lbs: 3 sets of 10 reps`}
                name="description"
                value={newPost.description}
                onChange={(e) => {
                  setNewPost({ ...newPost, description: e.target.value });
                }}
                w="full"
                color={colors.textPrimary}
                borderColor={colors.borderColorInput}
                _placeholder={{ color: colors.textMuted }}
              />
            </FormControl>

            {/* <Input
              placeholder="Image URL (optional)"
              name="image"
              value={newPost.image}
              onChange={(e) =>
                setNewPost({ ...newPost, image: e.target.value })
              }
              w="full"
            /> */}

            <FormControl>
              <FormLabel color={colors.textPrimary} mb={2} textAlign="center">
                Image (optional)
              </FormLabel>
              <VStack spacing={3} align="center" w="full">
                {newPost.postImage ? (
                  <Box
                    ref={postImagePreviewRef}
                    position="relative"
                    borderRadius="2xl"
                    overflow="hidden"
                    border="1px solid"
                    borderColor={isPostImageActive ? "blue.400" : colors.borderColorInput}
                    boxShadow={isPostImageActive ? "0 10px 30px rgba(0,0,0,0.25)" : "0 6px 18px rgba(0,0,0,0.18)"}
                    transform={isPostImageActive ? "scale(1.01)" : "scale(1)"}
                    transition="transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease"
                    onClick={() => setIsPostImageActive((v) => !v)}
                    cursor="pointer"
                    w="220px"
                    h="160px"
                    bg={colors.bgMuted}
                  >
                    {/* subtle top gradient like native media cards */}
                    <Box
                      position="absolute"
                      inset={0}
                      bgGradient="linear(to-b, blackAlpha.400, transparent 35%)"
                      pointerEvents="none"
                      opacity={0.65}
                    />

                    <Image
                      src={newPost.postImage}
                      alt="Post image preview"
                      backgroundColor={colors.bgMuted}
                      w="100%"
                      h="100%"
                      objectFit="cover"
                    />

                    {isPostImageActive ? (
                      <IconButton
                        aria-label="Remove photo"
                        icon={<CloseIcon boxSize={3} />}
                        size="sm"
                        variant="solid"
                        colorScheme="blackAlpha"
                        position="absolute"
                        top={3}
                        right={3}
                        borderRadius="full"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFileUpload(null);
                        }}
                      />
                    ) : null}
                  </Box>
                ) : null}
                <FileUploader
                  key={fileUploaderKey}
                  handleFile={handleFileUpload}
                  maxSizeMB={5}
                  showSelectedPreview={false}
                />
              </VStack>
            </FormControl>
            {/* <Input
              className="form-control form-control-lg mb-2 mt-2 !w-[267px] !h-[47px] text-lg text-center font-weight-light hover:file:cursor-pointer hover:file:text-slate-600 content-center"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onloadend = () => {
                  setNewPost({
                    ...newPost,
                    postImage: reader.result,
                    postImageName: file.name,
                  });
                  // console buffer of image
                };
                if (file) {
                  reader.readAsDataURL(file);
                }
              }}
              fontFamily="Arial, sans-serif"
            /> */}
            <Button
              colorScheme="blue"
              onClick={(e) => {
                handleAddPost();
              }}
              isDisabled={!canSubmit}
              w="full"
            >
              Add Post
            </Button>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
};
export default CreatePage;
