import {
  Container,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Spinner,
  Center,
  Avatar,
  Box,
  Divider,
  Alert,
  AlertIcon,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from "@chakra-ui/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomToast } from "../hooks/useCustomToast";
import { apiClient, API_ENDPOINTS } from "../config/api";
import { useProductStore } from "../store/product";
import { useThemeColors } from "../hooks/useThemeColors";
import { formatDateSafe } from "../utils/dateUtils";
import { CheckIcon, CloseIcon } from "@chakra-ui/icons";

const AdminDashboard = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [userToReject, setUserToReject] = useState(null);
  const hasCheckedAdminRef = useRef(false);
  const hasFetchedRequestsRef = useRef(false);

  const navigate = useNavigate();
  const toast = useCustomToast();
  const colors = useThemeColors();
  const { currentUserInfo } = useProductStore();

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(
        API_ENDPOINTS.GET_TRAINER_DASHBOARD_REQUESTS
      );

      if (response.data.success) {
        setPendingRequests(response.data.data.pendingRequests || []);
        setApprovedUsers(response.data.data.approvedUsers || []);
      }
    } catch (error) {
      toast.error(
        "Error",
        error.response?.data?.message || "Failed to fetch requests"
      );
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Check admin status on mount
  useEffect(() => {
    // Reset refs when currentUserInfo changes
    hasCheckedAdminRef.current = false;
    hasFetchedRequestsRef.current = false;

    const checkAdmin = async () => {
      if (!currentUserInfo) {
        setCheckingAdmin(false);
        return;
      }

      // Prevent multiple simultaneous checks
      if (hasCheckedAdminRef.current) {
        return;
      }

      try {
        hasCheckedAdminRef.current = true;
        const response = await apiClient.get(API_ENDPOINTS.CHECK_IS_ADMIN);
        if (response.data.success) {
          const adminStatus = response.data.isAdmin || false;
          setIsAdmin(adminStatus);

          if (!adminStatus) {
            toast.error(
              "Access Denied",
              "You do not have admin access to view this page."
            );
            setTimeout(() => navigate("/"), 2000);
          }
        }
      } catch (error) {
        toast.error("Error", "Failed to verify admin access. Please try again.");
        setTimeout(() => navigate("/"), 2000);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserInfo]);

  // Fetch requests when admin is confirmed
  useEffect(() => {
    if (isAdmin && !checkingAdmin && currentUserInfo && !hasFetchedRequestsRef.current) {
      hasFetchedRequestsRef.current = true;
      fetchRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, checkingAdmin, currentUserInfo]);


  const handleApprove = async (userId) => {
    setProcessingUserId(userId);
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.APPROVE_TRAINER_DASHBOARD_ACCESS(userId)
      );

      if (response.data.success) {
        toast.success(
          "Success",
          `Trainer dashboard access approved for ${response.data.data.name}`
        );
        fetchRequests(); // Refresh the list
      }
    } catch (error) {
      toast.error(
        "Error",
        error.response?.data?.message || "Failed to approve access"
      );
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleRejectClick = (user) => {
    setUserToReject(user);
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!userToReject) return;

    setProcessingUserId(userToReject.uid);
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.REJECT_TRAINER_DASHBOARD_ACCESS(userToReject.uid)
      );

      if (response.data.success) {
        toast.success(
          "Success",
          `Trainer dashboard access rejected for ${response.data.data.name}`
        );
        fetchRequests(); // Refresh the list
        setRejectModalOpen(false);
        setUserToReject(null);
      }
    } catch (error) {
      toast.error(
        "Error",
        error.response?.data?.message || "Failed to reject access"
      );
    } finally {
      setProcessingUserId(null);
    }
  };

  if (!currentUserInfo) {
    return (
      <Container maxW="container.xl" pt={{ base: 16, md: 20 }} pb={8} px={{ base: 4, md: 6 }}>
        <Center>
          <VStack spacing={4}>
            <Text>Please log in to access the admin dashboard.</Text>
            <Button onClick={() => navigate("/")}>Go to Home</Button>
          </VStack>
        </Center>
      </Container>
    );
  }

  if (checkingAdmin) {
    return (
      <Container maxW="container.xl" pt={{ base: 16, md: 20 }} pb={8} px={{ base: 4, md: 6 }}>
        <Center>
          <VStack spacing={4}>
            <Spinner size="xl" />
            <Text>Checking admin access...</Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container maxW="container.xl" pt={{ base: 16, md: 20 }} pb={8} px={{ base: 4, md: 6 }}>
        <Center>
          <VStack spacing={4}>
            <Text fontSize="lg" fontWeight="semibold">
              Admin Access Required
            </Text>
            <Text textAlign="center" color={colors.textSecondary}>
              You do not have permission to access this page.
            </Text>
            <Button onClick={() => navigate("/")}>Go to Home</Button>
          </VStack>
        </Center>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" pt={{ base: 16, md: 20 }} pb={8} px={{ base: 4, md: 6 }}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <VStack spacing={4} align="stretch">
          <VStack align="start" spacing={2}>
            <Heading size={{ base: "md", md: "lg" }}>Admin Dashboard</Heading>
            <Text color={colors.textSecondary} fontSize={{ base: "sm", md: "md" }}>
              Manage trainer dashboard access requests
            </Text>
          </VStack>
          <HStack
            spacing={4}
            justify={{ base: "center", md: "flex-end" }}
            wrap="wrap"
          >
            <Button variant="outline" onClick={() => navigate("/")} size={{ base: "sm", md: "md" }}>
              Back to Home
            </Button>
            <Button colorScheme="blue" onClick={fetchRequests} size={{ base: "sm", md: "md" }}>
              Refresh
            </Button>
          </HStack>
        </VStack>

        {/* Stats */}
        <HStack spacing={4} flexWrap="wrap">
          <Card bg={colors.bgMuted} flex={{ base: "1 1 100%", md: 1 }} minW={{ base: "100%", md: "auto" }}>
            <CardBody>
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" color={colors.textMuted}>
                  Pending Requests
                </Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {pendingRequests.length}
                </Text>
              </VStack>
            </CardBody>
          </Card>
          <Card bg={colors.bgMuted} flex={{ base: "1 1 100%", md: 1 }} minW={{ base: "100%", md: "auto" }}>
            <CardBody>
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" color={colors.textMuted}>
                  Approved Users
                </Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {approvedUsers.length}
                </Text>
              </VStack>
            </CardBody>
          </Card>
        </HStack>

        {isLoading ? (
          <Center py={8}>
            <Spinner size="xl" />
          </Center>
        ) : (
          <>
            {/* Pending Requests Section */}
            <VStack spacing={4} align="stretch">
              <Heading size={{ base: "sm", md: "md" }}>Pending Requests</Heading>
              {pendingRequests.length === 0 ? (
                <Card bg={colors.bgMuted}>
                  <CardBody>
                    <Center py={8}>
                      <Text color={colors.textMuted}>
                        No pending requests
                      </Text>
                    </Center>
                  </CardBody>
                </Card>
              ) : (
                <VStack spacing={4} align="stretch">
                  {pendingRequests.map((user) => (
                    <Card key={user.uid} bg={colors.bgCard}>
                      <CardBody>
                        <VStack spacing={4} align="stretch">
                          <HStack spacing={4} flexWrap="wrap">
                            <Avatar
                              src={user.picture}
                              name={user.name || user.email}
                              size={{ base: "sm", md: "md" }}
                            />
                            <VStack align="start" spacing={1} flex={1} minW={0}>
                              <Text fontWeight="semibold" fontSize={{ base: "sm", md: "md" }} noOfLines={1}>
                                {user.name || "No name"}
                              </Text>
                              <Text fontSize={{ base: "xs", md: "sm" }} color={colors.textMuted} noOfLines={1}>
                                {user.email}
                              </Text>
                              {user.username && (
                                <Text fontSize="xs" color={colors.textMuted} noOfLines={1}>
                                  @{user.username}
                                </Text>
                              )}
                              <Text fontSize="xs" color={colors.textMuted}>
                                Requested: {formatDateSafe(user.createdAt)}
                              </Text>
                            </VStack>
                          </HStack>
                          <HStack spacing={2} justify={{ base: "stretch", md: "flex-end" }} flexWrap="wrap">
                            <Button
                              colorScheme="green"
                              leftIcon={<CheckIcon />}
                              size={{ base: "sm", md: "sm" }}
                              isLoading={processingUserId === user.uid}
                              onClick={() => handleApprove(user.uid)}
                              flex={{ base: "1 1 auto", md: "0 0 auto" }}
                              minW={{ base: "calc(50% - 4px)", md: "auto" }}
                            >
                              Approve
                            </Button>
                            <Button
                              colorScheme="red"
                              leftIcon={<CloseIcon />}
                              size={{ base: "sm", md: "sm" }}
                              variant="outline"
                              isLoading={processingUserId === user.uid}
                              onClick={() => handleRejectClick(user)}
                              flex={{ base: "1 1 auto", md: "0 0 auto" }}
                              minW={{ base: "calc(50% - 4px)", md: "auto" }}
                            >
                              Reject
                            </Button>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              )}
            </VStack>

            <Divider />

            {/* Approved Users Section */}
            <VStack spacing={4} align="stretch">
              <Heading size={{ base: "sm", md: "md" }}>Approved Users</Heading>
              {approvedUsers.length === 0 ? (
                <Card bg={colors.bgMuted}>
                  <CardBody>
                    <Center py={8}>
                      <Text color={colors.textMuted}>No approved users</Text>
                    </Center>
                  </CardBody>
                </Card>
              ) : (
                <VStack spacing={4} align="stretch">
                  {approvedUsers.map((user) => (
                    <Card key={user.uid} bg={colors.bgCard}>
                      <CardBody>
                        <VStack spacing={4} align="stretch">
                          <HStack spacing={4} flexWrap="wrap">
                            <Avatar
                              src={user.picture}
                              name={user.name || user.email}
                              size={{ base: "sm", md: "md" }}
                            />
                            <VStack align="start" spacing={1} flex={1} minW={0}>
                              <HStack flexWrap="wrap" spacing={2}>
                                <Text fontWeight="semibold" fontSize={{ base: "sm", md: "md" }} noOfLines={1}>
                                  {user.name || "No name"}
                                </Text>
                                <Badge colorScheme="green" fontSize={{ base: "xs", md: "sm" }}>Approved</Badge>
                              </HStack>
                              <Text fontSize={{ base: "xs", md: "sm" }} color={colors.textMuted} noOfLines={1}>
                                {user.email}
                              </Text>
                              {user.username && (
                                <Text fontSize="xs" color={colors.textMuted} noOfLines={1}>
                                  @{user.username}
                                </Text>
                              )}
                              <Text fontSize="xs" color={colors.textMuted}>
                                Approved: {formatDateSafe(user.createdAt)}
                              </Text>
                            </VStack>
                          </HStack>
                          <Button
                            colorScheme="red"
                            leftIcon={<CloseIcon />}
                            size={{ base: "sm", md: "sm" }}
                            variant="outline"
                            isLoading={processingUserId === user.uid}
                            onClick={() => handleRejectClick(user)}
                            w={{ base: "100%", md: "auto" }}
                            alignSelf={{ base: "stretch", md: "flex-end" }}
                          >
                            Revoke Access
                          </Button>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              )}
            </VStack>
          </>
        )}
      </VStack>

      {/* Reject Confirmation Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setUserToReject(null);
        }}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Action</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to{" "}
              {userToReject?.trainerDashboardAccess === "approved"
                ? "revoke"
                : "reject"}{" "}
              trainer dashboard access for{" "}
              <strong>{userToReject?.name || userToReject?.email}</strong>?
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => {
                setRejectModalOpen(false);
                setUserToReject(null);
              }}
            >
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleRejectConfirm}
              isLoading={processingUserId === userToReject?.uid}
            >
              Confirm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default AdminDashboard;

