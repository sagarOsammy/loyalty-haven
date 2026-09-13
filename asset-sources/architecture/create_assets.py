import bpy
import json
import math
import os
from math import cos, pi, sin, sqrt
from mathutils import Matrix, Vector


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("LOYALTY_ARCH_OUT", SCRIPT_DIR)
os.makedirs(OUT, exist_ok=True)


def clear_file():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection":
            bpy.data.collections.remove(collection)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def collection(name):
    col = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if col.name not in bpy.context.scene.collection.children:
        try:
            bpy.context.scene.collection.children.link(col)
        except RuntimeError:
            pass
    return col


def move_to_collection(obj, col):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    col.objects.link(obj)
    return obj


def set_socket(node, names, value):
    if isinstance(names, str):
        names = [names]
    for name in names:
        socket = node.inputs.get(name)
        if socket is not None:
            socket.default_value = value
            return True
    return False


def pbr(name, color, roughness=0.45, metallic=0.0, emission=None, emission_strength=0.0, transmission=0.0, noise_scale=5.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1.0)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (-220, 0)
    set_socket(bsdf, "Base Color", (*color, 1.0))
    set_socket(bsdf, "Roughness", roughness)
    set_socket(bsdf, "Metallic", metallic)
    set_socket(bsdf, ["Transmission Weight", "Transmission"], transmission)
    set_socket(bsdf, ["Coat Weight", "Clearcoat"], 0.28 if metallic < 0.6 else 0.18)
    set_socket(bsdf, ["Coat Roughness", "Clearcoat Roughness"], 0.2)
    if emission is not None:
        set_socket(bsdf, ["Emission Color", "Emission"], (*emission, 1.0))
        set_socket(bsdf, ["Emission Strength", "Emission Strength"], emission_strength)
    if noise_scale:
        noise = nodes.new("ShaderNodeTexNoise")
        noise.location = (-560, -140)
        noise.inputs["Scale"].default_value = noise_scale
        noise.inputs["Detail"].default_value = 2.2
        noise.inputs["Roughness"].default_value = 0.65
        bump = nodes.new("ShaderNodeBump")
        bump.location = (-360, -100)
        bump.inputs["Strength"].default_value = 0.12 if roughness > 0.35 else 0.055
        bump.inputs["Distance"].default_value = 0.06
        links.new(noise.outputs["Fac"], bump.inputs["Height"])
        links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    if transmission > 0.0:
        set_socket(bsdf, "IOR", 1.45)
    return mat


def baked_microtexture(name, base, accent, scale=1.0, seed=0.0, size=256):
    """Create and pack a small deterministic microtexture so GLB exports retain stone/wood variation."""
    image = bpy.data.images.get(name) or bpy.data.images.new(name, width=size, height=size, alpha=False)
    pixels = [0.0] * (size * size * 4)
    for y in range(size):
        for x in range(size):
            u = x / max(1, size - 1)
            v = y / max(1, size - 1)
            grain = 0.5 + 0.5 * sin((u * 47.0 + sin(v * 19.0 + seed) * 4.0 + seed) * scale)
            veins = 0.5 + 0.5 * sin((u * 8.0 + v * 31.0 + sin(u * 13.0 + seed) * 2.8) * scale)
            mix = max(0.0, min(1.0, grain * 0.32 + veins * 0.68))
            # Keep the map subtle, it should read as tactile surface grain under light.
            idx = (y * size + x) * 4
            pixels[idx:idx + 4] = [
                base[0] * (1.0 - mix) + accent[0] * mix,
                base[1] * (1.0 - mix) + accent[1] * mix,
                base[2] * (1.0 - mix) + accent[2] * mix,
                1.0,
            ]
    image.pixels.foreach_set(pixels)
    image.pack()
    return image


def attach_base_map(mat, image):
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = next((node for node in nodes if node.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        return
    old = nodes.get(f"{mat.name} Baked Base Color")
    if old:
        nodes.remove(old)
    tex = nodes.new("ShaderNodeTexImage")
    tex.name = f"{mat.name} Baked Base Color"
    tex.label = "Packed GLB microtexture"
    tex.image = image
    tex.interpolation = "Linear"
    tex.location = (-560, 180)
    links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])


def ensure_uvs(col):
    """Give every exported mesh a usable UV set for its packed material map."""
    for obj in collection_objects(col):
        if obj.type != "MESH":
            continue
        bpy.ops.object.select_all(action="DESELECT")
        obj.hide_viewport = False
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(angle_limit=1.15192, island_margin=0.025)
        bpy.ops.object.mode_set(mode="OBJECT")
        obj.select_set(False)


