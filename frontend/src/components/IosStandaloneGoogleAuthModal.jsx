/* eslint-disable react/prop-types -- thin Chakra wrapper */
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
} from "@chakra-ui/react";

/**
 * Sets expectations before Google OAuth on iOS standalone PWAs, where the OS
 * opens Google's flow in a separate Safari-style view (close / Done control).
 */
export default function IosStandaloneGoogleAuthModal({
  isOpen,
  onClose,
  onContinue,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader>Sign in with Google</ModalHeader>
        <ModalBody>
          <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }}>
            On an app saved to your Home Screen, Apple opens Google sign-in in a
            separate Safari window. That is expected—you may see a close control
            at the top. After you finish signing in, Apple returns you here; if
            not, open this app from the Home Screen again.
          </Text>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={onContinue}>
            Continue
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
