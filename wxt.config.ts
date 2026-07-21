import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "La Bonne Note",
    version: "1.1.0",
    description: "Show ratings from Google Maps, Allocine, and TMDB on food delivery and streaming platforms",
    permissions: ["storage", "activeTab"],
    host_permissions: [
      "https://places.googleapis.com/*",
      "https://www.allocine.fr/*",
      "https://api.themoviedb.org/*",
    ],
    icons: {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png",
    },
  },
});
