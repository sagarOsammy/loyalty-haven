"""Render the preserved bench source from both seating directions."""

from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "asset-sources/outdoor-benches/source/bench.glb"
OUT_PLUS = ROOT / "asset-sources/outdoor-benches/source-preview-plus-z.png"
OUT_MINUS = ROOT / "asset-sources/outdoor-benches/source-preview-minus-z.png"


def look_at(camera, target):
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def bounds(objects):
    bpy.context.view_layer.update()
    points = [object.matrix_world @ Vector(corner) for object in objects for corner in object.bound_box]
    minimum = Vector(tuple(min(point[index] for point in points) for index in range(3)))
    maximum = Vector(tuple(max(point[index] for point in points) for index in range(3)))
    return minimum, maximum


def render(path, direction):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    objects = [object for object in bpy.context.scene.objects if object.type == "MESH"]
    minimum, maximum = bounds(objects)
    center = (minimum + maximum) / 2
    size = maximum - minimum
    extent = max(size.x, size.y, size.z, 1.0)

    bpy.ops.mesh.primitive_plane_add(size=extent * 5, location=(center.x, minimum.y - 0.01, center.z))
    ground = bpy.context.object
    material = bpy.data.materials.new("Preview ground")
    material.diffuse_color = (0.06, 0.04, 0.025, 1)
    ground.data.materials.append(material)

    camera_location = Vector((center.x + extent * 1.6, center.y + extent * 1.45, center.z + direction * extent * 2.0))
    bpy.ops.object.camera_add(location=camera_location)
    camera = bpy.context.object
    camera.data.lens = 58
    look_at(camera, center)
    bpy.context.scene.camera = camera

    bpy.ops.object.light_add(type="AREA", location=(center.x + extent * 2, center.y + extent * 2, center.z + direction * extent))
    key = bpy.context.object
    key.data.energy = 1000
    key.data.size = extent * 2
    look_at(key, center)
    bpy.ops.object.light_add(type="AREA", location=(center.x - extent, center.y + extent, center.z - direction * extent))
    fill = bpy.context.object
    fill.data.energy = 500
    fill.data.color = (1.0, 0.72, 0.48)
    fill.data.size = extent
    look_at(fill, center)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(path)
    scene.render.film_transparent = False
    if scene.world is None:
        scene.world = bpy.data.worlds.new("Bench preview world")
    scene.world.color = (0.015, 0.012, 0.01)
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)


def main():
    render(OUT_PLUS, 1)
    render(OUT_MINUS, -1)


if __name__ == "__main__":
    main()
