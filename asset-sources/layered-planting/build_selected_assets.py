"""Build selected Tripo foliage derivatives for the stage 6 planting pass.

The source FBX is imported read-only. The two disconnected major foliage
clusters are re-grounded side by side, while tiny detached pieces are assigned
to the nearest cluster. Existing planter geometry is filtered to the largest
ivory pot, its matching soil and low brass rims, leaving the original foliage
and empty secondary pots out of the accent derivative.
"""

import hashlib
import json
import math
import os
import sys

import bpy
from mathutils import Vector


PROJECT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
SOURCE_FBX = os.path.join(
    PROJECT,
    "asset-sources/layered-planting/source/tripo_pbr_model_eb306993-5625-4ea7-9c99-72459090b411.fbx",
)
PLANTER_GLB = os.path.join(PROJECT, "public/assets/planter.glb")
FOLIAGE_GLB = os.path.join(PROJECT, "public/assets/tropical-foliage-tripo.glb")
ACCENT_GLB = os.path.join(PROJECT, "public/assets/accent-planter-tripo.glb")
STATS_JSON = os.path.join(PROJECT, "asset-sources/layered-planting/selected-asset-stats.json")


def triangles(obj):
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def bounds_for(objects):
    if not objects:
        raise RuntimeError("Cannot calculate bounds for an empty object set")
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
    return minimum, maximum


def json_bounds(objects):
    minimum, maximum = bounds_for(objects)
    return {
        "min": [round(value, 6) for value in minimum],
        "max": [round(value, 6) for value in maximum],
        "dimensions": [round(value, 6) for value in maximum - minimum],
    }


def import_file(path):
    if path.lower().endswith((".glb", ".gltf")):
        bpy.ops.import_scene.gltf(filepath=path)
    else:
        bpy.ops.import_scene.fbx(filepath=path, use_custom_normals=True)


def all_meshes():
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]


def update_scene():
    bpy.context.view_layer.update()


def separate_loose(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    update_scene()
    return [candidate for candidate in all_meshes() if candidate.name.startswith(obj.name)]


def join_objects(objects, name):
    if not objects:
        raise RuntimeError(f"Cannot join empty object group {name}")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    active = max(objects, key=triangles)
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.join()
    active.name = name
    active.data.name = f"{name} mesh"
    update_scene()
    return active


def decimate(obj, ratio):
    if ratio >= 0.999:
        return
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new(name="Selected foliage triangle budget", type="DECIMATE")
    modifier.ratio = ratio
    modifier.use_collapse_triangulate = False
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    update_scene()


def prepare_foliage_groups(targets):
    """Import and return two normalized, rotated Blender-Z-up foliage objects."""
    import_file(SOURCE_FBX)
    source_objects = all_meshes()
    if len(source_objects) != 1:
        raise RuntimeError(f"Expected one selected FBX mesh, received {len(source_objects)}")
    parts = separate_loose(source_objects[0])
    if len(parts) < 2:
        raise RuntimeError(f"Expected at least two disconnected foliage components, received {len(parts)}")
    for part in parts:
        part.rotation_euler.x = math.pi / 2
    update_scene()

    major = sorted(parts, key=triangles, reverse=True)[:2]
    major_centers = [bounds_for([part])[0] + (bounds_for([part])[1] - bounds_for([part])[0]) / 2 for part in major]
    groups = [list() for _ in major]
    for part in parts:
        minimum, maximum = bounds_for([part])
        center = minimum + (maximum - minimum) / 2
        index = min(range(len(major_centers)), key=lambda value: (center - major_centers[value]).length)
        groups[index].append(part)

    source_triangles = sum(triangles(part) for part in parts)
    target_triangles = 11800
    ratio = min(1.0, target_triangles / max(source_triangles, 1))
    normalized = []
    # The source's lower component is the broad split-leaf cluster. The upper
    # component is the finer fern cluster. Sort by Z after the preview rotation.
    grouped_with_centers = []
    for group in groups:
        minimum, maximum = bounds_for(group)
        grouped_with_centers.append((minimum.z + maximum.z, group))
    grouped_with_centers.sort(key=lambda value: value[0])
    for index, (_, group) in enumerate(grouped_with_centers):
        joined = join_objects(group, "Selected Tripo monstera" if index == 0 else "Selected Tripo fern")
        decimate(joined, ratio)
        minimum, maximum = bounds_for([joined])
        height = maximum.z - minimum.z
        target_height, target_x, target_y = targets[index]
        scale = target_height / max(height, 0.001)
        joined.scale *= scale
        update_scene()
        minimum, maximum = bounds_for([joined])
        center = minimum + (maximum - minimum) / 2
        joined.location.x += target_x - center.x
        joined.location.y += target_y - center.y
        joined.location.z += -minimum.z
        joined["sourceId"] = "tripo_pbr_model_eb306993-5625-4ea7-9c99-72459090b411.fbx"
        joined["sourceComponent"] = "monstera" if index == 0 else "fern"
        update_scene()
        normalized.append(joined)
    return normalized


def downscale_embedded_images(limit=1024):
    records = []
    for image in bpy.data.images:
        width, height = image.size
        if max(width, height) > limit:
            image.scale(limit, limit)
        if image.packed_file is None:
            image.pack()
        records.append({
            "name": image.name,
            "width": image.size[0],
            "height": image.size[1],
            "packed": image.packed_file is not None,
        })
    return records


def export_objects(path, objects):
    if not objects:
        raise RuntimeError(f"Cannot export empty object set to {path}")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_draco_mesh_compression_enable=False,
    )


