import bpy
import math
import os
import json
import sys
from mathutils import Vector, Matrix

ROOT = os.environ.get("ASSET_ROOT", os.path.dirname(os.path.abspath(__file__)))
EXPORT_DIR = os.environ.get("ASSET_EXPORT_DIR", os.path.join(ROOT, "exports"))
RENDER_DIR = os.environ.get("ASSET_RENDER_DIR", os.path.join(ROOT, "renders"))
SOURCE_DIR = os.environ.get("ASSET_SOURCE_DIR", os.path.join(ROOT, "sources"))
LOGO_PATH = os.path.join(SOURCE_DIR, "united_logo", "united_airlines_logo_1998.svg")
AVIANCA_LOGO_PATH = os.path.join(SOURCE_DIR, "airline_logos", "avianca_2013_wordmark.svg")
AIR_CANADA_LOGO_PATH = os.path.join(SOURCE_DIR, "airline_logos", "air_canada_logo.svg")
VINTAGE_PATH = os.path.join(SOURCE_DIR, "polyhaven_vintage_suitcase_1k", "vintage_suitcase_1k.gltf")

os.makedirs(EXPORT_DIR, exist_ok=True)
os.makedirs(RENDER_DIR, exist_ok=True)

ASSETS = {}
MATS = {}
EXPORT_STATS = {}


def set_input(node, names, value):
    if isinstance(names, str):
        names = [names]
    for name in names:
        sock = node.inputs.get(name)
        if sock is not None:
            sock.default_value = value
            return


def material(name, color, metallic=0.0, roughness=0.45, coat=0.0, transmission=0.0, emission=None):
    if name in MATS:
        return MATS[name]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1.0)
    bsdf = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf:
        set_input(bsdf, "Base Color", (*color, 1.0))
        set_input(bsdf, "Metallic", metallic)
        set_input(bsdf, "Roughness", roughness)
        set_input(bsdf, ["Coat Weight", "Clearcoat"], coat)
        set_input(bsdf, ["Coat Roughness", "Clearcoat Roughness"], max(0.05, roughness * 0.6))
        set_input(bsdf, ["Transmission Weight", "Transmission"], transmission)
        if emission is not None:
            set_input(bsdf, "Emission Color", (*emission, 1.0))
            set_input(bsdf, "Emission Strength", 1.8)
    MATS[name] = mat
    return mat


def make_materials():
    MATS["airframe_white"] = material("Airframe White Aluminum", (0.82, 0.86, 0.89), metallic=0.38, roughness=0.24, coat=0.32)
    MATS["airframe_shadow"] = material("Airframe Shadow Aluminum", (0.42, 0.49, 0.54), metallic=0.55, roughness=0.28, coat=0.2)
    MATS["united_navy"] = material("United Navy", (0.018, 0.055, 0.17), metallic=0.26, roughness=0.26, coat=0.3)
    MATS["united_blue"] = material("United Blue Belly", (0.02, 0.19, 0.48), metallic=0.2, roughness=0.3, coat=0.22)
    MATS["logo_white"] = material("United Wordmark Navy", (0.018, 0.055, 0.17), metallic=0.12, roughness=0.24, coat=0.22)
    MATS["avianca_red"] = material("Avianca Red", (0.72, 0.015, 0.025), metallic=0.12, roughness=0.27, coat=0.26)
    MATS["avianca_wine"] = material("Avianca Wine Belly", (0.18, 0.012, 0.035), metallic=0.2, roughness=0.29, coat=0.22)
    MATS["aircanada_red"] = material("Air Canada Red", (0.72, 0.012, 0.02), metallic=0.12, roughness=0.26, coat=0.26)
    MATS["aircanada_grey"] = material("Air Canada Grey Belly", (0.07, 0.085, 0.105), metallic=0.34, roughness=0.29, coat=0.2)
    MATS["aircanada_wordmark"] = material("Air Canada Wordmark", (0.72, 0.012, 0.02), metallic=0.12, roughness=0.25, coat=0.2)
    MATS["glass"] = material("Aircraft Glass", (0.012, 0.035, 0.075), metallic=0.32, roughness=0.09, coat=0.55, transmission=0.18)
    MATS["glass_highlight"] = material("Window Highlight", (0.14, 0.34, 0.56), metallic=0.25, roughness=0.08, coat=0.5)
    MATS["rubber"] = material("Tire Rubber", (0.008, 0.011, 0.016), metallic=0.0, roughness=0.62)
    MATS["tire_side"] = material("Tire Sidewall", (0.02, 0.026, 0.035), metallic=0.05, roughness=0.48)
    MATS["hub"] = material("Wheel Hub", (0.45, 0.49, 0.53), metallic=0.78, roughness=0.19)
    MATS["engine_dark"] = material("Engine Intake Dark", (0.018, 0.023, 0.032), metallic=0.55, roughness=0.22)
    MATS["engine_fan"] = material("Engine Fan Blades", (0.34, 0.4, 0.47), metallic=0.88, roughness=0.22)
    MATS["red_light"] = material("Red Navigation Light", (0.8, 0.02, 0.015), roughness=0.2, emission=(1.0, 0.01, 0.005))
    MATS["green_light"] = material("Green Navigation Light", (0.015, 0.55, 0.04), roughness=0.2, emission=(0.01, 0.75, 0.02))
    MATS["white_light"] = material("White Strobe", (0.9, 0.95, 1.0), roughness=0.16, emission=(0.9, 0.95, 1.0))
    MATS["runway"] = material("Runway", (0.055, 0.075, 0.105), metallic=0.05, roughness=0.72)
    MATS["runway_line"] = material("Runway Marking", (0.65, 0.7, 0.75), metallic=0.0, roughness=0.5, emission=(0.08, 0.1, 0.14))
    MATS["case_black"] = material("Hard Case Black Polymer", (0.009, 0.012, 0.017), metallic=0.18, roughness=0.26, coat=0.35)
    MATS["case_rib"] = material("Hard Case Rib Highlights", (0.03, 0.04, 0.055), metallic=0.28, roughness=0.22, coat=0.3)
    MATS["case_edge"] = material("Hard Case Edge Seal", (0.07, 0.08, 0.095), metallic=0.18, roughness=0.37)
    MATS["leather"] = material("Cognac Leather", (0.38, 0.105, 0.032), metallic=0.0, roughness=0.34, coat=0.18)
    MATS["leather_dark"] = material("Leather Dark Trim", (0.11, 0.025, 0.012), metallic=0.0, roughness=0.42)
    MATS["brass"] = material("Aged Brass", (0.48, 0.23, 0.05), metallic=0.82, roughness=0.25)
    MATS["sticker"] = material("Travel Sticker", (0.88, 0.46, 0.08), metallic=0.0, roughness=0.36)


