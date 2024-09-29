import {
  Box,
  Button,
  Container,
  Heading,
  Input,
  useColorModeValue,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { useProductStore } from "../store/product";

const CreatePage = () => {
  const [newEntry, setNewEntry] = useState({
    name: "",
    price: "",
    image: "",
  });
  const toast = useToast();

  const { createEntry } = useProductStore();

  const handleAddEntry = async () => {
    const { success, message } = await createEntry(newEntry);
    // console.log("Success:", success);
    console.log("Message:", message);
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
    setNewEntry({ name: "", price: "", image: "" });
  };

  return (
    <Container maxW={"container.sm"}>
      <VStack spacing={8}>
        <Heading as={"h1"} size={"2xl"} textAlign={"center"} mb={8}>
          Create New Product
        </Heading>

        <Box
          w={"full"}
          bg={useColorModeValue("white", "gray.800")}
          p={6}
          rounded={"lg"}
          shadow={"md"}
        >
          <VStack spacing={4}>
            <Input
              placeholder="Product Name"
              name="name"
              value={newEntry.name}
              onChange={(e) =>
                setNewEntry({ ...newEntry, name: e.target.value })
              }
            />
            <Input
              placeholder="Price"
              name="price"
              type="number"
              value={newEntry.price}
              onChange={(e) =>
                setNewEntry({ ...newEntry, price: e.target.value })
              }
            />
            <Input
              placeholder="Image URL"
              name="image"
              value={newEntry.image}
              onChange={(e) =>
                setNewEntry({ ...newEntry, image: e.target.value })
              }
            />

            <Button colorScheme="blue" onClick={handleAddEntry} w="full">
              Add Product
            </Button>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
};
export default CreatePage;
