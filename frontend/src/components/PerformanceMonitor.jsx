import { useEffect, useState } from "react";
import { Box, Text, useColorModeValue } from "@chakra-ui/react";

const PerformanceMonitor = ({ isVisible = false }) => {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    imageCount: 0,
    apiCalls: 0,
    cacheHits: 0,
  });

  const textColor = useColorModeValue("gray.600", "gray.400");
  const bgColor = useColorModeValue("gray.100", "gray.800");

  useEffect(() => {
    // Track performance metrics
    const startTime = performance.now();

    // Monitor image loading
    const images = document.querySelectorAll("img");
    let loadedImages = 0;

    const handleImageLoad = () => {
      loadedImages++;
      setMetrics((prev) => ({
        ...prev,
        imageCount: loadedImages,
        loadTime: performance.now() - startTime,
      }));
    };

    images.forEach((img) => {
      if (img.complete) {
        handleImageLoad();
      } else {
        img.addEventListener("load", handleImageLoad);
        img.addEventListener("error", handleImageLoad);
      }
    });

    return () => {
      images.forEach((img) => {
        img.removeEventListener("load", handleImageLoad);
        img.removeEventListener("error", handleImageLoad);
      });
    };
  }, []);

  if (!isVisible) return null;

  return (
    <Box
      position="fixed"
      bottom="4"
      right="4"
      bg={bgColor}
      p={3}
      borderRadius="md"
      shadow="md"
      zIndex={1000}
      fontSize="sm"
    >
      <Text color={textColor} fontWeight="bold" mb={1}>
        Performance Metrics
      </Text>
      <Text color={textColor} fontSize="xs">
        Load Time: {metrics.loadTime.toFixed(0)}ms
      </Text>
      <Text color={textColor} fontSize="xs">
        Images: {metrics.imageCount}
      </Text>
      <Text color={textColor} fontSize="xs">
        API Calls: {metrics.apiCalls}
      </Text>
      <Text color={textColor} fontSize="xs">
        Cache Hits: {metrics.cacheHits}
      </Text>
    </Box>
  );
};

export default PerformanceMonitor;