def ico(col, name, location, radius, mat, scale=(1, 1, 1), subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    move_to_collection(obj, col)
    assign(obj, mat)
    smooth(obj)
    return obj


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return obj


def smooth(obj):
    if hasattr(obj.data, "polygons"):
        for poly in obj.data.polygons:
            poly.use_smooth = True


def bevel(obj, amount=0.08, segments=3):
    if amount <= 0:
        return obj
    mod = obj.modifiers.new("Softened architectural edges", "BEVEL")
    mod.width = amount
    mod.segments = segments
    mod.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(False)
    return obj


def cube(col, name, location, dimensions, mat, bevel_amount=0.0, rotation=None):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    if rotation is not None:
        obj.rotation_euler = rotation
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    move_to_collection(obj, col)
    assign(obj, mat)
    bevel(obj, bevel_amount, 3)
    return obj


def cylinder(col, name, location, radius, depth, mat, vertices=48, bevel_amount=0.0, rotation=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation or (0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    move_to_collection(obj, col)
    assign(obj, mat)
    if bevel_amount:
        bevel(obj, bevel_amount, 3)
    return obj


def sphere(col, name, location, radius, mat, scale=(1, 1, 1), segments=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=12, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    move_to_collection(obj, col)
    assign(obj, mat)
    smooth(obj)
    return obj


def torus(col, name, location, major, minor, mat, major_segments=64, minor_segments=12, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_segments=major_segments, minor_segments=minor_segments, location=location, major_radius=major, minor_radius=minor, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    move_to_collection(obj, col)
    assign(obj, mat)
    smooth(obj)
    return obj


def cylinder_between(col, name, a, b, radius, mat, vertices=12):
    a = Vector(a)
    b = Vector(b)
    vec = b - a
    mid = (a + b) * 0.5
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=vec.length, location=mid)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = vec.to_track_quat("Z", "Y")
    move_to_collection(obj, col)
    assign(obj, mat)
    return obj


def plane_mesh(col, name, vertices, faces, mat):
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    col.objects.link(obj)
    assign(obj, mat)
    return obj


def curved_prism(col, name, x_center, y_back, y_front, width, curve, z_bottom, z_top, mat, samples=32, bevel_amount=0.0):
    """Extruded rounded-front footprint used for continuous hotel pool decks and water bodies."""
    half = width * 0.5
    outline = [(-half, y_back), (half, y_back)]
    for index in range(samples, -1, -1):
        x = -half + (2.0 * half * index / samples)
        normalized = x / max(half, 1e-6)
        y = y_front - curve * max(0.0, 1.0 - normalized * normalized)
        outline.append((x, y))
    vertices = [(x_center + x, y, z_bottom) for x, y in outline]
    vertices.extend((x_center + x, y, z_top) for x, y in outline)
    count = len(outline)
    faces = [tuple(range(count - 1, -1, -1)), tuple(range(count, count * 2))]
    for index in range(count):
        next_index = (index + 1) % count
        faces.append((index, next_index, count + next_index, count + index))
    obj = plane_mesh(col, name, vertices, faces, mat)
    if bevel_amount:
        bevel(obj, bevel_amount, 3)
    return obj


def arch_band(col, name, start_degrees, end_degrees, radius, spring_z, rise, radial_depth, vertical_thickness, mat, samples=20):
    """One continuous arched masonry span, with no disconnected floating voussoir blocks."""
    centers = []
    for index in range(samples + 1):
        t = index / samples
        angle = math.radians(start_degrees + (end_degrees - start_degrees) * t)
        centers.append(Vector((cos(angle) * radius, sin(angle) * radius, spring_z + rise * sin(pi * t))))
    vertices = []
    for index, center in enumerate(centers):
        angle = math.radians(start_degrees + (end_degrees - start_degrees) * index / samples)
        radial = Vector((cos(angle), sin(angle), 0.0)) * (radial_depth * 0.5)
        vertical = Vector((0.0, 0.0, vertical_thickness * 0.5))
        vertices.extend((center - radial - vertical, center + radial - vertical, center + radial + vertical, center - radial + vertical))
    faces = []
    for index in range(samples):
        a = index * 4
        b = (index + 1) * 4
        faces.extend(((a, b, b + 1, a + 1), (a + 1, b + 1, b + 2, a + 2), (a + 2, b + 2, b + 3, a + 3), (a + 3, b + 3, b, a)))
    faces.extend(((0, 1, 2, 3), (samples * 4, samples * 4 + 3, samples * 4 + 2, samples * 4 + 1)))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    col.objects.link(obj)
    assign(obj, mat)
    bevel(obj, 0.02, 2)
    return obj


def arch_height(x, half=12.0, spring=5.9, rise=3.2):
    return spring + rise * sqrt(max(0.0, 1.0 - (x / half) ** 2))


def make_hangar(mats):
    col = collection("ASSET_HANGAR")
    limestone, brass, glass, dark, floor_mat, light_mat, teak = mats
    cube(col, "HangarFloorSlab", (0, 0, 0.14), (25, 15, 0.28), floor_mat, 0.12)
    cube(col, "HangarFloorInset", (0, 0.15, 0.31), (22.8, 12.9, 0.07), limestone, 0.04)
    for x in (-7.85, 0.0, 7.85):
        cube(col, f"BayLane{x:+.0f}", (x, -0.8, 0.36), (5.4, 11.0, 0.035), dark, 0.02)
        cube(col, f"BayLaneStripe{x:+.0f}", (x, -6.15, 0.39), (4.1, 0.05, 0.025), brass, 0.01)
    cube(col, "HangarBackWall", (0, 7.20, 4.1), (24.2, 0.28, 7.5), limestone, 0.05)
    # Three dark aircraft-bay recesses in the back wall, with a frame and a small overhead glow.
    for index, x in enumerate((-7.85, 0.0, 7.85), 1):
        cube(col, f"BayRecess{index}", (x, 7.02, 2.7), (6.7, 0.06, 4.75), dark, 0.12)
        cube(col, f"BayHeader{index}", (x, 6.88, 5.25), (6.9, 0.15, 0.18), brass, 0.05)
        cube(col, f"BayGlow{index}", (x, 6.84, 4.95), (4.7, 0.05, 0.07), light_mat, 0.02)
        cube(col, f"BayJambL{index}", (x - 3.35, 6.88, 2.75), (0.18, 0.16, 5.0), brass, 0.04)
        cube(col, f"BayJambR{index}", (x + 3.35, 6.88, 2.75), (0.18, 0.16, 5.0), brass, 0.04)
        # Rear clerestory glazing keeps the far wall readable through the open bays.
        cube(col, f"RearClerestory{index}", (x, 6.79, 5.86), (6.35, 0.045, 1.1), glass, 0.025)
        for mullion_index in (-2.1, 0.0, 2.1):
            cube(col, f"RearGridV{index}_{mullion_index:+.1f}", (x + mullion_index, 6.735, 5.86), (0.055, 0.065, 1.16), brass, 0.012)
        cube(col, f"RearGridH{index}", (x, 6.735, 5.86), (6.38, 0.065, 0.055), brass, 0.012)
    # Limestone front piers define three open bays while preserving the open facade.
    for index, x in enumerate((-12.0, -4.1, 4.1, 12.0), 1):
        cube(col, f"FrontPier{index}", (x, -7.25, 3.05), (0.46, 0.42, 5.75), limestone, 0.11)
        cube(col, f"FrontPierFoot{index}", (x, -7.25, 0.55), (0.9, 0.76, 0.18), brass, 0.05)
    # Barrel-vault roof with actual curved brass ribs and curved transparent roof panels.
    rib_y = [-7.08 + i * 2.02 for i in range(8)]
    rib_x = [-12.0 + i * 1.0 for i in range(25)]
    for rib_index, y in enumerate(rib_y):
        points = [(x, y, arch_height(x)) for x in rib_x]
        for seg in range(len(points) - 1):
            cylinder_between(col, f"RoofRib{rib_index:02d}_{seg:02d}", points[seg], points[seg + 1], 0.105, brass, 10)
    for r0, r1 in zip(rib_y[:-1], rib_y[1:]):
        for seg in range(len(rib_x) - 1):
            x0, x1 = rib_x[seg], rib_x[seg + 1]
            verts = [
                (x0, r0, arch_height(x0) + 0.02),
                (x1, r0, arch_height(x1) + 0.02),
                (x1, r1, arch_height(x1) + 0.02),
                (x0, r1, arch_height(x0) + 0.02),
            ]
            plane_mesh(col, f"RoofGlass_{seg:02d}_{int(r0)}", verts, [(0, 1, 2, 3)], glass)
    # Glass side elevations with vertical mullions.
    for side in (-1, 1):
        x = side * 12.12
        cube(col, f"SideBase{side}", (x, 0, 0.8), (0.18, 14.2, 0.6), limestone, 0.04)
        for y in [-6.0, -3.7, -1.4, 0.9, 3.2, 5.5]:
            cube(col, f"SideMullion{side}_{y}", (x, y, 3.15), (0.12, 0.09, 5.25), brass, 0.025)
        for y0, y1 in zip([-7.0, -5.0, -2.7, -0.4, 1.9, 4.2], [-5.0, -2.7, -0.4, 1.9, 4.2, 6.6]):
            plane_mesh(
                col,
                f"SideGlass{side}_{y0}",
                [(x, y0, 1.25), (x, y1, 1.25), (x, y1, 5.72), (x, y0, 5.72)],
                [(0, 1, 2, 3)],
                glass,
            )
    # Slim neutral runtime sign plates, intentionally no logos or words.
    cube(col, "RuntimeSignLeft", (-7.85, -7.48, 5.0), (5.7, 0.08, 0.58), dark, 0.11)
    cube(col, "RuntimeSignRight", (7.85, -7.48, 5.0), (5.7, 0.08, 0.58), dark, 0.11)
    for x in (-8.2, 0, 8.2):
        cube(col, f"RoofLight{x:+.0f}", (x, 1.0, 6.05), (4.6, 0.08, 0.08), light_mat, 0.02)
    return col


def add_suite_window(col, mats, x, y, z, width=3.0, height=1.75, suffix=""):
    limestone, brass, glass, dark, floor_mat, light_mat, teak = mats
    cube(col, f"SuiteRecess{suffix}", (x, y + 0.05, z), (width + 0.25, 0.18, height + 0.35), dark, 0.08)
    # A dark room volume, sheer side curtains, and a thin glazed skin give the suites depth.
    cube(col, f"SuiteRoom{suffix}", (x, y + 0.19, z), (width - 0.12, 0.22, height - 0.12), dark, 0.035)
    curtain = pbr("SuiteCurtain", (0.38, 0.24, 0.14), 0.82, 0.0, None, 0.0, 0.0, 2.5)
    cube(col, f"SuiteCurtainL{suffix}", (x - width * 0.38, y + 0.07, z + 0.03), (width * 0.16, 0.035, height - 0.12), curtain, 0.015)
    cube(col, f"SuiteCurtainR{suffix}", (x + width * 0.38, y + 0.07, z + 0.03), (width * 0.16, 0.035, height - 0.12), curtain, 0.015)
    cube(col, f"SuiteGlass{suffix}", (x, y - 0.015, z), (width, 0.08, height), glass, 0.05)
    cube(col, f"SuiteLight{suffix}", (x, y - 0.07, z + height * 0.31), (width * 0.72, 0.035, 0.08), light_mat, 0.02)
    cube(col, f"SuiteMullionV{suffix}", (x, y - 0.08, z), (0.045, 0.05, height), brass, 0.01)
    cube(col, f"SuiteMullionH{suffix}", (x, y - 0.08, z), (width, 0.05, 0.045), brass, 0.01)


def shrub_cluster(col, name, x, y, z, scale, teak, leaf):
    """Clustered broadleaf planting, with varied low crowns instead of single lollipop spheres."""
    cube(col, f"{name}Planter", (x, y, z + 0.12 * scale), (0.72 * scale, 0.55 * scale, 0.24 * scale), teak, 0.06 * scale)
    offsets = [(-0.20, -0.06, 0.42), (0.04, 0.04, 0.56), (0.22, -0.01, 0.40), (-0.06, 0.16, 0.34), (0.13, 0.18, 0.31)]
    for idx, (ox, oy, oz) in enumerate(offsets):
        ico(col, f"{name}Leaf{idx}", (x + ox * scale, y + oy * scale, z + oz * scale), 0.33 * scale, leaf, scale=(1.35, 0.9, 0.78), subdivisions=2)


def cone(col, name, location, radius1, radius2, depth, mat, vertices=32):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    move_to_collection(obj, col)
    assign(obj, mat)
    bevel(obj, min(0.025, depth * 0.18), 2)
    return obj


def lounge_set(col, name, x, y, z, rotation, teak, fabric):
    seat = cube(col, f"{name}Frame", (x, y, z + 0.10), (0.72, 0.40, 0.13), teak, 0.035, (0, 0, rotation))
    cube(col, f"{name}Cushion", (x, y - 0.015, z + 0.19), (0.58, 0.31, 0.08), fabric, 0.025, (0, 0, rotation))
    cube(col, f"{name}Back", (x, y + 0.16, z + 0.40), (0.70, 0.075, 0.48), teak, 0.035, (math.radians(-12), 0, rotation))
    cube(col, f"{name}BackCushion", (x, y + 0.115, z + 0.42), (0.57, 0.05, 0.31), fabric, 0.02, (math.radians(-12), 0, rotation))


def parasol(col, name, x, y, z, height, teak, fabric):
    cylinder(col, f"{name}Pole", (x, y, z + height * 0.48), 0.025, height, brass if False else teak, 12)
    cone(col, f"{name}Canopy", (x, y, z + height), 0.64, 0.10, 0.15, fabric, 32)


def scalloped_terrace(col, name, x_center, y_front, z, width, count, limestone, brass, water, teak, fabric, leaf, parasol_height=1.55):
    """Front projecting terrace with repeated deep scallop pools and pale coping."""
    offsets = [((i - (count - 1) / 2.0) * (width / max(1, count - 1))) for i in range(count)]
    cube(col, f"{name}DeckBack", (x_center, y_front + 0.66, z + 0.14), (width + 0.85, 1.42, 0.28), teak, 0.10)
    pool_water = water
    for i, offset in enumerate(offsets):
        x = x_center + offset
        # The lobe itself projects in front of the building and supplies the curved balcony silhouette.
        cylinder(col, f"{name}LobeDeck{i}", (x, y_front, z + 0.14), 1.25, 0.28, limestone, 48, 0.08)
        cylinder(col, f"{name}LobeBasin{i}", (x, y_front, z + 0.31), 1.17, 0.12, dark if False else teak, 48, 0.05)
        cylinder(col, f"{name}LobeWater{i}", (x, y_front, z + 0.40), 1.02, 0.08, pool_water, 48, 0.035)
        torus(col, f"{name}Coping{i}", (x, y_front, z + 0.46), 1.10, 0.075, limestone, 48, 8)
        # A low brass edge catches the sunset without reading as a hard glass balustrade.
        torus(col, f"{name}PoolTrim{i}", (x, y_front, z + 0.51), 1.00, 0.025, brass, 48, 6)
        lounge_set(col, f"{name}Lounge{i}", x, y_front + 0.94, z + 0.32, 0.0, teak, fabric)
        if i % 2 == 1:
            parasol(col, f"{name}Parasol{i}", x, y_front + 0.42, z + 0.52, parasol_height, teak, fabric)
    # Rear planting breaks the repeated rhythm and gives the terraces a lived-in resort scale.
    for i, offset in enumerate(offsets[::2]):
        shrub_cluster(col, f"{name}Shrub{i}", x_center + offset, y_front + 1.10, z + 0.30, 0.72, teak, leaf)


def continuous_pool_terrace(col, name, x_center, deck_back, deck_front, pool_back, pool_front, z, pool_width, deck_width, limestone, brass, water, teak, fabric, leaf, parasol_height=1.30):
    """One broad infinity pool with a curved front edge and a restrained furniture set."""
    curved_prism(col, f"{name}CreamDeck", x_center, deck_back, deck_front, deck_width, 0.18, z, z + 0.24, limestone, 40, 0.10)
    curved_prism(col, f"{name}PoolCoping", x_center, pool_back - 0.06, pool_front - 0.04, pool_width + 0.42, 0.58, z + 0.25, z + 0.34, limestone, 40, 0.045)
    curved_prism(col, f"{name}PoolWater", x_center, pool_back, pool_front, pool_width, 0.54, z + 0.34, z + 0.43, water, 40, 0.035)
    # A shallow teak strip at the rear gives the suite glazing a warm threshold.
    cube(col, f"{name}RearTeakThreshold", (x_center, pool_back + 0.18, z + 0.48), (deck_width - 0.60, 0.22, 0.12), teak, 0.035)
    side_offset = pool_width * 0.5 + 0.52
    lounge_y = (pool_back + pool_front) * 0.5
    for index, side in enumerate((-1, 1), 1):
        x = x_center + side * side_offset
        lounge_set(col, f"{name}Lounge{index}", x, lounge_y, z + 0.48, math.radians(8.0 * side), teak, fabric)
        parasol(col, f"{name}Parasol{index}", x, lounge_y - 0.05, z + 0.64, parasol_height, teak, fabric)
    # A pair of broad planted corners reads as landscaping rather than repeated spherical props.
    corner_x = deck_width * 0.5 - 0.52
    shrub_cluster(col, f"{name}PlantL", x_center - corner_x, deck_back + 0.28, z + 0.25, 0.62, teak, leaf)
    shrub_cluster(col, f"{name}PlantR", x_center + corner_x, deck_back + 0.28, z + 0.25, 0.62, teak, leaf)


def make_hotel_base(mats):
    col = collection("ASSET_HOTEL_BASE")
    limestone, brass, glass, dark, floor_mat, light_mat, teak = mats
    water = pbr("HotelPoolWater", (0.055, 0.42, 0.55), 0.09, 0.12, (0.01, 0.22, 0.28), 0.15, 0.0, 3.0)
    fabric = pbr("ResortLoungeFabric", (0.78, 0.66, 0.48), 0.74, 0.0, None, 0.0, 0.0, 2.0)
    leaf = pbr("HotelPlant", (0.05, 0.30, 0.18), 0.78, 0.0, None, 0.0, 0.0, 4.0)
    cube(col, "HotelBaseSlab", (0, 0, 0.14), (17, 11, 0.28), floor_mat, 0.12)
    # Structural envelope ends at Z=3.0, the upper coping is a separate flush datum.
    cube(col, "HotelLobbyShell", (0, 0.70, 1.52), (16.4, 8.9, 2.70), limestone, 0.24)
    cube(col, "HotelLobbyTopCoping", (0, 0.70, 2.90), (16.55, 8.98, 0.20), limestone, 0.08)
    cube(col, "HotelLobbyFrontVoid", (0, -3.86, 1.64), (14.4, 0.08, 2.16), dark, 0.12)
    for index, x in enumerate((-7.2, -3.6, 0, 3.6, 7.2), 1):
        cube(col, f"LobbyPillar{index}", (x, -4.05, 1.60), (0.28, 0.32, 2.78), limestone, 0.08)
        add_suite_window(col, mats, x, -4.14, 1.64, 2.65, 1.72, f"Base{index}")
    cube(col, "LobbyCanopy", (0, -4.43, 2.76), (14.8, 0.95, 0.18), teak, 0.09)
    for x in (-6.2, 0, 6.2):
        cube(col, f"LobbyCanopyBeam{x}", (x, -4.48, 2.86), (0.15, 1.05, 0.25), brass, 0.03)
    continuous_pool_terrace(col, "BasePool", 2.2, -3.65, -5.22, -3.48, -4.58, 2.04, 9.4, 12.6, limestone, brass, water, teak, fabric, leaf, parasol_height=0.28)
    for x in (-4.8, 0, 4.8):
        cube(col, f"LobbyWarmPanel{x}", (x, -4.18, 1.55), (1.2, 0.04, 0.8), light_mat, 0.03)
    return col


def make_hotel_level(mats):
    col = collection("ASSET_HOTEL_LEVEL")
    limestone, brass, glass, dark, floor_mat, light_mat, teak = mats
    water = pbr("HotelPoolWater", (0.055, 0.42, 0.55), 0.09, 0.12, (0.01, 0.22, 0.28), 0.15, 0.0, 3.0)
    fabric = pbr("ResortLoungeFabric", (0.78, 0.66, 0.48), 0.74, 0.0, None, 0.0, 0.0, 2.0)
    leaf = pbr("HotelPlant", (0.05, 0.30, 0.18), 0.78, 0.0, None, 0.0, 0.0, 4.0)
    cube(col, "LevelSlab", (0, 0, 0.14), (16.95, 10.95, 0.28), limestone, 0.12)
    # The repeatable suite core occupies the rear half, leaving a clear glazed datum at Y=0.
    cube(col, "LevelRearMass", (0, 2.82, 1.86), (16.3, 5.30, 3.0), limestone, 0.2)
    cube(col, "LevelTopCoping", (0, 2.82, 3.40), (16.45, 5.42, 0.16), limestone, 0.07)
    cube(col, "LevelFrontTeakSoffit", (0, -0.48, 0.72), (15.5, 0.65, 0.18), teak, 0.07)
    cube(col, "LevelFrontDarkRecess", (0, -0.04, 2.12), (15.5, 0.14, 2.28), dark, 0.08)
    for index, x in enumerate((-6.75, -3.38, 0, 3.38, 6.75), 1):
        add_suite_window(col, mats, x, -0.08, 2.10, 2.72, 1.80, f"Level{index}")
        cube(col, f"LevelPier{index}", (x + 1.58, -0.02, 1.84), (0.22, 0.3, 3.0), limestone, 0.05)
    continuous_pool_terrace(col, "LevelPool", 0.0, -0.10, -5.20, -0.20, -3.55, 0.36, 12.0, 15.8, limestone, brass, water, teak, fabric, leaf, parasol_height=1.34)
    return col


def make_hotel_roof(mats):
    col = collection("ASSET_HOTEL_ROOF")
    limestone, brass, glass, dark, floor_mat, light_mat, teak = mats
    pool_water = pbr("RooftopPool", (0.04, 0.42, 0.52), 0.08, 0.16, (0.01, 0.22, 0.28), 0.13, 0.0, 3.0)
    fabric = pbr("ResortLoungeFabric", (0.78, 0.66, 0.48), 0.74, 0.0, None, 0.0, 0.0, 2.0)
    leaf = pbr("RoofPlant", (0.05, 0.30, 0.18), 0.72, 0.0, None, 0.0, 0.0, 4.0)
    cube(col, "RoofCapSlab", (0, 0, 0.16), (17, 11, 0.32), limestone, 0.14)
    # A modest roof cap with one restrained pool and a small pergola, scaled safely for the upper stack.
    cube(col, "TerraceLower", (0, -1.85, 0.52), (11.8, 3.0, 0.32), teak, 0.14)
    continuous_pool_terrace(col, "RoofPool", 0.8, -0.32, -3.72, -0.48, -2.58, 0.68, 8.6, 10.8, limestone, brass, pool_water, teak, fabric, leaf, parasol_height=1.05)
    cube(col, "TerraceMiddle", (0, -0.10, 1.30), (15.3, 2.8, 0.30), limestone, 0.14)
    for x in (-5.2, 0, 5.2):
        shrub_cluster(col, f"RoofMiddleShrub{x}", x, -0.35, 1.52, 0.80, teak, leaf)
    cube(col, "TerraceUpper", (0, 2.65, 2.05), (14.5, 2.45, 0.30), teak, 0.14)
    for x in (-4.9, 0.0, 4.9):
        cube(col, f"CabanaRoof{x}", (x, 2.55, 2.83), (3.1, 1.75, 0.15), teak, 0.08)
        for px in (x - 1.35, x + 1.35):
            cylinder(col, f"CabanaPost{x}_{px}", (px, 2.55, 2.37), 0.045, 0.95, brass, 12)
        cube(col, f"CabanaGlow{x}", (x, 2.55, 2.32), (2.1, 0.04, 0.24), light_mat, 0.03)
    cube(col, "RoofParapetBack", (0, 5.1, 2.45), (16.8, 0.3, 0.8), limestone, 0.12)
    for x in (-6.8, -3.4, 0, 3.4, 6.8):
        cube(col, f"RoofWindowGlow{x}", (x, 4.92, 2.4), (1.6, 0.04, 0.38), light_mat, 0.03)
    return col


def make_forum(mats):
    col = collection("ASSET_FORUM")
    limestone, brass, glass, dark, floor_mat, light_mat, teak = mats
    warm_stone = pbr("ForumWarmStone", (0.68, 0.50, 0.34), 0.48, 0.08, None, 0.0, 0.0, 6.0)
    champagne = pbr("ForumChampagne", (0.62, 0.39, 0.16), 0.24, 0.78, None, 0.0, 0.0, 5.0)
    deep_recess = pbr("ForumRecess", (0.055, 0.035, 0.025), 0.6, 0.1, None, 0.0, 0.0, 3.0)
    cylinder(col, "ForumStageBase", (0, 0, 0.24), 4.8, 0.48, warm_stone, 96, 0.08)
    cylinder(col, "ForumStageStep", (0, 0, 0.57), 4.48, 0.18, limestone, 96, 0.05)
    torus(col, "ForumOuterBrassRing", (0, 0, 0.69), 4.31, 0.11, champagne, 96, 12)
    # The recessed stage surface reaches Z=1.2, leaving a broad area for the runtime centerpiece.
    cylinder(col, "ForumRecessedStage", (0, 0, 0.93), 3.88, 0.54, deep_recess, 96, 0.06)
    torus(col, "ForumInnerTrim", (0, 0, 1.20), 3.5, 0.055, brass, 96, 10)
    # Radial seating arc leaves the center open and faces the pavilion ring.
    for index, degrees in enumerate(range(-150, -29, 15), 1):
        angle = math.radians(degrees)
        x, y = cos(angle) * 3.28, sin(angle) * 3.28
        cube(col, f"ForumSeat{index:02d}", (x, y, 1.28), (0.86, 0.38, 0.34), teak, 0.12, (0, 0, angle - pi / 2))
        cube(col, f"ForumSeatBack{index:02d}", (x - cos(angle) * 0.18, y - sin(angle) * 0.18, 1.56), (0.8, 0.12, 0.48), warm_stone, 0.08, (0, 0, angle - pi / 2))
    # Ten full-height limestone piers make a complete open colonnade around the pavilion.
    ring_radius = 4.18
    pillar_count = 10
    pillar_angles = [-90 + index * (360.0 / pillar_count) for index in range(pillar_count)]
    for index, degrees in enumerate(pillar_angles, 1):
        angle = math.radians(degrees)
        x, y = cos(angle) * ring_radius, sin(angle) * ring_radius
        cylinder(col, f"ForumPillar{index:02d}", (x, y, 2.0), 0.24, 4.0, limestone, 24, 0.045)
        cylinder(col, f"ForumPillarPlinth{index:02d}", (x, y, 0.18), 0.40, 0.36, warm_stone, 24, 0.045)
        cylinder(col, f"ForumPillarCap{index:02d}", (x, y, 4.08), 0.36, 0.22, champagne, 24, 0.035)
    # Each portal is one continuous masonry arch span, with no disconnected floating blocks.
    spring_z = 3.62
    arch_rise = 0.88
    for arch_index, start_degrees in enumerate(pillar_angles, 1):
        end_degrees = start_degrees + 360.0 / pillar_count
        arch_band(col, f"ForumMasonryArch{arch_index:02d}", start_degrees, end_degrees, ring_radius, spring_z, arch_rise, 0.52, 0.30, limestone, samples=24)
    # Broad entablature bands cap the portals without covering the pavilion with a roof or dome.
    for index, degrees in enumerate(pillar_angles, 1):
        angle = math.radians(degrees)
        x, y = cos(angle) * ring_radius, sin(angle) * ring_radius
        cube(col, f"ForumEntablature{index:02d}", (x, y, 4.72), (2.15, 0.64, 0.38), warm_stone, 0.06, (0, 0, angle + pi / 2))
    torus(col, "ForumEntablatureBand", (0, 0, 4.83), ring_radius, 0.14, limestone, 96, 10)
    torus(col, "ForumBrassBand", (0, 0, 4.98), ring_radius - 0.12, 0.055, champagne, 96, 8)
    # Keep only a named runtime socket, the parent supplies the rotating labeled boards.
    rotator = bpy.data.objects.new("ForumCenterRotator", None)
    col.objects.link(rotator)
    cylinder(col, "ForumCenterTurntable", (0, 0, 1.29), 1.60, 0.16, champagne, 64, 0.04)
    # Three shallow entry steps on the front, aligned to the camera side.
    for index in range(3):
        y = -4.85 + index * 0.38
        cube(col, f"ForumEntryStep{index}", (0, y, 0.15 + index * 0.13), (2.2 + index * 0.4, 0.42, 0.25), limestone, 0.07)
    cube(col, "ForumRuntimePlaque", (0, -4.42, 1.42), (2.85, 0.10, 0.42), dark, 0.08)
    return col


def set_render_materials(mats):
    # Keep materials neutral and self-contained. The .blend retains the procedural bump nodes,
    # while the GLBs retain portable PBR base values and emission surfaces.
    for mat in mats:
        mat.diffuse_color = (*mat.diffuse_color[:3], 1.0)


def collection_objects(col):
    return [obj for obj in col.objects if obj.type in {"MESH", "CURVE", "EMPTY"}]


def metrics(col):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    objects = collection_objects(col)
    corners = []
    tris = 0
    materials = set()
    for obj in objects:
        if obj.type == "MESH":
            eval_obj = obj.evaluated_get(depsgraph)
            mesh = eval_obj.to_mesh()
            try:
                tris += sum(max(0, len(poly.vertices) - 2) for poly in mesh.polygons)
                transform = obj.matrix_basis if obj.parent is None else obj.matrix_world
                corners.extend([transform @ vertex.co for vertex in mesh.vertices])
                materials.update(slot.material.name for slot in obj.material_slots if slot.material)
            finally:
                eval_obj.to_mesh_clear()
    if not corners:
        bounds_min = Vector((0, 0, 0))
        bounds_max = Vector((0, 0, 0))
    else:
        bounds_min = Vector((min(p.x for p in corners), min(p.y for p in corners), min(p.z for p in corners)))
        bounds_max = Vector((max(p.x for p in corners), max(p.y for p in corners), max(p.z for p in corners)))
    return {
        "object_count": len(objects),
        "triangle_count": tris,
        "bounds_min_m": [round(v, 4) for v in bounds_min],
        "bounds_max_m": [round(v, 4) for v in bounds_max],
        "dimensions_m": [round(v, 4) for v in (bounds_max - bounds_min)],
        "materials": sorted(materials),
    }


def raw_bounds(col):
    corners = []
    for obj in collection_objects(col):
        if obj.type == "MESH":
            transform = obj.matrix_basis if obj.parent is None else obj.matrix_world
            corners.extend([transform @ vertex.co for vertex in obj.data.vertices])
    minimum = Vector((min(p.x for p in corners), min(p.y for p in corners), min(p.z for p in corners)))
    maximum = Vector((max(p.x for p in corners), max(p.y for p in corners), max(p.z for p in corners)))
    return minimum, maximum


def fit_xy(col, x_bounds=None, y_bounds=None):
    bpy.context.view_layer.update()
    minimum, maximum = raw_bounds(col)
    transform = Matrix.Identity(4)
    if x_bounds is not None:
        center = (minimum.x + maximum.x) * 0.5
        scale = (x_bounds[1] - x_bounds[0]) / max(maximum.x - minimum.x, 1e-6)
        target_center = (x_bounds[0] + x_bounds[1]) * 0.5
        transform = Matrix.Translation(Vector((target_center, 0, 0))) @ Matrix.Diagonal((scale, 1, 1, 1)) @ Matrix.Translation(Vector((-center, 0, 0))) @ transform
    if y_bounds is not None:
        minimum, maximum = raw_bounds(col)
        center = (minimum.y + maximum.y) * 0.5
        scale = (y_bounds[1] - y_bounds[0]) / max(maximum.y - minimum.y, 1e-6)
        target_center = (y_bounds[0] + y_bounds[1]) * 0.5
        transform = Matrix.Translation(Vector((0, target_center, 0))) @ Matrix.Diagonal((1, scale, 1, 1)) @ Matrix.Translation(Vector((0, -center, 0))) @ transform
    for obj in collection_objects(col):
        if obj.parent is None:
            obj.matrix_basis = transform @ obj.matrix_basis
        else:
            obj.matrix_world = transform @ obj.matrix_world
    bpy.context.view_layer.update()


def select_collection(col):
    bpy.ops.object.select_all(action="DESELECT")
    objects = collection_objects(col)
    for obj in objects:
        obj.hide_viewport = False
        obj.hide_render = False
        obj.select_set(True)
    if objects:
        bpy.context.view_layer.objects.active = objects[0]


def merge_static_by_material(col):
    groups = {}
    for obj in collection_objects(col):
        if obj.type != "MESH" or len(obj.data.materials) != 1 or obj.data.materials[0] is None:
            continue
        groups.setdefault(obj.data.materials[0].name, []).append(obj)
    for material_name, objects in groups.items():
        if len(objects) < 2:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.hide_viewport = False
            obj.hide_render = False
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        objects[0].name = f"{col.name}_{material_name}"


def export_collection(col, filename):
    select_collection(col)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, filename),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_yup=True,
    )
    bpy.ops.object.select_all(action="DESELECT")


def copy_collection(col, dest, location, prefix, scale=(1.0, 1.0, 1.0)):
    collection_transform = Matrix.Translation(Vector(location)) @ Matrix.Diagonal((scale[0], scale[1], scale[2], 1.0))
    for obj in collection_objects(col):
        clone = obj.copy()
        if obj.data is not None:
            clone.data = obj.data.copy()
        clone.name = prefix + obj.name
        dest.objects.link(clone)
        clone.hide_render = False
        clone.hide_viewport = False
        clone.parent = None
        source_matrix = obj.matrix_basis if obj.parent is None else obj.matrix_world
        clone.matrix_world = collection_transform @ source_matrix


def keep_hotel_base_lounges_inside(col, y_margin=0.75):
    """Keep the rotated lounge fabric mesh inside the base footprint after glTF axis conversion."""
    for obj in col.objects:
        if obj.type == "MESH" and obj.name.endswith("ResortLoungeFabric"):
            obj.location.y += y_margin


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def make_render_scene(hangar, base, level, roof, forum, mats):
    render_col = collection("RENDER_COMPOSITION")
    copy_collection(hangar, render_col, (-10.7, 1.0, 0.0), "RenderHangar_")
    copy_collection(base, render_col, (10.0, 1.15, 0.0), "RenderHotelBase_")
    # The upper levels taper in X/Z and step back in Y, keeping every lower infinity pool visible.
    copy_collection(level, render_col, (10.0, 1.15, 3.0), "RenderHotelLevel1_", scale=(1.0, 1.0, 1.0))
    copy_collection(level, render_col, (10.0, 3.85, 6.5), "RenderHotelLevel2_", scale=(0.86, 1.0, 0.86))
    copy_collection(roof, render_col, (10.0, 6.55, 10.0), "RenderHotelRoof_", scale=(0.74, 1.0, 0.74))
    copy_collection(forum, render_col, (0.0, -8.7, 0.0), "RenderForum_")
    # A quiet island plinth and water backdrop for inspection only, never exported.
    island = pbr("RenderIsland", (0.32, 0.24, 0.18), 0.78, 0.02, None, 0.0, 0.0, 2.0)
    water = pbr("RenderWater", (0.03, 0.18, 0.23), 0.15, 0.18, (0.01, 0.08, 0.1), 0.08, 0.0, 1.5)
    cube(render_col, "RenderIslandBase", (0, 0, -0.35), (48, 34, 0.6), island, 0.4)
    cube(render_col, "RenderWaterPlane", (0, 7.2, -0.76), (70, 45, 0.1), water, 0.0)
    return render_col


def render_preview(render_col, mats):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 820
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = os.path.join(OUT, "loyalty_island_preview.png")
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_percentage = 100
    scene.world.color = (0.26, 0.12, 0.07)
    world = scene.world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.24, 0.095, 0.045, 1.0)
        bg.inputs["Strength"].default_value = 0.56
    # Bright sunset key, broad hemisphere-style fill, and warm practicals.
    def area(name, loc, energy, size, color):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = color
        obj = bpy.data.objects.new(name, data)
        scene.collection.objects.link(obj)
        obj.location = loc
        look_at(obj, (0, 0, 3.0))
        return obj
    area("KeyWarm", (-24, -26, 32), 4300, 22, (1.0, 0.62, 0.40))
    area("FillHemisphere", (18, -2, 20), 6200, 24, (0.62, 0.78, 1.0))
    area("RimSunset", (0, 20, 28), 3400, 18, (1.0, 0.48, 0.26))
    sun_data = bpy.data.lights.new("SunsetSun", "SUN")
    sun_data.energy = 1.6
    sun_data.angle = math.radians(12.0)
    sun_data.color = (1.0, 0.56, 0.30)
    sun = bpy.data.objects.new("SunsetSun", sun_data)
    scene.collection.objects.link(sun)
    sun.location = (-12, -18, 24)
    look_at(sun, (0, 0, 2.0))
    data = bpy.data.lights.new("ForumPractical", "POINT")
    data.energy = 460
    data.color = (1.0, 0.43, 0.18)
    point = bpy.data.objects.new("ForumPractical", data)
    scene.collection.objects.link(point)
    point.location = (0, -8.7, 4.0)
    # Camera matches the reference composition, with the forum foreground and the hotel to the right.
    cam_data = bpy.data.cameras.new("PreviewCamera")
    cam = bpy.data.objects.new("PreviewCamera", cam_data)
    scene.collection.objects.link(cam)
    cam.location = (32, -44, 25)
    cam_data.lens = 50
    look_at(cam, (0, 0, 4.35))
    scene.camera = cam
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "loyalty_island_assets.blend"))
    bpy.ops.render.render(write_still=True)


