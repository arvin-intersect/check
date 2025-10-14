// src/components/layout/UserMenu.tsx
import { UserButton } from "@clerk/clerk-react";

export const UserMenu = () => {
  return (
    <UserButton afterSignOutUrl="/"/>
  );
};