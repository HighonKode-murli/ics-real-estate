import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readTopLevelLayout } from "./mp4-layout.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(projectRoot, "dist");
const maximumAssetSize = 25 * 1024 * 1024;
const publicEntries = [
  "index.html",
  "css",
  "js",
  "fonts",
  "images",
  "output 1.mp4",
  "output 2.mp4",
  "output 1-mobile.mp4",
  "output 2-mobile.mp4"
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
  const videos = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      const nested = await inspectOutput(entryPath);
      fileCount += nested.fileCount;
      totalBytes += nested.totalBytes;
      videos.push(...nested.videos);
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

    if (entry.name.toLowerCase().endsWith(".mp4")) videos.push(entryPath);

    fileCount += 1;
    totalBytes += fileStats.size;
  }

  return { fileCount, totalBytes, videos };
}

/**
 * The scroll-driven hero cannot render a frame until the browser has the `moov`
 * atom. When a re-encode drops `-movflags +faststart`, `moov` lands after `mdat`
 * and the visitor waits for the entire file before seeing anything. That
 * regression is invisible in a file listing, so the build refuses to ship it.
 */
async function assertProgressiveVideos(videoPaths) {
  const offenders = [];

  for (const videoPath of videoPaths) {
    const layout = await readTopLevelLayout(videoPath);
    const moovIndex = layout.indexOf("moov");
    const mdatIndex = layout.indexOf("mdat");
    const relativePath = path.relative(outputDirectory, videoPath);

    if (moovIndex === -1 || mdatIndex === -1) {
      offenders.push(`${relativePath} (no moov/mdat pair found: ${layout.join(", ") || "unparseable"})`);
      continue;
    }

    if (moovIndex > mdatIndex) {
      offenders.push(`${relativePath} (atom order: ${layout.join(", ")})`);
    }
  }

  if (offenders.length > 0) {
    throw new Error(
      "These MP4s are not progressively playable because moov follows mdat:\n" +
      offenders.map((entry) => `  - ${entry}`).join("\n") +
      "\nFix with: node scripts/faststart-mp4.mjs \"<file>.mp4\"" +
      "\nOr re-encode with: ffmpeg ... -movflags +faststart"
    );
  }
}

await Promise.all(publicEntries.map(assertEntryExists));
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const entry of publicEntries) {
  await cp(path.join(projectRoot, entry), path.join(outputDirectory, entry), {
    recursive: true
  });
}

const { fileCount, totalBytes, videos } = await inspectOutput(outputDirectory);
await assertProgressiveVideos(videos);
const totalMiB = (totalBytes / (1024 * 1024)).toFixed(2);

console.log(`Cloudflare Pages output created at ${outputDirectory}`);
console.log(`Copied ${fileCount} files (${totalMiB} MiB).`);
console.log(`Verified ${videos.length} MP4s are faststart (moov before mdat).`);
