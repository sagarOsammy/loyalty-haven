"""Create material-only hotel GLB derivatives with packed, deterministic PBR maps.

The source GLBs are imported and exported without mesh edits, modifier changes,
object joins, or transform application. Only material slots are replaced. The
script writes all outputs and verification artifacts under the directory that
contains this file, and keeps the source checkout read-only.
"""

import hashlib
import json
import math
import os
import shutil
from math import floor, sin

import bpy
from mathutils import Matrix, Vector


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
SOURCE_DIR = os.path.join(SOURCE_ROOT, "public", "assets")
ASSETS = ("hotel-base.glb", "hotel-level.glb", "hotel-roof.glb")
OUT_DIR = os.environ.get("LOYALTY_HOTEL_DETAIL_OUT", "/private/tmp/loyalty-hotel-detail-final-20260914")
PREVIEW_NAME = "hotel-material-detail-preview.png"
PROVENANCE_NAME = "provenance.json"
README_NAME = "README.md"


def clear_scene(remove_images=False):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection":
            bpy.data.collections.remove(collection)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)
    if remove_images:
        for image in list(bpy.data.images):
            if image.users == 0 and image.name not in {"Render Result", "Viewer Node"}:
                bpy.data.images.remove(image)


def set_input(node, names, value):
    if isinstance(names, str):
        names = (names,)
    for name in names:
        socket = node.inputs.get(name)
        if socket is not None:
            socket.default_value = value
            return socket
    return None


def socket_value(node, names, fallback=None):
    if isinstance(names, str):
        names = (names,)
    for name in names:
        socket = node.inputs.get(name)
        if socket is not None:
            try:
                return socket.default_value
            except Exception:
                return fallback
    return fallback


def hash2(ix, iy, seed):
    """Stable, dependency-free scalar hash in [0, 1]."""
    value = sin((ix * 127.1 + iy * 311.7 + seed * 74.7) * 0.017453292519943295) * 43758.5453123
    return value - floor(value)


def smooth_noise(u, v, scale, seed):
    x = u * scale
    y = v * scale
    x0 = floor(x)
    y0 = floor(y)
    tx = x - x0
    ty = y - y0
    tx = tx * tx * (3.0 - 2.0 * tx)
    ty = ty * ty * (3.0 - 2.0 * ty)
    a = hash2(x0, y0, seed)
    b = hash2(x0 + 1, y0, seed)
    c = hash2(x0, y0 + 1, seed)
    d = hash2(x0 + 1, y0 + 1, seed)
    return (a * (1.0 - tx) + b * tx) * (1.0 - ty) + (c * (1.0 - tx) + d * tx) * ty


def layered_noise(u, v, seed, broad=0.0, medium=0.0, fine=0.0):
    total = 0.0
    weight = 0.0
    if broad:
        total += broad * smooth_noise(u, v, 2.2, seed + 0.1)
        weight += broad
    if medium:
        total += medium * smooth_noise(u, v, 9.0, seed + 1.7)
        weight += medium
    if fine:
        total += fine * smooth_noise(u, v, 34.0, seed + 4.9)
        weight += fine
    return total / weight if weight else 0.5


def clamp(value, lo=0.0, hi=1.0):
    return max(lo, min(hi, value))


def make_image(name, pixels, size=256, non_color=False):
    image = bpy.data.images.get(name)
    if image is not None:
        bpy.data.images.remove(image)
    image = bpy.data.images.new(name, width=size, height=size, alpha=False)
    if non_color:
        try:
            image.colorspace_settings.name = "Non-Color"
        except Exception:
            pass
    image.pixels.foreach_set(pixels)
    image.update()
    image.pack()
    image["packed_by"] = "create_hotel_detail.py"
    return image


