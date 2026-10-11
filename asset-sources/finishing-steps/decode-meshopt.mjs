import { readFile, writeFile } from 'node:fs/promises';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// Decode a preserved meshopt GLB into a separate Blender-compatible derivative.
// Keep every embedded texture and accessor, only replace compressed buffer views.
await MeshoptDecoder.ready;
for (const family of ['flowering-trees/flower', 'outdoor-benches/bench', 'parasol-seating/patio']) {
  const [directory, filename] = family.split('/');
  const source = new URL(`../${directory}/source/${filename}.glb`, import.meta.url);
  const target = new URL(`../${directory}/${filename}-decoded.glb`, import.meta.url);
  const bytes = await readFile(source);
  const jsonLength = bytes.readUInt32LE(12);
  const doc = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const binStart = 20 + jsonLength + 8;
  const originalBin = bytes.subarray(binStart);
  const chunks = [originalBin];
  let length = originalBin.length;
  for (const view of doc.bufferViews ?? []) {
    const compressed = view.extensions?.EXT_meshopt_compression;
    if (!compressed) continue;
    const padding = (4 - length % 4) % 4;
    if (padding) { chunks.push(Buffer.alloc(padding)); length += padding; }
    const decoded = Buffer.alloc(compressed.count * compressed.byteStride);
    MeshoptDecoder.decodeGltfBuffer(decoded, compressed.count, compressed.byteStride,
      originalBin.subarray(compressed.byteOffset ?? 0, (compressed.byteOffset ?? 0) + compressed.byteLength),
      compressed.mode, compressed.filter ?? 'NONE');
    view.buffer = 0;
    view.byteOffset = length;
    view.byteLength = decoded.length;
    delete view.extensions.EXT_meshopt_compression;
    if (!Object.keys(view.extensions).length) delete view.extensions;
    chunks.push(decoded);
    length += decoded.length;
  }
  doc.buffers = [{ byteLength: length }];
  for (const key of ['extensionsUsed', 'extensionsRequired']) {
    if (doc[key]) doc[key] = doc[key].filter(value => value !== 'EXT_meshopt_compression');
  }
  const rawJson = Buffer.from(JSON.stringify(doc));
  const json = Buffer.concat([rawJson, Buffer.alloc((4 - rawJson.length % 4) % 4, 32)]);
  const bin = Buffer.concat([...chunks, Buffer.alloc((4 - length % 4) % 4)]);
  const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + bin.length, 8);
  const jsonHeader = Buffer.alloc(8); jsonHeader.writeUInt32LE(json.length); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(bin.length); binHeader.writeUInt32LE(0x004e4942, 4);
  await writeFile(target, Buffer.concat([header, jsonHeader, json, binHeader, bin]));
  console.log(JSON.stringify({source: source.pathname, target: target.pathname, bytes: (await readFile(target)).length}));
}
