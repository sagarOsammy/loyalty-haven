"""Inspect the supplied bench GLB without changing the preserved source."""

import hashlib
import json
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "asset-sources/outdoor-benches/source/bench.glb"
DECODED = ROOT / "asset-sources/outdoor-benches/bench-decoded.glb"
TARGET = ROOT / "public/assets/outdoor-bench-tripo.glb"
OUTPUT = ROOT / "asset-sources/outdoor-benches/source-stats.json"


def sha(path: Path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def mesh_objects():
    return [object for object in bpy.context.scene.objects if object.type == "MESH"]


def bounds(objects):
    bpy.context.view_layer.update()
    points = [object.matrix_world @ Vector(corner) for object in objects for corner in object.bound_box]
    if not points:
        return Vector((0, 0, 0)), Vector((0, 0, 0))
    return (
        Vector(tuple(min(point[index] for point in points) for index in range(3))),
        Vector(tuple(max(point[index] for point in points) for index in range(3))),
    )


def stats(objects):
    minimum, maximum = bounds(objects)
    vertices = 0
    polygons = 0
    triangles = 0
    mesh_stats = []
    for object in objects:
        object.data.calc_loop_triangles()
        object_vertices = len(object.data.vertices)
        object_polygons = len(object.data.polygons)
        object_triangles = len(object.data.loop_triangles)
        vertices += object_vertices
        polygons += object_polygons
        triangles += object_triangles
        mesh_stats.append({
            "name": object.name,
            "vertices": object_vertices,
            "polygons": object_polygons,
            "triangles": object_triangles,
            "dimensions": [round(value, 6) for value in object.dimensions],
            "materials": [slot.material.name for slot in object.material_slots if slot.material],
        })
    size = maximum - minimum
    materials = sorted({slot.material.name for object in objects for slot in object.material_slots if slot.material})
    return {
        "meshObjects": len(objects),
        "vertices": vertices,
        "polygons": polygons,
        "triangles": triangles,
        "boundsYUp": {
            "min": [round(value, 6) for value in minimum],
            "max": [round(value, 6) for value in maximum],
            "dimensions": [round(value, 6) for value in size],
        },
        "materials": materials,
        "meshes": mesh_stats,
    }


def image_stats():
    return [
        {
            "name": image.name,
            "width": image.size[0],
            "height": image.size[1],
            "packed": bool(image.packed_file),
            "filepath": image.filepath,
        }
        for image in bpy.data.images
    ]


def inspect(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects = mesh_objects()
    result = {
        "path": os.path.relpath(path, ROOT),
        "bytes": path.stat().st_size,
        "sha256": sha(path),
        "stats": stats(objects),
        "images": image_stats(),
    }
    return result


def main():
    paths = [path for path in (SOURCE, DECODED, TARGET) if path.exists()]
    records = [inspect(path) for path in paths]
    OUTPUT.write_text(json.dumps({"source": records}, indent=2) + "\n")
    print(json.dumps(records, indent=2))


if __name__ == "__main__":
    main()