def color_pixels(base, accent, seed, kind, size=256):
    pixels = [0.0] * (size * size * 4)
    for y in range(size):
        v = y / max(1, size - 1)
        for x in range(size):
            u = x / max(1, size - 1)
            if kind == "stone":
                n = layered_noise(u, v, seed, 0.56, 0.30, 0.14)
                # A soft, irregular mineral veil breaks up broad faces without stripes.
                veil = smooth_noise(u + 0.09 * sin(v * 8.0), v, 4.5, seed + 22.0)
                mix = clamp(0.27 + (n - 0.5) * 0.34 + (veil - 0.5) * 0.16)
            elif kind == "wood":
                # Directional grain with slow, irregular phase drift, kept low contrast.
                phase = u * 18.0 + 1.7 * sin(v * 8.0 + seed) + 0.9 * (smooth_noise(u, v, 3.0, seed) - 0.5)
                grain = 0.5 + 0.5 * sin(phase * math.tau)
                n = layered_noise(u, v, seed, 0.35, 0.45, 0.20)
                mix = clamp(0.32 + grain * 0.38 + (n - 0.5) * 0.18)
            elif kind == "glass":
                n = layered_noise(u, v, seed, 0.75, 0.25, 0.0)
                panel = 0.5 + 0.5 * sin((u * 2.0 + v * 0.8 + seed) * math.tau)
                mix = clamp(0.44 + (n - 0.5) * 0.11 + (panel - 0.5) * 0.055)
            elif kind == "water":
                n = layered_noise(u, v, seed, 0.35, 0.45, 0.20)
                ripples = 0.5 + 0.5 * sin((u * 11.0 + sin(v * 9.0 + seed) * 0.8) * math.tau)
                mix = clamp(0.48 + (n - 0.5) * 0.13 + (ripples - 0.5) * 0.06)
            elif kind == "fabric":
                n = layered_noise(u, v, seed, 0.18, 0.42, 0.40)
                weave = 0.5 + 0.5 * sin(u * size * 0.42) * sin(v * size * 0.42)
                mix = clamp(0.47 + (n - 0.5) * 0.14 + (weave - 0.5) * 0.035)
            elif kind == "plant":
                n = layered_noise(u, v, seed, 0.24, 0.52, 0.24)
                mix = clamp(0.35 + n * 0.55)
            else:
                n = layered_noise(u, v, seed, 0.55, 0.30, 0.15)
                mix = clamp(0.46 + (n - 0.5) * 0.18)
            idx = (y * size + x) * 4
            pixels[idx:idx + 4] = [
                clamp(base[0] * (1.0 - mix) + accent[0] * mix),
                clamp(base[1] * (1.0 - mix) + accent[1] * mix),
                clamp(base[2] * (1.0 - mix) + accent[2] * mix),
                1.0,
            ]
    return pixels


def scalar_pixels(lo, hi, seed, kind, size=256):
    pixels = [0.0] * (size * size * 4)
    for y in range(size):
        v = y / max(1, size - 1)
        for x in range(size):
            u = x / max(1, size - 1)
            n = layered_noise(u, v, seed, 0.55, 0.32, 0.13)
            if kind == "wood":
                phase = u * 18.0 + 1.7 * sin(v * 8.0 + seed)
                n = clamp(0.48 + (0.5 + 0.5 * sin(phase * math.tau) - 0.5) * 0.40 + (n - 0.5) * 0.12)
            elif kind == "glass":
                n = clamp(0.56 + (n - 0.5) * 0.32)
            elif kind == "fabric":
                n = clamp(0.82 + (n - 0.5) * 0.10)
            value = lo + (hi - lo) * clamp(n)
            idx = (y * size + x) * 4
            pixels[idx:idx + 4] = [value, value, value, 1.0]
    return pixels


