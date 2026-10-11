import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const folder = join(project, "public/assets");
const assets = [];
for (const name of (await readdir(folder)).sort()) {
  const path = join(folder, name);
  const data = await readFile(path);
  const entry = {
    path: relative(project, path),
    bytes: data.length,
    sha256: createHash("sha256").update(data).digest("hex"),
  };
  if (name.endsWith(".glb")) {
    if (
      data.toString("ascii", 0, 4) !== "glTF" ||
      data.readUInt32LE(4) !== 2 ||
      data.readUInt32LE(8) !== data.length
    )
      throw new Error(`Invalid GLB header: ${name}`);
    const gltf = JSON.parse(
      data.toString("utf8", 20, 20 + data.readUInt32LE(12)),
    );
    if (
      [...(gltf.buffers ?? []), ...(gltf.images ?? [])].some(
        (item) => item.uri && !item.uri.startsWith("data:"),
      )
    )
      throw new Error(`External dependency in ${name}`);
    const primitives = (gltf.meshes ?? []).flatMap((mesh) => mesh.primitives);
    Object.assign(entry, {
      nodes: gltf.nodes?.length ?? 0,
      meshes: gltf.meshes?.length ?? 0,
      primitives: primitives.length,
      materials: gltf.materials?.length ?? 0,
      embeddedImages: gltf.images?.length ?? 0,
      vertices: primitives.reduce(
        (sum, primitive) => sum + gltf.accessors[primitive.attributes.POSITION].count,
        0,
      ),
      triangles: primitives.reduce(
        (sum, p) =>
          sum +
          ((p.mode ?? 4) === 4
            ? gltf.accessors[p.indices ?? p.attributes.POSITION].count / 3
            : 0),
        0,
      ),
    });
  }
  assets.push(entry);
}
await writeFile(
  join(project, "docs/asset-manifest.json"),
  JSON.stringify(
    { assets, totalBytes: assets.reduce((sum, a) => sum + a.bytes, 0) },
    null,
    2,
  ) + "\n",
);
console.log(
  `${assets.length} local assets audited, ${assets.filter((a) => a.path.endsWith(".glb")).length} self-contained GLBs`,
);
