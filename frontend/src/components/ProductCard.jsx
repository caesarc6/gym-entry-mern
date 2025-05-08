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
  Textarea,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
  useColorMode,
} from "@chakra-ui/react";
import { FileUploader } from "./FileUploader"; // Import the FileUploader component
import { useProductStore } from "../store/product";
import { useState } from "react";
import PropTypes from "prop-types";

const ProductCard = ({ entry }) => {
  const [updatedEntry, setUpdatedEntry] = useState({
    _id: entry._id || "",
    name: entry.name || "Untitled",
    description: entry.description || "No description",
    image: entry.image || "default-image-url",
    likes: entry.likes || 0,
    comments: Array.isArray(entry.comments) ? entry.comments : [],
    createdAt: entry.createdAt || new Date().toISOString(),
  });
  const [comment, setComment] = useState("");
  const textColorTitle = useColorModeValue("gray.600", "gray.500");
  const textColor = useColorModeValue("gray.200", "gray.200");
  const textColorDesc = useColorModeValue("gray.700", "gray.400");
  const textColorOne = useColorModeValue("gray.300", "gray.700");
  const bg = useColorModeValue("white", "gray.800");
  const { colorMode } = useColorMode();
  const { deleteEntry, updateEntry, likeEntry, commentEntry } =
    useProductStore();

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setUpdatedEntry({
        ...updatedEntry,
        image: reader.result,
        imageName: file.name,
      });
      // console.log("File buffer:", reader.result);
    };
    if (file) {
      reader.readAsDataURL(file);
    }
  };

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
    // console.log("Updated Entry:", pid, updatedEntry);
    const previousEntry = { ...updatedEntry };
    setUpdatedEntry((prevEntry) => ({ ...prevEntry, ...updatedEntry }));
    // console.log("debug 'field too long' - updatedEntry:", updatedEntry);
    // error from backend server is coming from below line
    const { success, message, data } = await updateEntry(pid, updatedEntry);

    onClose();
    if (!success) {
      setUpdatedEntry(previousEntry);
      toast({
        title: "Error",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } else {
      if (data && data.data) {
        const { title, description, likes, comments } = data.data;
        setUpdatedEntry((prevEntry) => ({
          ...prevEntry,
          title,
          description,
          likes,
          comments,
        }));
      }
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

  // create a function to format the date into a string and abbreviate the month
  const formatDateHour = (dateString) => {
    const date = new Date(dateString);
    const options = {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };
    return date.toLocaleString("en-US", options);
  };

  const formatDateTitleTime = (dateString) => {
    const date = new Date(dateString);
    const options = {
      month: "short",
      day: "numeric",

      year: "numeric",
    };
    const formattedDate = date.toLocaleString("en-US", options);
    return `${formattedDate}`;
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
        src={updatedEntry.image || entry.image}
        alt={entry.name}
        h={48}
        w="full"
        objectFit="cover"
      />
      <VStack className="px-8" spacing={4} p="8px 8px 8px 8px">
        <Heading
          as={"h2"}
          size={"lg"}
          color={textColorTitle}
          fontFamily="Arial, sans-serif"
        >
          {updatedEntry.name}
          {/* - {formatDateTitle(updatedEntry.createdAt)} */}
        </Heading>
        <Text
          // colorScheme="gray"
          color={textColorOne}
          fontFamily="Arial, sans-serif"
        >
          {formatDateHour(updatedEntry.createdAt)}
          {" - "}
          {formatDateTitleTime(updatedEntry.createdAt)}
        </Text>
        <Box>
          <Box
            as="pre"
            style={{
              width: "100%",
              whiteSpace: "pre-wrap",
              fontFamily: "Arial, sans-serif",
            }}
            color={textColorDesc}
          >
            {updatedEntry.description}
          </Box>
        </Box>
        <Text color={textColorOne} fontFamily="Arial, sans-serif">
          Likes: {updatedEntry.likes}
        </Text>
        <HStack
          // spacing={3}
          style={{
            display: "flex",
            padding: "0px 12px 0px 12px",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <IconButton
            onClick={() => handleLikeEntry(entry._id)}
            icon={<StarIcon />}
            colorScheme="purple"
            style={{ width: "40px", height: "33px" }}
          />
          {/* <Button
              onClick={onOpen}
              icon={<EditIcon />}
              colorScheme="blue"
              style={{ width: "200px", height: "45px" }}
              w={"full"}
              mt={6}
              bg={useColorModeValue("gray.400", "gray.900")}
              color={"white"}
              rounded={"md"}
              _hover={{
                transform: "translateY(-2px)",
                boxShadow: "lg",
              }}
            >
              Edit
            </Button> */}
          <IconButton
            onClick={onOpen}
            icon={<EditIcon />}
            // colorScheme="gray"
            style={{ width: "235px", height: "55px" }}
            bg={useColorModeValue("gray.300", "gray.900")}
            color={"white"}
            rounded={"md"}
            _hover={{
              boxShadow: "lg",
            }}
          />
          <IconButton
            onClick={onDeleteOpen}
            icon={<DeleteIcon />}
            colorScheme="red"
            bg={useColorModeValue("red.200", "red.800")}
            style={{ width: "40px", height: "29px" }}
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
        <VStack
          style={{
            maxWidth: "360px",
            width: "-webkit-fill-available",
            padding: "0px 1em 0px 1em",
          }}
          spacing={2}
          align="start"
        >
          {updatedEntry.comments.map((comment, index) => (
            <Box
              style={{
                width: "100%",
                display: "inline-flex",
                justifyContent: "space-between",
              }}
              key={index}
              p={2}
              bg={colorMode === "dark" ? "gray.700" : "gray.100"}
              rounded="md"
            >
              <Text
                className=""
                color={textColor}
                fontFamily="Arial, sans-serif"
              >
                {comment.text}
              </Text>
              <Text
                color={colorMode === "dark" ? "gray.300" : "black"}
                fontSize="sm"
                fontFamily="Arial, sans-serif"
              >
                {formatDate(comment.createdAt)}
              </Text>
            </Box>
          ))}
        </VStack>
      </VStack>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontFamily="Arial, sans-serif">Update Entry</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Input
                placeholder="Entry Name"
                name="name"
                value={updatedEntry.name}
                onChange={(e) =>
                  setUpdatedEntry({ ...updatedEntry, name: e.target.value })
                }
                fontFamily="Arial, sans-serif"
              />
              <Textarea
                placeholder="Workout Split"
                style={{ height: "185px" }}
                name="description"
                value={updatedEntry.description}
                onChange={(e) =>
                  setUpdatedEntry({
                    ...updatedEntry,
                    description: e.target.value,
                  })
                }
                fontFamily="Arial, sans-serif"
              />
              <Image
                src={updatedEntry.image || "default-profile-picture-url"}
                alt="Profile Picture"
                boxSize="150px"
                objectFit="cover"
                borderRadius="3xl"
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
                    setUpdatedEntry({
                      ...updatedEntry,
                      image: reader.result,
                      imageName: file.name,
                    });
                    // console buffer of image
                    console.log("File buffer:", reader.result);
                  };
                  if (file) {
                    reader.readAsDataURL(file);
                  }
                }}
                fontFamily="Arial, sans-serif"
              /> */}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={() => handleUpdateEntry(entry._id, updatedEntry)}
              fontFamily="Arial, sans-serif"
            >
              Update
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              fontFamily="Arial, sans-serif"
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Delete</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Are you sure you want to delete this entry?</Text>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="red"
              onClick={() => handleDeleteEntry(entry._id)}
            >
              Delete
            </Button>
            <Button variant="ghost" onClick={onDeleteClose}>
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
ProductCard.propTypes = {
  entry: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string, // Make optional if it might be missing
    image: PropTypes.string, // Make optional
    likes: PropTypes.number, // Make optional
    comments: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string.isRequired,
        createdAt: PropTypes.string.isRequired,
      })
    ), // Make optional
    createdAt: PropTypes.string, // Make optional
  }).isRequired,
};

export default ProductCard;
