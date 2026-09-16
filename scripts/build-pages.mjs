import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(projectRoot, "dist");
const maximumAssetSize = 25 * 1024 * 1024;
const publicEntries = [
  "index.html",
  "css",
  "js",
  "fonts",
  "images",
  "dubai_zoom_image_frames",
  "real_estate_video_img_frames"
];

async function assertEntryExists(entry) {
  const source = path.join(projectRoot, entry);

  try {
    await stat(source);
  } catch {
    throw new Error(`Required public entry is missing: ${entry}`);
  }
}

async function inspectOutput(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  let fileCount = 0;
  let totalBytes = 0;

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      const nested = await inspectOutput(entryPath);
      fileCount += nested.fileCount;
      totalBytes += nested.totalBytes;
      continue;
    }

    if (!entry.isFile()) continue;

    const fileStats = await stat(entryPath);
    if (fileStats.size > maximumAssetSize) {
      const relativePath = path.relative(outputDirectory, entryPath);
      throw new Error(
        `Asset exceeds Cloudflare Pages' 25 MiB limit: ${relativePath} (${fileStats.size} bytes)`
      );
    }

    fileCount += 1;
    totalBytes += fileStats.size;
  }

  return { fileCount, totalBytes };
}

await Promise.all(publicEntries.map(assertEntryExists));
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const entry of publicEntries) {
  await cp(path.join(projectRoot, entry), path.join(outputDirectory, entry), {
    recursive: true
  });
}

const { fileCount, totalBytes } = await inspectOutput(outputDirectory);
const totalMiB = (totalBytes / (1024 * 1024)).toFixed(2);

console.log(`Cloudflare Pages output created at ${outputDirectory}`);
console.log(`Copied ${fileCount} files (${totalMiB} MiB).`);