def normal_pixels(seed, kind, strength=0.34, size=256):
    """Generate a subtle tangent normal texture from the same deterministic height field."""
    pixels = [0.0] * (size * size * 4)

    def height(u, v):
        if kind == "wood":
            phase = u * 18.0 + 1.7 * sin(v * 8.0 + seed)
            grain = 0.5 + 0.5 * sin(phase * math.tau)
            return 0.52 * grain + 0.48 * layered_noise(u, v, seed, 0.30, 0.45, 0.25)
        if kind == "stone":
            return layered_noise(u, v, seed, 0.60, 0.28, 0.12)
        if kind == "fabric":
            weave = 0.5 + 0.5 * sin(u * size * 0.42) * sin(v * size * 0.42)
            return 0.50 * weave + 0.50 * layered_noise(u, v, seed, 0.20, 0.50, 0.30)
        if kind == "water":
            return layered_noise(u, v, seed, 0.25, 0.50, 0.25)
        return layered_noise(u, v, seed, 0.70, 0.30, 0.0)

    step = 1.0 / max(1, size - 1)
    for y in range(size):
        v = y / max(1, size - 1)
        for x in range(size):
            u = x / max(1, size - 1)
            dx = (height(min(1.0, u + step), v) - height(max(0.0, u - step), v)) * 0.5
            dy = (height(u, min(1.0, v + step)) - height(u, max(0.0, v - step))) * 0.5
            nx = -dx * strength
            ny = -dy * strength
            nz = 1.0
            length = math.sqrt(nx * nx + ny * ny + nz * nz)
            idx = (y * size + x) * 4
            pixels[idx:idx + 4] = [0.5 + 0.5 * nx / length, 0.5 + 0.5 * ny / length, 0.5 + 0.5 * nz / length, 1.0]
    return pixels


def texture_set(prefix, base, accent, seed, kind, roughness, size=256, normal_strength=0.34):
    return {
        "base": make_image(prefix + " Base", color_pixels(base, accent, seed, kind, size), size),
        "roughness": make_image(prefix + " Roughness", scalar_pixels(*roughness, seed + 4.0, kind, size), size, non_color=True),
        "normal": make_image(prefix + " Normal", normal_pixels(seed + 8.0, kind, normal_strength, size), size, non_color=True),
    }


def make_pbr(name, textures, roughness=0.45, metallic=0.0, transmission=0.0, emission=None, emission_strength=0.0, coat=0.0, coat_roughness=0.22, sheen=0.0):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (0.5, 0.35, 0.2, 1.0)
    material["hotel_material_detail"] = "v1"
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (300, 0)
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (40, 0)
    set_input(bsdf, "Base Color", (0.5, 0.35, 0.2, 1.0))
    set_input(bsdf, "Roughness", roughness)
    set_input(bsdf, "Metallic", metallic)
    set_input(bsdf, ("Transmission Weight", "Transmission"), transmission)
    set_input(bsdf, ("Coat Weight", "Clearcoat"), coat)
    set_input(bsdf, ("Coat Roughness", "Clearcoat Roughness"), coat_roughness)
    set_input(bsdf, ("Sheen Weight", "Sheen"), sheen)
    set_input(bsdf, "IOR", 1.45 if transmission > 0.0 else 1.5)
    if emission is not None:
        set_input(bsdf, ("Emission Color", "Emission"), (*emission, 1.0))
        set_input(bsdf, "Emission Strength", emission_strength)

    base = nodes.new("ShaderNodeTexImage")
    base.name = name + " Embedded Base Color"
    base.label = "Embedded base color variation"
    base.image = textures["base"]
    base.interpolation = "Linear"
    base.location = (-620, 200)
    links.new(base.outputs["Color"], bsdf.inputs["Base Color"])

    rough = nodes.new("ShaderNodeTexImage")
    rough.name = name + " Embedded Roughness"
    rough.label = "Embedded roughness variation"
    rough.image = textures["roughness"]
    rough.interpolation = "Linear"
    rough.location = (-620, 0)
    links.new(rough.outputs["Color"], bsdf.inputs["Roughness"])

    normal_tex = nodes.new("ShaderNodeTexImage")
    normal_tex.name = name + " Embedded Normal"
    normal_tex.label = "Embedded tangent normal"
    normal_tex.image = textures["normal"]
    normal_tex.interpolation = "Linear"
    normal_tex.location = (-620, -200)
    normal_map = nodes.new("ShaderNodeNormalMap")
    normal_map.location = (-360, -180)
    normal_map.inputs["Strength"].default_value = 0.32 if name not in {"ArchitecturalGlass", "HotelPoolWater", "RooftopPool"} else 0.10
    links.new(normal_tex.outputs["Color"], normal_map.inputs["Color"])
    links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    return material


