import { readdir, lstat, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve, relative, join } from "node:path";
import { fileURLToPath } from "node:url";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(project, "docs", "source-inventory.csv");
const counts = {};
const rows = [["path", "classification", "bytes", "type"]];
function classify(parts, name) {
  if (parts.includes(".git")) return "version-control metadata";
  if (parts.includes("node_modules")) return "installed dependency";
  if (
    parts.some((p) =>
      [".next", "dist", ".wrangler", ".sites-runtime", ".vinext", "__pycache__"].includes(p),
    )
  )
    return "generated runtime or build artifact";
  if ([".DS_Store", "tsconfig.tsbuildinfo"].includes(name))
    return "system or incremental artifact";
  if (parts[0] === "docs" && parts[1] === "reference-images")
    return "preserved user reference";
  if (name.startsWith(".env"))
    return "configuration file, contents not inventoried";
  return "active source or asset";
}
async function visit(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
      continue;
    }
    if (path === output) continue;
    const rel = relative(project, path);
    const kind = classify(rel.split("/"), entry.name);
    const stat = await lstat(path);
    rows.push([
      rel,
      kind,
      stat.size,
      entry.isSymbolicLink() ? "symlink" : "file",
    ]);
    counts[kind] = (counts[kind] || 0) + 1;
  }
}
await visit(project);
await mkdir(join(project, "docs"), { recursive: true });
const csvCell = (value) => `"${String(value).replaceAll('"', '""')}"`;
await writeFile(
  output,
  rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n",
);
await writeFile(
  join(project, "docs", "inventory-summary.json"),
  JSON.stringify(
    {
      files: rows.length - 1,
      classification: counts,
      method:
        "Includes hidden/system files and symlinks within this repository without following symlink directories or reading secret contents. Excludes the CSV itself.",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({ files: rows.length - 1, classification: counts }, null, 2),
);
