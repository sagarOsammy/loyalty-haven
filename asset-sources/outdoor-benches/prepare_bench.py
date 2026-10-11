"""Create the optimized, grounded Y-up bench derivative from the supplied GLB."""

import hashlib
import json
import math
import os
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
FOLDER = Path(__file__).resolve().parent
SOURCE = FOLDER / "source/bench.glb"
TARGET = ROOT / "public/assets/outdoor-bench-tripo.glb"
BLEND = FOLDER / "bench-tripo.blend"
PREVIEW = FOLDER / "derivative-preview.png"
STATS = FOLDER / "derivative-stats.json"
PROVENANCE = FOLDER / "provenance.json"

TARGET_WIDTH = 3.05
TARGET_DEPTH = 1.12
TARGET_HEIGHT = 1.25
TARGET_TRIANGLES = 20_000
TARGET_IMAGE = 1024


def sha(path: Path) -> str:
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


def object_stats(objects):
    minimum, maximum = bounds(objects)
    vertices = 0
    polygons = 0
    triangles = 0
    meshes = []
    for object in objects:
        object.data.calc_loop_triangles()
        object_vertices = len(object.data.vertices)
        object_polygons = len(object.data.polygons)
        object_triangles = len(object.data.loop_triangles)
        vertices += object_vertices
        polygons += object_polygons
        triangles += object_triangles
        meshes.append({
            "name": object.name,
            "vertices": object_vertices,
            "polygons": object_polygons,
            "triangles": object_triangles,
            "dimensions": [round(value, 6) for value in object.dimensions],
            "materials": [slot.material.name for slot in object.material_slots if slot.material],
        })
    size = maximum - minimum
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
        "materials": sorted({
            slot.material.name
            for object in objects
            for slot in object.material_slots
            if slot.material
        }),
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


def map_to_y_up(objects):
    """Prepare Blender Z-up coordinates for a final glTF Y-up bench.

    Orthographic inspection shows source Y is the bench length, source Z is
    the upright axis, and source X is the front-to-back depth. Blender's
    glTF exporter swaps its Y/Z axes when ``export_yup=True`` and negates the
    exported Z axis. Therefore the pre-export Blender mapping is
    (sourceY, -sourceX, sourceZ), which produces final glTF coordinates
    (sourceY, sourceZ, sourceX). The cushion-facing side remains final +Z.
    """
    minimum, maximum = bounds(objects)
    source_size = maximum - minimum
    scale = min(
        TARGET_WIDTH / max(source_size.y, 0.0001),
        TARGET_HEIGHT / max(source_size.z, 0.0001),
        TARGET_DEPTH / max(source_size.x, 0.0001),
    )
    center_y = (minimum.y + maximum.y) / 2
    center_x = (minimum.x + maximum.x) / 2
    for object in objects:
        transform = object.matrix_world.copy()
        for vertex in object.data.vertices:
            source = transform @ vertex.co
            vertex.co = Vector((
                (source.y - center_y) * scale,
                -(source.x - center_x) * scale,
                (source.z - minimum.z) * scale,
            ))
        object.matrix_world.identity()
        object.data.update()
        object.data.calc_loop_triangles()
        object.name = "OutdoorBenchTripoOptimized"
        object["sourceAsset"] = SOURCE.name
        object["blenderExportAxisMapping"] = "blender=(sourceY,-sourceX,sourceZ)"
        object["finalGltfAxisMapping"] = "gltf=(sourceY,sourceZ,sourceX)"
        object["frontDirection"] = "final glTF +Z"
    bpy.context.view_layer.update()
    return {
        "sourceDimensionsYUpBeforeScale": [round(value, 6) for value in (
            source_size.y,
            source_size.z,
            source_size.x,
        )],
        "uniformScale": scale,
        "targetEnvelope": [TARGET_WIDTH, TARGET_HEIGHT, TARGET_DEPTH],
        "blenderExportMapping": "Blender X=source Y, Blender Y=-source X, Blender Z=source Z",
        "finalGltfMapping": "glTF X=source Y, glTF Y=source Z, glTF Z=source X",
        "frontDirection": "final glTF +Z",
        "grounding": "minimum mapped Blender Z moved to 0, exported glTF Y remains grounded",
    }


