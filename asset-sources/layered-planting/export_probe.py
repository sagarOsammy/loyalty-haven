"""Export the imported FBX once to confirm Blender's glTF axis contract."""

import bpy
import math
import sys


source = sys.argv[-2]
destination = sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=source, use_custom_normals=True)
bpy.context.view_layer.update()
for obj in bpy.context.scene.objects:
    if obj.type == "MESH":
        obj.rotation_euler.x = math.pi / 2
bpy.context.view_layer.update()
bpy.ops.export_scene.gltf(
    filepath=destination,
    export_format="GLB",
    export_apply=True,
    export_yup=True,
    export_texcoords=True,
    export_normals=True,
    export_materials="EXPORT",
    export_image_format="AUTO",
)
print(f"exported {destination}")
