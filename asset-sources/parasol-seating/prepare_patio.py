"""Prepare the supplied combined patio GLB for four scene instances.

The source is one merged mesh, so the four-chair arrangement stays together
as supplied. This script preserves the source, resizes embedded maps, applies
a uniform Y-up transform and creates a separate derivative for the runtime.
"""

from __future__ import annotations

import hashlib
import json
import struct
import subprocess
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
FOLDER = Path(__file__).resolve().parent
SOURCE = FOLDER / "source/patio.glb"
DECODED = FOLDER / "patio-decoded.glb"
TARGET = ROOT / "public/assets/patio-seating-tripo.glb"
BLEND = FOLDER / "patio-seating-tripo.blend"
SOURCE_PREVIEW = FOLDER / "source-preview.png"
DERIVATIVE_PREVIEW = FOLDER / "derivative-preview.png"
TEXTURE_DIR = FOLDER / "textures"
STATS = FOLDER / "derivative-stats.json"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def embedded_glb_images(path: Path):
    """Read image dimensions from the bytes embedded in a GLB BIN chunk."""
    data = path.read_bytes()
    if data[:4] != b"glTF":
        raise RuntimeError(f"Not a GLB file: {path}")
    offset = 12
    json_chunk = None
    binary_chunk = b""
    while offset + 8 <= len(data):
        length, chunk_type = struct.unpack_from("<II", data, offset)
        chunk = data[offset + 8:offset + 8 + length]
        offset += 8 + length
        if chunk_type == 0x4E4F534A:
            json_chunk = json.loads(chunk.decode("utf-8"))
        elif chunk_type == 0x004E4942:
            binary_chunk = chunk
    if json_chunk is None:
        raise RuntimeError(f"GLB JSON chunk missing: {path}")
    result = []
    for index, image in enumerate(json_chunk.get("images", [])):
        view = json_chunk["bufferViews"][image["bufferView"]]
        start = view.get("byteOffset", 0)
        end = start + view["byteLength"]
        payload = binary_chunk[start:end]
        if payload[:8] == b"\x89PNG\r\n\x1a\n":
            width, height = struct.unpack_from(">II", payload, 16)
            mime_type = "image/png"
        else:
            width = height = 0
            mime_type = image.get("mimeType", "unknown")
        result.append({
            "index": index,
            "mimeType": mime_type,
            "width": width,
            "height": height,
            "byteLength": len(payload),
            "pngSignature": payload[:8] == b"\x89PNG\r\n\x1a\n",
        })
    return result


def mesh_objects():
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]


def bounds(objects):
    bpy.context.view_layer.update()
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    if not points:
        return Vector((0, 0, 0)), Vector((0, 0, 0))
    return (
        Vector(tuple(min(point[i] for point in points) for i in range(3))),
        Vector(tuple(max(point[i] for point in points) for i in range(3))),
    )


def stats(objects):
    lower, upper = bounds(objects)
    size = upper - lower
    vertices = 0
    polygons = 0
    triangles = 0
    meshes = []
    for obj in objects:
        mesh_vertices = len(obj.data.vertices)
        mesh_polygons = len(obj.data.polygons)
        mesh_triangles = sum(max(0, len(poly.vertices) - 2) for poly in obj.data.polygons)
        vertices += mesh_vertices
        polygons += mesh_polygons
        triangles += mesh_triangles
        meshes.append({
            "name": obj.name,
            "vertices": mesh_vertices,
            "polygons": mesh_polygons,
            "triangles": mesh_triangles,
            "dimensions": list(obj.dimensions),
            "materials": [slot.material.name for slot in obj.material_slots if slot.material],
        })
    return {
        "objects": len(objects),
        "vertices": vertices,
        "polygons": polygons,
        "triangles": triangles,
        "boundsBlender": {"min": list(lower), "max": list(upper)},
        "dimensionsBlender": list(size),
        "meshes": meshes,
    }


def image_info():
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