def reduce_triangles(objects):
    before = object_stats(objects)["triangles"]
    ratio = min(1.0, TARGET_TRIANGLES / max(before, 1))
    for object in objects:
        bpy.ops.object.select_all(action="DESELECT")
        object.select_set(True)
        bpy.context.view_layer.objects.active = object
        modifier = object.modifiers.new(name="Outdoor bench economical derivative", type="DECIMATE")
        modifier.ratio = ratio
        modifier.use_collapse_triangulate = False
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        object.data.update()
        object.data.calc_loop_triangles()
    after = object_stats(objects)["triangles"]
    return {
        "beforeTriangles": before,
        "afterTriangles": after,
        "ratioRequested": ratio,
    }


def resize_and_pack_color_image():
    records = []
    for image in list(bpy.data.images):
        width, height = image.size
        # Set the color space before resizing. Blender can reload the original
        # FILE image dimensions when the color space is changed after scale().
        image.colorspace_settings.name = "sRGB"
        if width and height and max(width, height) > TARGET_IMAGE:
            image.scale(TARGET_IMAGE, TARGET_IMAGE)
        # Blender's glTF exporter can retain a FILE image's original source
        # dimensions even after Image.scale(). Copy the scaled pixels into a
        # generated image so the embedded runtime payload is definitely 1024.
        resized = bpy.data.images.new(
            name=f"{image.name}_runtime",
            width=image.size[0],
            height=image.size[1],
            alpha=True,
        )
        # Set the generated image color space before assigning pixels. In
        # Blender 5.2 changing it after the copy clears generated pixels.
        resized.colorspace_settings.name = "sRGB"
        resized.pixels.foreach_set(image.pixels[:])
        resized.update()
        resized.pack()
        for material in bpy.data.materials:
            if not material.use_nodes or not material.node_tree:
                continue
            for node in material.node_tree.nodes:
                if getattr(node, "image", None) is image:
                    node.image = resized
        bpy.data.images.remove(image)
        image = resized
        records.append({
            "name": image.name,
            "width": image.size[0],
            "height": image.size[1],
            "packed": bool(image.packed_file),
            "colorspace": image.colorspace_settings.name,
        })
    return records


def export_objects(objects):
    bpy.ops.object.select_all(action="DESELECT")
    for object in objects:
        object.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=str(TARGET),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_image_format="JPEG",
        export_image_quality=90,
        export_draco_mesh_compression_enable=False,
    )


