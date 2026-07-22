import { defineConfig } from "wxt";

export default defineConfig({
  webExt: {
    openBrowser: false,
  },
  manifest: {
    name: "La Bonne Note",
    version: "1.1.0",
    description: "Show ratings from Google Maps, Allocine, and TMDB on food delivery, streaming, and hotel booking platforms",
    permissions: ["storage", "activeTab", "tabs"],
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