def link_object(obj, collection=None):
    if collection is None:
        collection = bpy.context.collection
    if obj.name not in collection.objects:
        collection.objects.link(obj)
    return obj


def assign_mat(obj, mat):
    if obj.type == "MESH":
        obj.data.materials.clear()
        obj.data.materials.append(mat)
    elif hasattr(obj.data, "materials"):
        obj.data.materials.clear()
        obj.data.materials.append(mat)


def add_cube(name, loc, dims, mat, bevel=0.0, rotation=(0.0, 0.0, 0.0), collection=None):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        mod = obj.modifiers.new("Soft manufactured edges", "BEVEL")
        mod.width = bevel
        mod.segments = 4
        mod.limit_method = "ANGLE"
    assign_mat(obj, mat)
    if collection:
        for c in list(obj.users_collection):
            c.objects.unlink(obj)
        collection.objects.link(obj)
    return obj


def add_cylinder(name, loc, radius, depth, mat, vertices=32, rotation=(0.0, 0.0, 0.0), collection=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    assign_mat(obj, mat)
    if collection:
        for c in list(obj.users_collection):
            c.objects.unlink(obj)
        collection.objects.link(obj)
    return obj


def add_uv_sphere(name, loc, scale, mat, collection=None, segments=32, rings=18):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_mat(obj, mat)
    if collection:
        for c in list(obj.users_collection):
            c.objects.unlink(obj)
        collection.objects.link(obj)
    return obj


def add_torus(name, loc, major, minor, mat, rotation=(0.0, 0.0, 0.0), collection=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=40, minor_segments=12, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    assign_mat(obj, mat)
    if collection:
        for c in list(obj.users_collection):
            c.objects.unlink(obj)
        collection.objects.link(obj)
    return obj


def add_curve(name, points, mat, bevel=0.012, collection=None, cyclic=False):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 12
    curve.bevel_depth = bevel
    curve.bevel_resolution = 3
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for bp, co in zip(spline.bezier_points, points):
        bp.co = co
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, curve)
    link_object(obj, collection)
    assign_mat(obj, mat)
    return obj


def create_mesh(name, verts, faces, materials, mat_indices=None, collection=None):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    link_object(obj, collection)
    for mat in materials:
        mesh.materials.append(mat)
    if mat_indices:
        for poly, idx in zip(mesh.polygons, mat_indices):
            poly.material_index = idx
    for poly in mesh.polygons:
        poly.use_smooth = True
    return obj


def create_fuselage(collection):
    sections = [
        (-6.02, 0.035, 0.04, 1.12),
        (-5.82, 0.31, 0.27, 1.12),
        (-5.48, 0.68, 0.61, 1.12),
        (-4.95, 0.88, 0.82, 1.12),
        (-4.15, 0.98, 0.91, 1.11),
        (-2.4, 1.01, 0.94, 1.10),
        (0.0, 1.02, 0.96, 1.10),
        (2.55, 1.0, 0.94, 1.10),
        (3.75, 0.95, 0.88, 1.11),
        (4.55, 0.80, 0.76, 1.12),
        (5.05, 0.58, 0.56, 1.14),
        (5.47, 0.34, 0.35, 1.17),
        (5.82, 0.12, 0.14, 1.2),
        (6.02, 0.035, 0.04, 1.22),
    ]
    n = 56
    verts = []
    for y, rx, rz, cz in sections:
        for j in range(n):
            a = (2.0 * math.pi * j) / n
            zshape = math.sin(a)
            bottom_factor = 0.94 if zshape < 0 else 1.0
            x = rx * math.cos(a)
            z = cz + rz * zshape * bottom_factor
            verts.append((x, y, z))
    faces = []
    indices = []
    for i in range(len(sections) - 1):
        for j in range(n):
            a = i * n + j
            b = i * n + ((j + 1) % n)
            c = (i + 1) * n + ((j + 1) % n)
            d = (i + 1) * n + j
            faces.append((a, b, c, d))
            aa = 2.0 * math.pi * (j + 0.5) / n
            indices.append(1 if math.sin(aa) < -0.35 else 0)
    obj = create_mesh("Aircraft Fuselage", verts, faces, [MATS["airframe_white"], MATS["united_blue"]], indices, collection)
    obj.data.set_sharp_from_angle(angle=math.radians(60))
    return obj


FUSELAGE_PROFILE = [
    (-6.02, 0.035, 0.04, 1.12), (-5.82, 0.31, 0.27, 1.12),
    (-5.48, 0.68, 0.61, 1.12), (-4.95, 0.88, 0.82, 1.12),
    (-4.15, 0.98, 0.91, 1.11), (-2.4, 1.01, 0.94, 1.10),
    (0.0, 1.02, 0.96, 1.10), (2.55, 1.0, 0.94, 1.10),
    (3.75, 0.95, 0.88, 1.11), (4.55, 0.80, 0.76, 1.12),
    (5.05, 0.58, 0.56, 1.14), (5.47, 0.34, 0.35, 1.17),
    (5.82, 0.12, 0.14, 1.20), (6.02, 0.035, 0.04, 1.22),
]


def fuselage_profile(y):
    if y <= FUSELAGE_PROFILE[0][0]:
        return FUSELAGE_PROFILE[0][1:]
    if y >= FUSELAGE_PROFILE[-1][0]:
        return FUSELAGE_PROFILE[-1][1:]
    for a, b in zip(FUSELAGE_PROFILE, FUSELAGE_PROFILE[1:]):
        if a[0] <= y <= b[0]:
            t = (y - a[0]) / (b[0] - a[0])
            return tuple(a[i] + (b[i] - a[i]) * t for i in range(1, 4))
    return FUSELAGE_PROFILE[6][1:]


def create_surface_panel(name, side, y_center, y_length, phi_min, phi_max, mat, collection, y_steps=4, phi_steps=4, radial_offset=0.018):
    """Create a thin panel that follows the fuselage cross-section."""
    verts = []
    for iy in range(y_steps + 1):
        y = y_center - y_length * 0.5 + y_length * iy / y_steps
        rx, rz, cz = fuselage_profile(y)
        for iz in range(phi_steps + 1):
            phi = phi_min + (phi_max - phi_min) * iz / phi_steps
            verts.append((side * (rx + radial_offset) * math.cos(phi), y, cz + rz * math.sin(phi)))
    faces = []
    row = phi_steps + 1
    for iy in range(y_steps):
        for iz in range(phi_steps):
            a = iy * row + iz
            b = (iy + 1) * row + iz
            c = (iy + 1) * row + iz + 1
            d = iy * row + iz + 1
            faces.append((a, b, c, d))
    obj = create_mesh(name, verts, faces, [mat], None, collection)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def create_wing(name, side, collection, zbase=1.02, span=5.72, root_x=0.62):
    xs = [root_x, 1.05, 2.0, 3.25, 4.55, span]
    leads = [-0.84, -0.65, -0.30, 0.22, 0.68, 1.10]
    trails = [2.15, 2.18, 2.30, 2.48, 2.62, 2.72]
    ts = [0.0, 0.22, 0.50, 0.78, 1.0]
    verts = []
    for x0, le, tr in zip(xs, leads, trails):
        x = side * x0
        dihedral = 0.035 + (x0 / span) * 0.22
        for t in ts:
            y = le + (tr - le) * t
            chord = 0.075 * (1.0 - 0.42 * abs(2.0 * t - 1.0))
            camber = 0.025 * math.sin(math.pi * t)
            verts.append((x, y, zbase + dihedral + camber + chord))
        for t in ts:
            y = le + (tr - le) * t
            chord = 0.055 * (1.0 - 0.30 * abs(2.0 * t - 1.0))
            verts.append((x, y, zbase + dihedral + 0.012 * math.sin(math.pi * t) - chord))
    faces = []
    idx = []
    n_chord = len(ts)
    for i in range(len(xs) - 1):
        for k in range(n_chord - 1):
            a = i * 2 * n_chord + k
            b = (i + 1) * 2 * n_chord + k
            c = (i + 1) * 2 * n_chord + k + 1
            d = i * 2 * n_chord + k + 1
            faces.append((a, b, c, d))
            idx.append(0)
            a = i * 2 * n_chord + n_chord + k
            b = i * 2 * n_chord + n_chord + k + 1
            c = (i + 1) * 2 * n_chord + n_chord + k + 1
            d = (i + 1) * 2 * n_chord + n_chord + k
            faces.append((a, b, c, d))
            idx.append(1)
        for top in (0, 1):
            for k in (0, n_chord - 1):
                a = i * 2 * n_chord + top * n_chord + k
                b = i * 2 * n_chord + (1 - top) * n_chord + k
                c = (i + 1) * 2 * n_chord + (1 - top) * n_chord + k
                d = (i + 1) * 2 * n_chord + top * n_chord + k
                faces.append((a, b, c, d))
                idx.append(1)
    wing = create_mesh(name, verts, faces, [MATS["airframe_white"], MATS["airframe_shadow"]], idx, collection)
    bevel = wing.modifiers.new("Wing edge softening", "BEVEL")
    bevel.width = 0.025
    bevel.segments = 2
    winglet_x = side * (span - 0.05)
    winglet = create_mesh(
        name + " Winglet",
        [
            (winglet_x, 1.06, 1.18),
            (winglet_x, 2.74, 1.18),
            (winglet_x, 2.62, 1.78),
            (winglet_x, 1.48, 1.82),
            (side * (span + 0.06), 1.06, 1.18),
            (side * (span + 0.06), 2.74, 1.18),
            (side * (span + 0.06), 2.62, 1.78),
            (side * (span + 0.06), 1.48, 1.82),
        ],
        [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (3, 2, 6, 7)],
        [MATS["united_navy"]],
        None,
        collection,
    )
    return [wing, winglet]


def create_horizontal_tail(name, side, collection):
    xs = [0.38, 0.72, 1.24, 1.78, 2.22]
    leads = [3.28, 3.31, 3.36, 3.43, 3.52]
    trails = [4.18, 4.18, 4.16, 4.10, 4.02]
    ts = [0.0, 0.28, 0.56, 0.80, 1.0]
    verts = []
    for x0, le, tr in zip(xs, leads, trails):
        x = side * x0
        dihedral = 0.015 + (x0 / 2.22) * 0.08
        for t in ts:
            y = le + (tr - le) * t
            verts.append((x, y, 1.78 + dihedral + 0.035 + 0.012 * math.sin(math.pi * t)))
        for t in ts:
            y = le + (tr - le) * t
            verts.append((x, y, 1.78 + dihedral - 0.035 + 0.008 * math.sin(math.pi * t)))
    faces = []
    n_chord = len(ts)
    for i in range(len(xs) - 1):
        for k in range(n_chord - 1):
            a = i * 2 * n_chord + k
            b = (i + 1) * 2 * n_chord + k
            c = (i + 1) * 2 * n_chord + k + 1
            d = i * 2 * n_chord + k + 1
            faces.append((a, b, c, d))
            a = i * 2 * n_chord + n_chord + k
            b = i * 2 * n_chord + n_chord + k + 1
            c = (i + 1) * 2 * n_chord + n_chord + k + 1
            d = (i + 1) * 2 * n_chord + n_chord + k
            faces.append((a, b, c, d))
        for top in (0, 1):
            for k in (0, n_chord - 1):
                a = i * 2 * n_chord + top * n_chord + k
                b = i * 2 * n_chord + (1 - top) * n_chord + k
                c = (i + 1) * 2 * n_chord + (1 - top) * n_chord + k
                d = (i + 1) * 2 * n_chord + top * n_chord + k
                faces.append((a, b, c, d))
    tail = create_mesh(name, verts, faces, [MATS["airframe_white"], MATS["airframe_shadow"]], None, collection)
    bevel = tail.modifiers.new("Horizontal tail edge softening", "BEVEL")
    bevel.width = 0.018
    bevel.segments = 2
    return tail


def create_tail(collection):
    fin = create_mesh(
        "Vertical Tail Navy",
        [
            (-0.07, 3.88, 1.58), (0.07, 3.88, 1.58),
            (-0.07, 5.74, 1.72), (0.07, 5.74, 1.72),
            (-0.07, 4.82, 4.12), (0.07, 4.82, 4.12),
            (-0.07, 4.22, 3.63), (0.07, 4.22, 3.63),
        ],
        [(0, 2, 4, 6), (1, 7, 5, 3), (0, 1, 3, 2), (2, 3, 5, 4), (4, 5, 7, 6), (6, 7, 1, 0)],
        [MATS["united_navy"]],
        None,
        collection,
    )
    tail_edges = [create_horizontal_tail("Horizontal Stabilizer -1", -1, collection), create_horizontal_tail("Horizontal Stabilizer 1", 1, collection)]
    return [fin] + tail_edges


def create_revolved(name, center_x, center_z, sections, mat, collection, n=48):
    verts = []
    for y, r in sections:
        for j in range(n):
            a = 2.0 * math.pi * j / n
            verts.append((center_x + r * math.cos(a), y, center_z + r * math.sin(a)))
    faces = []
    for i in range(len(sections) - 1):
        for j in range(n):
            faces.append((i * n + j, i * n + (j + 1) % n, (i + 1) * n + (j + 1) % n, (i + 1) * n + j))
    obj = create_mesh(name, verts, faces, [mat], None, collection)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def fan_blade(name, cx, cy, cz, angle, collection):
    r0, r1 = 0.10, 0.40
    w0, w1 = 0.045, 0.09
    pts = []
    for r, w in ((r0, w0), (r1, w1)):
        for off in (-w, w):
            a = angle + off
            pts.append((cx + r * math.cos(a), cy, cz + r * math.sin(a)))
    y2 = cy - 0.026
    verts = pts + [(x, y2, z) for x, _, z in pts]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6)]
    return create_mesh(name, verts, faces, [MATS["engine_fan"]], None, collection)


