"""Print the selected GLB material graph and texture metadata."""

import json
import sys

import bpy


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=sys.argv[-1])
    for material in bpy.data.materials:
        print(json.dumps({
            "name": material.name,
            "use_nodes": material.use_nodes,
            "diffuse_color": list(material.diffuse_color),
            "nodes": [
                {
                    "name": node.name,
                    "type": node.type,
                    "label": node.label,
                    "image": getattr(getattr(node, "image", None), "name", None),
                    "color": list(node.inputs["Color"].default_value)
                    if node.type == "RGB" and "Color" in node.inputs else None,
                }
                for node in material.node_tree.nodes
            ],
        }, indent=2))
    for image in bpy.data.images:
        print(json.dumps({
            "image": image.name,
            "size": list(image.size),
            "packed": bool(image.packed_file),
            "colorspace": image.colorspace_settings.name,
        }, indent=2))


if __name__ == "__main__":
    main()
