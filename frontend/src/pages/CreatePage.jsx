import {
  Box,
  Button,
  Container,
  Heading,
  Input,
  Image,
  Text,
  Textarea,
  useColorModeValue,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProductStore } from "../store/product";
import { auth } from "../firebase";
import { FileUploader } from "../components/FileUploader"; // Import the FileUploader component
import night from "../assets/night.jpg";
import day from "../assets/light.jpg";
import defaultBg from "../assets/defaultBg.jpg";
import defaultBgNight from "../assets/defaultBgNight.jpg";

const CreatePage = () => {
  const [newEntry, setNewEntry] = useState({
    title: "",
    description: "",
    image: "",
  });

  const [newPost, setNewPost] = useState({
    title: "",
    description: "",
    image: "",
    uid: "",
  });

  const navigate = useNavigate(); // Initialize useNavigate
  const bgColorMode = useColorModeValue(defaultBg, defaultBgNight);

  const handleFileUpload = (file) => {
    console.log("🔍 [CREATE_PAGE] handleFileUpload called");
    console.log("🔍 [CREATE_PAGE] File received:", {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    });

    const reader = new FileReader();

    reader.onloadstart = () => {
      console.log("🔍 [CREATE_PAGE] FileReader started reading file");
    };

    reader.onloadend = () => {
      console.log("🔍 [CREATE_PAGE] FileReader finished reading file");
      console.log(
        "🔍 [CREATE_PAGE] Reader result length:",
        reader.result ? reader.result.length : 0
      );
      console.log("🔍 [CREATE_PAGE] Reader result type:", typeof reader.result);

      const updatedPost = {
        ...newPost,
        postImage: reader.result,
        postImageName: file.name,
      };

      console.log("🔍 [CREATE_PAGE] Updating newPost state:", {
        hasPostImage: !!updatedPost.postImage,
        postImageName: updatedPost.postImageName,
        postImageLength: updatedPost.postImage
          ? updatedPost.postImage.length
          : 0,
      });

      setNewPost(updatedPost);
    };

    reader.onerror = (error) => {
      console.error("❌ [CREATE_PAGE] FileReader error:", error);
    };

    if (file) {
      console.log("🔍 [CREATE_PAGE] Starting to read file as data URL");
      reader.readAsDataURL(file);
    } else {
      console.log("❌ [CREATE_PAGE] No file provided to handleFileUpload");
    }
  };

  const toast = useToast();

  const { createPost } = useProductStore();

  const defaultImage = useColorModeValue(day, night);

  const handleAddEntry = async () => {
    console.log("🔍 [CREATE_PAGE] handleAddEntry called");
    console.log("🔍 [CREATE_PAGE] Current newPost state:", {
      name: newPost.name,
      description: newPost.description,
      hasPostImage: !!newPost.postImage,
      postImageName: newPost.postImageName,
      postImageLength: newPost.postImage ? newPost.postImage.length : 0,
    });

    // get current user from auth
    const currentUser = { uid: auth.currentUser.uid };
    const currUser = currentUser.uid;
    console.log("🔍 [CREATE_PAGE] Current user UID:", currUser);

    const postWithUID = { ...newPost, uid: currUser };
    console.log("🔍 [CREATE_PAGE] Post with UID:", {
      name: postWithUID.name,
      description: postWithUID.description,
      uid: postWithUID.uid,
      hasPostImage: !!postWithUID.postImage,
      postImageName: postWithUID.postImageName,
    });

    console.log("🔍 [CREATE_PAGE] Calling createPost...");
    const { success, message } = await createPost(postWithUID);
    console.log("🔍 [CREATE_PAGE] createPost result:", { success, message });

    if (!success) {
      console.error("❌ [CREATE_PAGE] Post creation failed:", message);
      toast({
        title: "Error",
        description: message,
        status: "error",
        isClosable: true,
      });
    } else {
      console.log("✅ [CREATE_PAGE] Post created successfully");
      toast({
        title: "Success",
        description: message,
        status: "success",
        isClosable: true,
      });
      // Redirect to the main page after successful entry creation
      navigate("/"); // Replace "/" with the path to your main page
    }
    setNewPost({ name: "", description: "", image: "", uid: "" });
  };

  return (
    <Container maxW={"container.sm"}>
      <VStack spacing={8}>
        <Heading
          color={useColorModeValue("gray.800", "whiteAlpha.700")}
          p={3}
          as={"h1"}
          size={"2xl"}
          textAlign={"center"}
          mb={8}
          mt={24}
        >
          Create New Post
        </Heading>

        <Box
          w={"full"}
          bg={useColorModeValue("white", "gray.800")}
          p={6}
          rounded={"lg"}
          shadow={"md"}
        >
          <VStack spacing={4} w="full">
            <Input
              placeholder="Name of Workout Session*"
              name="title"
              value={newPost.name}
              onChange={(e) => {
                console.log(
                  "🔍 [CREATE_PAGE] Name input changed:",
                  e.target.value
                );
                setNewPost({ ...newPost, name: e.target.value });
              }}
              w="full"
            />
            <Textarea
              style={{ height: "185px" }}
              placeholder="Workout description * 
              
E.g.
DumbBell Curls 6lbs: 3 sets of 10 reps"
              name="description"
              value={newPost.description}
              onChange={(e) => {
                console.log(
                  "🔍 [CREATE_PAGE] Description input changed:",
                  e.target.value.substring(0, 50) + "..."
                );
                setNewPost({ ...newPost, description: e.target.value });
              }}
              w="full"
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
              backgroundColor={useColorModeValue("gray.200", "gray.700")}
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
                console.log("🔍 [CREATE_PAGE] Add Entry button clicked");
                console.log("🔍 [CREATE_PAGE] Event details:", {
                  type: e.type,
                  target: e.target,
                  currentTarget: e.currentTarget,
                });
                console.log(
                  "🔍 [CREATE_PAGE] Current newPost state at button click:",
                  {
                    name: newPost.name,
                    description: newPost.description,
                    hasPostImage: !!newPost.postImage,
                    postImageName: newPost.postImageName,
                    postImageLength: newPost.postImage
                      ? newPost.postImage.length
                      : 0,
                  }
                );
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