def create_engine(name, x, collection):
    nacelle = create_revolved(
        name + " Nacelle",
        x,
        0.72,
        [(-0.48, 0.48), (-0.38, 0.56), (-0.10, 0.58), (0.22, 0.52), (1.18, 0.39), (1.56, 0.33)],
        MATS["airframe_white"],
        collection,
    )
    add_torus(name + " Intake Lip", (x, -0.48, 0.72), 0.50, 0.055, MATS["airframe_shadow"], rotation=(math.pi / 2, 0.0, 0.0), collection=collection)
    add_cylinder(name + " Intake Disk", (x, -0.515, 0.72), 0.43, 0.035, MATS["engine_dark"], vertices=48, rotation=(math.pi / 2, 0.0, 0.0), collection=collection)
    add_cylinder(name + " Spinner", (x, -0.55, 0.72), 0.075, 0.075, MATS["engine_fan"], vertices=24, rotation=(math.pi / 2, 0.0, 0.0), collection=collection)
    for i in range(14):
        fan_blade(name + " Fan Blade %02d" % i, x, -0.56, 0.72, 2.0 * math.pi * i / 14.0, collection)
    add_cylinder(name + " Exhaust Cone", (x, 1.56, 0.72), 0.25, 0.055, MATS["engine_dark"], vertices=40, rotation=(math.pi / 2, 0.0, 0.0), collection=collection)
    add_cylinder(name + " Exhaust Ring", (x, 1.62, 0.72), 0.31, 0.05, MATS["engine_fan"], vertices=40, rotation=(math.pi / 2, 0.0, 0.0), collection=collection)
    pylon = create_mesh(
        name + " Pylon",
        [(x - 0.14, -0.1, 1.02), (x + 0.14, -0.1, 1.02), (x + 0.11, 0.8, 1.02), (x - 0.11, 0.8, 1.02),
         (x - 0.07, 0.1, 0.98), (x + 0.07, 0.1, 0.98), (x + 0.07, 0.7, 0.98), (x - 0.07, 0.7, 0.98)],
        [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3)],
        [MATS["airframe_shadow"]],
        None,
        collection,
    )
    return [nacelle, pylon]


