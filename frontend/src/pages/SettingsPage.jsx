import {
  Badge,
  Box,
  Button,
  Flex,
  Container,
  Heading,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Stack,
  Text,
  Textarea,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { useThemeColors } from "../hooks/useThemeColors";
import { useTheme } from "../contexts/ThemeContext";
import { FileUploader } from "../components/FileUploader";
import PrivacySettings from "../components/PrivacySettings";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { getCurrentAuthUser, signOutAll } from "../utils/auth";
import { useCustomToast } from "../hooks/useCustomToast";
import { cn } from "../lib/utils";
import { useProductStore } from "../store/product";

const SettingsPage = () => {
  const colors = useThemeColors();
  const toast = useCustomToast();
  const navigate = useNavigate();
  const { themeMode, setThemeMode, currentTheme } = useTheme();
  const setCurrentUser = useProductStore((s) => s.setCurrentUser);

  const [isLoading, setIsLoading] = useState(true);
  const [backgroundPreview, setBackgroundPreview] = useState("");
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [isSavingBackground, setIsSavingBackground] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [userProfile, setUserProfile] = useState({
    name: "",
    username: "",
    goal: "",
    gymName: "",
    bio: "",
    profileImage: "",
  });
  const [profileImage, setProfileImage] = useState(null);

  const {
    isOpen: isBackgroundOpen,
    onOpen: onBackgroundOpen,
    onClose: onBackgroundClose,
  } = useDisclosure();
  const {
    isOpen: isProfileOpen,
    onOpen: onProfileOpen,
    onClose: onProfileClose,
  } = useDisclosure();
  const {
    isOpen: isPrivacyOpen,
    onOpen: onPrivacyOpen,
    onClose: onPrivacyClose,
  } = useDisclosure();

  const themeValue = useMemo(() => {
    if (themeMode === "system") return "system";
    if (themeMode === "light") return "light";
    return "dark";
  }, [themeMode]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        const user = await getCurrentAuthUser();
        if (!user) return;
        const res = await apiClient.get(API_ENDPOINTS.GET_USER_PROFILE(user.uid));
        const userData = res.data?.data?.user || {};
        if (!mounted) return;
        setBackgroundPreview(userData.backgroundPicture || "");
        setUserProfile({
          name: userData.name || "",
          username: userData.username || "",
          goal: userData.goal || "",
          gymName: userData.gymName || "",
          bio: userData.bio || "",
          profileImage: userData.picture || userData.profileImage || "",
        });
      } catch (error) {
        toast.error(
          "Settings load failed",
          error?.message || "Unable to load settings right now."
        );
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleBackgroundImageUpload = (file) => {
    if (!file) return;
    setBackgroundImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setBackgroundPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileImageUpload = (file) => {
    if (!file) return;
    setProfileImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setUserProfile((prev) => ({
        ...prev,
        profileImage: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const user = await getCurrentAuthUser();
      if (!user) {
        toast.error("Error", "You must be signed in to update your profile.");
        return;
      }
      if (!userProfile.name.trim()) {
        toast.error("Error", "Name is required");
        return;
      }
      if (userProfile.username && userProfile.username.includes(" ")) {
        toast.error("Error", "Username cannot contain spaces");
        return;
      }

      const form = new FormData();
      form.append("name", userProfile.name);
      form.append("username", userProfile.username);
      form.append("goal", userProfile.goal);
      form.append("gymName", userProfile.gymName);
      form.append("bio", userProfile.bio);
      if (profileImage) {
        form.append("profileImage", profileImage);
        form.append("profileImageName", profileImage.name);
      }

      const resp = await apiClient.post(API_ENDPOINTS.UPDATE_USER_PROFILE, form);
      const next = resp.data?.data || {};

      setUserProfile((prev) => ({
        ...prev,
        ...next,
        profileImage: next.picture || next.profileImage || prev.profileImage,
      }));
      setProfileImage(null);
      toast.success("Profile updated", "Your profile has been successfully updated.");
      onProfileClose();
    } catch (error) {
      toast.error("Update failed", error?.message || "Unable to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleBackgroundSubmit = async (e) => {
    e.preventDefault();
    setIsSavingBackground(true);
    try {
      const user = await getCurrentAuthUser();
      if (!user) {
        toast.error("Error", "You must be signed in to update your background.");
        return;
      }
      if (!backgroundImage) {
        toast.error("Error", "Please choose a background image first.");
        return;
      }

      const form = new FormData();
      form.append("backgroundPicture", backgroundImage);
      form.append("backgroundPictureName", backgroundImage.name);

      const resp = await apiClient.post(API_ENDPOINTS.UPDATE_USER_BACKGROUND, form);
      if (resp.data?.success === false && resp.data?.message) {
        throw new Error(resp.data.message);
      }

      toast.success("Background updated", "Your background image was updated.");
      setBackgroundImage(null);
      onBackgroundClose();
    } catch (error) {
      toast.error("Update failed", error?.message || "Unable to update background.");
    } finally {
      setIsSavingBackground(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutAll();
      setCurrentUser(null);
      toast.success("Signed out", "You’ve been signed out.");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error("Error", error?.message || "Failed to sign out.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-20 w-full">
        <div
          className={cn(
            "w-full border-b px-4 py-[1px] pt-[constant(safe-area-inset-top)] pt-[env(safe-area-inset-top)] transition-all duration-300 backdrop-blur-xl",
            currentTheme === "light"
              ? "border-zinc-200/80 bg-zinc-50/90 shadow-sm"
              : currentTheme === "dark-black"
                ? "border-neutral-800/55 bg-neutral-950/88"
                : currentTheme === "dark-blue"
                  ? "border-[rgb(39_39_42_/_6%)] bg-zinc-950/85"
                  : "border-[rgb(39_39_42_/_6%)] bg-zinc-950/88",
          )}
        >
          <div className="mx-auto w-full max-w-7xl">
            <div className="relative flex items-center justify-between py-2">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                aria-label="Back to profile"
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                  currentTheme === "light"
                    ? "text-gray-700 hover:bg-gray-100"
                    : "text-zinc-200/90 hover:bg-white/10 hover:text-white",
                )}
              >
                <FiArrowLeft className="h-5 w-5" />
              </button>

              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
                <span className="text-xl uppercase bg-gradient-to-r from-blue-300 to-gray-400 bg-clip-text text-transparent">
                  Settings
                </span>
              </div>

              <div className="h-10 w-10" aria-hidden />
            </div>
          </div>
        </div>
      </nav>

      <Container maxW="container.xl" py={12}>
        <div className="pt-4" />
        <Box
          maxW="580px"
          w="full"
          bg={colors.bgCard}
          boxShadow="2xl"
          rounded="md"
          overflow="hidden"
          p={6}
          mx="auto"
        >
          {isLoading ? (
            <Text color={colors.textMuted}>Loading…</Text>
          ) : (
            <VStack align="stretch" spacing={6}>
              <Box>
                <Heading size="sm" color={colors.textPrimary} mb={2}>
                  Profile
                </Heading>
                <VStack align="stretch" spacing={3}>
                  <Button
                    colorScheme="blue"
                    variant="outline"
                    color={colors.textPrimary}
                    borderColor={colors.borderColor}
                    _hover={{ bg: colors.bgHover }}
                    onClick={onProfileOpen}
                  >
                    Edit Profile
                  </Button>
                  <Button
                    onClick={onBackgroundOpen}
                    colorScheme="blue"
                    variant="outline"
                    color={colors.textPrimary}
                    borderColor={colors.borderColor}
                    _hover={{ bg: colors.bgHover }}
                  >
                    Edit Background
                  </Button>
                </VStack>
              </Box>

              <Box>
                <Heading size="sm" color={colors.textPrimary} mb={2}>
                  Privacy
                </Heading>
                <Button
                  onClick={onPrivacyOpen}
                  colorScheme="gray"
                  variant="outline"
                  color={colors.textPrimary}
                  borderColor={colors.borderColor}
                  _hover={{ bg: colors.bgHover }}
                  w="full"
                >
                  Privacy Settings
                </Button>
              </Box>

              <Box>
                <Flex align="center" justify="space-between" mb={2}>
                  <Heading size="sm" color={colors.textPrimary}>
                    Theme
                  </Heading>
                  {themeValue === "system" && (
                    <Badge colorScheme="purple" variant="subtle">
                      System
                    </Badge>
                  )}
                </Flex>
                <RadioGroup value={themeValue} onChange={setThemeMode}>
                  <Stack direction={{ base: "column", md: "row" }} spacing={4}>
                    <Radio value="light" colorScheme="blue">
                      <Text color={colors.textPrimary}>Light</Text>
                    </Radio>
                    <Radio value="dark" colorScheme="blue">
                      <Text color={colors.textPrimary}>Dark</Text>
                    </Radio>
                    <Radio value="system" colorScheme="blue">
                      <Text color={colors.textPrimary}>System</Text>
                    </Radio>
                  </Stack>
                </RadioGroup>
                <Text fontSize="sm" color={colors.textMuted} mt={2}>
                  Dark includes your dark variants (dark / dark-black / dark-blue).
                </Text>
              </Box>

              <Box>
                <Heading size="sm" color={colors.textPrimary} mb={2}>
                  Account
                </Heading>
                <Text fontSize="sm" color={colors.textMuted} mb={4}>
                  Sign out of Ethereal Gains on this device.
                </Text>
                <Button
                  w="full"
                  colorScheme="red"
                  variant="outline"
                  onClick={handleSignOut}
                  isLoading={isSigningOut}
                  loadingText="Signing out…"
                >
                  Sign out
                </Button>
              </Box>
            </VStack>
          )}
        </Box>
      </Container>

      {/* Background Edit Modal */}
      <Modal isOpen={isBackgroundOpen} onClose={onBackgroundClose}>
        <form onSubmit={handleBackgroundSubmit}>
          <ModalOverlay />
          <ModalContent bg={colors.bgCard}>
            <ModalHeader color={colors.textPrimary} bg={colors.bgCard}>
              Update Background
            </ModalHeader>
            <ModalCloseButton color={colors.textMuted} />
            <ModalBody bg={colors.bgCard}>
              <VStack spacing={4}>
                <Image
                  src={backgroundPreview}
                  alt="Background Picture"
                  w="full"
                  h="200px"
                  objectFit="cover"
                  borderRadius="md"
                  fallbackSrc={backgroundPreview}
                />
                <FileUploader
                  handleFile={handleBackgroundImageUpload}
                  accept="image/jpeg,image/png,image/gif"
                />
              </VStack>
            </ModalBody>
            <ModalFooter bg={colors.bgCard}>
              <Button
                type="submit"
                colorScheme="blue"
                mr={3}
                isLoading={isSavingBackground}
                loadingText="Saving…"
              >
                Save Changes
              </Button>
              <Button
                onClick={onBackgroundClose}
                color={colors.textPrimary}
                _hover={{ bg: colors.bgHover }}
              >
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </form>
      </Modal>

      {/* Profile Edit Modal */}
      <Modal isOpen={isProfileOpen} onClose={onProfileClose}>
        <form onSubmit={handleProfileSubmit}>
          <ModalOverlay />
          <ModalContent bg={colors.bgCard}>
            <ModalHeader color={colors.textPrimary} bg={colors.bgCard}>
              Update Profile
            </ModalHeader>
            <ModalCloseButton color={colors.textMuted} />
            <ModalBody bg={colors.bgCard}>
              <VStack spacing={4}>
                <Image
                  src={userProfile.profileImage}
                  alt="Profile Picture"
                  boxSize="150px"
                  objectFit="cover"
                  borderRadius="full"
                />
                <FileUploader
                  handleFile={handleProfileImageUpload}
                  accept="image/jpeg,image/png,image/gif"
                />
                <Input
                  type="text"
                  name="name"
                  value={userProfile.name}
                  onChange={(e) =>
                    setUserProfile((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Name"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                  _placeholder={{ color: colors.textMuted }}
                />
                <Input
                  type="text"
                  name="username"
                  value={userProfile.username}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  placeholder="Username"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                  _placeholder={{ color: colors.textMuted }}
                />
                <Text fontSize="xs" color={colors.textMuted} textAlign="center">
                  Username must be unique and cannot contain spaces
                </Text>
                <Input
                  type="text"
                  name="goal"
                  value={userProfile.goal}
                  onChange={(e) =>
                    setUserProfile((prev) => ({ ...prev, goal: e.target.value }))
                  }
                  placeholder="Fitness Goal"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                  _placeholder={{ color: colors.textMuted }}
                />
                <Textarea
                  name="bio"
                  value={userProfile.bio}
                  onChange={(e) =>
                    setUserProfile((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  placeholder="Bio"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                  _placeholder={{ color: colors.textMuted }}
                />
                <Input
                  type="text"
                  name="gymName"
                  value={userProfile.gymName}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      gymName: e.target.value,
                    }))
                  }
                  placeholder="Gym Name"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                  _placeholder={{ color: colors.textMuted }}
                />
              </VStack>
            </ModalBody>
            <ModalFooter bg={colors.bgCard}>
              <Button
                type="submit"
                colorScheme="blue"
                mr={3}
                isLoading={isSavingProfile}
                loadingText="Saving…"
              >
                Save Changes
              </Button>
              <Button
                onClick={onProfileClose}
                color={colors.textPrimary}
                _hover={{ bg: colors.bgHover }}
              >
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </form>
      </Modal>

      {/* Privacy Settings Modal */}
      <PrivacySettings isOpen={isPrivacyOpen} onClose={onPrivacyClose} isModal />
    </>
  );
};

export default SettingsPage;

