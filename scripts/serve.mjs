/**
 * Minimal static preview server with HTTP Range support.
 *
 * Range matters here: Safari (and iOS in particular) fetches video through
 * range requests and will refuse a media resource served without them, so
 * testing the scroll-driven hero over file:// or a range-less server tells you
 * nothing useful. Serves the repository root by default.
 *
 * Usage: node scripts/serve.mjs [--port 4173] [--root dist]
 */
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function argValue(flag, fallback) {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : fallback;
}

const port = Number(argValue("--port", "4173"));
const serveRoot = path.resolve(projectRoot, argValue("--root", "."));

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

const server = createServer(async (request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400).end("Bad request");
    return;
  }

  if (pathname.endsWith("/")) pathname += "index.html";

  // Contain every request inside the served root.
  const target = path.resolve(serveRoot, "." + path.posix.normalize(pathname));
  if (target !== serveRoot && !target.startsWith(serveRoot + path.sep)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  let fileStats;
  try {
    fileStats = await stat(target);
    if (fileStats.isDirectory()) throw new Error("directory");
  } catch {
    response.writeHead(404, { "content-type": "text/plain" }).end("Not found");
    return;
  }

  const contentType = CONTENT_TYPES[path.extname(target).toLowerCase()] || "application/octet-stream";
  const range = request.headers.range;

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (match) {
      const hasStart = match[1] !== "";
      const hasEnd = match[2] !== "";
      let start = hasStart ? Number(match[1]) : 0;
      let end = hasEnd ? Number(match[2]) : fileStats.size - 1;

      // "bytes=-500" means the trailing 500 bytes.
      if (!hasStart && hasEnd) {
        start = Math.max(0, fileStats.size - Number(match[2]));
        end = fileStats.size - 1;
      }

      if (start > end || start >= fileStats.size) {
        response.writeHead(416, { "content-range": `bytes */${fileStats.size}` }).end();
        return;
      }

      end = Math.min(end, fileStats.size - 1);
      response.writeHead(206, {
        "content-type": contentType,
        "content-length": end - start + 1,
        "content-range": `bytes ${start}-${end}/${fileStats.size}`,
        "accept-ranges": "bytes",
        "cache-control": "no-cache"
      });
      createReadStream(target, { start, end }).pipe(response);
      return;
    }
  }

  response.writeHead(200, {
    "content-type": contentType,
    "content-length": fileStats.size,
    "accept-ranges": "bytes",
    "cache-control": "no-cache"
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(target).pipe(response);
});

server.listen(port, () => {
  console.log(`Preview server: http://localhost:${port}/  (root: ${path.relative(projectRoot, serveRoot) || "."})`);
});