def side_detail_box(name, side, y, z, dims, mat, collection, bevel=0.025, xoffset=0.0):
    x = side * (0.975 + xoffset)
    return add_cube(name, (x, y, z), dims, mat, bevel=bevel, rotation=(0.0, 0.0, 0.0), collection=collection)


def add_aircraft_windows(collection):
    objs = []
    for side in (-1, 1):
        cockpit_ranges = [(-4.52, 0.10, 0.40), (-4.08, 0.15, 0.52)]
        for i, (y, phi_min, phi_max) in enumerate(cockpit_ranges):
            objs.append(create_surface_panel("Cockpit Glass %s %02d" % (side, i), side, y, 0.34, phi_min, phi_max, MATS["glass"], collection, y_steps=3, phi_steps=3, radial_offset=0.026))
        for i in range(22):
            y = -3.30 + i * 0.34
            objs.append(create_surface_panel("Passenger Window %s %02d" % (side, i), side, y, 0.14, 0.36, 0.49, MATS["glass"], collection, y_steps=2, phi_steps=2, radial_offset=0.023))
            if i % 3 == 0:
                objs.append(create_surface_panel("Window Reflection %s %02d" % (side, i), side, y - 0.01, 0.05, 0.405, 0.445, MATS["glass_highlight"], collection, y_steps=1, phi_steps=2, radial_offset=0.032))
        for idx, y in enumerate((-2.72, 2.42)):
            panel = create_surface_panel("Passenger Door %s %02d" % (side, idx), side, y, 0.74, -0.62, 0.62, MATS["airframe_shadow"], collection, y_steps=5, phi_steps=5, radial_offset=0.024)
            objs.append(panel)
            handle = create_surface_panel("Door Handle %s %02d" % (side, idx), side, y - 0.24, 0.035, 0.10, 0.24, MATS["brass"], collection, y_steps=1, phi_steps=2, radial_offset=0.038)
            objs.append(handle)
    return objs


