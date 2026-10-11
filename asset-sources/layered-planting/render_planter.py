"""Render the retained planter source for container-only review."""

import os
import sys

import bpy
from mathutils import Vector


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


source = sys.argv[-2]
destination = sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=source)
for obj in bpy.context.scene.objects:
    if obj.type == "MESH" and "leaf" in obj.name.lower():
        obj.hide_render = True

mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and not obj.hide_render]
points = [obj.matrix_world @ Vector(corner) for obj in mesh_objects for corner in obj.bound_box]
minimum = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
maximum = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
target = (minimum + maximum) / 2
extent = max(maximum - minimum)

ground_material = bpy.data.materials.new("Preview ground")
ground_material.diffuse_color = (0.12, 0.09, 0.06, 1)
bpy.ops.mesh.primitive_plane_add(size=9, location=(0, 0, -0.02))
bpy.context.object.data.materials.append(ground_material)

camera_data = bpy.data.cameras.new("Preview camera")
camera = bpy.data.objects.new("Preview camera", camera_data)
bpy.context.collection.objects.link(camera)
camera.location = target + Vector((extent * 1.45, -extent * 1.8, extent * 1.2))
camera.data.lens = 58
look_at(camera, target)
bpy.context.scene.camera = camera

for location, energy, size in [
    ((5, -5, 7), 1100, 4),
    ((-4, -3, 4), 650, 3),
    ((0, 5, 5), 700, 3),
]:
    light_data = bpy.data.lights.new("Preview softbox", "AREA")
    light_data.energy = energy
    light_data.size = size
    light = bpy.data.objects.new("Preview softbox", light_data)
    bpy.context.collection.objects.link(light)
    light.location = location
    look_at(light, target)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 720
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = os.path.abspath(destination)
scene.world = bpy.data.worlds.new("Preview world")
scene.world.color = (0.035, 0.025, 0.018)
scene.view_settings.look = "AgX - Medium High Contrast"
bpy.ops.render.render(write_still=True)
print(f"rendered {destination}")
