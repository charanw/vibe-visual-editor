import { VisualVibesEditor } from "@/features/visual-vibes";

/**
 * Root route for the single-page Visual Vibes editor.
 *
 * Route code imports only the feature public API so feature internals can move
 * without changing Next.js app-layer files.
 */
export default function Home() {
  return <VisualVibesEditor />;
}
