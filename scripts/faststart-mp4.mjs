import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const containerTypes = new Set([
  "dinf", "edts", "ilst", "mdia", "minf", "moov", "mvex", "stbl", "trak", "udta"
]);

function readBox(buffer, offset, limit) {
  if (offset + 8 > limit) return null;

  let size = buffer.readUInt32BE(offset);
  const type = buffer.toString("ascii", offset + 4, offset + 8);
  let headerSize = 8;

  if (size === 1) {
    if (offset + 16 > limit) throw new Error(`Truncated extended-size ${type} box`);
    const extendedSize = buffer.readBigUInt64BE(offset + 8);
    if (extendedSize > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(`${type} box is too large to process safely`);
    }
    size = Number(extendedSize);
    headerSize = 16;
  } else if (size === 0) {
    size = limit - offset;
  }

  if (size < headerSize || offset + size > limit) {
    throw new Error(`Invalid ${type} box at byte ${offset}`);
  }

  return {
    start: offset,
    end: offset + size,
    size,
    type,
    headerSize,
    payloadStart: offset + headerSize
  };
}

function listBoxes(buffer, start = 0, end = buffer.length) {
  const boxes = [];
  let offset = start;

  while (offset < end) {
    const box = readBox(buffer, offset, end);
    if (!box) break;
    boxes.push(box);
    offset = box.end;
  }

  if (offset !== end) throw new Error(`Unparsed MP4 data at byte ${offset}`);
  return boxes;
}

function patchChunkOffsets(buffer, start, end, delta, mediaStart, mediaEnd) {
  for (const box of listBoxes(buffer, start, end)) {
    if (box.type === "stco" || box.type === "co64") {
      const entryCount = buffer.readUInt32BE(box.payloadStart + 4);
      const entryWidth = box.type === "stco" ? 4 : 8;
      let entryOffset = box.payloadStart + 8;

      if (entryOffset + entryCount * entryWidth > box.end) {
        throw new Error(`Invalid ${box.type} chunk-offset table`);
      }

      for (let index = 0; index < entryCount; index += 1) {
        if (entryWidth === 4) {
          const current = buffer.readUInt32BE(entryOffset);
          if (current < mediaStart || current >= mediaEnd) {
            throw new Error(`Unsupported chunk offset outside the media-data box: ${current}`);
          }
          buffer.writeUInt32BE(current + delta, entryOffset);
        } else {
          const current = buffer.readBigUInt64BE(entryOffset);
          if (current < BigInt(mediaStart) || current >= BigInt(mediaEnd)) {
            throw new Error(`Unsupported chunk offset outside the media-data box: ${current}`);
          }
          buffer.writeBigUInt64BE(current + BigInt(delta), entryOffset);
        }
        entryOffset += entryWidth;
      }
      continue;
    }

    if (containerTypes.has(box.type)) {
      patchChunkOffsets(buffer, box.payloadStart, box.end, delta, mediaStart, mediaEnd);
    } else if (box.type === "meta") {
      patchChunkOffsets(buffer, box.payloadStart + 4, box.end, delta, mediaStart, mediaEnd);
    }
  }
}

async function optimizeFastStart(filePath) {
  const absolutePath = path.resolve(filePath);
  const source = await readFile(absolutePath);
  const topLevelBoxes = listBoxes(source);
  const ftyp = topLevelBoxes.find((box) => box.type === "ftyp");
  const moov = topLevelBoxes.find((box) => box.type === "moov");
  const mediaDataBoxes = topLevelBoxes.filter((box) => box.type === "mdat");
  const mdat = mediaDataBoxes[0];

  if (!ftyp || !moov || !mdat) throw new Error(`${filePath} is missing ftyp, moov, or mdat`);
  if (moov.start < mdat.start) {
    console.log(`${filePath}: already optimized for fast start`);
    return;
  }
  if (mediaDataBoxes.length !== 1 || moov !== topLevelBoxes.at(-1)) {
    throw new Error(`${filePath} uses an unsupported multi-mdat or non-final moov layout`);
  }

  const patchedMoov = Buffer.from(source.subarray(moov.start, moov.end));
  patchChunkOffsets(
    patchedMoov,
    moov.headerSize,
    patchedMoov.length,
    moov.size,
    mdat.payloadStart,
    mdat.end
  );

  const optimized = Buffer.concat([
    source.subarray(0, ftyp.end),
    patchedMoov,
    source.subarray(ftyp.end, moov.start),
    source.subarray(moov.end)
  ]);

  if (optimized.length !== source.length) throw new Error(`${filePath} changed size unexpectedly`);

  const optimizedBoxes = listBoxes(optimized);
  const optimizedMoov = optimizedBoxes.find((box) => box.type === "moov");
  const optimizedMdat = optimizedBoxes.find((box) => box.type === "mdat");
  if (!optimizedMoov || !optimizedMdat || optimizedMoov.start > optimizedMdat.start) {
    throw new Error(`${filePath} fast-start verification failed`);
  }

  const temporaryPath = `${absolutePath}.faststart.tmp`;
  const backupPath = `${absolutePath}.faststart.backup`;
  await rm(temporaryPath, { force: true });
  await rm(backupPath, { force: true });
  await writeFile(temporaryPath, optimized);
  await rename(absolutePath, backupPath);

  try {
    await rename(temporaryPath, absolutePath);
    await rm(backupPath, { force: true });
  } catch (error) {
    await rm(absolutePath, { force: true });
    await rename(backupPath, absolutePath);
    throw error;
  }

  console.log(`${filePath}: moved moov before mdat (${moov.size} bytes)`);
}

const files = process.argv.slice(2);
if (!files.length) throw new Error("Provide at least one MP4 path");

for (const file of files) {
  await optimizeFastStart(file);
}
