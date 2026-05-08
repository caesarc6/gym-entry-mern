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
  Skeleton,
  Text,
  Textarea,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

const lightUrl = new URL("../assets/light.jpg", import.meta.url).href;
const nightUrl = new URL("../assets/night.jpg", import.meta.url).href;
const defaultBgUrl = new URL("../assets/defaultBg.jpg", import.meta.url).href;
const defaultBgNightUrl = new URL(
  "../assets/defaultBgNight.jpg",
  import.meta.url
).href;
const THEME_OPTIONS = [
  { value: "light", label: "Light", description: "Bright" },
  { value: "dark", label: "Dark", description: "Dim" },
  { value: "system", label: "System", description: "Device" },
];

const SettingsPage = () => {
  const colors = useThemeColors();
  const toast = useCustomToast();
  const navigate = useNavigate();
  const { themeMode, setThemeMode, currentTheme } = useTheme();
  const profileColorMode =
    colors.currentTheme === "light" ? lightUrl : nightUrl;
  const bgColorMode =
    colors.currentTheme === "light" ? defaultBgUrl : defaultBgNightUrl;
  const setCurrentUser = useProductStore((s) => s.setCurrentUser);
  const storeUser = useProductStore((s) => s.currentUser);

  /** Profile / background values from API — theme & sign-out render without waiting. */
  const [isUserDataLoading, setIsUserDataLoading] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState(null);
  const [backgroundPreview, setBackgroundPreview] = useState("");
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [isSavingBackground, setIsSavingBackground] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const themeSliderRef = useRef(null);
  const isThemeDraggingRef = useRef(false);
  const themeDragStartXRef = useRef(0);
  const didDragThemeRef = useRef(false);
  const [themeSliderWidth, setThemeSliderWidth] = useState(0);
  const [themeDragX, setThemeDragX] = useState(null);

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
  const themeOptionIndex = useMemo(
    () =>
      Math.max(
        THEME_OPTIONS.findIndex((option) => option.value === themeValue),
        0
      ),
    [themeValue]
  );
  const themeThumbWidth = themeSliderWidth > 0 ? themeSliderWidth / 3 : 0;
  const selectedThemeX = themeThumbWidth * themeOptionIndex;
  const activeThemeX = themeDragX ?? selectedThemeX;

  useLayoutEffect(() => {
    const slider = themeSliderRef.current;
    if (!slider) return;

    const updateSliderWidth = () => {
      setThemeSliderWidth(Math.max(slider.clientWidth - 8, 0));
    };

    updateSliderWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSliderWidth);
      return () => window.removeEventListener("resize", updateSliderWidth);
    }

    const observer = new ResizeObserver(updateSliderWidth);
    observer.observe(slider);
    return () => observer.disconnect();
  }, []);

  const getThemeXFromPointer = useCallback(
    (clientX) => {
      const slider = themeSliderRef.current;
      if (!slider || !themeThumbWidth) return selectedThemeX;

      const rect = slider.getBoundingClientRect();
      const innerLeft = rect.left + 4;
      const rawX = clientX - innerLeft - themeThumbWidth / 2;
      return Math.min(Math.max(rawX, 0), themeThumbWidth * 2);
    },
    [selectedThemeX, themeThumbWidth]
  );

  const commitThemeX = useCallback(
    (x) => {
      if (!themeThumbWidth) return;
      const nextIndex = Math.min(
        Math.max(Math.round(x / themeThumbWidth), 0),
        THEME_OPTIONS.length - 1
      );
      setThemeMode(THEME_OPTIONS[nextIndex].value);
    },
    [setThemeMode, themeThumbWidth]
  );

  const handleThemePointerDown = useCallback(
    (event) => {
      if (event.button !== undefined && event.button !== 0) return;

      isThemeDraggingRef.current = true;
      didDragThemeRef.current = false;
      themeDragStartXRef.current = event.clientX;
      setThemeDragX(getThemeXFromPointer(event.clientX));
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [getThemeXFromPointer]
  );

  const handleThemePointerMove = useCallback(
    (event) => {
      if (!isThemeDraggingRef.current) return;

      if (Math.abs(event.clientX - themeDragStartXRef.current) > 4) {
        didDragThemeRef.current = true;
      }
      setThemeDragX(getThemeXFromPointer(event.clientX));
    },
    [getThemeXFromPointer]
  );

  const handleThemePointerEnd = useCallback(
    (event) => {
      if (!isThemeDraggingRef.current) return;

      const nextX = getThemeXFromPointer(event.clientX);
      isThemeDraggingRef.current = false;
      setThemeDragX(null);
      commitThemeX(nextX);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    },
    [commitThemeX, getThemeXFromPointer]
  );

  const handleThemeOptionClick = useCallback(
    (event, value) => {
      if (didDragThemeRef.current) {
        event.preventDefault();
        didDragThemeRef.current = false;
        return;
      }
      setThemeMode(value);
    },
    [setThemeMode]
  );

  const handleThemeOptionKeyDown = useCallback(
    (event, index) => {
      let nextIndex = index;
      if (event.key === "ArrowLeft") nextIndex = Math.max(index - 1, 0);
      else if (event.key === "ArrowRight") {
        nextIndex = Math.min(index + 1, THEME_OPTIONS.length - 1);
      } else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = THEME_OPTIONS.length - 1;
      else if (event.key !== "Enter" && event.key !== " ") return;

      event.preventDefault();
      setThemeMode(THEME_OPTIONS[nextIndex].value);
    },
    [setThemeMode]
  );

  const applyUserProfileToForm = useCallback((p) => {
    setBackgroundPreview(p.backgroundPicture || "");
    setUserProfile({
      name: p.name || "",
      username: p.username || "",
      goal: p.goal || "",
      gymName: p.gymName || "",
      bio: p.bio || "",
      profileImage: p.profileImage || p.picture || "",
    });
  }, []);

  // Instant hydrate from profile tab cache (no network) when available.
  useLayoutEffect(() => {
    const uid = storeUser?.uid;
    if (!uid) return;
    const cached = useProductStore.getState().profileTabCache;
    if (
      cached?.uid === uid &&
      cached?.profileLoaded === true &&
      cached?.userProfile
    ) {
      applyUserProfileToForm(cached.userProfile);
      setProfileLoadError(null);
      setIsUserDataLoading(false);
    }
  }, [storeUser?.uid, applyUserProfileToForm]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setProfileLoadError(null);
      try {
        let uid = storeUser?.uid;
        if (!uid) {
          const user = await getCurrentAuthUser();
          uid = user?.uid;
        }
        if (!uid) {
          if (mounted) setIsUserDataLoading(false);
          return;
        }

        const cached = useProductStore.getState().profileTabCache;
        if (
          cached?.uid === uid &&
          cached?.profileLoaded === true &&
          cached?.userProfile
        ) {
          if (mounted) {
            applyUserProfileToForm(cached.userProfile);
            setIsUserDataLoading(false);
          }
          return;
        }

        if (mounted) setIsUserDataLoading(true);
        const res = await apiClient.get(API_ENDPOINTS.GET_USER_PROFILE(uid));
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
        if (mounted) {
          setProfileLoadError(
            error?.message || "Unable to load profile settings right now.",
          );
        }
        toast.error(
          "Settings load failed",
          error?.message || "Unable to load settings right now.",
        );
      } finally {
        if (mounted) setIsUserDataLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [storeUser?.uid]); // eslint-disable-line react-hooks/exhaustive-deps -- toast from useCustomToast

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

              <Box w={10} />
            </div>
          </div>
        </div>
      </nav>

      <Container maxW="800px" py={{ base: 10, md: 16 }} px={{ base: 8, md: 14 }}>
        <VStack align="stretch" spacing={{ base: 10, md: 12 }}>
          <Box textAlign="center">
            <Text
              fontSize="xs"
              letterSpacing="0.22em"
              textTransform="uppercase"
              color={colors.textMuted}
              mb={3}
            >
              Preferences
            </Text>
            <Heading
              size={{ base: "lg", md: "xl" }}
              color={colors.textPrimary}
              fontWeight="500"
            >
              Keep your space simple.
            </Heading>
            <Text
              maxW="460px"
              mx="auto"
              mt={4}
              fontSize="sm"
              color={colors.textMuted}
              lineHeight="1.8"
            >
              Tune the essentials for your profile, privacy, appearance, and session.
            </Text>
          </Box>

        <Box
          w="full"
          p={{ base: 0, md: 4 }}
          mx="auto"
        >
          <VStack align="stretch" spacing={{ base: 10, md: 12 }}>
            <Box>
              <Flex
                align={{ base: "stretch", md: "center" }}
                justify="space-between"
                gap={5}
                direction={{ base: "column", md: "row" }}
              >
                <Box>
                  <Heading size="sm" color={colors.textPrimary} fontWeight="500">
                    Profile
                  </Heading>
                  <Text fontSize="sm" color={colors.textMuted} mt={2} lineHeight="1.7">
                    Update how your account appears to others.
                  </Text>
                </Box>
              {isUserDataLoading ? (
                <VStack align="stretch" spacing={3} minW={{ md: "220px" }}>
                  <Skeleton height="42px" borderRadius="full" />
                  <Skeleton height="42px" borderRadius="full" />
                </VStack>
              ) : profileLoadError ? (
                <Text fontSize="sm" color="red.400" maxW={{ md: "260px" }}>
                  {profileLoadError}
                </Text>
              ) : (
                <VStack align="stretch" spacing={3} minW={{ md: "220px" }}>
                  <Button
                    variant="outline"
                    color={colors.textPrimary}
                    borderColor={colors.borderColor}
                    borderRadius="full"
                    fontWeight="500"
                    _hover={{ bg: colors.bgHover, borderColor: colors.borderColorInput }}
                    onClick={onProfileOpen}
                  >
                    Edit Profile
                  </Button>
                  <Button
                    onClick={onBackgroundOpen}
                    variant="outline"
                    color={colors.textPrimary}
                    borderColor={colors.borderColor}
                    borderRadius="full"
                    fontWeight="500"
                    _hover={{ bg: colors.bgHover, borderColor: colors.borderColorInput }}
                  >
                    Edit Background
                  </Button>
                </VStack>
              )}
              </Flex>
            </Box>

            <Box>
              <Flex
                align={{ base: "stretch", md: "center" }}
                justify="space-between"
                gap={5}
                direction={{ base: "column", md: "row" }}
              >
                <Box>
                  <Heading size="sm" color={colors.textPrimary} fontWeight="500">
                    Privacy
                  </Heading>
                  <Text fontSize="sm" color={colors.textMuted} mt={2} lineHeight="1.7">
                    Decide who can find you and view your activity.
                  </Text>
                </Box>
                <Button
                  onClick={onPrivacyOpen}
                  variant="outline"
                  color={colors.textPrimary}
                  borderColor={colors.borderColor}
                  borderRadius="full"
                  fontWeight="500"
                  minW={{ md: "220px" }}
                  _hover={{ bg: colors.bgHover, borderColor: colors.borderColorInput }}
                >
                  Privacy Settings
                </Button>
              </Flex>
            </Box>

            <Box>
              <Flex align="center" justify="space-between" gap={4} mb={5}>
                <Box>
                  <Heading size="sm" color={colors.textPrimary} fontWeight="500">
                    Appearance
                  </Heading>
                  <Text fontSize="sm" color={colors.textMuted} mt={2} lineHeight="1.7">
                    Choose a calm theme for your device.
                  </Text>
                </Box>
                <Badge
                  colorScheme={themeValue === "system" ? "purple" : "gray"}
                  variant="subtle"
                  borderRadius="full"
                  px={3}
                  py={1}
                >
                  {THEME_OPTIONS.find((option) => option.value === themeValue)?.label}
                </Badge>
              </Flex>
              <Box
                ref={themeSliderRef}
                role="radiogroup"
                aria-label="Theme mode"
                position="relative"
                display="grid"
                gridTemplateColumns="repeat(3, minmax(0, 1fr))"
                gap={0}
                p="4px"
                bg={colors.bgMuted}
                border="1px solid"
                borderColor={colors.borderColor}
                borderRadius="full"
                overflow="hidden"
                cursor={themeDragX === null ? "grab" : "grabbing"}
                userSelect="none"
                touchAction="pan-y"
                onPointerDown={handleThemePointerDown}
                onPointerMove={handleThemePointerMove}
                onPointerUp={handleThemePointerEnd}
                onPointerCancel={handleThemePointerEnd}
              >
                <Box
                  position="absolute"
                  top="4px"
                  bottom="4px"
                  left="4px"
                  w={
                    themeThumbWidth
                      ? `${themeThumbWidth}px`
                      : "calc((100% - 8px) / 3)"
                  }
                  bg={colors.bgCard}
                  border="1px solid"
                  borderColor={colors.borderColorInput}
                  borderRadius="full"
                  boxShadow="0 10px 30px rgba(0, 0, 0, 0.14)"
                  transform={
                    themeThumbWidth
                      ? `translateX(${activeThemeX}px)`
                      : `translateX(${themeOptionIndex * 100}%)`
                  }
                  transition={
                    themeDragX === null
                      ? "transform 820ms cubic-bezier(0.42, 0, 0.58, 1), background-color 820ms cubic-bezier(0.42, 0, 0.58, 1)"
                      : "background-color 820ms cubic-bezier(0.42, 0, 0.58, 1)"
                  }
                />
                {THEME_OPTIONS.map((option, index) => {
                  const isSelected = option.value === themeValue;
                  return (
                    <Box
                      key={option.value}
                      as="button"
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={isSelected ? 0 : -1}
                      onClick={(event) =>
                        handleThemeOptionClick(event, option.value)
                      }
                      onKeyDown={(event) =>
                        handleThemeOptionKeyDown(event, index)
                      }
                      position="relative"
                      zIndex={1}
                      px={{ base: 2, md: 4 }}
                      py={3.5}
                      borderRadius="full"
                      textAlign="center"
                      cursor="pointer"
                      color={isSelected ? colors.textPrimary : colors.textMuted}
                      _hover={{ color: colors.textPrimary }}
                      _focusVisible={{
                        outline: "2px solid",
                        outlineColor: colors.primary,
                        outlineOffset: "2px",
                      }}
                    >
                      <Text fontSize="sm" fontWeight={isSelected ? "700" : "600"}>
                        {option.label}
                      </Text>
                      <Text
                        fontSize="xs"
                        color={isSelected ? colors.textSecondary : colors.textMuted}
                        display={{ base: "none", sm: "block" }}
                      >
                        {option.description}
                      </Text>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Box>
              <Flex
                align={{ base: "stretch", md: "center" }}
                justify="space-between"
                gap={5}
                direction={{ base: "column", md: "row" }}
              >
                <Box>
                  <Heading size="sm" color={colors.textPrimary} fontWeight="500">
                    Account
                  </Heading>
                  <Text fontSize="sm" color={colors.textMuted} mt={2} lineHeight="1.7">
                    Sign out of Ethereal Gains on this device.
                  </Text>
                </Box>
                <Button
                  minW={{ md: "220px" }}
                  colorScheme="red"
                  variant="outline"
                  borderRadius="full"
                  borderColor="red.300"
                  onClick={handleSignOut}
                  isLoading={isSigningOut}
                  loadingText="Signing out…"
                >
                  Sign out
                </Button>
              </Flex>
            </Box>
          </VStack>
        </Box>
        </VStack>
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
                  src={backgroundPreview || bgColorMode}
                  alt="Background Picture"
                  w="full"
                  h="200px"
                  objectFit="cover"
                  borderRadius="md"
                  fallbackSrc={bgColorMode}
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
                  src={userProfile.profileImage || profileColorMode}
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

