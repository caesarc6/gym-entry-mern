import {
  Box,
  Button,
  Container,
  Heading,
  Input,
  Textarea,
  useColorModeValue,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { useProductStore } from "../store/product";
import { auth } from "../firebase";
import { set } from "mongoose";

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

  const toast = useToast();

  const { createPost } = useProductStore();

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
    }
    setNewPost({ name: "", description: "", image: "", uid: "" });
  };

  return (
    <Container maxW={"container.sm"}>
      <VStack spacing={8}>
        <Heading p={3} as={"h1"} size={"2xl"} textAlign={"center"} mb={8}>
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
              placeholder="Name*"
              name="title"
              value={newPost.name}
              onChange={(e) => setNewPost({ ...newPost, name: e.target.value })}
              w="full"
            />
            <Textarea
              style={{ height: "185px" }}
              placeholder="Workout description... *
Eg. DumbBell Curls 6lbs: 3 sets of 10 reps"
              name="description"
              value={newPost.description}
              onChange={(e) =>
                setNewPost({ ...newPost, description: e.target.value })
              }
              w="full"
            />

            <Input
              placeholder="Image URL (optional)"
              name="image"
              value={newPost.image}
              onChange={(e) =>
                setNewPost({ ...newPost, image: e.target.value })
              }
              w="full"
            />
            <Button colorScheme="blue" onClick={handleAddEntry} w="full">
              Add Entry
            </Button>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
};
export default CreatePage;
