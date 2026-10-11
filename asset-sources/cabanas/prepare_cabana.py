"""Build the normalized, lower-complexity cabana GLB from the supplied FBX."""
import hashlib
import json
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
FOLDER = Path(__file__).resolve().parent
SOURCE = FOLDER / "source/tripo_pbr_model_4566ecd8-8750-4ee0-867c-b3a537a87952.fbx"
TARGET = ROOT / "public/assets/cabana-tripo.glb"
BLEND = FOLDER / "cabana-tripo.blend"
PREVIEW = FOLDER / "derivative-preview.png"
PROVENANCE = FOLDER / "provenance.json"
STATS = FOLDER / "derivative-stats.json"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


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


def set_image_color_spaces():
    for material in bpy.data.materials:
        if not material.use_nodes or not material.node_tree:
            continue
        for node in material.node_tree.nodes:
            image = getattr(node, "image", None)
            if image is None:
                continue
            label = f"{image.name} {image.filepath}".lower()
            non_color = any(token in label for token in ("normal", "rough", "metal", "_1", "_2", "_3"))
            image.colorspace_settings.name = "Non-Color" if non_color else "sRGB"


def resize_and_pack_images():
    before = image_info()
    for image in bpy.data.images:
        if image.size[0] == 0 or image.size[1] == 0:
            continue
        label = f"{image.name} {image.filepath}".lower()
        non_color = any(token in label for token in ("normal", "rough", "metal", "_1", "_2", "_3"))
        maximum = 1024 if non_color else 2048
        largest = max(image.size[0], image.size[1])
        if largest > maximum:
            ratio = maximum / largest
            image.scale(max(1, round(image.size[0] * ratio)), max(1, round(image.size[1] * ratio)))
        image.pack()
    set_image_color_spaces()
    return before, image_info()


def normalize_geometry(objects):
    source_min, source_max = bounds(objects)
    source_size = source_max - source_min
    center = (source_min + source_max) / 2
    # The FBX is nearly square in plan. The scene's waterfront slot is
    # shallower, so normalize to a 4.8 x 2.8 x 3.55m cabana envelope.
    target_size = Vector((4.8, 2.8, 3.55))
    scale = Vector((
        target_size.x / source_size.x,
        target_size.y / source_size.y,
        target_size.z / source_size.z,
    ))
    for obj in objects:
        transform = obj.matrix_world.copy()
        for vertex in obj.data.vertices:
            point = transform @ vertex.co
            vertex.co = Vector((
                (point.x - center.x) * scale.x,
                (point.y - center.y) * scale.y,
                (point.z - source_min.z) * scale.z,
            ))
        obj.matrix_world.identity()
        obj.data.update()
        obj.name = "CabanaTripoOptimized"
        obj["cabana_parts"] = "teak frame, white canopy, tied curtains, cream daybed"
        obj["source_asset"] = SOURCE.name
    return {
        "sourceBoundsBlender": {"min": list(source_min), "max": list(source_max)},
        "sourceDimensionsBlender": list(source_size),
        "targetDimensionsBlender": list(target_size),
        "axisScale": list(scale),
        "grounding": "source minimum Z moved to Blender Z=0; GLB exporter writes Y-up coordinates",
    }


def orient_plaza_opening(objects):
    """Rotate the source so its open seating side faces GLB +Z.

    The inspected FBX opens toward Blender +Y. Blender's glTF conversion maps
    Blender +Y to glTF -Z, while this row's plaza is toward scene +Z. A 180
    degree turn around Blender Z preserves the silhouette and makes the
    curtains and daybed face the plaza after export.
    """
    for obj in objects:
        transform = obj.matrix_world.copy()
        for vertex in obj.data.vertices:
            point = transform @ vertex.co
            vertex.co = Vector((-point.x, -point.y, point.z))
        obj.matrix_world.identity()
        obj.data.update()
    return {
        "rotationBlenderZDegrees": 180,
        "openingSourceDirectionBlender": "+Y",
        "openingExportDirectionGlTF": "+Z",
        "plazaDirectionScene": "+Z",
    }


def decimate(objects):
    before = stats(objects)["triangles"]
    for obj in objects:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        modifier = obj.modifiers.new("Cabana economical derivative", "DECIMATE")
        modifier.ratio = 0.30
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    after = stats(objects)["triangles"]
    return {"beforeTriangles": before, "afterTriangles": after, "ratioRequested": 0.30}


def add_reference_fabric_material(objects):
    """Whiten the canopy roof while retaining the source map on timber parts."""
    fabric = bpy.data.materials.new("CabanaWhiteCanopy")
    fabric.use_nodes = True
    nodes = fabric.node_tree.nodes
    links = fabric.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.inputs["Base Color"].default_value = (0.93, 0.88, 0.78, 1.0)
    shader.inputs["Roughness"].default_value = 0.82
    shader.inputs["Metallic"].default_value = 0.0
    normal_image = next((image for image in bpy.data.images if "normal" in f"{image.name} {image.filepath}".lower()), None)
    if normal_image:
        normal_image.colorspace_settings.name = "Non-Color"
        normal_texture = nodes.new("ShaderNodeTexImage")
        normal_texture.image = normal_image
        normal_map = nodes.new("ShaderNodeNormalMap")
        normal_map.inputs["Strength"].default_value = 0.22
        links.new(normal_texture.outputs["Color"], normal_map.inputs["Color"])
        links.new(normal_map.outputs["Normal"], shader.inputs["Normal"])
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    assigned = 0
    for obj in objects:
        obj.data.materials.append(fabric)
        fabric_index = len(obj.data.materials) - 1
        for polygon in obj.data.polygons:
            # The canopy is the high, gently sloping roof surface. Keep the
            # source material on posts, tied curtains, bed and deck details.
            if polygon.center.z > 0.10 and abs(polygon.normal.z) > 0.18:
                polygon.material_index = fabric_index
                assigned += 1
        obj.data.update()
    return {"material": fabric.name, "canopyPolygons": assigned}