def build_materials():
    maps = {}
    maps["stone"] = texture_set("Hotel Detail Travertine", (0.60, 0.45, 0.30), (0.88, 0.75, 0.57), 11.0, "stone", (0.36, 0.52), normal_strength=0.56)
    maps["floor"] = texture_set("Hotel Detail Stone Floor", (0.17, 0.085, 0.036), (0.42, 0.24, 0.12), 17.0, "stone", (0.52, 0.68), normal_strength=0.40)
    maps["wood"] = texture_set("Hotel Detail Teak", (0.055, 0.016, 0.006), (0.31, 0.090, 0.024), 23.0, "wood", (0.38, 0.56), normal_strength=0.47)
    maps["glass"] = texture_set("Hotel Detail Glazing", (0.07, 0.19, 0.23), (0.19, 0.39, 0.41), 29.0, "glass", (0.08, 0.17), normal_strength=0.20)
    maps["water"] = texture_set("Hotel Detail Pool Water", (0.08, 0.48, 0.58), (0.15, 0.67, 0.73), 31.0, "water", (0.045, 0.10), normal_strength=0.20)
    maps["brass"] = texture_set("Hotel Detail Brass", (0.25, 0.105, 0.026), (0.69, 0.39, 0.10), 37.0, "metal", (0.17, 0.29), normal_strength=0.22)
    maps["fabric"] = texture_set("Hotel Detail Linen", (0.56, 0.43, 0.28), (0.86, 0.72, 0.51), 41.0, "fabric", (0.70, 0.86), normal_strength=0.36)
    maps["plant"] = texture_set("Hotel Detail Foliage", (0.018, 0.12, 0.055), (0.08, 0.36, 0.15), 47.0, "plant", (0.66, 0.84), normal_strength=0.30)
    maps["interior"] = texture_set("Hotel Detail Interior", (0.012, 0.008, 0.006), (0.075, 0.037, 0.020), 53.0, "metal", (0.55, 0.72), normal_strength=0.18)
    maps["curtain"] = texture_set("Hotel Detail Curtain", (0.16, 0.095, 0.05), (0.38, 0.23, 0.13), 59.0, "fabric", (0.77, 0.90), normal_strength=0.27)
    maps["emissive"] = texture_set("Hotel Detail Practical Light", (0.36, 0.075, 0.012), (0.95, 0.25, 0.025), 61.0, "metal", (0.18, 0.30), normal_strength=0.14)
    return {
        "PaleTravertine": make_pbr("HotelDetail_PaleTravertine", maps["stone"], roughness=0.44, metallic=0.02, coat=0.10, coat_roughness=0.26),
        "WarmStoneFloor": make_pbr("HotelDetail_WarmStoneFloor", maps["floor"], roughness=0.58, metallic=0.01, coat=0.08, coat_roughness=0.30),
        "DarkTeak": make_pbr("HotelDetail_DarkTeak", maps["wood"], roughness=0.47, metallic=0.0, coat=0.16, coat_roughness=0.22),
        "ArchitecturalGlass": make_pbr("HotelDetail_ArchitecturalGlass", maps["glass"], roughness=0.11, metallic=0.02, transmission=0.72, coat=0.18, coat_roughness=0.10),
        "HotelPoolWater": make_pbr("HotelDetail_HotelPoolWater", maps["water"], roughness=0.075, metallic=0.0, transmission=0.18, coat=0.24, coat_roughness=0.08),
        "RooftopPool": make_pbr("HotelDetail_RooftopPool", maps["water"], roughness=0.07, metallic=0.0, transmission=0.18, coat=0.24, coat_roughness=0.08),
        "AgedChampagneBrass": make_pbr("HotelDetail_AgedChampagneBrass", maps["brass"], roughness=0.22, metallic=0.84, coat=0.08, coat_roughness=0.14),
        "ResortLoungeFabric": make_pbr("HotelDetail_ResortLoungeFabric", maps["fabric"], roughness=0.78, metallic=0.0, sheen=0.14),
        "HotelPlant": make_pbr("HotelDetail_HotelPlant", maps["plant"], roughness=0.76, metallic=0.0, sheen=0.04),
        "RoofPlant": make_pbr("HotelDetail_RoofPlant", maps["plant"], roughness=0.74, metallic=0.0, sheen=0.04),
        "DeepInterior": make_pbr("HotelDetail_DeepInterior", maps["interior"], roughness=0.64, metallic=0.0, coat=0.05),
        "SuiteCurtain": make_pbr("HotelDetail_SuiteCurtain", maps["curtain"], roughness=0.84, metallic=0.0, sheen=0.16),
        "WarmEmissive": make_pbr("HotelDetail_WarmEmissive", maps["emissive"], roughness=0.24, metallic=0.02, emission=(1.0, 0.16, 0.018), emission_strength=3.2, coat=0.08),
    }


