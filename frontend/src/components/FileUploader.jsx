// import { useRef } from "react";
// import "../index.css";

// export const FileUploader = ({ handleFile, accept = "image/*" }) => {
//   const hiddenFileInput = useRef(null);

//   const handleClick = (e) => {
//     e.preventDefault(); // Prevent form submission
//     hiddenFileInput.current.click();
//   };

//   const handleChange = (event) => {
//     const fileUploaded = event.target.files[0];
//     if (fileUploaded) {
//       handleFile(fileUploaded);
//     }
//   };

//   return (
//     <>
//       <button className="button-upload" onClick={handleClick} type="button">
//         Upload Image
//       </button>
//       <input
//         type="file"
//         onChange={handleChange}
//         ref={hiddenFileInput}
//         accept={accept}
//         style={{ display: "none" }}
//       />
//     </>
//   );
// };

// FileUploader.js
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Text,
  VStack,
  HStack,
  Progress,
  useColorModeValue,
  Box,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerBody,
  useDisclosure,
  IconButton,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from "@chakra-ui/react";
import { ButtonLoadingSpinner } from "./loading";
import { CloseIcon } from "@chakra-ui/icons";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { useCustomToast } from "../hooks/useCustomToast";
import {
  handleImageUploadWithCompression,
} from "../utils/imageCompression";
import { getCroppedImgAsFile } from "../utils/getCroppedImg";
import "../index.css";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Camera as CameraIcon, ImagePlus } from "lucide-react";
import { cn } from "../lib/utils";

const subtleTriggerClassName =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50";

