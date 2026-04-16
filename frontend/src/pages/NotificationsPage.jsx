import {
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { useCustomToast } from "../hooks/useCustomToast";
import { useThemeColors } from "../hooks/useThemeColors";
import { useProductStore } from "../store/product";
import { getCurrentAuthUser } from "../utils/auth";

export default function NotificationsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [actingId, setActingId] = useState(null);
  const toast = useCustomToast();
  const colors = useThemeColors();
  const navigate = useNavigate();
  const { notificationsCache, setNotificationsCache, clearNotificationsCache } =
    useProductStore();

  const load = async () => {
    setIsLoading(true);
    try {
      const user = await getCurrentAuthUser();
      if (!user) {
        setItems([]);
        clearNotificationsCache();
        return;
      }

      if (
        notificationsCache &&
        notificationsCache.uid === user.uid &&
        Date.now() - notificationsCache.cachedAt < 60_000
      ) {
        setItems(notificationsCache.items || []);
        return;
      }

      const response = await apiClient.get(API_ENDPOINTS.FOLLOW_REQUESTS_PENDING);
      const data = response.data;
      const next = Array.isArray(data?.data) ? data.data : [];
      setItems(next);
      setNotificationsCache({ uid: user.uid, items: next, cachedAt: Date.now() });
    } catch (error) {
      toast.error(
        "Failed to load notifications",
        error?.message || "Unable to fetch follow requests.",
      );
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load created inline
  }, []);

  const act = async (requestId, action) => {
    setActingId(requestId);
    try {
      await apiClient.post(API_ENDPOINTS.FOLLOW_REQUEST_ACTION(requestId, action));
      setItems((prev) => {
        const next = prev.filter((r) => r._id !== requestId);
        if (notificationsCache?.uid) {
          setNotificationsCache({
            uid: notificationsCache.uid,
            items: next,
            cachedAt: Date.now(),
          });
        }
        return next;
      });
      toast.success(
        "Updated",
        action === "accept" ? "Follow request accepted." : "Follow request rejected.",
      );
    } catch (error) {
      toast.error("Error", error?.message || "Failed to update request.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <Container maxW="container.xl" py={4}>
      <Flex align="center" justify="space-between" mb={4}>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Back
        </Button>
        <Text fontWeight={700} color={colors.textPrimary}>
          Notifications
        </Text>
        <Button variant="ghost" onClick={load}>
          Refresh
        </Button>
      </Flex>

      {isLoading ? (
        <Flex justify="center" py={10}>
          <Spinner size="lg" />
        </Flex>
      ) : items.length === 0 ? (
        <Box
          borderWidth="1px"
          borderColor={colors.borderColor}
          bg={colors.bgCard}
          rounded="lg"
          p={6}
          textAlign="center"
        >
          <Text color={colors.textMuted}>No follow requests right now.</Text>
        </Box>
      ) : (
        <VStack spacing={3} align="stretch">
          {items.map((req) => (
            <Box
              key={req._id}
              borderWidth="1px"
              borderColor={colors.borderColor}
              bg={colors.bgCard}
              rounded="lg"
              p={4}
            >
              <Flex justify="space-between" align="center" gap={3}>
                <Box minW={0}>
                  <Text fontWeight={600} color={colors.textPrimary} noOfLines={1}>
                    {req?.requesterName || req?.requesterUsername || "New request"}
                  </Text>
                  <Text fontSize="sm" color={colors.textMuted} noOfLines={1}>
                    {req?.requesterUsername ? `@${req.requesterUsername}` : ""}
                  </Text>
                </Box>
                <HStack spacing={2}>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    variant="solid"
                    isLoading={actingId === req._id}
                    onClick={() => act(req._id, "accept")}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="outline"
                    isLoading={actingId === req._id}
                    onClick={() => act(req._id, "reject")}
                  >
                    Reject
                  </Button>
                </HStack>
              </Flex>
            </Box>
          ))}
        </VStack>
      )}
    </Container>
  );
}

