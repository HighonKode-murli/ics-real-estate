/**
 * Minimal MP4/ISOBMFF box helpers shared by the build guard and the faststart
 * remuxer. Only the pieces needed to reason about atom order and chunk offsets.
 */
import { open } from "node:fs/promises";

export const CONTAINER_BOXES = new Set([
  "moov", "trak", "mdia", "minf", "stbl", "edts", "mvex", "udta"
]);

export function parseBoxes(buffer, start = 0, end = buffer.length) {
  const boxes = [];
  let offset = start;

  while (offset + 8 <= end) {
    const declaredSize = buffer.readUInt32BE(offset);
    const type = buffer.toString("latin1", offset + 4, offset + 8);
    let size = declaredSize;
    let headerSize = 8;

    if (declaredSize === 1) {
      size = Number(buffer.readBigUInt64BE(offset + 8));
      headerSize = 16;
    } else if (declaredSize === 0) {
      size = end - offset;
    }

    if (size < headerSize || offset + size > end) break;

    boxes.push({ type, start: offset, end: offset + size, bodyStart: offset + headerSize, size });
    offset += size;
  }

  return boxes;
}

/** Every stco/co64 table nested anywhere inside the given range. */
export function collectChunkOffsetTables(buffer, start, end, found = []) {
  for (const box of parseBoxes(buffer, start, end)) {
    if (box.type === "stco" || box.type === "co64") {
      found.push({
        type: box.type,
        entryCount: buffer.readUInt32BE(box.bodyStart + 4),
        entriesStart: box.bodyStart + 8
      });
    } else if (CONTAINER_BOXES.has(box.type)) {
      collectChunkOffsetTables(buffer, box.bodyStart, box.end, found);
    }
  }

  return found;
}

/**
 * Reads only the top-level box headers, so this stays cheap on 20 MB files.
 * Returns the atom order, e.g. ["ftyp", "moov", "mdat"].
 */
export async function readTopLevelLayout(filePath) {
  const handle = await open(filePath, "r");

  try {
    const { size: fileSize } = await handle.stat();
    const header = Buffer.alloc(16);
    const layout = [];
    let offset = 0;

    while (offset + 8 <= fileSize) {
      const { bytesRead } = await handle.read(header, 0, 16, offset);
      if (bytesRead < 8) break;

      const declaredSize = header.readUInt32BE(0);
      const type = header.toString("latin1", 4, 8);
      let size = declaredSize;

      if (declaredSize === 1) {
        if (bytesRead < 16) break;
        size = Number(header.readBigUInt64BE(8));
      } else if (declaredSize === 0) {
        size = fileSize - offset;
      }

      if (size < 8 || offset + size > fileSize) break;

      layout.push(type);
      offset += size;
    }

    return layout;
  } finally {
    await handle.close();
  }
}

/**
 * True when `moov` precedes `mdat`, i.e. the file is progressively playable.
 * Returns null when the file has no recognisable moov/mdat pair.
 */
export async function isFaststart(filePath) {
  const layout = await readTopLevelLayout(filePath);
  const moov = layout.indexOf("moov");
  const mdat = layout.indexOf("mdat");
  if (moov === -1 || mdat === -1) return null;
  return moov < mdat;
}
