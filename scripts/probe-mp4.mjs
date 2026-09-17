// Throwaway diagnostic: reads MP4 boxes to report the properties that govern
// scroll-scrub performance (resolution, fps, keyframe interval, faststart).
import { open, stat } from "node:fs/promises";

const targets = process.argv.slice(2);

function readBoxes(buf, start, end, depth, visit) {
  let offset = start;
  while (offset + 8 <= end) {
    let size = buf.readUInt32BE(offset);
    const type = buf.toString("latin1", offset + 4, offset + 8);
    let headerSize = 8;
    if (size === 1) {
      size = Number(buf.readBigUInt64BE(offset + 8));
      headerSize = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < headerSize || offset + size > end) break;
    visit(type, offset + headerSize, offset + size, depth);
    offset += size;
  }
}

const containers = new Set([
  "moov", "trak", "mdia", "minf", "stbl", "edts", "udta", "mvex"
]);

async function probe(file) {
  const { size } = await stat(file);
  const handle = await open(file, "r");
  const buf = Buffer.alloc(size);
  await handle.read(buf, 0, size, 0);
  await handle.close();

  const topLevel = [];
  readBoxes(buf, 0, size, 0, (type) => topLevel.push(type));

  const tracks = [];
  let current = null;
  let timescaleUnit = 1;

  const walk = (from, to, depth) => {
    readBoxes(buf, from, to, depth, (type, bodyStart, bodyEnd, d) => {
      if (type === "trak") {
        current = { handler: null, codec: null, width: 0, height: 0, samples: 0, syncSamples: null, timescale: 1, duration: 0, dataBytes: 0 };
        tracks.push(current);
      }
      if (type === "mvhd") {
        timescaleUnit = buf.readUInt32BE(bodyStart + 12);
      }
      if (type === "tkhd" && current) {
        const version = buf[bodyStart];
        // v0 body: 4 vf + 4 ctime + 4 mtime + 4 id + 4 rsv + 4 dur + 8 rsv
        //          + 2 layer + 2 group + 2 vol + 2 rsv + 36 matrix = 76 -> width
        const dims = bodyStart + (version === 1 ? 88 : 76);
        current.width = buf.readUInt32BE(dims) / 65536;
        current.height = buf.readUInt32BE(dims + 4) / 65536;
      }
      if (type === "mdhd" && current) {
        const version = buf[bodyStart];
        if (version === 1) {
          current.timescale = buf.readUInt32BE(bodyStart + 20);
          current.duration = Number(buf.readBigUInt64BE(bodyStart + 24));
        } else {
          current.timescale = buf.readUInt32BE(bodyStart + 12);
          current.duration = buf.readUInt32BE(bodyStart + 16);
        }
      }
      if (type === "hdlr" && current) {
        current.handler = buf.toString("latin1", bodyStart + 8, bodyStart + 12);
      }
      if (type === "stsd" && current) {
        const entryCount = buf.readUInt32BE(bodyStart + 4);
        if (entryCount > 0) {
          current.codec = buf.toString("latin1", bodyStart + 12, bodyStart + 16);
          // SampleEntry header is 16 bytes, VisualSampleEntry adds 16 before width/height.
          if (current.handler === "vide") {
            current.codedWidth = buf.readUInt16BE(bodyStart + 8 + 32);
            current.codedHeight = buf.readUInt16BE(bodyStart + 8 + 34);
          }
        }
      }
      if (type === "stts" && current) {
        const entryCount = buf.readUInt32BE(bodyStart + 4);
        let total = 0;
        let deltaSet = new Map();
        for (let i = 0; i < entryCount; i += 1) {
          const p = bodyStart + 8 + i * 8;
          const count = buf.readUInt32BE(p);
          const delta = buf.readUInt32BE(p + 4);
          total += count;
          deltaSet.set(delta, (deltaSet.get(delta) || 0) + count);
        }
        current.samples = total;
        current.sampleDeltas = [...deltaSet.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      }
      if (type === "stss" && current) {
        current.syncSamples = buf.readUInt32BE(bodyStart + 4);
        const list = [];
        for (let i = 0; i < Math.min(current.syncSamples, 12); i += 1) {
          list.push(buf.readUInt32BE(bodyStart + 8 + i * 4));
        }
        current.firstSyncSamples = list;
      }
      if (type === "stsz" && current) {
        const sampleSize = buf.readUInt32BE(bodyStart + 4);
        const count = buf.readUInt32BE(bodyStart + 8);
        if (sampleSize > 0) {
          current.dataBytes = sampleSize * count;
        } else {
          let sum = 0;
          for (let i = 0; i < count; i += 1) sum += buf.readUInt32BE(bodyStart + 12 + i * 4);
          current.dataBytes = sum;
        }
      }
      if (containers.has(type)) walk(bodyStart, bodyEnd, d + 1);
    });
  };

  walk(0, size, 0);

  const moovIndex = topLevel.indexOf("moov");
  const mdatIndex = topLevel.indexOf("mdat");

  console.log(`\n=== ${file} ===`);
  console.log(`file size        : ${(size / 1048576).toFixed(2)} MB`);
  console.log(`top-level boxes  : ${topLevel.join(", ")}`);
  console.log(`faststart (moov first): ${moovIndex !== -1 && mdatIndex !== -1 ? moovIndex < mdatIndex : "unknown"}`);

  for (const track of tracks) {
    const seconds = track.timescale ? track.duration / track.timescale : 0;
    console.log(`\n  -- track [${track.handler}] codec=${track.codec}`);
    console.log(`     duration      : ${seconds.toFixed(3)} s`);
    if (track.handler === "vide") {
      console.log(`     display size  : ${Math.round(track.width)} x ${Math.round(track.height)}`);
      console.log(`     coded size    : ${track.codedWidth} x ${track.codedHeight}`);
      console.log(`     frames        : ${track.samples}`);
      console.log(`     fps (avg)     : ${seconds ? (track.samples / seconds).toFixed(3) : "n/a"}`);
      const sync = track.syncSamples === null ? track.samples : track.syncSamples;
      console.log(`     keyframes     : ${track.syncSamples === null ? `${track.samples} (no stss -> ALL frames are keyframes)` : track.syncSamples}`);
      if (sync > 0) {
        console.log(`     GOP (avg)     : ${(track.samples / sync).toFixed(2)} frames = ${(seconds / sync).toFixed(3)} s per keyframe`);
      }
      if (track.firstSyncSamples) {
        console.log(`     first keyframe sample numbers: ${track.firstSyncSamples.join(", ")}`);
      }
    }
    console.log(`     media bytes   : ${(track.dataBytes / 1048576).toFixed(2)} MB`);
    if (seconds > 0) {
      console.log(`     bitrate       : ${((track.dataBytes * 8) / seconds / 1e6).toFixed(2)} Mbps`);
    }
  }
}

for (const target of targets) {
  try {
    await probe(target);
  } catch (error) {
    console.error(`Failed to probe ${target}: ${error.message}`);
  }
}
