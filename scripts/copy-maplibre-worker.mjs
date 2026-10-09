// MapLibre 6 loads its web worker by URL. Bundlers relocate the library, so the worker and its shared
// chunk are served as static files from /vendor/maplibre and registered with setWorkerUrl().
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "maplibre-gl", "dist");
const target = join(root, "public", "vendor", "maplibre");
if (!existsSync(source)) {
  console.warn("maplibre-gl not installed; skipping worker copy");
  process.exit(0);
}
mkdirSync(target, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(join(source, file), join(target, file));
console.log("Copied MapLibre worker to public/vendor/maplibre");