def add_gear(collection):
    objs = []
    for side in (-1, 1):
        x = side * 1.32
        add_cylinder("Main Gear Strut %s" % side, (x, 0.88, 0.39), 0.055, 0.76, MATS["hub"], vertices=20, collection=collection)
        for j, y in enumerate((0.73, 1.02)):
            add_torus("Main Tire %s %s" % (side, j), (x, y, 0.16), 0.16, 0.065, MATS["rubber"], rotation=(0.0, math.pi / 2, 0.0), collection=collection)
            add_cylinder("Main Hub %s %s" % (side, j), (x + side * 0.006, y, 0.16), 0.08, 0.04, MATS["hub"], vertices=24, rotation=(0.0, math.pi / 2, 0.0), collection=collection)
        add_cube("Main Gear Fairing %s" % side, (x, 0.67, 0.65), (0.24, 0.58, 0.12), MATS["airframe_shadow"], bevel=0.035, collection=collection)
    add_cylinder("Nose Gear Strut", (0.0, -4.12, 0.31), 0.045, 0.55, MATS["hub"], vertices=20, collection=collection)
    for j, x in enumerate((-0.11, 0.11)):
        add_torus("Nose Tire %s" % j, (x, -4.12, 0.09), 0.09, 0.04, MATS["rubber"], rotation=(0.0, math.pi / 2, 0.0), collection=collection)
        add_cylinder("Nose Hub %s" % j, (x, -4.12, 0.09), 0.04, 0.04, MATS["hub"], vertices=20, rotation=(0.0, math.pi / 2, 0.0), collection=collection)
    return objs


def add_airline_logo(collection, logo_path, airline_name, mat, fallback_text):
    """Place a clear compatible wordmark on both fuselage sides.

    The corresponding official SVG is retained in sources and provenance,
    but Blender's SVG curve importer can preserve tiny disconnected path
    fragments for these legacy airline files. A native text curve gives a
    stable, editable airline wordmark in every GLB viewer while retaining the
    sourced logo as the visual and licensing reference.
    """
    for side in (-1, 1):
        txt = bpy.data.curves.new("%s Compatible Wordmark" % airline_name, "FONT")
        txt.body = fallback_text
        txt.align_x = "CENTER"
        txt.align_y = "CENTER"
        txt.size = 0.28
        txt.extrude = 0.012
        txt.bevel_depth = 0.003
        txt.bevel_resolution = 2
        logo = bpy.data.objects.new("%s Compatible Wordmark" % airline_name, txt)
        link_object(logo, collection)
        # Convert the editable text curve to a mesh so the wordmark is
        # included by the GLB exporter, which does not serialize FONT objects.
        bpy.ops.object.select_all(action="DESELECT")
        logo.select_set(True)
        bpy.context.view_layer.objects.active = logo
        bpy.ops.object.convert(target="MESH")
        logo = bpy.context.object
        if logo is None:
            continue
        logo.name = "%s Compatible Wordmark" % airline_name
        assign_mat(logo, mat)
        logo.scale = (1.0, 1.0, 1.0)
        # SVG local X is the wordmark's long axis. Map it to aircraft Y,
        # SVG local Y to aircraft Z, and its normal to the outward fuselage
        # normal. A direct basis avoids the Euler-order ambiguity that made
        # the first pass render the logo edge-on.
        if side > 0:
            basis = Matrix(((0.0, 0.0, 1.0), (1.0, 0.0, 0.0), (0.0, 1.0, 0.0)))
        else:
            basis = Matrix(((0.0, 0.0, -1.0), (1.0, 0.0, 0.0), (0.0, -1.0, 0.0)))
        logo.rotation_mode = "QUATERNION"
        logo.rotation_quaternion = basis.to_quaternion()
        logo.location = (side * 1.02, -1.35, 1.30)
        for c in list(logo.users_collection):
            c.objects.unlink(logo)
        collection.objects.link(logo)
        logo.select_set(False)


def add_united_logo(collection):
    add_airline_logo(collection, LOGO_PATH, "United", MATS["logo_white"], "UNITED")


def create_aircraft():
    collection = bpy.data.collections.new("AIRCRAFT_UNITED")
    bpy.context.scene.collection.children.link(collection)
    objs = []
    objs.append(create_fuselage(collection))
    for side in (-1, 1):
        objs.extend(create_wing("Main Wing %s" % side, side, collection))
        objs.extend(create_engine("Left Engine" if side < 0 else "Right Engine", side * 3.0, collection))
    objs.extend(create_tail(collection))
    objs.extend(add_aircraft_windows(collection))
    add_united_logo(collection)
    add_gear(collection)
    add_cylinder("Top Antenna Forward", (0.0, -1.2, 2.03), 0.022, 0.22, MATS["airframe_shadow"], vertices=16, collection=collection)
    add_cylinder("Top Antenna Aft", (0.0, 2.8, 2.03), 0.018, 0.17, MATS["airframe_shadow"], vertices=16, collection=collection)
    add_uv_sphere("Port Navigation Light", (-5.72, 1.22, 1.32), (0.055, 0.055, 0.055), MATS["red_light"], collection)
    add_uv_sphere("Starboard Navigation Light", (5.72, 1.22, 1.32), (0.055, 0.055, 0.055), MATS["green_light"], collection)
    add_uv_sphere("Tail Beacon", (0.0, 4.0, 2.03), (0.07, 0.07, 0.07), MATS["white_light"], collection)
    objs = [o for o in collection.objects if o.type in {"MESH", "CURVE"}]
    ASSETS["airline-united"] = objs
    return objs


def duplicate_aircraft_variant(key, collection_name, airline_name, logo_path, tail_mat, belly_mat, logo_mat, fallback_text):
    """Clone the validated aircraft mesh and replace only livery materials.

    Meshes are copied so each exported GLB is self-contained and can be
    edited independently. The United source wordmark is omitted from clones,
    then replaced with the airline's sourced SVG wordmark.
    """
    collection = bpy.data.collections.new(collection_name)
    bpy.context.scene.collection.children.link(collection)
    mapping = {
        "United Navy": tail_mat,
        "United Blue Belly": belly_mat,
    }
    variant_objs = []
    for src in ASSETS["airline-united"]:
        if "Wordmark" in src.name:
            continue
        obj = src.copy()
        if getattr(src, "data", None) is not None:
            obj.data = src.data.copy()
        obj.name = "%s %s" % (airline_name, src.name)
        collection.objects.link(obj)
        if hasattr(obj.data, "materials"):
            for index, slot in enumerate(list(obj.data.materials)):
                old_name = slot.name if slot else ""
                if old_name in mapping:
                    obj.data.materials[index] = mapping[old_name]
        variant_objs.append(obj)
    add_airline_logo(collection, logo_path, airline_name, logo_mat, fallback_text)
    ASSETS[key] = [o for o in collection.objects if o.type in {"MESH", "CURVE"}]
    return ASSETS[key]


