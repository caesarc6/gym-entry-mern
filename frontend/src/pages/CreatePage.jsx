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

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewPost({
        ...newPost,
        postImage: reader.result,
        postImageName: file.name,
      });
    };
    if (file) {
      reader.readAsDataURL(file);
    }
  };

  const toast = useToast();

  const { createPost } = useProductStore();

  const defaultImage = useColorModeValue(day, night);

  const handleAddEntry = async () => {
    // get current user from auth
    const currentUser = { uid: auth.currentUser.uid };
    // console.log("Current User:", auth.currentUser.uid);
    const currUser = currentUser.uid;
    const postWithUID = { ...newPost, uid: currUser };
    const { success, message } = await createPost(postWithUID);
    if (!success) {
      toast({
        title: "Error",
        description: message,
        status: "error",
        isClosable: true,
      });
    } else {
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
          Create New Entry
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
              onChange={(e) => setNewPost({ ...newPost, name: e.target.value })}
              w="full"
            />
            <Textarea
              style={{ height: "185px" }}
              placeholder="Workout description * 
              
E.g.
DumbBell Curls 6lbs: 3 sets of 10 reps"
              name="description"
              value={newPost.description}
              onChange={(e) =>
                setNewPost({ ...newPost, description: e.target.value })
              }
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
              src={newPost.postImage || defaultImage}
              alt="Profile Picture"
              backgroundColor={useColorModeValue("gray.200", "gray.700")}
              boxSize="150px"
              objectFit="cover"
              borderRadius="md"
            />
            <FileUploader
              // className="form-control form-control-lg mb-2 mt-2 !w-[267px] !h-[47px] text-lg text-center font-weight-light hover:file:cursor-pointer hover:file:text-slate-600 content-center"
              handleFile={handleFileUpload}
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
                  // console.log("File buffer:", reader.result);
                };
                if (file) {
                  reader.readAsDataURL(file);
                }
              }}
              fontFamily="Arial, sans-serif"
            /> */}
            <Button colorScheme="blue" onClick={handleAddEntry} w="3xs">
              Add Entry
            </Button>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
};
export default CreatePage;
