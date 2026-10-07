import { Avatar } from "@chakra-ui/react";
import { useTheme } from "../contexts/ThemeContext";
import {
  defaultProfileImageUrl,
  isUploadedProfilePhoto,
} from "../utils/defaultProfileImage";

/**
 * Profile photo. An uploaded picture is shown as-is.
 * Missing or failed pictures use the light or dark default, with no initials.
 */
export default function ProfileAvatar({
  src,
  name,
  bg: _bg,
  color: _color,
  icon: _icon,
  ...props
}) {
  const { currentTheme } = useTheme();
  const fallback = defaultProfileImageUrl(currentTheme);
  const photo = isUploadedProfilePhoto(src) ? src.trim() : "";

  return (
    <Avatar
      {...props}
      src={photo || fallback}
      bg="transparent"
      aria-label={props["aria-label"] || (typeof name === "string" ? name : undefined)}
      icon={
        <img
          alt=""
          src={fallback}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      }
    />
  );
}