def import_glb(path):
    bpy.ops.object.select_all(action="DESELECT")
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    after = [obj for obj in bpy.context.scene.objects if obj not in before and obj.type == "MESH"]
    return after


def mesh_metrics(objects):
    points = []
    triangles = 0
    materials = set()
    transforms = []
    for obj in objects:
        if obj.type != "MESH":
            continue
        points.extend(obj.matrix_world @ vertex.co for vertex in obj.data.vertices)
        triangles += sum(max(0, len(poly.vertices) - 2) for poly in obj.data.polygons)
        materials.update(material.name for material in obj.data.materials if material)
        transforms.append({
            "name": obj.name,
            "location": [round(v, 7) for v in obj.location],
            "rotation": [round(v, 7) for v in obj.rotation_euler],
            "scale": [round(v, 7) for v in obj.scale],
        })
    if points:
        lo = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
        hi = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    else:
        lo = Vector((0.0, 0.0, 0.0))
        hi = Vector((0.0, 0.0, 0.0))
    transforms.sort(key=lambda item: item["name"])
    transform_json = json.dumps(transforms, sort_keys=True, separators=(",", ":"))
    return {
        "object_count": len(objects),
        "triangle_count": triangles,
        "bounds_min_m": [round(v, 7) for v in lo],
        "bounds_max_m": [round(v, 7) for v in hi],
        "dimensions_m": [round(v, 7) for v in (hi - lo)],
        "materials": sorted(materials),
        "transform_sha256": hashlib.sha256(transform_json.encode("utf-8")).hexdigest(),
    }


def source_material_names(objects):
    return sorted({material.name for obj in objects for material in obj.data.materials if material})


def assign_materials(objects, lookup):
    unmapped = []
    for obj in objects:
        for index, old in enumerate(list(obj.data.materials)):
            source_name = old.name if old else ""
            replacement = lookup.get(source_name)
            if replacement is None and "." in source_name:
                base_name, suffix = source_name.rsplit(".", 1)
                if len(suffix) == 3 and suffix.isdigit():
                    replacement = lookup.get(base_name)
            if replacement is None:
                unmapped.append(source_name)
            else:
                obj.data.materials[index] = replacement
    if unmapped:
        raise RuntimeError("Unmapped source materials: " + ", ".join(sorted(set(unmapped))))


def export_objects(objects, path):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.hide_viewport = False
        obj.hide_render = False
        obj.select_set(True)
    if objects:
        bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_cameras=False,
        export_lights=False,
        export_yup=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_animations=False,
        export_skins=False,
        export_morph=False,
    )
    bpy.ops.object.select_all(action="DESELECT")


def transformed_copy(objects, collection, location, scale=(1.0, 1.0, 1.0), label="Preview"):
    transform = Matrix.Translation(Vector(location)) @ Matrix.Diagonal((*scale, 1.0))
    copies = []
    for obj in objects:
        clone = obj.copy()
        if obj.data is not None:
            clone.data = obj.data.copy()
        collection.objects.link(clone)
        clone.name = label + "_" + obj.name
        clone.matrix_world = transform @ obj.matrix_world
        clone.hide_render = False
        clone.hide_viewport = False
        copies.append(clone)
    return copies


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def add_area(scene, name, location, energy, size, color, target=(0.0, 0.0, 5.0)):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    look_at(obj, target)
    return obj


