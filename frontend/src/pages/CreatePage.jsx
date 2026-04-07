import {
  Box,
  Button,
  Container,
  Heading,
  Input,
  Image,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
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
  const [newPost, setNewPost] = useState({
    name: "",
    description: "",
    image: "",
    uid: "",
  });

  const navigate = useNavigate(); // Initialize useNavigate
  const colors = useThemeColors();
  const bgColorMode =
    colors.currentTheme === "light" ? defaultBg : defaultBgNight;

  const handleFileUpload = (file) => {
    const reader = new FileReader();

    reader.onloadstart = () => {};

    reader.onloadend = () => {
      const updatedPost = {
        ...newPost,
        postImage: reader.result,
        postImageName: file.name,
      };

      setNewPost(updatedPost);
    };

    reader.onerror = (error) => {};

    if (file) {
      reader.readAsDataURL(file);
    } else {
    }
  };

  const toast = useCustomToast();

  const { createPost } = useProductStore();

  const handleAddEntry = async () => {
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
      // Redirect to the main page after successful entry creation
      navigate("/"); // Replace "/" with the path to your main page
    }
    setNewPost({ name: "", description: "", image: "", uid: "" });
  };

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
          <VStack spacing={4} w="full">
            <Input
              placeholder="Name of Workout Session*"
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
            <Textarea
              style={{ height: "185px" }}
              placeholder="Workout description * 
              
E.g.
DumbBell Curls 6lbs: 3 sets of 10 reps"
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

            {/* <Input
              placeholder="Image URL (optional)"
              name="image"
              value={newPost.image}
              onChange={(e) =>
                setNewPost({ ...newPost, image: e.target.value })
              }
              w="full"
            /> */}

            <Image
              src={newPost.postImage || bgColorMode}
              alt="Profile Picture"
              backgroundColor={colors.bgMuted}
              boxSize="150px"
              objectFit="cover"
              borderRadius="md"
            />
            <FileUploader
              handleFile={handleFileUpload}
              maxSizeMB={5}
              showCompressionInfo={true}
            />
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
                handleAddEntry();
              }}
              w="3xs"
            >
              Add Entry
            </Button>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
};
export default CreatePage;