def look_at(camera, target):
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def render_preview(objects):
    lower, upper = bounds(objects)
    center = (lower + upper) / 2
    size = upper - lower
    max_size = max(size.x, size.y, size.z, 1.0)
    bpy.ops.object.camera_add(location=(center.x + max_size * 1.45, center.y - max_size * 1.55, center.z + max_size * 1.2))
    camera = bpy.context.object
    camera.data.lens = 58
    look_at(camera, center)
    bpy.context.scene.camera = camera
    bpy.ops.mesh.primitive_plane_add(size=max_size * 4, location=(center.x, center.y, lower.z))
    ground = bpy.context.object
    ground.name = "PreviewGround"
    material = bpy.data.materials.new("PreviewGroundMaterial")
    material.diffuse_color = (0.075, 0.055, 0.04, 1.0)
    ground.data.materials.append(material)
    bpy.ops.object.light_add(type="AREA", location=(center.x + max_size, center.y - max_size, center.z + max_size * 2))
    key = bpy.context.object
    key.data.energy = 1200
    key.data.shape = "DISK"
    key.data.size = max_size * 1.5
    look_at(key, center)
    bpy.ops.object.light_add(type="AREA", location=(center.x - max_size, center.y + max_size, center.z + max_size))
    fill = bpy.context.object
    fill.data.energy = 700
    fill.data.color = (1.0, 0.72, 0.45)
    fill.data.size = max_size
    look_at(fill, center)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW)
    scene.render.film_transparent = False
    if scene.world is None:
        scene.world = bpy.data.worlds.new("CabanaPreviewWorld")
    scene.world.color = (0.03, 0.02, 0.015)
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(SOURCE), use_image_search=True)
    source_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    source_stats = stats(source_objects)
    source_images_before = image_info()
    transform_info = normalize_geometry(source_objects)
    orientation_info = orient_plaza_opening(source_objects)
    image_before_resize, image_after_resize = resize_and_pack_images()
    fabric_info = add_reference_fabric_material(source_objects)
    decimation = decimate(source_objects)
    runtime_stats_before_export = stats(source_objects)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in source_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = source_objects[0]
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    bpy.ops.export_scene.gltf(
        filepath=str(TARGET),
        export_format="GLB",
        use_selection=True,
        export_image_format="AUTO",
    )

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(TARGET))
    runtime_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    runtime_stats = stats(runtime_objects)
    runtime_images = image_info()
    render_preview(runtime_objects)

    output = {
        "schema": "loyalty-haven-cabana-derivative-1",
        "source": {
            "path": str(SOURCE.relative_to(ROOT)),
            "bytes": SOURCE.stat().st_size,
            "sha256": sha(SOURCE),
            "fbxMeshStats": source_stats,
            "imagesBefore": source_images_before,
        },
        "derivative": {
            "path": str(TARGET.relative_to(ROOT)),
            "bytes": TARGET.stat().st_size,
            "sha256": sha(TARGET),
            "glbMeshStats": runtime_stats,
            "dimensionsWorldYUp": {
                "width": runtime_stats["dimensionsBlender"][0],
                "height": runtime_stats["dimensionsBlender"][2],
                "depth": runtime_stats["dimensionsBlender"][1],
            },
            "imagesAfter": runtime_images,
            "preview": str(PREVIEW.relative_to(ROOT)),
        },
        "runtimeStatsBeforeExport": runtime_stats_before_export,
        "normalization": transform_info,
        "orientation": orientation_info,
        "decimation": decimation,
        "fabricOverride": fabric_info,
        "texturePolicy": {
            "baseColorMax": 2048,
            "roughnessMetallicNormalMax": 1024,
            "embedded": True,
            "colorSpace": "base color sRGB, roughness metallic normal Non-Color",
        },
        "visualFeatures": {
            "fullWhiteSquareCanopy": "present in source preview",
            "tiedCornerCurtains": "present as draped tied curtain panels",
            "woodPosts": "present, sculpted brown timber-like posts",
            "creamDaybed": "present beneath canopy, partly occluded by curtains in source preview",
            "semanticComponents": "source is one merged mesh and one material, so roles are recorded but not independently addressable",
        },
        "blendDerivative": str(BLEND.relative_to(ROOT)),
        "sourcePreserved": True,
        "scope": "Local derivative for browser review, no publication",
    }
    STATS.write_text(json.dumps(output, indent=2) + "\n")
    PROVENANCE.write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps(output, indent=2), flush=True)


if __name__ == "__main__":
    main()
