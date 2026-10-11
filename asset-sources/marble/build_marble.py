"""Original, deterministic marble atlas. Existing paving sources remain intact."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "assets"
SIZE, TILE, SEED = 2048, 256, 20261011
rng = np.random.default_rng(SEED)
color = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
rough = np.zeros((SIZE, SIZE), dtype=np.float32)
height = np.zeros((SIZE, SIZE), dtype=np.float32)
y, x = np.mgrid[:TILE, :TILE].astype(np.float32)

def cloud(resolution):
    sample = rng.uniform(0, 255, (resolution, resolution)).astype(np.uint8)
    return np.asarray(Image.fromarray(sample).resize((TILE, TILE), Image.Resampling.BICUBIC), dtype=np.float32) / 255 - 0.5

for row in range(8):
    for col in range(8):
        coarse, medium, fine = cloud(5), cloud(12), cloud(40)
        tones = [[202, 183, 161], [190, 173, 155], [213, 196, 174], [198, 179, 160], [205, 187, 170]]
        base = np.array(tones[rng.integers(len(tones))], dtype=np.float32) + rng.uniform(-5, 5)
        # Cloudy mineral deposits remain legible from the fixed elevated camera.
        stone = coarse * 30 + medium * 15 + fine * 4
        field = base + stone[..., None] * np.array([1.0, 0.92, 0.83])
        direction = rng.uniform(-1.2, 1.2)
        folded = x + direction * y + coarse * 65 + medium * 18
        mineral = np.sin(folded / rng.uniform(16, 29) + rng.uniform(0, 6))
        deposits = np.clip(mineral - 0.45, 0, 1) * (0.7 + coarse)
        field -= deposits[..., None] * np.array([15, 14, 12])
        veins = np.zeros((TILE, TILE), dtype=np.float32)
        slope = rng.uniform(-0.8, 0.8)
        for _ in range(7):
            origin = rng.uniform(-100, 350)
            phase = rng.uniform(0, np.pi * 2)
            curve = origin + slope * y + np.sin(y / 43 + phase) * 13 + coarse * 30 + medium * 9
            distance = np.abs(x - curve)
            width = rng.uniform(0.8, 2.2)
            veins += np.exp(-(distance / width) ** 2) * rng.uniform(7, 18)
            veins += np.exp(-(distance / (width * 6)) ** 2) * 4
        field -= veins[..., None] * np.array([0.8, 0.85, 0.9])
        edge = np.minimum.reduce([x, y, TILE - 1 - x, TILE - 1 - y])
        grout = np.clip(1 - edge / 1.8, 0, 1)
        field = field * (1 - grout[..., None] * 0.22)
        region = np.s_[row*TILE:(row+1)*TILE, col*TILE:(col+1)*TILE]
        color[region] = field
        rough[region] = 176 + coarse * 20 + medium * 9 + fine * 5 + grout * 45 + deposits * 12
        height[region] = 0.5 - grout * 0.04 + fine * 0.0015 + medium * 0.002

# Periodic derivatives keep the atlas seam consistent with the internal joints.
dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * 2
dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * 2
normal = np.stack([-dx, dy, np.ones_like(dx)], axis=-1)
normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
maps = {
    "marble-resort-warm-color.jpg": color,
    "marble-resort-warm-roughness.jpg": rough,
    "marble-resort-warm-normal.jpg": (normal * 0.5 + 0.5) * 255,
}
records = []
for name, values in maps.items():
    path = OUT / name
    Image.fromarray(np.clip(values, 0, 255).astype(np.uint8)).save(path, quality=94, subsampling=0)
    data = path.read_bytes()
    records.append({"path": str(path.relative_to(ROOT)), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
(Path(__file__).parent / "provenance-warm.json").write_text(json.dumps({
    "source": "Original procedural output, visual direction from user reference supplied 11 October 2026",
    "seed": SEED, "resolution": SIZE, "atlas": "8 by 8 slabs, 1.5 metres per slab, 12 metre repeat",
    "transformation": "Warm beige and taupe marble, cloudy mineral deposits, irregular veins, shallow joints, honed roughness and tangent-space normals. First marble maps and provenance remain preserved.",
    "outputs": records,
}, indent=2) + "\n")
print(json.dumps(records, indent=2))
