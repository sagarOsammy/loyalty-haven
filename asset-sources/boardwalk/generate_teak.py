"""Original deterministic teak maps, no supplied image or asset is modified."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "public" / "assets"
SIZE = (1024, 2048)
rng = np.random.default_rng(20261011)
w, h = SIZE
x, y = np.meshgrid(np.arange(w) / w, np.arange(h) / h)

# Long, irregular fibre bands with finer pores and soft mineral color variation.
warped = x + .008 * np.sin(y * 2 * np.pi) + .005 * np.sin(y * 6 * np.pi + x * 13)
coarse = np.sin(warped * 2 * np.pi * 17 + .55 * np.sin(y * 8 * np.pi))
fine = np.sin(warped * 2 * np.pi * 83 + .8 * np.sin(y * 4 * np.pi))
pores = np.power(.5 + .5 * np.sin(warped * 2 * np.pi * 151), 12)
samples = rng.normal(0, 1, 65)
samples[-1] = samples[0]
wide = np.interp(x, np.linspace(0, 1, 65), samples)
noise = rng.normal(0, 1, (h, w))
variation = coarse * 5 + fine * 2.1 - pores * 5 + wide * 5 + noise * 1.4
rgb = np.stack([130 + variation * 1.25, 87 + variation, 48 + variation * .7], axis=-1)
color = np.uint8(np.clip(rgb, 0, 255))
height = coarse * .17 + fine * .12 - pores * .13 + noise * .035
dx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * .24
dy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * .08
normal = np.stack([-dx, -dy, np.ones_like(dx)], axis=-1)
normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
normal = np.uint8(np.clip((normal * .5 + .5) * 255, 0, 255))
rough = np.uint8(np.clip(176 + coarse * 8 + wide * 4 + noise * 1.5, 145, 198))
maps = {"color": color, "normal": normal, "roughness": rough}
records = []
for name, pixels in maps.items():
    target = DEST / f"boardwalk-teak-{name}.jpg"
    Image.fromarray(pixels).save(target, quality=92)
    records.append({"path": str(target.relative_to(ROOT)), "bytes": target.stat().st_size,
                    "sha256": hashlib.sha256(target.read_bytes()).hexdigest()})
checkpoint = []
for path in sorted((Path(__file__).parent / "before").glob("*")):
    checkpoint.append({"path": str(path.relative_to(ROOT)), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
provenance = {"source": "Original deterministic teak texture authoring, guided by Sammy's reference",
              "seed": 20261011, "size": SIZE, "maps": records, "preserved_stage_3_sources": checkpoint}
(Path(__file__).parent / "provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")
print(json.dumps({"maps": len(records), "bytes": sum(r["bytes"] for r in records)}))
