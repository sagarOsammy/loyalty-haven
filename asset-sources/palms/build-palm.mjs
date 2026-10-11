import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const source = new URL("./source/tripo_base_model_72143897-a7af-41ea-94ed-eb1d43943dec_meshopt.glb", import.meta.url);
const destination = new URL("../../public/assets/palm-tripo.glb", import.meta.url);
const original = await readFile(source);
const jsonLength = original.readUInt32LE(12);
const gltf = JSON.parse(original.subarray(20, 20 + jsonLength));
const compressed = original.subarray(28 + jsonLength);
await MeshoptDecoder.ready;
const chunks = [];
let offset = 0;
for (const view of gltf.bufferViews) {
  const extension = view.extensions.EXT_meshopt_compression;
  const decoded = new Uint8Array(view.byteLength);
  MeshoptDecoder.decodeGltfBuffer(decoded, extension.count, extension.byteStride,
    compressed.subarray(extension.byteOffset, extension.byteOffset + extension.byteLength),
    extension.mode, extension.filter);
  view.buffer = 0;
  view.byteOffset = offset;
  delete view.extensions;
  const padded = Buffer.alloc(Math.ceil(decoded.length / 4) * 4);
  padded.set(decoded);
  chunks.push(padded);
  offset += padded.length;
}
const positions = chunks[0];
const accessor = gltf.accessors[0];
const [minX, minY, minZ] = accessor.min;
const [maxX, maxY, maxZ] = accessor.max;
// Preserve the previous model's six-metre base height and ground-level origin.
const height = 6;
const scale = height / (maxY - minY);
const centerX = (minX + maxX) / 2;
const centerZ = (minZ + maxZ) / 2;
const colors = Buffer.alloc(accessor.count * 3);
const foliage = new THREE.Color("#466238");
const bark = new THREE.Color("#896347");
for (let i = 0; i < accessor.count; i++) {
  const x = positions.readFloatLE(i * 12);
  const y = positions.readFloatLE(i * 12 + 4);
  const z = positions.readFloatLE(i * 12 + 8);
  const relativeHeight = (y - minY) / (maxY - minY);
  positions.writeFloatLE((x - centerX) * scale, i * 12);
  positions.writeFloatLE((y - minY) * scale, i * 12 + 4);
  positions.writeFloatLE((z - centerZ) * scale, i * 12 + 8);
  const leaf = THREE.MathUtils.smoothstep(relativeHeight, 0.57, 0.65);
  const color = bark.clone().lerp(foliage, leaf);
  const variation = 0.94 + 0.06 * Math.sin(x * 97 + y * 63 + z * 83);
  colors[i * 3] = Math.round(color.r * variation * 255);
  colors[i * 3 + 1] = Math.round(color.g * variation * 255);
  colors[i * 3 + 2] = Math.round(color.b * variation * 255);
}
accessor.min = [(minX - centerX) * scale, 0, (minZ - centerZ) * scale];
accessor.max = [(maxX - centerX) * scale, height, (maxZ - centerZ) * scale];
gltf.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: colors.length, target: 34962 });
gltf.accessors.push({ bufferView: 3, componentType: 5121, count: accessor.count, type: "VEC3", normalized: true });
const primitive = gltf.meshes[0].primitives[0];
primitive.attributes.COLOR_0 = 3;
primitive.material = 0;
gltf.materials = [{ name: "Tripo palm natural colors", doubleSided: true,
  pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.86 } }];
gltf.nodes[0].name = "TripoPalm";
gltf.extensionsUsed = ["KHR_mesh_quantization"];
gltf.extensionsRequired = ["KHR_mesh_quantization"];
delete gltf.extensions;
chunks.push(colors);
const binary = Buffer.concat(chunks);
gltf.buffers = [{ byteLength: binary.length }];
const json = Buffer.from(JSON.stringify(gltf));
const paddedJson = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
paddedJson.set(json);
const output = Buffer.alloc(28 + paddedJson.length + binary.length);
output.write("glTF");
output.writeUInt32LE(2, 4);
output.writeUInt32LE(output.length, 8);
output.writeUInt32LE(paddedJson.length, 12);
output.writeUInt32LE(0x4e4f534a, 16);
paddedJson.copy(output, 20);
output.writeUInt32LE(binary.length, 20 + paddedJson.length);
output.writeUInt32LE(0x004e4942, 24 + paddedJson.length);
binary.copy(output, 28 + paddedJson.length);
await writeFile(destination, output);
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");
await writeFile(new URL("./provenance.json", import.meta.url), JSON.stringify({
  source: source.pathname, sourceBytes: original.length, sourceSha256: hash(original),
  destination: destination.pathname, bytes: output.length, sha256: hash(output),
  vertices: accessor.count, triangles: gltf.accessors[primitive.indices].count / 3,
  height, normalizationScale: scale, bounds: { min: accessor.min, max: accessor.max },
  transformation: "Decode meshopt, ground and uniformly normalize, add approved natural vertex colors. All vertices and triangles retained.",
}, null, 2) + "\n");
console.log(`Palm derivative: ${output.length} bytes, ${accessor.count} vertices, ${gltf.accessors[primitive.indices].count / 3} triangles`);
