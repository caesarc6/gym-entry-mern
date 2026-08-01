import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useColorModeValue,
} from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";

export default function MobileNavMenu({ className, iconClassName, onNavigate }) {
  const navigate = useNavigate();

  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const itemHoverBg = useColorModeValue("gray.50", "whiteAlpha.100");

  const go = (pathOrDelta) => {
    if (typeof onNavigate === "function") onNavigate(pathOrDelta);
    if (typeof pathOrDelta === "number") navigate(pathOrDelta);
    else navigate(pathOrDelta);
  };

  return (
    <Menu>
      <MenuButton
        as={IconButton}
        aria-label="Open menu"
        icon={<HamburgerIcon className={iconClassName} />}
        variant="ghost"
        className={className}
      />
      <MenuList bg={bg} borderColor={borderColor} zIndex={50} minW="12rem">
        <MenuItem
          _hover={{ bg: itemHoverBg }}
          onClick={() => go("/notifications")}
        >
          Notifications
        </MenuItem>
        <MenuItem _hover={{ bg: itemHoverBg }} onClick={() => go("/settings")}>
          Settings
        </MenuItem>
        <MenuItem _hover={{ bg: itemHoverBg }} onClick={() => go("/")}>
          Home
        </MenuItem>
      </MenuList>
    </Menu>
  );
}

