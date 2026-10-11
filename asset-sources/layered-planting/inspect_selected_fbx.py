"""Inspect the supplied Tripo FBX without mutating the source asset."""

import json
import os
import sys

import bpy
from mathutils import Vector


def material_record(material):
    images = []
    if material and material.use_nodes:
        for node in material.node_tree.nodes:
            image = getattr(node, "image", None)
            if image is None:
                continue
            images.append({
                "name": image.name,
                "source": image.source,
                "filepath": image.filepath,
                "packed": image.packed_file is not None,
                "width": image.size[0],
                "height": image.size[1],
            })
    return {
        "name": material.name if material else None,
        "diffuse_color": list(material.diffuse_color) if material else None,
        "images": images,
    }


def main():
    source = sys.argv[-1]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if source.lower().endswith((".glb", ".gltf")):
        bpy.ops.import_scene.gltf(filepath=source)
    else:
        bpy.ops.import_scene.fbx(filepath=source, use_custom_normals=True)
    bpy.context.view_layer.update()

    minimum = Vector((float("inf"), float("inf"), float("inf")))
    maximum = Vector((float("-inf"), float("-inf"), float("-inf")))
    mesh_records = []
    material_records = {}
    total_triangles = 0
    total_vertices = 0
    total_polygons = 0

    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        mesh = obj.data
        mesh.calc_loop_triangles()
        world_vertices = [obj.matrix_world @ vertex.co for vertex in mesh.vertices]
        if world_vertices:
            for vertex in world_vertices:
                minimum.x = min(minimum.x, vertex.x)
                minimum.y = min(minimum.y, vertex.y)
                minimum.z = min(minimum.z, vertex.z)
                maximum.x = max(maximum.x, vertex.x)
                maximum.y = max(maximum.y, vertex.y)
                maximum.z = max(maximum.z, vertex.z)
        triangles = len(mesh.loop_triangles)
        total_triangles += triangles
        total_vertices += len(mesh.vertices)
        total_polygons += len(mesh.polygons)
        names = []
        for material in mesh.materials:
            if material is not None:
                names.append(material.name)
                material_records[material.name] = material_record(material)
        mesh_records.append({
            "name": obj.name,
            "vertices": len(mesh.vertices),
            "polygons": len(mesh.polygons),
            "triangles": triangles,
            "materials": names,
            "world_scale": list(obj.matrix_world.to_scale()),
            "rotation_euler": list(obj.rotation_euler),
            "dimensions": list(obj.dimensions),
        })

    images = []
    for image in bpy.data.images:
        images.append({
            "name": image.name,
            "source": image.source,
            "filepath": image.filepath,
            "packed": image.packed_file is not None,
            "width": image.size[0],
            "height": image.size[1],
        })
    result = {
        "source": os.path.abspath(source),
        "objects": len(bpy.context.scene.objects),
        "mesh_objects": len(mesh_records),
        "vertices": total_vertices,
        "polygons": total_polygons,
        "triangles": total_triangles,
        "bounds": {
            "min": list(minimum),
            "max": list(maximum),
            "dimensions": list(maximum - minimum),
        },
        "mesh_records": mesh_records,
        "materials": list(material_records.values()),
        "images": images,
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
