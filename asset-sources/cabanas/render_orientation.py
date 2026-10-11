"""Render the cabana derivative from both boardwalk-facing directions.

This is a local inspection helper. It leaves the runtime GLB unchanged and
writes two PNGs beside the derivative so the plaza-facing opening can be
verified after the Blender-to-glTF axis conversion.
"""
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
GLB = ROOT / "public/assets/cabana-tripo.glb"
FOLDER = Path(__file__).resolve().parent


def look_at(camera, target):
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def render_view(label, location):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(GLB))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    lower = Vector(tuple(min(point[i] for point in points) for i in range(3)))
    upper = Vector(tuple(max(point[i] for point in points) for i in range(3)))
    center = (lower + upper) / 2
    size = upper - lower
    bpy.ops.object.camera_add(location=location)
    camera = bpy.context.object
    camera.data.lens = 58
    look_at(camera, center)
    bpy.context.scene.camera = camera
    bpy.ops.mesh.primitive_plane_add(size=max(size) * 4, location=(center.x, center.y, lower.z))
    ground = bpy.context.object
    ground.data.materials.append(bpy.data.materials.new("OrientationGround"))
    ground.active_material.diffuse_color = (0.075, 0.055, 0.04, 1.0)
    for light_location, energy, color in [
        ((center.x + 4, center.y - 4, center.z + 6), 1200, (1.0, 1.0, 1.0)),
        ((center.x - 4, center.y + 4, center.z + 3), 700, (1.0, 0.72, 0.45)),
    ]:
        bpy.ops.object.light_add(type="AREA", location=light_location)
        light = bpy.context.object
        light.data.energy = energy
        light.data.color = color
        light.data.size = 5
        look_at(light, center)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(FOLDER / f"orientation-{label}.png")
    scene.world = bpy.data.worlds.new("OrientationWorld")
    scene.world.color = (0.03, 0.02, 0.015)
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)


def main():
    # Blender Z-up inspection coordinates. glTF +Z maps back to Blender -Y.
    render_view("blender-minus-y", (0, -6.5, 2.2))
    render_view("blender-plus-y", (0, 6.5, 2.2))


if __name__ == "__main__":
    main()