def remove_objects(objects):
    for obj in list(objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def asset_stats(path, objects, images, extra=None):
    minimum, maximum = bounds_for(objects)
    return {
        "path": os.path.relpath(path, PROJECT),
        "bytes": os.path.getsize(path),
        "sha256": hashlib.sha256(open(path, "rb").read()).hexdigest(),
        "meshObjects": len(objects),
        "vertices": sum(len(obj.data.vertices) for obj in objects),
        "polygons": sum(len(obj.data.polygons) for obj in objects),
        "triangles": sum(triangles(obj) for obj in objects),
        "boundsBlenderZUp": {
            "min": [round(value, 6) for value in minimum],
            "max": [round(value, 6) for value in maximum],
            "dimensions": [round(value, 6) for value in maximum - minimum],
        },
        "images": images,
        **(extra or {}),
    }


def build_foliage():
    foliage_objects = prepare_foliage_groups([
        (1.78, -0.34, 0.01),
        (2.0, 0.34, 0.04),
    ])
    images = downscale_embedded_images()
    export_objects(FOLIAGE_GLB, foliage_objects)
    update_scene()
    return asset_stats(
        FOLIAGE_GLB,
        foliage_objects,
        images,
        {"components": [obj.get("sourceComponent") for obj in foliage_objects], "normalizedHeight": 2.0},
    )


def keep_container_geometry():
    imported = all_meshes()
    container_candidates = [
        obj for obj in imported
        if "planter_" in obj.name.lower()
    ]
    brass = [obj for obj in container_candidates if "planter_brass" in obj.name.lower()]
    ivory = [obj for obj in container_candidates if "planter_ivory_stone" in obj.name.lower()]
    soil = [obj for obj in container_candidates if "planter_soil" in obj.name.lower()]
    if len(brass) != 1:
        raise RuntimeError(f"Expected one brass planter mesh, received {len(brass)}")
    if len(ivory) != 1 or len(soil) != 1:
        raise RuntimeError(f"Expected one ivory mesh and one soil mesh, received {len(ivory)} and {len(soil)}")

    # Partition the original three-pot cluster and retain its largest pot. The
    # selected foliage then shares one soil surface, avoiding empty secondary
    # containers in the runtime derivative.
    brass_parts = separate_loose(brass[0])
    ivory_parts = separate_loose(ivory[0])
    soil_parts = separate_loose(soil[0])
    largest_ivory = max(
        ivory_parts,
        key=lambda obj: obj.dimensions.x * obj.dimensions.y * obj.dimensions.z,
    )
    ivory_minimum, ivory_maximum = bounds_for([largest_ivory])
    ivory_center = (ivory_minimum + ivory_maximum) / 2

    def horizontal_distance(obj):
        minimum, maximum = bounds_for([obj])
        center = (minimum + maximum) / 2
        return math.hypot(center.x - ivory_center.x, center.y - ivory_center.y)

    selected_soil = min(soil_parts, key=horizontal_distance)
    brass_rings = [
        obj for obj in brass_parts
        if bounds_for([obj])[1].z - bounds_for([obj])[0].z < 0.5
    ]
    selected_rings = sorted(brass_rings, key=horizontal_distance)[:2]
    keep = [largest_ivory, selected_soil, *selected_rings]
    imported = all_meshes()
    container_candidates = [
        obj for obj in imported
        if "planter_" in obj.name.lower()
    ]
    remove_objects([obj for obj in container_candidates if obj not in keep])
    if not keep:
        raise RuntimeError("No container geometry survived the foliage filter")
    # Reduce source ring and soil density while keeping the ivory pot bodies.
    for obj in keep:
        name = obj.name.lower()
        if "planter_ivory_stone" in name:
            continue
        decimate(obj, 0.52)
    update_scene()
    return keep


def normalize_container(objects, target_height=0.68):
    minimum, maximum = bounds_for(objects)
    scale = target_height / max(maximum.z - minimum.z, 0.001)
    for obj in objects:
        obj.scale *= scale
    update_scene()
    minimum, maximum = bounds_for(objects)
    center = minimum + (maximum - minimum) / 2
    for obj in objects:
        obj.location.x -= center.x
        obj.location.y -= center.y
        obj.location.z -= minimum.z
    update_scene()


def build_accent_planter():
    foliage_objects = prepare_foliage_groups([
        (1.28, -0.29, 0.0),
        (1.34, 0.29, 0.04),
    ])
    import_file(PLANTER_GLB)
    container_objects = keep_container_geometry()
    normalize_container(container_objects)
    soil_objects = [obj for obj in container_objects if "planter_soil" in obj.name.lower()]
    if not soil_objects:
        raise RuntimeError("Container derivative has no soil base")
    _, soil_maximum = bounds_for(soil_objects)
    for obj in foliage_objects:
        obj.location.z += soil_maximum.z
    update_scene()
    all_objects = container_objects + foliage_objects
    images = downscale_embedded_images()
    export_objects(ACCENT_GLB, all_objects)
    update_scene()
    return asset_stats(
        ACCENT_GLB,
        all_objects,
        images,
        {
            "containerObjects": len(container_objects),
            "foliageObjects": len(foliage_objects),
            "containerSource": "public/assets/planter.glb, largest ivory pot, matching soil and low brass rims only",
            "originalFoliageExcluded": True,
            "normalizedHeight": round(bounds_for(all_objects)[1].z - bounds_for(all_objects)[0].z, 6),
        },
    )


def main():
    if not os.path.exists(SOURCE_FBX):
        raise RuntimeError(f"Missing preserved FBX source: {SOURCE_FBX}")
    source_sha256 = hashlib.sha256(open(SOURCE_FBX, "rb").read()).hexdigest()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    foliage = build_foliage()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    accent_planter = build_accent_planter()
    output = {
        "source": {
            "path": os.path.relpath(SOURCE_FBX, PROJECT),
            "sha256": source_sha256,
            "bytes": os.path.getsize(SOURCE_FBX),
        },
        "runtime": {
            "tropicalFoliage": foliage,
            "accentPlanter": accent_planter,
        },
        "coordinateContract": "GLB Y-up, roots at Y=0 for foliage and accent planter base",
        "textureContract": "Embedded PBR images downscaled to 1024 by 1024 max, original FBX retained unchanged",
    }
    with open(STATS_JSON, "w", encoding="utf-8") as handle:
        json.dump(output, handle, indent=2)
        handle.write("\n")
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
