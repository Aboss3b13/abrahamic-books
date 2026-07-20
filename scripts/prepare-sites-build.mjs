import { cp, copyFile, mkdir, writeFile } from "node:fs/promises";

await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
await cp("public/offline", "dist/offline", { recursive: true }).catch((error) => {
  // The lightweight Sites source branch intentionally omits the 300+ MB
  // offline bundle. Full server and APK builds still include it.
  if (error.code !== "ENOENT") throw error;
});
await copyFile(".openai/hosting.json", "dist/.openai/hosting.json");
await copyFile("sw.js", "dist/sw.js");
await copyFile("manifest.webmanifest", "dist/manifest.webmanifest");

await writeFile(
  "dist/server/index.js",
  `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const downloadName = "abrahamic-books-offline.apk";
    if (url.pathname.endsWith(\`/downloads/\${downloadName}\`)) {
      return Response.redirect(\`https://raw.githubusercontent.com/Aboss3b13/abrahamic-books/main/public/downloads/\${downloadName}\`, 302);
    }
    const offlineMarker = "/offline/";
    const offlineIndex = url.pathname.indexOf(offlineMarker);
    if (offlineIndex >= 0) {
      const offlinePath = url.pathname.slice(offlineIndex + offlineMarker.length).split("/").map(encodeURIComponent).join("/");
      return Response.redirect(\`https://raw.githubusercontent.com/Aboss3b13/abrahamic-books/main/public/offline/\${offlinePath}\`, 302);
    }
    if (env?.ASSETS?.fetch) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Static asset binding is unavailable.", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
};
`,
);
