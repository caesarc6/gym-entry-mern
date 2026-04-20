import {
  Alert,
  AlertDescription,
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Image,
  Textarea,
  VStack,
} from "@chakra-ui/react";
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

const CreatePage = () => {
  const draftStorageKey = useMemo(() => "gym-entry:create-post-draft:v1", []);
  const draftMaxAgeMs = useMemo(() => 30 * 24 * 60 * 60 * 1000, []);
  const [newPost, setNewPost] = useState({
    name: "",
    description: "",
    image: "",
    uid: "",
  });
  const didHydrateDraftRef = useRef(false);
  const saveDraftTimeoutRef = useRef(null);

  const navigate = useNavigate(); // Initialize useNavigate
  const colors = useThemeColors();
  const bgColorMode =
    colors.currentTheme === "light" ? defaultBg : defaultBgNight;

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
    }
  };

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
                  <Image
                    src={newPost.postImage}
                    alt="Post image preview"
                    backgroundColor={colors.bgMuted}
                    boxSize="150px"
                    objectFit="cover"
                    borderRadius="md"
                  />
                ) : null}
                <FileUploader
                  handleFile={handleFileUpload}
                  maxSizeMB={5}
                  showCompressionInfo={true}
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