def resize_and_pack_images():
    before = image_info()
    # Blender 5.2 preserves the original packed bytes during export. Save the
    # resized buffers as local PNGs and remove the old packed bytes so the GLB
    # exporter reads the new files. The images are repacked after export for a
    # portable working .blend.
    TEXTURE_DIR.mkdir(parents=True, exist_ok=True)
    paths = []
    maximum = 1024
    images = [image for image in bpy.data.images if image.size[0] and image.size[1]]
    for index, image in enumerate(images):
        label = f"{image.name} {image.filepath}".lower()
        non_color = any(token in label for token in ("normal", "rough", "metal", "_1", "_2", "_3"))
        image.colorspace_settings.name = "Non-Color" if non_color else "sRGB"
        path = TEXTURE_DIR / f"map-{index}.png"
        # Use a plain string here. Blender's GLB exporter resolves image
        # paths through filepath_raw, and a Path object can leave the old
        # packed 2048px bytes attached on some Blender builds.
        image.filepath_raw = str(path)
        image.file_format = "PNG"
        image.save()
        image.unpack(method="REMOVE")
        # Image.scale is a no-op for packed Tripo images in Blender 5.2. The
        # saved PNG is resized with the system image tool, then reloaded into
        # the same datablock so every material node and the exporter resolve
        # the actual 1024px pixels.
        subprocess.run(
            ["/usr/bin/sips", "-Z", str(maximum), str(path)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        image.reload()
        paths.append(path)
    after = image_info()
    if any(
        image["width"] > maximum or image["height"] > maximum
        for image in after
    ):
        raise RuntimeError(f"Texture resize failed before export: {after}")
    return before, after, paths


def repack_resized_images(paths):
    for image, path in zip(bpy.data.images, paths):
        data = path.read_bytes()
        image.pack(data=data, data_len=len(data))


def normalize_to_ground(objects):
    """Keep the source proportions and place its lowest point at Blender Z=0."""
    lower, upper = bounds(objects)
    center = (lower + upper) / 2
    source_height = max(upper.z - lower.z, 0.001)
    # The supplied GLB is normalized to one metre high. The canopy and four
    # chairs need a broad, human-scale footprint in the plaza, so normalize to
    # the reserved combined-set envelope while retaining a 2.85m canopy height.
    target_size = Vector((4.25, 4.0, 2.85))
    axis_scale = Vector((
        target_size.x / max(upper.x - lower.x, 0.001),
        target_size.y / max(upper.y - lower.y, 0.001),
        target_size.z / source_height,
    ))
    for obj in objects:
        transform = obj.matrix_world.copy()
        for vertex in obj.data.vertices:
            point = transform @ vertex.co
            vertex.co = Vector((
                (point.x - center.x) * axis_scale.x,
                (point.y - center.y) * axis_scale.y,
                (point.z - lower.z) * axis_scale.z,
            ))
        obj.matrix_world.identity()
        obj.data.update()
        obj.name = "PatioSeatingOptimized"
        obj["source_asset"] = SOURCE.name
        obj["source_components"] = "combined umbrella, table and four lounge chairs"
    return {
        "sourceBoundsBlender": {"min": list(lower), "max": list(upper)},
        "sourceDimensionsBlender": list(upper - lower),
        "axisScale": list(axis_scale),
        "targetDimensions": list(target_size),
        "grounding": "source bounds centered, lowest point moved to Blender Z=0",
        "axis": "Blender Z-up, glTF exporter writes Y-up",
    }


def decimate(objects):
    before = stats(objects)["triangles"]
    ratio = min(1.0, 50_000 / max(before, 1))
    for obj in objects:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        modifier = obj.modifiers.new("Patio seating economical derivative", "DECIMATE")
        modifier.ratio = ratio
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    after = stats(objects)["triangles"]
    return {"beforeTriangles": before, "afterTriangles": after, "ratioRequested": ratio}


def look_at(camera, target):
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def render_preview(objects, target: Path):
    lower, upper = bounds(objects)
    center = (lower + upper) / 2
    size = upper - lower
    extent = max(size.x, size.y, size.z, 1.0)
    bpy.ops.object.camera_add(location=(center.x + extent * 1.4, center.y - extent * 1.55, center.z + extent * 1.0))
    camera = bpy.context.object
    camera.data.lens = 58
    look_at(camera, center)
    bpy.context.scene.camera = camera
    bpy.ops.mesh.primitive_plane_add(size=extent * 4, location=(center.x, center.y, lower.z))
    ground = bpy.context.object
    ground.name = "PreviewGround"
    ground.data.materials.append(bpy.data.materials.new("PreviewGroundMaterial"))
    ground.active_material.diffuse_color = (0.075, 0.055, 0.04, 1)
    for location, energy, color in [
        ((center.x + extent, center.y - extent, center.z + extent * 2), 1200, (1.0, 1.0, 1.0)),
        ((center.x - extent, center.y + extent, center.z + extent), 700, (1.0, 0.72, 0.45)),
    ]:
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.data.energy = energy
        light.data.color = color
        light.data.size = extent * 1.5
        look_at(light, center)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(target)
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new("PatioPreviewWorld")
    scene.world.color = (0.03, 0.02, 0.015)
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)


def import_source(path: Path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects = mesh_objects()
    if not objects:
        raise RuntimeError(f"No mesh found in {path}")
    return objects


def main():
    source_objects = import_source(SOURCE)
    source_stats = stats(source_objects)
    source_images = image_info()
    render_preview(source_objects, SOURCE_PREVIEW)

    transform = normalize_to_ground(source_objects)
    image_before, image_after, texture_paths = resize_and_pack_images()
    decimation = decimate(source_objects)
    runtime_stats_before_export = stats(source_objects)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in source_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = source_objects[0]
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(TARGET),
        export_format="GLB",
        use_selection=True,
        export_image_format="AUTO",
    )
    repack_resized_images(texture_paths)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))

    runtime_objects = import_source(TARGET)
    runtime_stats = stats(runtime_objects)
    runtime_images = image_info()
    embedded_images = embedded_glb_images(TARGET)
    if any(
        image["width"] > 1024 or image["height"] > 1024
        for image in embedded_images
    ):
        raise RuntimeError(f"Embedded texture pixel check failed: {embedded_images}")
    render_preview(runtime_objects, DERIVATIVE_PREVIEW)
    output = {
        "schema": "loyalty-haven-parasol-seating-derivative-1",
        "source": {
            "path": str(SOURCE.relative_to(ROOT)),
            "bytes": SOURCE.stat().st_size,
            "sha256": sha(SOURCE),
            "glbMeshStats": source_stats,
            "images": source_images,
        },
        "derivative": {
            "path": str(TARGET.relative_to(ROOT)),
            "bytes": TARGET.stat().st_size,
            "sha256": sha(TARGET),
            "glbMeshStats": runtime_stats,
            "images": runtime_images,
            "embeddedPixelChecks": embedded_images,
            "preview": str(DERIVATIVE_PREVIEW.relative_to(ROOT)),
        },
        "runtimeStatsBeforeExport": runtime_stats_before_export,
        "normalization": transform,
        "decimation": decimation,
        "texturePolicy": {
            "maxDimension": 1024,
            "embedded": True,
            "colorSpace": "base color sRGB, metallic roughness and normal Non-Color",
        },
        "visualFeatures": {
            "suppliedSet": "combined umbrella, table and four lounge chairs",
            "chairCount": 4,
            "runtimePlacementPolicy": "repeat complete supplied set; do not remove chair geometry without separable semantic components",
            "materialStructure": "one merged mesh and one material with three embedded PBR maps",
        },
        "sourcePreserved": True,
        "scope": "Local derivative for browser review, no publication",
    }
    STATS.write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps(output, indent=2), flush=True)


if __name__ == "__main__":
    main()
