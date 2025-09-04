import React, { useState } from "react";
import { Box, Text, VStack, Heading } from "@chakra-ui/react";
import PaginationComponent from "./Pagination";

const PaginationDemo = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 15; // Example with 15 pages

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    console.log(`Navigated to page ${newPage}`);
  };

  return (
    <VStack spacing={6} p={8} bg="gray.50" borderRadius="lg">
      <Heading size="lg">Pagination Component Demo</Heading>

      <Text fontSize="lg" color="gray.600">
        Current Page: {currentPage} of {totalPages}
      </Text>

      <Box p={4} bg="white" borderRadius="md" shadow="sm">
        <Text mb={4} fontWeight="medium">
          Sample content for page {currentPage}
        </Text>
        <Text color="gray.600">
          This demonstrates the shadcn pagination component with:
        </Text>
        <ul style={{ marginLeft: "20px", marginTop: "8px" }}>
          <li>Previous/Next buttons</li>
          <li>Page numbers with ellipsis</li>
          <li>Active page highlighting</li>
          <li>Responsive design</li>
        </ul>
      </Box>

      <PaginationComponent
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        maxVisiblePages={5}
      />
    </VStack>
  );
};

export default PaginationDemo;
