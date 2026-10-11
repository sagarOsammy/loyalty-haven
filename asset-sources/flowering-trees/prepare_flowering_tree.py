"""Inspect and build the lightweight flowering-tree runtime derivative."""

import hashlib
import json
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
FOLDER = Path(__file__).resolve().parent
SOURCE = FOLDER / "source/flower.glb"
TARGET = ROOT / "public/assets/flowering-tree-tripo.glb"
BLEND = FOLDER / "flowering-tree-tripo.blend"
SOURCE_PREVIEW = FOLDER / "source-preview.png"
DERIVATIVE_PREVIEW = FOLDER / "derivative-preview.png"
PROVENANCE = FOLDER / "provenance.json"
STATS = FOLDER / "derivative-stats.json"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def mesh_objects():
    return [object for object in bpy.context.scene.objects if object.type == "MESH"]


def bounds(objects):
    bpy.context.view_layer.update()
    points = [object.matrix_world @ Vector(corner)
              for object in objects for corner in object.bound_box]
    if not points:
        return Vector((0, 0, 0)), Vector((0, 0, 0))
    return (
        Vector(tuple(min(point[index] for point in points) for index in range(3))),
        Vector(tuple(max(point[index] for point in points) for index in range(3))),
    )


def stats(objects):
    lower, upper = bounds(objects)
    size = upper - lower
    vertices = 0
    polygons = 0
    triangles = 0
    meshes = []
    for object in objects:
        mesh = object.data
        mesh.calc_loop_triangles()
        mesh_vertices = len(mesh.vertices)
        mesh_polygons = len(mesh.polygons)
        mesh_triangles = len(mesh.loop_triangles)
        vertices += mesh_vertices
        polygons += mesh_polygons
        triangles += mesh_triangles
        meshes.append({
            "name": object.name,
            "vertices": mesh_vertices,
            "polygons": mesh_polygons,
            "triangles": mesh_triangles,
            "dimensions": list(object.dimensions),
            "materials": [slot.material.name for slot in object.material_slots if slot.material],
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
    for image in bpy.data.images:
        if image.size[0] == 0 or image.size[1] == 0:
            continue
        # The selected source has one color map. Keep it at 2048 for the
        # flowers and branches while avoiding the original 4096 map cost.
        maximum = 2048
        largest = max(image.size[0], image.size[1])
        if largest > maximum:
            ratio = maximum / largest
            image.scale(max(1, round(image.size[0] * ratio)), max(1, round(image.size[1] * ratio)))
        image.pack()
        image.colorspace_settings.name = "sRGB"
    return before, image_info()


def transform_to_grounded_y_up(objects):
    """Normalize the imported source to Blender Z-up and ground it at z=0.

    The source GLB arrives with its vertical extent on Blender Y. Rotate the
    source into Blender Z-up before export, which writes a standard glTF Y-up
    file for Three.js. The uniform scale preserves the natural branch shape.
    """
    before_min, before_max = bounds(objects)
    before_size = before_max - before_min
    vertical_axis = max(range(3), key=lambda index: before_size[index])
    if vertical_axis == 1:
        for object in objects:
            object.rotation_euler.x = 0
            object.rotation_euler.y = 0
            object.rotation_euler.z = 0
            object.rotation_euler.x = 0
            # Rotate Blender Y-up source into Blender Z-up.
            object.rotation_euler.x = -1.5707963267948966
    elif vertical_axis == 0:
        for object in objects:
            object.rotation_euler.y = 1.5707963267948966
    bpy.context.view_layer.update()
    lower, upper = bounds(objects)
    center = (lower + upper) / 2
    size = upper - lower
    target_height = 4.2
    scale = target_height / max(size.z, 0.0001)
    for object in objects:
        object.scale *= scale
    bpy.context.view_layer.update()
    lower, upper = bounds(objects)
    center = (lower + upper) / 2
    for object in objects:
        object.location.x -= center.x
        object.location.y -= center.y
        object.location.z -= lower.z
        object["source_asset"] = SOURCE.name
        object["asset_roles"] = "natural trunk and branches, white flowering canopy"
        object["normalization"] = "uniform scale, Blender Z-up, grounded at z=0"
    bpy.context.view_layer.update()
    return {
        "sourceDimensionsBefore": list(before_size),
        "sourceVerticalAxisBlender": ["X", "Y", "Z"][vertical_axis],
        "targetHeight": target_height,
        "uniformScale": scale,
        "grounding": "minimum Blender Z moved to 0, GLB exporter writes Y-up",
        "normalizedDimensions": list(bounds(objects)[1] - bounds(objects)[0]),
    }


def decimate(objects):
    before = stats(objects)["triangles"]
    # A single source mesh allows the modifier to preserve one UV set and its
    # embedded color map while bringing six repetitions into the scene budget.
    ratio = 0.155
    for object in objects:
        bpy.ops.object.select_all(action="DESELECT")
        object.select_set(True)
        bpy.context.view_layer.objects.active = object
        modifier = object.modifiers.new("Flowering tree lightweight derivative", "DECIMATE")
        modifier.decimate_type = "COLLAPSE"
        modifier.ratio = ratio
        modifier.use_collapse_triangulate = False
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    after = stats(objects)["triangles"]
    return {"beforeTriangles": before, "afterTriangles": after, "ratioRequested": ratio}


def look_at(camera, target):
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def render_preview(objects, path: Path):
    lower, upper = bounds(objects)
    center = (lower + upper) / 2
    size = upper - lower
    max_size = max(size.x, size.y, size.z, 1.0)
    bpy.ops.object.camera_add(location=(center.x + max_size * 1.35,
                                        center.y - max_size * 1.55,
                                        center.z + max_size * 1.05))
    camera = bpy.context.object
    camera.data.lens = 58
    look_at(camera, center)
    bpy.context.scene.camera = camera
    bpy.ops.mesh.primitive_plane_add(size=max_size * 4, location=(center.x, center.y, lower.z - 0.01))
    ground = bpy.context.object
    ground.name = "PreviewGround"
    ground_material = bpy.data.materials.new("PreviewGroundMaterial")
    ground_material.diffuse_color = (0.08, 0.05, 0.035, 1.0)
    ground.data.materials.append(ground_material)
    bpy.ops.object.light_add(type="AREA", location=(center.x + max_size, center.y - max_size, center.z + max_size * 2))
    key = bpy.context.object
    key.data.energy = 900
    key.data.shape = "DISK"
    key.data.size = max_size * 1.4
    look_at(key, center)
    bpy.ops.object.light_add(type="AREA", location=(center.x - max_size, center.y + max_size, center.z + max_size))
    fill = bpy.context.object
    fill.data.energy = 500
    fill.data.color = (1.0, 0.72, 0.5)
    fill.data.size = max_size
    look_at(fill, center)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 800
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(path)
    scene.render.film_transparent = False
    if scene.world is None:
        scene.world = bpy.data.worlds.new("FloweringTreePreviewWorld")
    scene.world.color = (0.03, 0.02, 0.015)
    bpy.ops.render.render(write_still=True)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    source_objects = mesh_objects()
    source_stats = stats(source_objects)
    source_images = image_info()
    render_preview(source_objects, SOURCE_PREVIEW)

    transform_info = transform_to_grounded_y_up(source_objects)
    image_before_resize, image_after_resize = resize_and_pack_images()
    decimation = decimate(source_objects)
    runtime_stats_before_export = stats(source_objects)
    bpy.ops.object.select_all(action="DESELECT")
    for object in source_objects:
        object.select_set(True)
    bpy.context.view_layer.objects.active = source_objects[0]
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    bpy.ops.export_scene.gltf(
        filepath=str(TARGET),
        export_format="GLB",
        use_selection=True,
        export_image_format="JPEG",
        export_jpeg_quality=90,
        export_yup=True,
    )

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(TARGET))
    runtime_objects = mesh_objects()
    runtime_stats = stats(runtime_objects)
    runtime_images = image_info()
    render_preview(runtime_objects, DERIVATIVE_PREVIEW)

    output = {
        "schema": "loyalty-haven-flowering-tree-derivative-1",
        "source": {
            "path": str(SOURCE.relative_to(ROOT)),
            "bytes": SOURCE.stat().st_size,
            "sha256": sha(SOURCE),
            "stats": source_stats,
            "images": source_images,
        },
        "transform": transform_info,
        "imagesBeforeResize": image_before_resize,
        "imagesAfterResize": image_after_resize,
        "decimation": decimation,
        "runtimeBeforeExport": runtime_stats_before_export,
        "runtime": {
            "path": str(TARGET.relative_to(ROOT)),
            "bytes": TARGET.stat().st_size,
            "sha256": sha(TARGET),
            "stats": runtime_stats,
            "images": runtime_images,
        },
        "preview": {
            "source": str(SOURCE_PREVIEW.relative_to(ROOT)),
            "derivative": str(DERIVATIVE_PREVIEW.relative_to(ROOT)),
        },
    }
    STATS.write_text(json.dumps(output, indent=2) + "\n")
    provenance = json.loads(PROVENANCE.read_text())
    provenance["status"] = "derivative-prepared-pending-parent-integration"
    provenance["sourceFiles"] = [str(SOURCE.relative_to(ROOT))]
    provenance["derivativeFiles"] = [str(TARGET.relative_to(ROOT))]
    provenance["sourceFileBytes"] = SOURCE.stat().st_size
    provenance["sourceSha256"] = sha(SOURCE)
    provenance["runtimeFileBytes"] = TARGET.stat().st_size
    provenance["runtimeSha256"] = sha(TARGET)
    provenance["sourceExportMetrics"] = {
        "vertices": source_stats["vertices"],
        "triangles": source_stats["triangles"],
        "polygons": source_stats["polygons"],
    }
    provenance["runtimeExportMetrics"] = {
        "vertices": runtime_stats["vertices"],
        "triangles": runtime_stats["triangles"],
        "polygons": runtime_stats["polygons"],
        "dimensionsBlender": runtime_stats["dimensionsBlender"],
    }
    provenance["verification"]["sourceMetrics"] = "recorded from supplied local GLB and Tripo page"
    provenance["verification"]["exportMetrics"] = "recorded from optimized runtime GLB"
    provenance["verification"]["materialTexture"] = "one embedded 2048px color map retained"
    provenance["verification"]["preview"] = "source and derivative rendered in Blender"
    provenance["normalization"] = transform_info
    provenance["decimation"] = decimation
    provenance["previews"] = {
        "source": str(SOURCE_PREVIEW.relative_to(ROOT)),
        "derivative": str(DERIVATIVE_PREVIEW.relative_to(ROOT)),
    }
    PROVENANCE.write_text(json.dumps(provenance, indent=2) + "\n")
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