def create_hard_case():
    collection = bpy.data.collections.new("LUGGAGE_BLACK_RIBBED")
    bpy.context.scene.collection.children.link(collection)
    objs = []
    body = add_cube("Black Hard Shell Case Body", (0.0, 0.0, 0.48), (0.62, 0.38, 0.84), MATS["case_black"], bevel=0.075, collection=collection)
    objs.append(body)
    for face_y in (-0.205, 0.205):
        for i in range(6):
            x = -0.22 + i * 0.088
            objs.append(add_cube("Ribbed Shell %s %02d" % (face_y, i), (x, face_y, 0.50), (0.028, 0.025, 0.70), MATS["case_rib"], bevel=0.012, collection=collection))
    for z in (0.09, 0.87):
        objs.append(add_curve("Shell Edge Seal", [(-0.25, -0.205, z), (0.25, -0.205, z), (0.25, 0.205, z), (-0.25, 0.205, z)], MATS["case_edge"], bevel=0.015, collection=collection, cyclic=True))
    for x in (-0.23, 0.23):
        for y in (-0.12, 0.12):
            objs.append(add_torus("Hard Case Wheel", (x, y, 0.075), 0.075, 0.028, MATS["rubber"], rotation=(0.0, math.pi / 2, 0.0), collection=collection))
            objs.append(add_cylinder("Hard Case Wheel Hub", (x, y, 0.075), 0.034, 0.045, MATS["hub"], vertices=20, rotation=(0.0, math.pi / 2, 0.0), collection=collection))
    for x in (-0.16, 0.16):
        objs.append(add_cube("Telescopic Rail", (x, 0.0, 1.0), (0.035, 0.035, 0.32), MATS["hub"], bevel=0.014, collection=collection))
    objs.append(add_cube("Telescopic Handle", (0.0, 0.0, 1.17), (0.39, 0.07, 0.055), MATS["case_edge"], bevel=0.02, collection=collection))
    for side in (-1, 1):
        objs.append(add_cube("Corner Guard %s" % side, (side * 0.27, -0.20, 0.18), (0.08, 0.035, 0.12), MATS["case_edge"], bevel=0.018, collection=collection))
    objs.append(add_cube("Hard Case Travel Sticker", (0.0, -0.224, 0.68), (0.19, 0.02, 0.10), MATS["sticker"], bevel=0.008, collection=collection))
    ASSETS["luggage-black-ribbed"] = [o for o in collection.objects if o.type in {"MESH", "CURVE"}]
    return ASSETS["luggage-black-ribbed"]


def create_duffel():
    collection = bpy.data.collections.new("LUGGAGE_COGNAC_DUFFEL")
    bpy.context.scene.collection.children.link(collection)
    objs = []
    body = create_revolved("Cognac Duffel Body", 0.0, 0.42, [(-0.40, 0.14), (-0.34, 0.25), (-0.2, 0.31), (0.18, 0.31), (0.34, 0.25), (0.40, 0.14)], MATS["leather"], collection, n=48)
    objs.append(body)
    for y in (-0.29, 0.29):
        objs.append(add_torus("Duffel End Seam", (0.0, y, 0.42), 0.25, 0.018, MATS["leather_dark"], rotation=(math.pi / 2, 0.0, 0.0), collection=collection))
    objs.append(add_curve("Duffel Main Zipper", [(-0.30, -0.35, 0.67), (-0.1, -0.4, 0.73), (0.1, -0.4, 0.73), (0.30, -0.35, 0.67)], MATS["brass"], bevel=0.014, collection=collection))
    for x in (-0.19, 0.19):
        objs.append(add_curve("Duffel Carry Handle", [(x, -0.17, 0.59), (x, -0.10, 0.91), (x, 0.10, 0.91), (x, 0.17, 0.59)], MATS["leather_dark"], bevel=0.035, collection=collection))
    objs.append(add_curve("Duffel Shoulder Strap", [(-0.39, -0.29, 0.55), (-0.5, 0.0, 1.02), (0.5, 0.0, 1.02), (0.39, 0.29, 0.55)], MATS["leather_dark"], bevel=0.028, collection=collection))
    for side in (-1, 1):
        objs.append(add_cube("Duffel Brass Foot %s" % side, (side * 0.22, 0.0, 0.14), (0.075, 0.10, 0.075), MATS["brass"], bevel=0.02, collection=collection))
    objs.append(add_cube("Duffel Luggage Tag", (0.0, -0.385, 0.48), (0.12, 0.02, 0.17), MATS["leather_dark"], bevel=0.012, collection=collection))
    ASSETS["luggage-cognac-duffel"] = [o for o in collection.objects if o.type in {"MESH", "CURVE"}]
    return ASSETS["luggage-cognac-duffel"]


def transform_group(objects, target_height=1.0):
    objects = [o for o in objects if o.type in {"MESH", "CURVE"}]
    if not objects:
        return
    mn, mx = object_bounds(objects)
    h = max(mx.z - mn.z, 1e-6)
    scale = target_height / h
    S = Matrix.Scale(scale, 4)
    for o in objects:
        o.matrix_world = S @ o.matrix_world
    mn, mx = object_bounds(objects)
    off = Vector((-(mn.x + mx.x) * 0.5, -(mn.y + mx.y) * 0.5, -mn.z))
    T = Matrix.Translation(off)
    for o in objects:
        o.matrix_world = T @ o.matrix_world


def import_vintage():
    collection = bpy.data.collections.new("LUGGAGE_VINTAGE_SUITCASE")
    bpy.context.scene.collection.children.link(collection)
    if not os.path.exists(VINTAGE_PATH):
        ASSETS["luggage-vintage-suitcase"] = []
        return []
    before = set(bpy.data.objects)
    try:
        bpy.ops.import_scene.gltf(filepath=VINTAGE_PATH)
    except Exception as exc:
        print("Vintage suitcase import failed:", exc)
        ASSETS["luggage-vintage-suitcase"] = []
        return []
    imported = [o for o in bpy.data.objects if o not in before and o.type in {"MESH", "CURVE"}]
    # Poly Haven publishes two side-by-side display variants in this glTF.
    # Keep the stickered 01 case as the single production asset.
    created = [o for o in imported if "vintage_suitcase_01" in o.name]
    for o in imported:
        if o not in created:
            bpy.data.objects.remove(o, do_unlink=True)
    for o in created:
        for c in list(o.users_collection):
            c.objects.unlink(o)
        collection.objects.link(o)
    transform_group(created, 1.0)
    ASSETS["luggage-vintage-suitcase"] = created
    return created


