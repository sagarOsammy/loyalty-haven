"""Render a selected planting source or derivative for offline visual QA."""

import math
import os
import sys

import bpy
from mathutils import Vector


def look_at(camera, target):
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def import_asset(path):
    if path.lower().endswith((".glb", ".gltf")):
        bpy.ops.import_scene.gltf(filepath=path)
    else:
        bpy.ops.import_scene.fbx(filepath=path, use_custom_normals=True)


def main():
    source = sys.argv[-2]
    destination = sys.argv[-1]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    import_asset(source)
    imported = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not imported:
        raise RuntimeError("no mesh imported")

    root = bpy.data.objects.new("Preview root", None)
    bpy.context.collection.objects.link(root)
    for obj in imported:
        obj.parent = root
    # The FBX is Y-up. Runtime GLBs already use glTF Y-up and are imported into
    # Blender's Z-up viewport by the glTF importer.
    if not source.lower().endswith((".glb", ".gltf")):
        root.rotation_euler.x = math.pi / 2

    bpy.context.view_layer.update()
    bounds = None
    for obj in imported:
        current = obj.matrix_world @ Vector(obj.bound_box[0])
        current_bounds = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        minimum = Vector((min(vertex.x for vertex in current_bounds), min(vertex.y for vertex in current_bounds), min(vertex.z for vertex in current_bounds)))
        maximum = Vector((max(vertex.x for vertex in current_bounds), max(vertex.y for vertex in current_bounds), max(vertex.z for vertex in current_bounds)))
        if bounds is None:
            bounds = [minimum, maximum]
        else:
            bounds[0].x = min(bounds[0].x, minimum.x)
            bounds[0].y = min(bounds[0].y, minimum.y)
            bounds[0].z = min(bounds[0].z, minimum.z)
            bounds[1].x = max(bounds[1].x, maximum.x)
            bounds[1].y = max(bounds[1].y, maximum.y)
            bounds[1].z = max(bounds[1].z, maximum.z)
    scale = 2.0 / max(bounds[1].z - bounds[0].z, 0.001)
    root.scale = (scale, scale, scale)
    root.location.z = -bounds[0].z * scale
    bpy.context.view_layer.update()

    ground_material = bpy.data.materials.new("Preview ground")
    ground_material.diffuse_color = (0.12, 0.09, 0.06, 1.0)
    bpy.ops.mesh.primitive_plane_add(size=7, location=(0, 0, -0.015))
    ground = bpy.context.object
    ground.data.materials.append(ground_material)

    camera_data = bpy.data.cameras.new("Preview camera")
    camera = bpy.data.objects.new("Preview camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (2.8, -4.4, 2.35)
    camera.data.lens = 58
    look_at(camera, (0, 0, 0.85))
    bpy.context.scene.camera = camera

    for location, energy, size in [
        ((3.2, -2.5, 4.2), 850, 3.0),
        ((-2.5, -1.5, 2.6), 500, 2.5),
        ((0.0, 3.0, 3.2), 600, 2.0),
    ]:
        light_data = bpy.data.lights.new("Preview softbox", "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = size
        light = bpy.data.objects.new("Preview softbox", light_data)
        bpy.context.collection.objects.link(light)
        light.location = location
        look_at(light, (0, 0, 0.8))

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = os.path.abspath(destination)
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new("Preview world")
    scene.world.color = (0.035, 0.025, 0.018)
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)
    print(f"rendered {destination}")


if __name__ == "__main__":
    main()
