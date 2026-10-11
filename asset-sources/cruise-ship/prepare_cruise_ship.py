"""Convert the supplied FBX to a self-contained GLB, retaining both originals."""
import hashlib
import json
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
FOLDER = Path(__file__).resolve().parent
SOURCE = FOLDER / "source/tripo_pbr_model_9f2828ec-aab5-4b3b-b9e7-6b65e54efc37.fbx"
REFERENCE = ROOT / "asset-sources/retired-runtime/assets/cruise-ship.glb"
TARGET = ROOT / "public/assets/cruise-ship-tripo.glb"


def bounds(objects):
    bpy.context.view_layer.update()
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    return (Vector(tuple(min(p[i] for p in points) for i in range(3))),
            Vector(tuple(max(p[i] for p in points) for i in range(3))))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(REFERENCE))
reference_min, reference_max = bounds([obj for obj in bpy.context.scene.objects if obj.type == "MESH"])
reference_size = reference_max - reference_min
draft_fraction = -reference_min.z / reference_size.z

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(SOURCE))
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
source_min, source_max = bounds(meshes)
source_size = source_max - source_min
scale = reference_size.y / source_size.y
center = (source_min + source_max) / 2
waterline = source_min.z + source_size.z * draft_fraction
triangle_count = sum(sum(len(poly.vertices) - 2 for poly in obj.data.polygons) for obj in meshes)
source_images = []
for image in bpy.data.images:
    source_images.append({"name": image.name, "dimensions": list(image.size), "embedded": bool(image.packed_file)})
    if max(image.size) > 2048:
        factor = 2048 / max(image.size)
        image.scale(round(image.size[0] * factor), round(image.size[1] * factor))
    image.pack()

# Bake the FBX world transform, center horizontally and place the waterline at Z=0.
# Blender's GLB exporter converts Z up to the site's Y up coordinate system.
for obj in meshes:
    transform = obj.matrix_world.copy()
    for vertex in obj.data.vertices:
        position = transform @ vertex.co
        # The supplied bow faces the opposite longitudinal direction to the reference.
        vertex.co = (Vector((center.x - position.x, center.y - position.y,
                             position.z - waterline)) * scale)
    obj.matrix_world.identity()
    obj.data.update()
    obj.name = "TripoCruiseShip"

bpy.ops.object.select_all(action="DESELECT")
for obj in meshes:
    obj.select_set(True)
runtime_min, runtime_max = bounds(meshes)
bpy.ops.export_scene.gltf(filepath=str(TARGET), export_format="GLB", use_selection=True,
                         export_image_format="JPEG", export_jpeg_quality=92)
bpy.ops.wm.save_as_mainfile(filepath=str(FOLDER / "cruise-ship-tripo.blend"))
(FOLDER / "provenance.json").write_text(json.dumps({
    "source": str(SOURCE.relative_to(ROOT)), "sourceSha256": sha(SOURCE), "sourceBytes": SOURCE.stat().st_size,
    "reference": str(REFERENCE.relative_to(ROOT)), "referenceSha256": sha(REFERENCE),
    "runtime": str(TARGET.relative_to(ROOT)), "runtimeSha256": sha(TARGET), "runtimeBytes": TARGET.stat().st_size,
    "generator": str(Path(__file__).relative_to(ROOT)), "generatorSha256": sha(Path(__file__)),
    "sourceTriangles": triangle_count, "runtimeTriangles": triangle_count,
    "sourceBoundsBlender": {"min": list(source_min), "max": list(source_max)},
    "runtimeBoundsBlender": {"min": list(runtime_min), "max": list(runtime_max)},
    "referenceLength": reference_size.y, "referenceDraftFraction": draft_fraction,
    "scale": scale, "sourceWaterlineZ": waterline, "sourceImages": source_images,
    "transformations": ["Retain all mesh polygons, UVs and four supplied PBR maps",
                        "Uniformly match original ship length and proportional draft, center horizontally",
                        "Bake FBX transform, turn 180 degrees to match reference bow direction, export GLB with Y up",
                        "Reduce 4096px textures to 2048px and embed, JPEG quality 92"],
    "scope": "Local replacement and review, public deployment was not requested",
    "origin": "User-supplied Tripo FBX, licensing not supplied with the file"
}, indent=2) + "\n")
print("CRUISE_SHIP_CONVERTED", TARGET.stat().st_size, triangle_count, flush=True)
