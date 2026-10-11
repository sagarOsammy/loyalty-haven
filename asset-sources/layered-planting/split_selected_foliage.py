"""Inspect disconnected foliage components in the selected FBX."""

import json
import math
import sys

import bpy
from mathutils import Vector


def bounds_for(objects):
    minimum = Vector((float("inf"), float("inf"), float("inf")))
    maximum = Vector((float("-inf"), float("-inf"), float("-inf")))
    for obj in objects:
        for corner in obj.bound_box:
            point = obj.matrix_world @ Vector(corner)
            minimum.x = min(minimum.x, point.x)
            minimum.y = min(minimum.y, point.y)
            minimum.z = min(minimum.z, point.z)
            maximum.x = max(maximum.x, point.x)
            maximum.y = max(maximum.y, point.y)
            maximum.z = max(maximum.z, point.z)
    return {"min": list(minimum), "max": list(maximum), "dimensions": list(maximum - minimum)}


bpy.ops.wm.read_factory_settings(use_empty=True)
source = sys.argv[-1]
bpy.ops.import_scene.fbx(filepath=source, use_custom_normals=True)
mesh = next(obj for obj in bpy.context.scene.objects if obj.type == "MESH")
bpy.context.view_layer.objects.active = mesh
mesh.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.separate(type="LOOSE")
bpy.ops.object.mode_set(mode="OBJECT")
parts = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
for obj in parts:
    obj.rotation_euler.x = math.pi / 2
bpy.context.view_layer.update()
records = []
for obj in sorted(parts, key=lambda value: value.name):
    obj.data.calc_loop_triangles()
    records.append({
        "name": obj.name,
        "vertices": len(obj.data.vertices),
        "polygons": len(obj.data.polygons),
        "triangles": len(obj.data.loop_triangles),
        "bounds_z_up_preview": bounds_for([obj]),
    })
print(json.dumps({"part_count": len(parts), "parts": records}, indent=2))
