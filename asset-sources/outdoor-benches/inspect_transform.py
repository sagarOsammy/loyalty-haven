import json
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "asset-sources/outdoor-benches/source/bench.glb"


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    records = []
    for object in bpy.context.scene.objects:
        if object.type != "MESH":
            continue
        records.append({
            "name": object.name,
            "location": list(object.location),
            "rotation": list(object.rotation_euler),
            "scale": list(object.scale),
            "matrixWorld": [list(row) for row in object.matrix_world],
            "dimensions": list(object.dimensions),
            "bounds": [list(object.matrix_world @ Vector(corner)) for corner in object.bound_box],
        })
    print(json.dumps(records, indent=2))


if __name__ == "__main__":
    main()
