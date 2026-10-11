"""Inspect and render the supplied cabana FBX without modifying the source."""
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
FOLDER = Path(__file__).resolve().parent
SOURCE = FOLDER / "source/tripo_pbr_model_4566ecd8-8750-4ee0-867c-b3a537a87952.fbx"
STATS = FOLDER / "source-stats.json"
PREVIEW = FOLDER / "source-preview.png"


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


def look_at(camera, target):
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def render_preview(meshes, lower, upper):
    center = (lower + upper) / 2
    size = upper - lower
    max_size = max(size.x, size.y, size.z, 1.0)
    bpy.ops.object.camera_add(location=(center.x + max_size * 1.45, center.y - max_size * 1.55, center.z + max_size * 1.2))
    camera = bpy.context.object
    look_at(camera, center)
    camera.data.lens = 58
    bpy.context.scene.camera = camera

    bpy.ops.mesh.primitive_plane_add(size=max_size * 4, location=(center.x, center.y, lower.z))
    ground = bpy.context.object
    ground.name = "PreviewGround"
    ground.data.materials.append(bpy.data.materials.new("PreviewGroundMaterial"))
    ground.active_material.diffuse_color = (0.075, 0.055, 0.04, 1.0)

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
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    lower, upper = bounds(meshes)
    size = upper - lower
    mesh_stats = []
    source_triangles = 0
    source_polygons = 0
    source_vertices = 0
    for obj in meshes:
        triangles = sum(max(0, len(poly.vertices) - 2) for poly in obj.data.polygons)
        polygons = len(obj.data.polygons)
        vertices = len(obj.data.vertices)
        source_triangles += triangles
        source_polygons += polygons
        source_vertices += vertices
        mesh_stats.append({
            "name": obj.name,
            "vertices": vertices,
            "polygons": polygons,
            "triangles": triangles,
            "dimensions": list(obj.dimensions),
            "materials": [slot.material.name for slot in obj.material_slots if slot.material],
        })
    materials = []
    for material in bpy.data.materials:
        images = []
        if material.use_nodes and material.node_tree:
            for node in material.node_tree.nodes:
                image = getattr(node, "image", None)
                if image and image.name not in images:
                    images.append(image.name)
        materials.append({
            "name": material.name,
            "useNodes": material.use_nodes,
            "images": images,
            "blendMethod": getattr(material.surface_render_method, "__str__", lambda: str(material.surface_render_method))(),
        })
    images = []
    for image in bpy.data.images:
        images.append({
            "name": image.name,
            "width": image.size[0],
            "height": image.size[1],
            "packed": bool(image.packed_file),
            "filepath": image.filepath,
        })
    render_preview(meshes, lower, upper)
    output = {
        "schema": "loyalty-haven-cabana-fbx-inspection-1",
        "source": str(SOURCE.relative_to(ROOT)),
        "sourceBytes": SOURCE.stat().st_size,
        "sourceSha256": sha(SOURCE),
        "sourceObjects": len(meshes),
        "sourceVertices": source_vertices,
        "sourcePolygons": source_polygons,
        "sourceTriangles": source_triangles,
        "sourceBoundsBlender": {"min": list(lower), "max": list(upper)},
        "sourceDimensionsBlender": list(size),
        "meshes": mesh_stats,
        "materials": materials,
        "images": images,
        "preview": str(PREVIEW.relative_to(ROOT)),
        "coordinateSystem": "Imported FBX statistics use Blender's Z-up coordinates before normalization.",
    }
    STATS.write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps(output, indent=2), flush=True)


if __name__ == "__main__":
    main()