def main():
    clear_file()
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.length_unit = "METERS"
    limestone = pbr("PaleTravertine", (0.68, 0.52, 0.34), 0.42, 0.06, None, 0.0, 0.0, 4.2)
    brass = pbr("AgedChampagneBrass", (0.55, 0.31, 0.10), 0.24, 0.82, None, 0.0, 0.0, 5.0)
    glass = pbr("ArchitecturalGlass", (0.16, 0.42, 0.48), 0.08, 0.16, (0.02, 0.08, 0.10), 0.05, 0.76, 2.5)
    dark = pbr("DeepInterior", (0.035, 0.024, 0.02), 0.68, 0.08, None, 0.0, 0.0, 2.0)
    floor_mat = pbr("WarmStoneFloor", (0.34, 0.23, 0.16), 0.72, 0.04, None, 0.0, 0.0, 3.5)
    light_mat = pbr("WarmEmissive", (0.68, 0.26, 0.07), 0.25, 0.15, (1.0, 0.2, 0.035), 5.0, 0.0, 2.0)
    teak = pbr("DarkTeak", (0.16, 0.055, 0.024), 0.5, 0.1, None, 0.0, 0.0, 6.0)
    mats = (limestone, brass, glass, dark, floor_mat, light_mat, teak)
    hangar = make_hangar(mats)
    hotel_base = make_hotel_base(mats)
    hotel_level = make_hotel_level(mats)
    hotel_roof = make_hotel_roof(mats)
    forum = make_forum(mats)
    # Pack authored surface variation into image textures so the GLB retains tactile stone and timber.
    stone_map = baked_microtexture("BakedWarmTravertine", (0.60, 0.48, 0.34), (0.94, 0.82, 0.64), scale=1.0, seed=3.0)
    floor_map = baked_microtexture("BakedWarmStoneFloor", (0.16, 0.095, 0.045), (0.45, 0.27, 0.13), scale=1.2, seed=7.0)
    teak_map = baked_microtexture("BakedDarkTeak", (0.055, 0.018, 0.007), (0.30, 0.095, 0.028), scale=1.7, seed=11.0)
    for material_name, image in (
        ("PaleTravertine", stone_map),
        ("ForumWarmStone", stone_map),
        ("WarmStoneFloor", floor_map),
        ("DarkTeak", teak_map),
    ):
        material = bpy.data.materials.get(material_name)
        if material is not None:
            attach_base_map(material, image)
    fit_xy(hangar, (-12.5, 12.5), (-7.5, 7.5))
    fit_xy(hotel_base, (-8.5, 8.5), (-5.5, 5.5))
    assets = {
        "hangar.glb": hangar,
        "hotel-base.glb": hotel_base,
        "hotel-level.glb": hotel_level,
        "hotel-roof.glb": hotel_roof,
        "forum.glb": forum,
    }
    for col in assets.values():
        merge_static_by_material(col)
        ensure_uvs(col)
    # Reapply footprint constraints after material joins, which can change active object origins.
    fit_xy(hangar, (-12.5, 12.5), (-7.5, 7.5))
    fit_xy(hotel_base, (-8.5, 8.5), (-5.5, 5.5))
    keep_hotel_base_lounges_inside(hotel_base)
    fit_xy(hotel_level, y_bounds=(-5.475, 5.475))
    fit_xy(hotel_roof, (-8.5, 8.5), (-5.5, 5.5))
    source_metrics = {name: metrics(col) for name, col in assets.items()}
    for name, col in assets.items():
        export_collection(col, name)
        for obj in collection_objects(col):
            obj.hide_render = True
            obj.hide_viewport = True
    render_col = make_render_scene(hangar, hotel_base, hotel_level, hotel_roof, forum, mats)
    if os.environ.get("LOYALTY_ARCH_SKIP_RENDER", "0") != "1":
        render_preview(render_col, mats)
    provenance = {
        "schema": "loyalty-v2-architecture-1",
        "created_by": "create_assets.py",
        "source": "Procedural Blender geometry authored for My Loyalty Haven v2",
        "external_assets": [],
        "brand_assets": [],
        "reference_images": [
            "docs/reference-images/Gemini-4.png",
            "docs/reference-images/GPT-2.png",
        ],
        "coordinate_system": "Blender Z-up, metres, glTF Y-up export",
        "assets": source_metrics,
        "notes": {
            "hangar": "25m X by 15m Y footprint, front opening at Y=-7.5, base Z=0, no aircraft or branded signage",
            "hotel_base": "17m X by 11m Y footprint, structural lobby top exactly Z=3.0m, broad lower pool terrace, foliage and furniture may extend above the datum",
            "hotel_level": "repeatable 3.5m segment, suite core in Y=0..5.5 behind glazing at Y=0, broad continuous infinity pool on Y=-5.5..0",
            "hotel_roof": "modest rounded pool cap with compact cabana and pergola, source base Z=0",
            "forum": "4.8m radius stage with 10 full-height limestone pillars, continuous masonry arches, broad entablature, and an empty runtime center socket",
            "materials": "PBR materials include packed warm travertine, stone-floor, and dark-teak image maps plus procedural bump nodes",
        },
        "license": "Original procedural geometry and script, no third-party asset files embedded",
    }
    with open(os.path.join(OUT, "provenance.json"), "w", encoding="utf-8") as handle:
        json.dump(provenance, handle, indent=2)
    with open(os.path.join(OUT, "README.md"), "w", encoding="utf-8") as handle:
        handle.write("# Loyalty v2 architecture assets\n\n")
        handle.write("Procedural Blender source and GLB exports for the luxury loyalty island diorama.\n\n")
        handle.write("All geometry and materials in this pass are original procedural output, with no embedded brand or third-party assets. See provenance.json for exact bounds and triangle counts.\n")
    print(json.dumps(provenance, indent=2))


main()
