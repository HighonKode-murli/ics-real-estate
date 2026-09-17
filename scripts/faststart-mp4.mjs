/**
 * Lossless MP4 "faststart" remux.
 *
 * A browser cannot decode a single frame of an MP4 until it has the `moov`
 * atom, because `moov` holds the sample tables. When `moov` sits after `mdat`
 * the player must pull the whole file (or issue extra range requests) before it
 * can show anything or answer a seek. Moving `moov` in front of `mdat` is what
 * `ffmpeg -movflags +faststart` does, and it is a pure container rewrite: not a
 * single compressed sample is touched, so quality is bit-for-bit identical.
 *
 * Chunk offsets in `stco`/`co64` are absolute file offsets, so they are shifted
 * by the same delta that `mdat` moves.
 *
 * Usage: node scripts/faststart-mp4.mjs "file.mp4" ["another.mp4" ...]
 *        node scripts/faststart-mp4.mjs --check "file.mp4"
 */
import { readFile, writeFile, mkdir, copyFile, stat } from "node:fs/promises";
import path from "node:path";
import { parseBoxes, collectChunkOffsetTables } from "./mp4-layout.mjs";

function describeLayout(buffer) {
  return parseBoxes(buffer, 0, buffer.length).map((box) => box.type);
}

function isFaststartBuffer(buffer) {
  const layout = describeLayout(buffer);
  const moov = layout.indexOf("moov");
  const mdat = layout.indexOf("mdat");
  if (moov === -1 || mdat === -1) return null;
  return moov < mdat;
}

async function remux(file) {
  const original = await readFile(file);
  const topLevel = parseBoxes(original, 0, original.length);
  const layout = topLevel.map((box) => box.type);

  const ftyp = topLevel.filter((box) => box.type === "ftyp");
  const moovBoxes = topLevel.filter((box) => box.type === "moov");
  const mdatBoxes = topLevel.filter((box) => box.type === "mdat");

  if (moovBoxes.length !== 1) throw new Error(`expected exactly one moov box, found ${moovBoxes.length}`);
  if (mdatBoxes.length !== 1) throw new Error(`expected exactly one mdat box, found ${mdatBoxes.length}`);

  const moov = moovBoxes[0];
  const mdat = mdatBoxes[0];

  if (moov.start < mdat.start) {
    console.log(`  ${path.basename(file)}: already faststart (${layout.join(", ")}) - left untouched.`);
    return { changed: false };
  }

  // Rebuild as ftyp, moov, then everything else in original order.
  // `free` boxes are padding and are dropped, which also shrinks the file.
  const trailing = topLevel.filter(
    (box) => box.type !== "ftyp" && box.type !== "moov" && box.type !== "free" && box.type !== "skip"
  );

  const movedMoov = Buffer.from(original.subarray(moov.start, moov.end));
  const ftypBytes = ftyp.reduce((total, box) => total + box.size, 0);
  const newMdatStart = ftypBytes + movedMoov.length;
  const delta = newMdatStart - mdat.start;

  // Patch chunk offsets inside the relocated moov copy.
  const tables = collectChunkOffsetTables(movedMoov, 0, movedMoov.length);
  if (tables.length === 0) throw new Error("no stco/co64 tables found in moov");

  let patchedEntries = 0;

  for (const table of tables) {
    for (let index = 0; index < table.entryCount; index += 1) {
      if (table.type === "stco") {
        const at = table.entriesStart + index * 4;
        const updated = movedMoov.readUInt32BE(at) + delta;
        if (updated < 0 || updated > 0xffffffff) {
          throw new Error("chunk offset would overflow 32 bits; co64 upgrade required");
        }
        movedMoov.writeUInt32BE(updated, at);
      } else {
        const at = table.entriesStart + index * 8;
        const updated = movedMoov.readBigUInt64BE(at) + BigInt(delta);
        if (updated < 0n) throw new Error("negative 64-bit chunk offset");
        movedMoov.writeBigUInt64BE(updated, at);
      }
      patchedEntries += 1;
    }
  }

  const pieces = [];
  for (const box of ftyp) pieces.push(original.subarray(box.start, box.end));
  pieces.push(movedMoov);
  for (const box of trailing) pieces.push(original.subarray(box.start, box.end));

  const rebuilt = Buffer.concat(pieces);

  // Verify before overwriting: layout order, and every chunk offset must land
  // inside the new mdat payload.
  const verifyLayout = describeLayout(rebuilt);
  if (verifyLayout.indexOf("moov") > verifyLayout.indexOf("mdat")) {
    throw new Error("verification failed: moov still follows mdat");
  }

  const verifyBoxes = parseBoxes(rebuilt, 0, rebuilt.length);
  const verifyMdat = verifyBoxes.find((box) => box.type === "mdat");
  const verifyMoov = verifyBoxes.find((box) => box.type === "moov");
  if (!verifyMdat || !verifyMoov) throw new Error("verification failed: missing moov or mdat");
  if (verifyMdat.start !== newMdatStart) {
    throw new Error(`verification failed: mdat at ${verifyMdat.start}, expected ${newMdatStart}`);
  }

  for (const table of collectChunkOffsetTables(rebuilt, verifyMoov.bodyStart, verifyMoov.end)) {
    for (let index = 0; index < table.entryCount; index += 1) {
      const value = table.type === "stco"
        ? rebuilt.readUInt32BE(table.entriesStart + index * 4)
        : Number(rebuilt.readBigUInt64BE(table.entriesStart + index * 8));
      if (value < verifyMdat.bodyStart || value >= verifyMdat.end) {
        throw new Error(`verification failed: chunk offset ${value} outside mdat payload`);
      }
    }
  }

  const backupDirectory = path.join(path.dirname(file), ".media-backup");
  await mkdir(backupDirectory, { recursive: true });
  await copyFile(file, path.join(backupDirectory, path.basename(file)));
  await writeFile(file, rebuilt);

  console.log(`  ${path.basename(file)}: ${layout.join(", ")} -> ${verifyLayout.join(", ")}`);
  console.log(
    `    moov moved ahead of mdat, ${patchedEntries} chunk offsets shifted by ${delta} bytes; ` +
    `${(original.length / 1048576).toFixed(2)} MB -> ${(rebuilt.length / 1048576).toFixed(2)} MB`
  );

  return { changed: true };
}

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const files = args.filter((value) => value !== "--check");

if (files.length === 0) {
  console.error('Usage: node scripts/faststart-mp4.mjs [--check] "file.mp4" ...');
  process.exit(1);
}

let failures = 0;

for (const file of files) {
  try {
    await stat(file);
  } catch {
    console.error(`  ${file}: not found`);
    failures += 1;
    continue;
  }

  try {
    if (checkOnly) {
      const buffer = await readFile(file);
      const state = isFaststartBuffer(buffer);
      console.log(`  ${path.basename(file)}: faststart=${state} (${describeLayout(buffer).join(", ")})`);
    } else {
      await remux(file);
    }
  } catch (error) {
    console.error(`  ${file}: ${error.message}`);
    failures += 1;
  }
}

process.exit(failures > 0 ? 1 : 0);
