// src/components/layout/PublicLayout.tsx
import { Outlet } from "react-router-dom";

/**
 * A minimal layout component for public-facing pages like the client form.
 * It contains no sidebars, headers, or any other internal navigation elements,
 * ensuring a clean, standalone experience for the client.
 */
export const PublicLayout = () => {
  return (
    <div className="min-h-screen w-full bg-background">
      {/* Outlet renders the child route, e.g., the ClientForm component */}
      <Outlet />
    </div>
  );
};