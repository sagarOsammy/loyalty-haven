from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "asset-sources/outdoor-benches/source/bench.glb"
OUT = ROOT / "asset-sources/outdoor-benches"


def look_at(camera, target):
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def bounds(objects):
    bpy.context.view_layer.update()
    points = [object.matrix_world @ Vector(corner) for object in objects for corner in object.bound_box]
    minimum = Vector(tuple(min(point[index] for point in points) for index in range(3)))
    maximum = Vector(tuple(max(point[index] for point in points) for index in range(3)))
    return minimum, maximum


def render(name, location):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    objects = [object for object in bpy.context.scene.objects if object.type == "MESH"]
    minimum, maximum = bounds(objects)
    center = (minimum + maximum) / 2
    extent = max(maximum - minimum)
    bpy.ops.object.camera_add(location=location)
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = extent * 1.5
    look_at(camera, center)
    bpy.context.scene.camera = camera
    bpy.ops.object.light_add(type="AREA", location=(2.0, 2.0, 2.0))
    key = bpy.context.object
    key.data.energy = 900
    key.data.size = 2
    look_at(key, center)
    bpy.ops.object.light_add(type="AREA", location=(-2.0, 1.0, -2.0))
    fill = bpy.context.object
    fill.data.energy = 300
    fill.data.size = 2
    look_at(fill, center)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 700
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(OUT / f"source-view-{name}.png")
    if scene.world is None:
        scene.world = bpy.data.worlds.new("Bench views world")
    scene.world.color = (0.015, 0.012, 0.01)
    bpy.ops.render.render(write_still=True)


def main():
    render("front-yup", (0, 0, 3))
    render("top-yup", (0, 3, 0))
    render("side-yup", (3, 0, 0))


if __name__ == "__main__":
    main()