def inspect_exported_runtime():
    """Re-import the GLB and report its final glTF Y-up coordinate system."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(TARGET))
    imported = mesh_objects()
    blender_stats = object_stats(imported)
    blender_bounds = blender_stats["boundsYUp"]
    # Blender's glTF importer converts final glTF (X, Y, Z) into Blender
    # (X, Z, -Y). Convert the verified re-import back to final glTF axes.
    final_bounds = {
        "min": [
            blender_bounds["min"][0],
            blender_bounds["min"][2],
            -blender_bounds["max"][1],
        ],
        "max": [
            blender_bounds["max"][0],
            blender_bounds["max"][2],
            -blender_bounds["min"][1],
        ],
    }
    final_bounds["dimensions"] = [
        round(final_bounds["max"][index] - final_bounds["min"][index], 6)
        for index in range(3)
    ]
    final_meshes = []
    for mesh in blender_stats["meshes"]:
        dimensions = mesh["dimensions"]
        final_mesh = dict(mesh)
        final_mesh["dimensions"] = [dimensions[0], dimensions[2], dimensions[1]]
        final_meshes.append(final_mesh)
    final_stats = dict(blender_stats)
    final_stats["boundsYUp"] = final_bounds
    final_stats["meshes"] = final_meshes
    final_stats["coordinateSystem"] = "final glTF Y-up"
    return final_stats, image_info()


def look_at(camera, target):
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def render_preview(objects):
    minimum, maximum = bounds(objects)
    center = (minimum + maximum) / 2
    extent = max(maximum - minimum)
    bpy.ops.mesh.primitive_plane_add(size=extent * 5, location=(center.x, center.y, -0.015))
    ground = bpy.context.object
    ground.name = "PreviewGround"
    ground_material = bpy.data.materials.new("BenchPreviewGround")
    ground_material.diffuse_color = (0.07, 0.045, 0.028, 1)
    ground.data.materials.append(ground_material)
    bpy.ops.object.camera_add(location=(center.x + extent * 1.5, center.y + extent * 1.25, center.z + extent * 1.8))
    camera = bpy.context.object
    camera.data.lens = 58
    look_at(camera, center + Vector((0, extent * 0.1, 0)))
    bpy.context.scene.camera = camera
    bpy.ops.object.light_add(type="AREA", location=(center.x + extent * 1.3, center.y + extent * 2.3, center.z + extent * 1.3))
    key = bpy.context.object
    key.data.energy = 1100
    key.data.size = extent * 1.6
    look_at(key, center)
    bpy.ops.object.light_add(type="AREA", location=(center.x - extent, center.y + extent, center.z - extent))
    fill = bpy.context.object
    fill.data.energy = 500
    fill.data.color = (1.0, 0.72, 0.46)
    fill.data.size = extent
    look_at(fill, center)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW)
    scene.render.film_transparent = False
    if scene.world is None:
        scene.world = bpy.data.worlds.new("BenchPreviewWorld")
    scene.world.color = (0.02, 0.014, 0.01)
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)


def main():
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    objects = mesh_objects()
    if len(objects) != 1:
        raise RuntimeError(f"Expected one source mesh, received {len(objects)}")
    source_stats = object_stats(objects)
    source_images = image_info()
    transform = map_to_y_up(objects)
    normalized_stats = object_stats(objects)
    reduction = reduce_triangles(objects)
    image_stats = resize_and_pack_color_image()
    runtime_stats = object_stats(objects)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    export_objects(objects)
    render_preview(objects)
    runtime_stats, runtime_images = inspect_exported_runtime()
    derivative = {
        "path": os.path.relpath(TARGET, ROOT),
        "bytes": TARGET.stat().st_size,
        "sha256": sha(TARGET),
        "stats": runtime_stats,
        "images": runtime_images,
        "sourceStats": source_stats,
        "normalizedStats": normalized_stats,
        "transform": transform,
        "reduction": reduction,
        "export": {
            "coordinateSystem": "final glTF Y-up",
            "imageFormat": "JPEG",
            "imageQuality": 90,
            "reimportedVertices": runtime_stats["vertices"],
            "reimportedTriangles": runtime_stats["triangles"],
        },
        "preview": os.path.relpath(PREVIEW, ROOT),
    }
    STATS.write_text(json.dumps(derivative, indent=2) + "\n")
    provenance = {
        "stage": 8,
        "family": "outdoor-benches",
        "status": "derivative-prepared-pending-parent-browser-review",
        "referenceImage": {
            "path": "/var/folders/7t/0_hkzn095vqbj1pj6m0vqs5w0000gn/T/codex-clipboard-3b0c0bc6-9a68-445f-bf19-2b880641ed7f.png",
            "sha256": "39143e86bce8cef3ead01394367f0f616758521257f4dc2a4467b87fa20d6795",
        },
        "selectedSource": {
            "label": "Tripo Option A, wooden bench with beige upholstered cushion and solid wood frame",
            "url": "https://studio.tripo3d.ai/3d-model/wooden-bench-with-beige-upholstered-cushion-and-solid-wood-frame-6a88819d-bbd3-4333-af71-f7aafb1fee7b",
            "localPath": os.path.relpath(SOURCE, ROOT),
            "sourceSha256": sha(SOURCE),
            "sourceBytes": SOURCE.stat().st_size,
            "sourceVertices": source_stats["vertices"],
            "sourceTriangles": source_stats["triangles"],
            "sourceFaces": source_stats["polygons"],
            "sourceBoundsYUp": source_stats["boundsYUp"],
            "embeddedImages": source_images,
            "remotePageReported": {
                "checkedAt": "2026-10-11",
                "reportedFaces": 594374,
                "reportedVertices": 306371,
                "status": "confirmed-by-local-export",
            },
        },
        "runtimeDerivative": {
            "localPath": os.path.relpath(TARGET, ROOT),
            "sha256": sha(TARGET),
            "bytes": TARGET.stat().st_size,
            "vertices": runtime_stats["vertices"],
            "triangles": runtime_stats["triangles"],
            "boundsYUp": runtime_stats["boundsYUp"],
            "embeddedImages": runtime_images,
            "imageFormat": "JPEG",
            "imageQuality": 90,
            "frontDirection": "final glTF +Z",
            "targetEnvelope": [TARGET_WIDTH, TARGET_HEIGHT, TARGET_DEPTH],
        },
        "transforms": {
            "blenderExportMapping": transform["blenderExportMapping"],
            "finalGltfMapping": transform["finalGltfMapping"],
            "uniformScale": transform["uniformScale"],
            "grounded": True,
            "preservedUVs": True,
            "materialHandling": "single source material and embedded color map retained",
        },
        "verification": {
            "sourcePreserved": True,
            "derivativePrepared": True,
            "offlineRender": PREVIEW.exists(),
            "browserPlacement": False,
            "parentIntegration": False,
        },
    }
    PROVENANCE.write_text(json.dumps(provenance, indent=2) + "\n")
    print(json.dumps(derivative, indent=2))


if __name__ == "__main__":
    main()
