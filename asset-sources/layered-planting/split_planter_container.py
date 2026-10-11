"""Inspect disconnected pieces of the retained planter container meshes."""

import json
import sys

import bpy
from mathutils import Vector


def bounds_for(obj):
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    minimum = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
    maximum = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
    return {"min": list(minimum), "max": list(maximum), "dimensions": list(maximum - minimum)}


source = sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=source)
records = []
for mesh in [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]:
    if "planter_brass" not in mesh.name.lower():
        continue
    bpy.context.view_layer.objects.active = mesh
    mesh.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
parts = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and "planter_brass" in obj.name.lower()]
bpy.context.view_layer.update()
for obj in sorted(parts, key=lambda value: value.name):
    obj.data.calc_loop_triangles()
    records.append({"name": obj.name, "triangles": len(obj.data.loop_triangles), "bounds": bounds_for(obj)})
print(json.dumps(records, indent=2))