def add_preview_ground(collection):
    mat = bpy.data.materials.new("PreviewGround")
    mat.use_nodes = True
    bsdf = next(node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (0.018, 0.028, 0.038, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.64
    bpy.ops.mesh.primitive_cube_add(location=(0.0, 3.0, -0.72))
    ground = bpy.context.object
    ground.name = "PreviewGround"
    ground.dimensions = (44.0, 34.0, 0.42)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for old in list(ground.users_collection):
        old.objects.unlink(ground)
    collection.objects.link(ground)
    ground.data.materials.append(mat)


def render_preview(output_paths):
    clear_scene(remove_images=True)
    preview = bpy.data.collections.new("HOTEL_MATERIAL_DETAIL_PREVIEW")
    bpy.context.scene.collection.children.link(preview)
    module_specs = (
        ("hotel-base.glb", (0.0, 0.0, 0.0), (1.0, 1.0, 1.0), "Base"),
        ("hotel-level.glb", (0.0, 0.0, 3.0), (1.0, 1.0, 1.0), "Level1"),
        ("hotel-level.glb", (0.0, 2.70, 6.50), (0.86, 1.0, 0.86), "Level2"),
        ("hotel-roof.glb", (0.0, 5.40, 10.0), (0.74, 1.0, 0.74), "Roof"),
    )
    for filename, location, scale, label in module_specs:
        objects = import_glb(output_paths[filename])
        transformed_copy(objects, preview, location, scale, label)
        for obj in objects:
            bpy.data.objects.remove(obj, do_unlink=True)
    add_preview_ground(preview)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 24
    scene.render.resolution_x = 1440
    scene.render.resolution_y = 1040
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.filepath = os.path.join(OUT_DIR, PREVIEW_NAME)
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGB"
    scene.world = scene.world or bpy.data.worlds.new("Hotel studio")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = (0.012, 0.025, 0.052, 1.0)
        background.inputs["Strength"].default_value = 0.24
    add_area(scene, "PreviewWarmKey", (-18.0, -24.0, 28.0), 5600, 19.0, (1.0, 0.50, 0.25), (0.0, 0.0, 5.2))
    add_area(scene, "PreviewCoolFill", (18.0, -2.0, 20.0), 6500, 23.0, (0.50, 0.70, 1.0), (0.0, 1.0, 5.0))
    add_area(scene, "PreviewRim", (2.0, 22.0, 25.0), 4700, 17.0, (1.0, 0.40, 0.18), (0.0, 2.0, 6.5))
    sun_data = bpy.data.lights.new("PreviewSun", "SUN")
    sun_data.energy = 1.2
    sun_data.angle = math.radians(10.0)
    sun_data.color = (1.0, 0.52, 0.30)
    sun = bpy.data.objects.new("PreviewSun", sun_data)
    scene.collection.objects.link(sun)
    sun.location = (-12.0, -18.0, 24.0)
    look_at(sun, (0.0, 1.0, 5.0))
    cam_data = bpy.data.cameras.new("HotelDetailPreviewCamera")
    camera = bpy.data.objects.new("HotelDetailPreviewCamera", cam_data)
    scene.collection.objects.link(camera)
    camera.location = (25.5, -34.0, 18.6)
    cam_data.lens = 54.0
    look_at(camera, (0.0, 1.0, 5.65))
    scene.camera = camera
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    source_hashes = {}
    for filename in ASSETS:
        source_path = os.path.join(SOURCE_DIR, filename)
        with open(source_path, "rb") as handle:
            source_hashes[filename] = hashlib.sha256(handle.read()).hexdigest()

    clear_scene(remove_images=True)
    materials = build_materials()
    output_paths = {filename: os.path.join(OUT_DIR, filename) for filename in ASSETS}
    records = {}
    imported_modules = {}
    for filename in ASSETS:
        source_path = os.path.join(SOURCE_DIR, filename)
        objects = import_glb(source_path)
        imported_modules[filename] = objects
        source_metrics = mesh_metrics(objects)
        source_names = source_material_names(objects)
        assign_materials(objects, materials)
        output_material_names = sorted({material.name for obj in objects for material in obj.data.materials if material})
        export_objects(objects, output_paths[filename])
        records[filename] = {
            "source": {
                "path": os.path.relpath(source_path, SOURCE_ROOT),
                "sha256": source_hashes[filename],
                "metrics": source_metrics,
                "material_names": source_names,
            },
            "output": {
                "path": os.path.relpath(output_paths[filename], OUT_DIR),
                "sha256": None,
                "metrics_before_roundtrip": {**mesh_metrics(objects), "materials": output_material_names},
                "material_names": output_material_names,
            },
        }
        print("EXPORTED", filename, flush=True)

    clear_scene(remove_images=True)

    for filename, record in records.items():
        with open(output_paths[filename], "rb") as handle:
            record["output"]["sha256"] = hashlib.sha256(handle.read()).hexdigest()

    # Round-trip each exported GLB and capture bounds and topology for a reviewable check.
    for filename, record in records.items():
        clear_scene(remove_images=True)
        objects = import_glb(output_paths[filename])
        record["output"]["metrics_roundtrip"] = mesh_metrics(objects)
        record["output"]["geometry_preserved"] = {
            "object_count_equal": record["source"]["metrics"]["object_count"] == record["output"]["metrics_roundtrip"]["object_count"],
            "triangle_count_equal": record["source"]["metrics"]["triangle_count"] == record["output"]["metrics_roundtrip"]["triangle_count"],
            "dimensions_equal_within_1e-4m": all(
                abs(a - b) <= 1e-4
                for a, b in zip(record["source"]["metrics"]["dimensions_m"], record["output"]["metrics_roundtrip"]["dimensions_m"])
            ),
        }
    clear_scene(remove_images=True)
    render_preview(output_paths)

    provenance = {
        "schema": "loyalty-v2-hotel-material-detail-1",
        "created_by": "create_hotel_detail.py",
        "source_root": SOURCE_ROOT,
        "source_assets": "public/assets/hotel-*.glb",
        "outputs": records,
        "preview": PREVIEW_NAME,
        "material_method": {
            "geometry_changes": False,
            "transform_changes": False,
            "module_stack_preview": [
                {"asset": "hotel-base.glb", "translation_m": [0.0, 0.0, 0.0], "scale": [1.0, 1.0, 1.0]},
                {"asset": "hotel-level.glb", "translation_m": [0.0, 0.0, 3.0], "scale": [1.0, 1.0, 1.0]},
                {"asset": "hotel-level.glb", "translation_m": [0.0, 2.70, 6.50], "scale": [0.86, 1.0, 0.86]},
                {"asset": "hotel-roof.glb", "translation_m": [0.0, 5.40, 10.0], "scale": [0.74, 1.0, 0.74]},
            ],
            "embedded_maps": [
                "stone base color, roughness, tangent normal",
                "wood base color, roughness, tangent normal",
                "glazing base color, roughness, tangent normal",
                "water, brass, fabric, foliage, interior, curtain, and practical light maps",
            ],
            "design_direction": "Warm luxurious resort materials with restrained tonal variation, soft travertine mineral mottling, low-contrast teak grain, smoky teal glazing, and practical PBR roughness/normal response.",
            "dependencies": "Blender built-in Python API only, no external assets or network fetches",
        },
    }
    with open(os.path.join(OUT_DIR, PROVENANCE_NAME), "w", encoding="utf-8") as handle:
        json.dump(provenance, handle, indent=2)
    with open(os.path.join(OUT_DIR, README_NAME), "w", encoding="utf-8") as handle:
        handle.write("# Hotel material detail derivative\n\n")
        handle.write("Material-only derivatives for the three hotel modules. `create_hotel_detail.py` imports the source GLBs, replaces material graphs with packed deterministic PBR maps, exports the GLBs, round-trips them for bounds/topology checks, and renders the stack preview.\n\n")
        handle.write("Original source files remain unchanged. See `provenance.json` for source/output SHA-256 hashes, material names, output bounds, and geometry preservation checks.\n")
    print(json.dumps(provenance, indent=2))


if __name__ == "__main__":
    main()
