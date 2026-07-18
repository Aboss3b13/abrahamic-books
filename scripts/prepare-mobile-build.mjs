import { rm } from "node:fs/promises";

// The website publishes the APK, but the APK must not contain a nested copy of
// itself. The in-app download link points to the public server instead.
await rm("dist/downloads", { recursive: true, force: true });
// Vite already fingerprints and bundles both reader fonts under dist/assets.
// Avoid carrying the duplicate public/font copies in the offline APK.
await rm("dist/fonts", { recursive: true, force: true });
