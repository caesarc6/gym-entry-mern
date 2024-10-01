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

const CreatePage = () => {
  const [newEntry, setNewEntry] = useState({
    name: "",
    description: "",
    image: "",
  });
  const toast = useToast();

  const { createEntry } = useProductStore();

  const handleAddEntry = async () => {
    const { success, message } = await createEntry(newEntry);
    // console.log("Success:", success);
    // console.log("Message:", message);
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
    setNewEntry({ name: "", description: "", image: "" });
  };

  return (
    <Container maxW={"container.sm"}>
      <VStack spacing={8}>
        <Heading as={"h1"} size={"2xl"} textAlign={"center"} mb={8}>
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
              placeholder="Workout Name"
              name="name"
              value={newEntry.name}
              onChange={(e) =>
                setNewEntry({ ...newEntry, name: e.target.value })
              }
              w="full"
            />
            <Textarea
              placeholder="Workout Split"
              name="description"
              value={newEntry.description}
              onChange={(e) =>
                setNewEntry({ ...newEntry, description: e.target.value })
              }
              w="full"
            />

            <Input
              placeholder="Image URL"
              name="image"
              value={newEntry.image}
              onChange={(e) =>
                setNewEntry({ ...newEntry, image: e.target.value })
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
