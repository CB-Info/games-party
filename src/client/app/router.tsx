import { Suspense, lazy } from "react";
import { createBrowserRouter, type RouteObject } from "react-router";

import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RoomPage } from "../pages/RoomPage";

// The design system demonstration exists only while developing. `import.meta.env.DEV` becomes the
// literal `false` at build time, so the branch and its dynamic import leave the production bundle.
function devRoutes(): RouteObject[] {
  if (!import.meta.env.DEV) {
    return [];
  }

  const DevUiPage = lazy(async () => {
    const module = await import("../pages/DevUiPage");
    return { default: module.DevUiPage };
  });

  return [
    {
      path: "/dev/ui",
      element: (
        <Suspense fallback={null}>
          <DevUiPage />
        </Suspense>
      ),
    },
  ];
}

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/r/:code", element: <RoomPage /> },
  ...devRoutes(),
  { path: "*", element: <NotFoundPage /> },
]);