export const FileUploader = ({
  handleFile,
  maxSizeMB = 5,
  enableNativeCamera = true,
  showSelectedPreview = true,
  /** When set (width/height), user crops inside the preview before compression. */
  cropAspect = undefined,
  /** Smaller layout for dense modals (e.g. edit workout post). */
  compact = false,
  /** `subtle` = dashed dropzone style (create post). */
  variant = "default",
}) => {
  const hiddenFileInput = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null);
  const [pendingSource, setPendingSource] = useState(null); // "camera" | "photos" | "file"
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState(null);
  const [isSelectedActive, setIsSelectedActive] = useState(false);
  const previewDisclosure = useDisclosure();
  const actionsDisclosure = useDisclosure();
  const toast = useCustomToast();
  const selectedBorderColor = useColorModeValue("blue.500", "blue.300");
  const isCapacitorNative = useMemo(() => {
    if (typeof window === "undefined") return false;
    const cap = window.Capacitor;
    return !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
  }, []);

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl && pendingPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pendingPreviewUrl);
      }
      if (selectedPreviewUrl && selectedPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(selectedPreviewUrl);
      }
    };
  }, [pendingPreviewUrl, selectedPreviewUrl]);

  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, [pendingPreviewUrl, cropAspect]);

  const showCropper =
    cropAspect != null &&
    Number.isFinite(cropAspect) &&
    pendingPreviewUrl &&
    pendingFile &&
    pendingFile.type !== "image/gif" &&
    pendingFile.type !== "image/svg+xml";

  const canConfirmCrop =
    !showCropper || (croppedAreaPixels != null && croppedAreaPixels.width > 0);

  const handleClick = (e) => {
    e.preventDefault(); // Prevent form submission
    e.stopPropagation(); // Prevent event bubbling
    hiddenFileInput.current.click();
  };

  const setPendingSelection = async (file, source = "file") => {
    if (!file) return;

    try {
      // Lightweight haptic feedback for native feel
      if (isCapacitorNative) {
        try {
          await Haptics.impact({ style: ImpactStyle.Light });
        } catch {
          // no-op
        }
      }
    } catch {
      // no-op
    }

    if (pendingPreviewUrl && pendingPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(pendingPreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingFile(file);
    setPendingPreviewUrl(previewUrl);
    setPendingSource(source);
    previewDisclosure.onOpen();
    actionsDisclosure.onOpen();
  };

  const fileFromCapacitorPhoto = async (photo) => {
    // `webPath` is the most reliable for turning the result into a Blob/File.
    if (!photo?.webPath) {
      throw new Error("Could not read selected photo.");
    }
    const resp = await fetch(photo.webPath);
    const blob = await resp.blob();
    const ext = (photo.format || "jpeg").toLowerCase();
    const filename = `photo-${Date.now()}.${ext === "jpg" ? "jpeg" : ext}`;
    const mime = blob.type || (ext === "png" ? "image/png" : "image/jpeg");
    return new File([blob], filename, { type: mime, lastModified: Date.now() });
  };

  const takePhotoNative = async () => {
    // Let the tap animation / any transitions finish before presenting iOS UI.
    await new Promise((r) => setTimeout(r, 150));
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 90,
      saveToGallery: false,
      correctOrientation: true,
    });
    const file = await fileFromCapacitorPhoto(photo);
    await setPendingSelection(file, "camera");
  };

  const choosePhotoNative = async () => {
    await new Promise((r) => setTimeout(r, 150));
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos,
      quality: 90,
      correctOrientation: true,
    });
    const file = await fileFromCapacitorPhoto(photo);
    await setPendingSelection(file, "photos");
  };

  const presentNativePicker = async (kind) => {
    // iOS can behave oddly if we present the picker while a bottom drawer is open.
    actionsDisclosure.onClose();
    // Also dismiss the preview modal itself (without clearing state) so we don't
    // stack native iOS presentation on top of an active full-screen modal.
    previewDisclosure.onClose();
    await new Promise((r) => setTimeout(r, 450));
    if (kind === "camera") {
      await takePhotoNative();
      return;
    }
    await choosePhotoNative();
  };

  const handleChange = async (event) => {
    const fileUploaded = event.target.files[0];
    if (!fileUploaded) {
      return;
    }
    await setPendingSelection(fileUploaded, "file");
  };

  const closePreview = () => {
    previewDisclosure.onClose();
    actionsDisclosure.onClose();
    setPendingFile(null);
    if (pendingPreviewUrl && pendingPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(pendingPreviewUrl);
    }
    setPendingPreviewUrl(null);
    setPendingSource(null);
  };

  const confirmUsePhoto = async () => {
    if (!pendingFile || !canConfirmCrop) return;
    setIsProcessing(true);

    try {
      let fileToCompress = pendingFile;
      if (
        showCropper &&
        croppedAreaPixels &&
        pendingPreviewUrl
      ) {
        try {
          fileToCompress = await getCroppedImgAsFile(
            pendingPreviewUrl,
            croppedAreaPixels,
            pendingFile.name
          );
        } catch (err) {
          toast.error(
            "Crop Error",
            err?.message || "Could not crop image. Try another photo."
          );
          setIsProcessing(false);
          return;
        }
      }

      await handleImageUploadWithCompression(
        fileToCompress,
        (result) => {
          handleFile(result.file);
          setIsSelectedActive(false);
          if (selectedPreviewUrl && selectedPreviewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(selectedPreviewUrl);
          }
          setSelectedPreviewUrl(result.preview || null);
          setIsProcessing(false);
          closePreview();
        },
        (error) => {
          toast.error("Upload Error", error);
          setIsProcessing(false);
        },
        { maxSizeMB }
      );
    } catch {
      setIsProcessing(false);
    }
  };

  const clearSelected = async () => {
    setIsSelectedActive(false);
    if (selectedPreviewUrl && selectedPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(selectedPreviewUrl);
    }
    setSelectedPreviewUrl(null);
    try {
      if (isCapacitorNative) {
        try {
          await Haptics.impact({ style: ImpactStyle.Light });
        } catch {
          // no-op
        }
      }
    } catch {
      // no-op
    }
    // Let parent clear its state (most handlers accept null).
    try {
      handleFile(null);
    } catch {
      // no-op
    }
  };

  const isSubtle = variant === "subtle";

  const onTakePhotoNative = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await takePhotoNative();
    } catch (err) {
      // User cancel is common; avoid noisy errors.
      const msg = err?.message || "";
      if (!/cancel/i.test(msg)) {
        toast.error("Camera Error", "Could not open the camera.");
      }
    }
  };

  const onChoosePhotoNative = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await choosePhotoNative();
    } catch (err) {
      const msg = err?.message || "";
      if (!/cancel/i.test(msg)) {
        toast.error("Photos Error", "Could not open your photo library.");
      }
    }
  };

  return (
    <VStack spacing={compact ? 2 : 3} align="stretch">
      {isCapacitorNative && enableNativeCamera ? (
        isSubtle ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={subtleTriggerClassName}
              onClick={onTakePhotoNative}
              disabled={isProcessing}
            >
              <CameraIcon className="size-4 shrink-0" strokeWidth={1.75} />
              <span>Camera</span>
            </button>
            <button
              type="button"
              className={subtleTriggerClassName}
              onClick={onChoosePhotoNative}
              disabled={isProcessing}
            >
              <ImagePlus className="size-4 shrink-0" strokeWidth={1.75} />
              <span>Library</span>
            </button>
          </div>
        ) : (
          <HStack
            spacing={compact ? 2 : 3}
            flexWrap={compact ? "wrap" : undefined}
          >
            <Button
              className="button-upload"
              onClick={onTakePhotoNative}
              type="button"
              size={compact ? "sm" : "md"}
              isDisabled={isProcessing}
              colorScheme="blue"
              variant="solid"
            >
              Take Photo
            </Button>

            <Button
              onClick={onChoosePhotoNative}
              type="button"
              size={compact ? "sm" : "md"}
              isDisabled={isProcessing}
              colorScheme="blue"
              variant="outline"
            >
              Choose Photo
            </Button>
          </HStack>
        )
      ) : isSubtle ? (
        <button
          type="button"
          className={cn(subtleTriggerClassName, compact ? "py-2.5" : "py-3.5")}
          onClick={handleClick}
          disabled={isProcessing}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {isProcessing ? (
            <>
              <ButtonLoadingSpinner />
              <span>Processing…</span>
            </>
          ) : (
            <>
              <ImagePlus className="size-4 shrink-0" strokeWidth={1.75} />
              <span>Add a photo</span>
            </>
          )}
        </button>
      ) : (
        <Button
          className="button-upload"
          onClick={handleClick}
          type="button"
          size={compact ? "sm" : "md"}
          isLoading={isProcessing}
          spinner={<ButtonLoadingSpinner />}
          loadingText="Processing..."
          isDisabled={isProcessing}
          colorScheme="blue"
          variant="outline"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {isProcessing ? "Processing Image..." : "Add Image"}
        </Button>
      )}

      <input
        type="file"
        onChange={handleChange}
        ref={hiddenFileInput}
        accept="image/*"
        style={{ display: "none" }}
      />

      {/* Fullscreen preview (native-feel) */}
      <Modal
        isOpen={previewDisclosure.isOpen}
        onClose={closePreview}
        size="full"
        motionPreset="slideInBottom"
        closeOnOverlayClick={false}
        returnFocusOnClose={false}
      >
        <ModalOverlay bg="blackAlpha.800" />
        <ModalContent bg="black" borderRadius={0}>
          <ModalBody p={0} display="flex" flexDirection="column">
            <Box
              flex="1"
              display="flex"
              flexDirection="column"
              alignItems={showCropper ? "stretch" : "center"}
              justifyContent={showCropper ? "flex-start" : "center"}
              position="relative"
              px={3}
              pt={6}
              pb={20}
              minH={0}
            >
              {/* Top controls */}
              <HStack
                position="absolute"
                top={0}
                left={0}
                right={0}
                p={3}
                justify="space-between"
              >
                <Button
                  variant="ghost"
                  color="white"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closePreview();
                  }}
                >
                  Cancel
                </Button>

                {isCapacitorNative && enableNativeCamera ? (
                  pendingSource === "camera" ? (
                    <Button
                      variant="ghost"
                      color="white"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          await takePhotoNative();
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      Retake
                    </Button>
                  ) : null
                ) : null}
              </HStack>

              {pendingPreviewUrl ? (
                showCropper ? (
                  <VStack spacing={0} align="stretch" w="100%" flex="1" minH={0}>
                    <Box
                      position="relative"
                      w="100%"
                      flex="1"
                      minH={{ base: "280px", md: "340px" }}
                      borderRadius="md"
                      overflow="hidden"
                    >
                      <Cropper
                        image={pendingPreviewUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={cropAspect}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={(_area, areaPixels) =>
                          setCroppedAreaPixels(areaPixels)
                        }
                      />
                    </Box>
                    <Box px={4} py={3} w="100%">
                      <Text fontSize="sm" color="whiteAlpha.800" mb={2}>
                        Zoom
                      </Text>
                      <Slider
                        aria-label="Crop zoom"
                        min={1}
                        max={3}
                        step={0.02}
                        value={zoom}
                        onChange={setZoom}
                      >
                        <SliderTrack bg="whiteAlpha.300">
                          <SliderFilledTrack bg="blue.300" />
                        </SliderTrack>
                        <SliderThumb />
                      </Slider>
                    </Box>
                  </VStack>
                ) : (
                  <Box
                    as="img"
                    src={pendingPreviewUrl}
                    alt="Selected"
                    maxH="100%"
                    maxW="100%"
                    objectFit="contain"
                    borderRadius="md"
                  />
                )
              ) : null}
            </Box>

            {/* iOS-style action sheet */}
            <Drawer
              isOpen={actionsDisclosure.isOpen}
              placement="bottom"
              onClose={closePreview}
              closeOnOverlayClick={false}
              returnFocusOnClose={false}
            >
              <DrawerOverlay bg="transparent" />
              <DrawerContent
                borderTopRadius="2xl"
                bg={useColorModeValue("white", "gray.900")}
              >
                <DrawerBody py={4}>
                  <VStack spacing={3} align="stretch">
                    <Button
                      bg={useColorModeValue("gray.800", "gray.100")}
                      color={useColorModeValue("white", "gray.900")}
                      _hover={{
                        bg: useColorModeValue("gray.700", "gray.200"),
                      }}
                      _active={{
                        bg: useColorModeValue("gray.600", "gray.300"),
                      }}
                      size="lg"
                      isLoading={isProcessing}
                      spinner={<ButtonLoadingSpinner />}
                      loadingText="Processing..."
                      isDisabled={!canConfirmCrop}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        confirmUsePhoto();
                      }}
                    >
                      Use Photo
                    </Button>

                    {isCapacitorNative && enableNativeCamera ? (
                      <HStack spacing={3}>
                        <Button
                          size="lg"
                          variant="outline"
                          flex="1"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            presentNativePicker("photos").catch(() => {});
                          }}
                        >
                          Choose Another
                        </Button>
                        {pendingSource === "camera" ? (
                          <Button
                            size="lg"
                            variant="outline"
                            flex="1"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              presentNativePicker("camera").catch(() => {});
                            }}
                          >
                            Retake
                          </Button>
                        ) : null}
                      </HStack>
                    ) : (
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleClick(e);
                        }}
                      >
                        Choose Another
                      </Button>
                    )}

                    <Button
                      size="lg"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        closePreview();
                      }}
                    >
                      Cancel
                    </Button>
                  </VStack>
                </DrawerBody>
              </DrawerContent>
            </Drawer>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Selected image preview with remove control */}
      {showSelectedPreview && selectedPreviewUrl ? (
        <Box
          position="relative"
          alignSelf="center"
          borderRadius={compact ? "md" : "lg"}
          overflow="hidden"
          border="2px solid"
          borderColor={isSelectedActive ? selectedBorderColor : "transparent"}
          transition="border-color 120ms ease"
          onClick={() => setIsSelectedActive((v) => !v)}
          cursor="pointer"
          w={compact ? "112px" : "160px"}
          h={compact ? "112px" : "160px"}
        >
          <Box
            as="img"
            src={selectedPreviewUrl}
            alt="Selected preview"
            w="100%"
            h="100%"
            objectFit="cover"
          />

          {isSelectedActive ? (
            <IconButton
              aria-label="Remove photo"
              icon={<CloseIcon boxSize={3} />}
              size="sm"
              colorScheme="blackAlpha"
              position="absolute"
              top={2}
              right={2}
              borderRadius="full"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearSelected();
              }}
            />
          ) : null}
        </Box>
      ) : null}

      {/* Processing Progress */}
      {isProcessing && (
        <Box>
          <Text fontSize={compact ? "xs" : "sm"} mb={2}>
            Processing image...
          </Text>
          <Progress size="sm" isIndeterminate colorScheme="blue" />
        </Box>
      )}
    </VStack>
  );
};