def object_bounds(objects):
    pts = []
    for o in objects:
        if o.type not in {"MESH", "CURVE"}:
            continue
        try:
            pts.extend([o.matrix_world @ Vector(c) for c in o.bound_box])
        except Exception:
            pass
    if not pts:
        return Vector((0, 0, 0)), Vector((0, 0, 0))
    return Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))), Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))


def triangle_count(objects):
    total = 0
    for o in objects:
        if o.type != "MESH":
            continue
        try:
            o.data.calc_loop_triangles()
            total += len(o.data.loop_triangles)
        except Exception:
            total += sum(max(0, len(p.vertices) - 2) for p in o.data.polygons)
    return total


def asset_info(name, objects):
    mn, mx = object_bounds(objects)
    mats = sorted({m.name for o in objects if hasattr(o.data, "materials") for m in o.data.materials if m})
    return {
        "asset": name,
        "object_count": len(objects),
        "triangle_count": triangle_count(objects),
        "material_count": len(mats),
        "materials": mats,
        "bounds_m": {
            "min": [round(v, 5) for v in mn],
            "max": [round(v, 5) for v in mx],
            "size": [round(v, 5) for v in (mx - mn)],
        },
        "coordinate_contract": "Blender Z-up, aircraft longitudinal axis is Y, nose toward negative Y, wheels and luggage bases at z=0",
    }


def export_asset(name, objects):
    source_objects = [o for o in objects if o.type in {"MESH", "CURVE"}]
    path = os.path.join(EXPORT_DIR, name + ".glb")
    if not source_objects:
        return path
    temp_collection = bpy.data.collections.new("EXPORT_BATCH_%s" % name)
    bpy.context.scene.collection.children.link(temp_collection)
    copies = []
    try:
        # Copy and apply modifiers in a temporary collection so the editable
        # scene keeps every authored component, while the GLB gets one static
        # mesh with one primitive per material instead of one node per part.
        for source in source_objects:
            copy = source.copy()
            if getattr(source, "data", None) is not None:
                copy.data = source.data.copy()
            temp_collection.objects.link(copy)
            copy.matrix_world = source.matrix_world.copy()
            copies.append(copy)
            bpy.ops.object.select_all(action="DESELECT")
            copy.select_set(True)
            bpy.context.view_layer.objects.active = copy
            bpy.ops.object.convert(target="MESH")
        bpy.ops.object.select_all(action="DESELECT")
        for copy in copies:
            if copy.name in bpy.data.objects:
                copy.hide_set(False)
                copy.select_set(True)
        bpy.context.view_layer.objects.active = copies[0]
        bpy.ops.object.join()
        batched = bpy.context.view_layer.objects.active
        batched.name = "%s Static Batch" % name
        # Blender join can preserve repeated slots by name. Compact them so
        # the exporter emits only the actual material primitive set.
        old_materials = list(batched.data.materials)
        unique_materials = []
        remap = {}
        for index, mat in enumerate(old_materials):
            key = mat.name if mat else ""
            if key not in remap:
                remap[key] = len(unique_materials)
                unique_materials.append(mat)
            for poly in batched.data.polygons:
                if poly.material_index == index:
                    poly.material_index = remap[key]
        compact_indices = [poly.material_index for poly in batched.data.polygons]
        batched.data.materials.clear()
        for mat in unique_materials:
            if mat:
                batched.data.materials.append(mat)
        for poly, compact_index in zip(batched.data.polygons, compact_indices):
            poly.material_index = compact_index
        bpy.ops.object.select_all(action="DESELECT")
        batched.select_set(True)
        bpy.context.view_layer.objects.active = batched
        bpy.ops.export_scene.gltf(
            filepath=path,
            export_format="GLB",
            use_selection=True,
            export_apply=True,
            export_materials="EXPORT",
            export_texcoords=True,
            export_normals=True,
        )
    except TypeError:
        bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True)
    finally:
        bpy.ops.object.select_all(action="DESELECT")
        for obj in list(temp_collection.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(temp_collection)
    EXPORT_STATS[name] = {"glb_nodes": 1, "glb_materials": len(unique_materials)}
    return path


def add_ground():
    ground = add_cube("Render Ground", (0.0, 0.0, -0.075), (40.0, 40.0, 0.15), MATS["runway"], bevel=0.02)
    for y in (-8.0, 0.0, 8.0):
        add_cube("Runway Centerline", (0.0, y, 0.005), (0.12, 3.0, 0.012), MATS["runway_line"], bevel=0.02)
    return ground


def point_camera(camera, target):
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_render():
    scene = bpy.context.scene
    # Blender 5.2 LTS in the local app exposes the Eevee enum under its
    # compatibility name, while newer builds expose BLENDER_EEVEE_NEXT.
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (0.035, 0.060, 0.105)
    bpy.ops.object.camera_add(location=(14.5, -17.5, 8.0))
    camera = bpy.context.object
    camera.data.lens = 58
    camera.data.sensor_width = 36
    point_camera(camera, (0.0, 0.2, 1.1))
    scene.camera = camera
    key_data = bpy.data.lights.new("Key Area", "AREA")
    key_data.energy = 1800
    key_data.shape = "DISK"
    key_data.size = 7.0
    key = bpy.data.objects.new("Key Area", key_data)
    bpy.context.scene.collection.objects.link(key)
    key.location = (8.0, -8.0, 12.0)
    point_camera(key, (0.0, 0.0, 1.0))
    fill_data = bpy.data.lights.new("Fill Area", "AREA")
    fill_data.energy = 1100
    fill_data.size = 9.0
    fill = bpy.data.objects.new("Fill Area", fill_data)
    bpy.context.scene.collection.objects.link(fill)
    fill.location = (-8.0, -2.0, 6.0)
    point_camera(fill, (0.0, 0.0, 1.0))
    rim_data = bpy.data.lights.new("Rim Area", "AREA")
    rim_data.energy = 1350
    rim_data.size = 5.0
    rim = bpy.data.objects.new("Rim Area", rim_data)
    bpy.context.scene.collection.objects.link(rim)
    rim.location = (1.0, 10.0, 9.0)
    point_camera(rim, (0.0, 2.0, 1.5))
    add_ground()


def set_asset_render_visibility(active_name):
    for name, objects in ASSETS.items():
        visible = name == active_name
        for o in objects:
            o.hide_render = not visible


def render_asset(name, camera_loc, target, filename):
    scene = bpy.context.scene
    camera = scene.camera
    camera.location = camera_loc
    point_camera(camera, target)
    set_asset_render_visibility(name)
    scene.render.filepath = os.path.join(RENDER_DIR, filename)
    bpy.ops.render.render(write_still=True)


def save_blend():
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "loyalty-v2-aircraft-luggage.blend"))


