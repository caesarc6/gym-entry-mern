import { DeleteIcon, EditIcon, StarIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Heading,
  HStack,
  IconButton,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useProductStore } from "../store/product";
import { useState } from "react";

const ProductCard = ({ entry }) => {
  const [updatedEntry, setUpdatedEntry] = useState(entry);
  const [comment, setComment] = useState("");
  const textColor = useColorModeValue("gray.600", "gray.200");
  const bg = useColorModeValue("white", "gray.800");
  const { deleteEntry, updateEntry, likeEntry, commentEntry } =
    useProductStore();

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleDeleteEntry = async (pid) => {
    const { success, message } = await deleteEntry(pid);
    if (!success) {
      toast({
        title: "Error",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } else {
      toast({
        title: "Success",
        description: message,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleUpdateEntry = async (pid, updatedEntry) => {
    const { success, message } = await updateEntry(pid, updatedEntry);
    onClose();
    if (!success) {
      toast({
        title: "Error",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } else {
      toast({
        title: "Success",
        description: "Product updated successfully",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleLikeEntry = async (pid) => {
    const { success, message } = await likeEntry(pid);
    if (!success) {
      toast({
        title: "Error",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } else {
      setUpdatedEntry((prevEntry) => ({
        ...prevEntry,
        likes: prevEntry.likes + 1,
      }));
      toast({
        title: "Success",
        description: "Entry liked successfully",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleCommentEntry = async (pid, comment) => {
    const { success, message } = await commentEntry(pid, comment);
    if (!success) {
      toast({
        title: "Error",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } else {
      setUpdatedEntry((prevEntry) => ({
        ...prevEntry,
        comments: [
          ...prevEntry.comments,
          { text: comment, createdAt: new Date() },
        ],
      }));
      setComment("");
      toast({
        title: "Success",
        description: "Comment added successfully",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const isOlderThanYear = now.getFullYear() - date.getFullYear() > 0;

    const options = {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };

    if (isOlderThanYear) {
      options.year = "numeric";
    }

    return date.toLocaleString("en-US", options);
  };

  return (
    <Box
      shadow="lg"
      rounded="lg"
      overflow="hidden"
      transition="all 0.3s"
      _hover={{ transform: "translateY(-5px)", shadow: "xl" }}
      bg={bg}
    >
      <Image
        src={entry.image}
        alt={entry.name}
        h={48}
        w="full"
        objectFit="cover"
      />
      <VStack spacing={4}>
        <Heading as={"h2"} size={"lg"} color={textColor}>
          {updatedEntry.name}
        </Heading>
        <Text color={textColor}>Price: ${updatedEntry.price}</Text>
        <Text color={textColor}>Likes: {updatedEntry.likes}</Text>
        <HStack spacing={2}>
          <IconButton
            colorScheme="purple"
            icon={<StarIcon />}
            onClick={() => handleLikeEntry(entry._id)}
          />
          <IconButton icon={<EditIcon />} onClick={onOpen} colorScheme="blue" />
          <IconButton
            icon={<DeleteIcon />}
            onClick={() => handleDeleteEntry(entry._id)}
            colorScheme="red"
          />
        </HStack>
        <HStack spacing={2}>
          <Input
            placeholder="Comment here.."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button
            style={{ bottom: "8px" }}
            colorScheme="gray"
            onClick={() => handleCommentEntry(entry._id, comment)}
            mt={4}
          >
            Comment
          </Button>
        </HStack>
        <VStack style={{ width: "360px" }} spacing={2} align="start">
          {updatedEntry.comments.map((comment, index) => (
            <Box
              style={{
                width: "inherit",
                dispaly: "inline-flex",
                justifyContent: "space-between",
              }}
              key={index}
              p={2}
              // grey bg no not use colorModeValue
              bg={"gray.600"}
              rounded="md"
            >
              {/* display text element next to each other with space in between */}
              <Text className="" color={textColor}>
                {comment.text}
              </Text>
              <Text color={textColor} fontSize="sm">
                {formatDate(comment.createdAt)}
              </Text>
            </Box>
          ))}
        </VStack>
      </VStack>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Update Entry</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Input
                placeholder="Product Name"
                name="name"
                value={updatedEntry.name}
                onChange={(e) =>
                  setUpdatedEntry({ ...updatedEntry, name: e.target.value })
                }
              />
              <Input
                placeholder="Price"
                name="price"
                type="number"
                value={updatedEntry.price}
                onChange={(e) =>
                  setUpdatedEntry({
                    ...updatedEntry,
                    price: e.target.value,
                  })
                }
              />
              <Input
                placeholder="Image URL"
                name="image"
                value={updatedEntry.image}
                onChange={(e) =>
                  setUpdatedEntry({
                    ...updatedEntry,
                    image: e.target.value,
                  })
                }
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={() => handleUpdatedEntry(entry._id, updatedEntry)}
            >
              Update
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

//   return (
//     <Box
//       shadow="lg"
//       rounded="lg"
//       overflow="hidden"
//       transition="all 0.3s"
//       _hover={{ transform: "translateY(-5px)", shadow: "xl" }}
//       bg={bg}
//     >
//       <Image
//         src={product.image}
//         alt={product.name}
//         h={48}
//         w="full"
//         objectFit="cover"
//       />
//       <Box p={4}>
//         <Heading as="h3" size="md" mb={2}>
//           {product.name}
//         </Heading>

//         <Text fontWeight="bold" fontSize="xl" color={textColor} mb={4}>
//           ${product.price}
//         </Text>
//         {/* // Display the number of likes and refresh when user like the product */}
//         <Text fontWeight="bold" fontSize="xl" color={textColor} mb={4}>
//           Likes: {updatedProduct.likes}
//         </Text>
//         <HStack spacing={2}>
//           <IconButton
//             colorScheme="purple"
//             icon={<StarIcon />}
//             onClick={() => handleLikeProduct(product._id)}
//           />
//           <IconButton icon={<EditIcon />} onClick={onOpen} colorScheme="blue" />
//           <IconButton
//             icon={<DeleteIcon />}
//             onClick={() => handleDeleteProduct(product._id)}
//             colorScheme="red"
//           />
//         </HStack>
//         <HStack spacing={2}>
//           <Input
//             placeholder="Comment here.."
//             value={comment}
//             onChange={(e) => setComment(e.target.value)}
//           />
//           <Button
//             style={{ bottom: "8px" }}
//             colorScheme="blue"
//             onClick={() => handleCommentProduct(product._id, comment)}
//             mt={4}
//           >
//             Comment
//           </Button>
//         </HStack>
//         <VStack spacing={2} align="start">
//           {updatedProduct.comments.map((comment, index) => (
//             <Box
//               key={index}
//               p={2}
//               bg={useColorModeValue("gray.100", "gray.700")}
//               rounded="md"
//             >
//               <Text color={textColor}>{comment.text}</Text>
//               <Text color={textColor} fontSize="sm">
//                 {formatDate(comment.timestamp)}
//               </Text>
//             </Box>
//           ))}
//         </VStack>
//       </Box>
//       <Modal isOpen={isOpen} onClose={onClose}>
//         <ModalOverlay />

//         <ModalContent>
//           <ModalHeader>Update Product</ModalHeader>
//           <ModalCloseButton />
//           <ModalBody>
//             <VStack spacing={4}>
//               <Input
//                 placeholder="Product Name"
//                 name="name"
//                 value={updatedProduct.name}
//                 onChange={(e) =>
//                   setUpdatedProduct({ ...updatedProduct, name: e.target.value })
//                 }
//               />
//               <Input
//                 placeholder="Price"
//                 name="price"
//                 type="number"
//                 value={updatedProduct.price}
//                 onChange={(e) =>
//                   setUpdatedProduct({
//                     ...updatedProduct,
//                     price: e.target.value,
//                   })
//                 }
//               />
//               <Input
//                 placeholder="Image URL"
//                 name="image"
//                 value={updatedProduct.image}
//                 onChange={(e) =>
//                   setUpdatedProduct({
//                     ...updatedProduct,
//                     image: e.target.value,
//                   })
//                 }
//               />
//             </VStack>
//           </ModalBody>
//           <ModalFooter>
//             <Button
//               colorScheme="blue"
//               mr={3}
//               onClick={() => handleUpdateProduct(product._id, updatedProduct)}
//             >
//               Update
//             </Button>
//             <Button variant="ghost" onClick={onClose}>
//               Cancel
//             </Button>
//           </ModalFooter>
//         </ModalContent>
//       </Modal>
//     </Box>
//   );
// };

export default ProductCard;
