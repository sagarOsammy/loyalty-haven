"""Create a smaller local-review derivative, preserving the supplied GLB."""
import bpy
import hashlib
import json
import os
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "loyalty-brass-telescope.glb"
OUT = Path(os.environ.get("LOYALTY_TELESCOPE_OUT", "/private/tmp/loyalty-telescope-detail-20260914"))
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
before = sum(len(o.data.polygons) for o in meshes)
for obj in meshes:
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new("Small scene prop reduction", "DECIMATE")
    mod.ratio = 0.12
    mod.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for poly in obj.data.polygons:
        poly.use_smooth = True
for image in bpy.data.images:
    if image.size[0] > 1024 or image.size[1] > 1024:
        image.scale(1024, 1024)
    image.pack()
bpy.ops.object.select_all(action="DESELECT")
for obj in meshes:
    obj.select_set(True)
target = OUT / "loyalty-brass-telescope.glb"
bpy.ops.export_scene.gltf(filepath=str(target), export_format="GLB", use_selection=True, export_image_format="JPEG", export_jpeg_quality=88)
after = sum(len(o.data.polygons) for o in meshes)
(OUT / "provenance.json").write_text(json.dumps({
    "source": "loyalty-brass-telescope.glb", "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    "sourceBytes": SOURCE.stat().st_size, "sourceTriangles": before,
    "runtime": "public/assets/loyalty-brass-telescope.glb", "runtimeSha256": hashlib.sha256(target.read_bytes()).hexdigest(),
    "runtimeBytes": target.stat().st_size, "runtimeTriangles": after,
    "transformations": ["Blender decimation ratio 0.12", "Embedded textures reduced to 1024 square where needed", "JPEG quality 88", "Original placement, UVs and PBR maps retained"],
    "origin": "User-supplied Tripo text-to-3D export", "usage": "Noncommercial personal review, see adjacent README for Tripo free-plan restrictions"
}, indent=2) + "\n")
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 24
scene.world = bpy.data.worlds.new("Studio")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.3, 0.35, 0.4, 1)
scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.5
for loc, energy, size in [((2,-3,4),450,3),((-2,-1,2),250,2),((0,3,3),400,2)]:
    bpy.ops.object.light_add(type="AREA", location=loc)
    light = bpy.context.object
    light.data.energy, light.data.shape, light.data.size = energy, "DISK", size
    light.rotation_euler = (Vector((0,0,0.5))-light.location).to_track_quat("-Z","Y").to_euler()
bpy.ops.object.camera_add(location=(1.8,-2.8,1.6))
camera = bpy.context.object
camera.rotation_euler = (Vector((0,0,0.5))-camera.location).to_track_quat("-Z","Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 1.4
scene.camera = camera
scene.render.resolution_x, scene.render.resolution_y = 720,720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUT / "telescope-preview.png")
bpy.ops.render.render(write_still=True)
print((OUT / "provenance.json").read_text())