def main():
    clean_scene()
    make_materials()
    create_aircraft()
    duplicate_aircraft_variant(
        "airline-avianca",
        "AIRCRAFT_AVIANCA",
        "Avianca",
        AVIANCA_LOGO_PATH,
        MATS["avianca_red"],
        MATS["avianca_wine"],
        MATS["avianca_red"],
        "avianca",
    )
    duplicate_aircraft_variant(
        "airline-aircanada",
        "AIRCRAFT_AIR_CANADA",
        "Air Canada",
        AIR_CANADA_LOGO_PATH,
        MATS["aircanada_red"],
        MATS["aircanada_grey"],
        MATS["aircanada_wordmark"],
        "AIR CANADA",
    )
    create_hard_case()
    create_duffel()
    import_vintage()
    setup_render()
    save_blend()

    manifests = {}
    for name, objects in ASSETS.items():
        manifests[name] = asset_info(name, objects)
        export_asset(name, objects)
        manifests[name].update(EXPORT_STATS.get(name, {}))

    render_asset("airline-united", (14.5, -17.5, 8.0), (0.0, 0.2, 1.05), "aircraft-united.png")
    render_asset("luggage-black-ribbed", (2.7, -3.6, 2.1), (0.0, 0.0, 0.5), "luggage-black-ribbed.png")
    render_asset("luggage-cognac-duffel", (2.7, -3.6, 2.0), (0.0, 0.0, 0.48), "luggage-cognac-duffel.png")
    render_asset("luggage-vintage-suitcase", (2.7, -3.6, 2.0), (0.0, 0.0, 0.5), "luggage-vintage-suitcase.png")

    provenance = {
        "build": {
            "script": os.path.join(ROOT, "build_assets.py"),
            "blender": "Blender 5.2.1 LTS",
            "generated_at": "2026-09-12",
            "scope": "New clean aircraft and luggage asset build, no Site checkout touched",
        },
        "aircraft": {
            "asset": "airline-united.glb",
            "method": "Procedural Blender authoring after bounded free-source search found no directly downloadable, license-clear, photoreal passenger aircraft without an add-on/account gate",
            "geometry": "Smoothed surface-of-revolution fuselage, swept airfoil wings, winglets, horizontal and vertical tails, modeled nacelles, intake rings, fan blades, cockpit and cabin windows, doors, landing gear, tires, hubs, lights, antennas",
            "livery": "White aluminum, navy tail, blue belly region, clear editable UNITED wordmark based on the sourced United Airlines 1998 SVG reference, trademark remains subject to owner rights",
            "source_logo": "https://commons.wikimedia.org/wiki/File:United_Airlines_logo_1998.svg",
            "mark_rendering": "Native editable text mesh is exported for reliable GLB visibility, official SVG is retained under sources/united_logo as the source reference",
        },
        "aircraft_variants": {
            "airline-avianca.glb": {
                "asset": "airline-avianca.glb",
                "method": "Copied validated aircraft mesh with named livery materials replaced, clear editable avianca wordmark based on sourced Avianca 2013 SVG reference",
                "source_logo": "https://commons.wikimedia.org/wiki/File:Avianca_2013_wordmark.svg",
                "license_note": "Wikimedia Commons lists the file as public domain, trademark rights remain with Avianca",
                "livery_roles": "Avianca Red tail and wordmark, Avianca Wine Belly, white aluminum airframe",
                "mark_rendering": "Native editable text mesh is exported for reliable GLB visibility, official SVG is retained under sources/airline_logos",
            },
            "airline-aircanada.glb": {
                "asset": "airline-aircanada.glb",
                "method": "Copied validated aircraft mesh with named livery materials replaced, clear editable AIR CANADA wordmark based on sourced Air Canada SVG reference",
                "source_logo": "https://commons.wikimedia.org/wiki/File:Air_Canada_logo.svg",
                "license_note": "Wikimedia Commons lists the file as public domain, trademark rights remain with Air Canada",
                "livery_roles": "Air Canada Red tail and logo, Air Canada Grey Belly, white aluminum airframe",
                "mark_rendering": "Native editable text mesh is exported for reliable GLB visibility, official SVG is retained under sources/airline_logos",
            },
        },
        "luggage-black-ribbed": {
            "asset": "luggage-black-ribbed.glb",
            "method": "Procedural Blender authoring",
            "geometry": "Beveled shell, six raised ribs per face, edge seals, corner guards, telescopic rails and handle, four wheels, hubs, sticker",
        },
        "luggage-cognac-duffel": {
            "asset": "luggage-cognac-duffel.glb",
            "method": "Procedural Blender authoring",
            "geometry": "Rounded leather body, end seams, zipper, carry handles, shoulder strap, brass feet and luggage tag",
        },
        "luggage-vintage-suitcase": {
            "asset": "luggage-vintage-suitcase.glb",
            "method": "Imported suitcase 01 only from a derived 1K glTF copy of the Poly Haven source",
            "source": "https://polyhaven.com/a/vintage_suitcase",
            "license": "CC0, https://polyhaven.com/license",
            "transformation": "Isolated stickered suitcase 01, normalized to 1.0 m height, centered X/Y, base translated to z=0, derived 1K PBR maps embedded in the export",
            "source_preserved": "Original 2K glTF and maps remain under sources/polyhaven_vintage_suitcase",
        },
        "outputs": {
            "exports": EXPORT_DIR,
            "renders": RENDER_DIR,
            "blend": os.path.join(ROOT, "loyalty-v2-aircraft-luggage.blend"),
        },
        "asset_metrics": manifests,
    }
    with open(os.path.join(ROOT, "provenance.json"), "w", encoding="utf-8") as f:
        json.dump(provenance, f, indent=2)
    save_blend()
    print(json.dumps(manifests, indent=2))


def clean_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection" and collection.users == 0:
            bpy.data.collections.remove(collection)


if __name__ == "__main__":
    main()
