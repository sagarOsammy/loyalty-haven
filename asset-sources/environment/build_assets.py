import bpy
import json
import math
import os
from mathutils import Matrix, Vector


# The temporary folder remains the default for this run, while an explicit
# override or a relocated copy can regenerate beside the script.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.environ.get("LOYALTY_ASSET_OUT_DIR", SCRIPT_DIR)
GLB_DIR = os.path.join(OUT_DIR, "glb")
RENDER_DIR = os.path.join(OUT_DIR, "renders")
os.makedirs(GLB_DIR, exist_ok=True)
os.makedirs(RENDER_DIR, exist_ok=True)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection":
            bpy.data.collections.remove(collection)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def set_input(node, names, value):
    for name in names:
        socket = node.inputs.get(name)
        if socket is not None:
            socket.default_value = value
            return


def make_material(name, color, metallic=0.0, roughness=0.45, transmission=0.0, coat=0.0, emission=None):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (*color, 1.0)
    nodes = material.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        set_input(bsdf, ["Base Color"], (*color, 1.0))
        set_input(bsdf, ["Metallic"], metallic)
        set_input(bsdf, ["Roughness"], roughness)
        set_input(bsdf, ["Transmission Weight", "Transmission"], transmission)
        set_input(bsdf, ["Coat Weight", "Clearcoat"], coat)
        if emission is not None:
            set_input(bsdf, ["Emission Color", "Emission"], (*emission, 1.0))
            set_input(bsdf, ["Emission Strength"], 1.6)
    return material


def apply_transform(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.select_set(False)


def move_to_collection(obj, collection):
    for user_collection in list(obj.users_collection):
        user_collection.objects.unlink(obj)
    collection.objects.link(obj)


def add_material(obj, material):
    if obj.data and hasattr(obj.data, "materials"):
        obj.data.materials.append(material)


def add_bevel(obj, width=0.04, segments=3):
    if obj.type != "MESH":
        return
    modifier = obj.modifiers.new("Soft bevel", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"


def smooth_mesh(obj):
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True


def add_cube(collection, name, location, dimensions, material, bevel=0.04, parent=None):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    apply_transform(obj)
    move_to_collection(obj, collection)
    add_material(obj, material)
    add_bevel(obj, bevel, 4)
    if parent:
        obj.parent = parent
    return obj


def add_uv_sphere(collection, name, location, scale, material, segments=36, rings=24, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transform(obj)
    move_to_collection(obj, collection)
    add_material(obj, material)
    smooth_mesh(obj)
    if parent:
        obj.parent = parent
    return obj


def add_cylinder(collection, name, location, radius, depth, material, vertices=48, bevel=0.025, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    apply_transform(obj)
    move_to_collection(obj, collection)
    add_material(obj, material)
    add_bevel(obj, bevel, 3)
    smooth_mesh(obj)
    if parent:
        obj.parent = parent
    return obj


def add_torus(collection, name, location, major_radius, minor_radius, material, rotation=(0.0, 0.0, 0.0), major_segments=64, minor_segments=16, parent=None):
    bpy.ops.mesh.primitive_torus_add(
        major_segments=major_segments,
        minor_segments=minor_segments,
        major_radius=major_radius,
        minor_radius=minor_radius,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    move_to_collection(obj, collection)
    add_material(obj, material)
    smooth_mesh(obj)
    if parent:
        obj.parent = parent
    return obj


def add_curve(collection, name, points, material, bevel_depth=0.025, bevel_resolution=4, cyclic=False, parent=None):
    curve = bpy.data.curves.new(name + "Curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 16
    curve.bevel_depth = bevel_depth
    curve.bevel_resolution = bevel_resolution
    curve.fill_mode = "FULL"
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for bezier_point, point in zip(spline.bezier_points, points):
        bezier_point.co = point
        bezier_point.handle_left_type = "AUTO"
        bezier_point.handle_right_type = "AUTO"
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, curve)
    collection.objects.link(obj)
    add_material(obj, material)
    if parent:
        obj.parent = parent
    return obj


def add_poly_curve(collection, name, points, material, bevel_depth=0.025, bevel_resolution=4, cyclic=False, parent=None):
    curve = bpy.data.curves.new(name + "Curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 4
    curve.bevel_depth = bevel_depth
    curve.bevel_resolution = bevel_resolution
    curve.fill_mode = "FULL"
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for curve_point, point in zip(spline.points, points):
        curve_point.co = (*point, 1.0)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, curve)
    collection.objects.link(obj)
    add_material(obj, material)
    if parent:
        obj.parent = parent
    return obj


def add_mesh(collection, name, vertices, faces, material, parent=None, bevel=0.0, smooth=False):
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    add_material(obj, material)
    if bevel:
        add_bevel(obj, bevel, 3)
    if smooth:
        smooth_mesh(obj)
    if parent:
        obj.parent = parent
    return obj


def new_asset(name):
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    root = bpy.data.objects.new(name, None)
    root.empty_display_type = "PLAIN_AXES"
    collection.objects.link(root)
    root["asset_name"] = name
    root["generator"] = "Procedural original Blender asset, no external meshes"
    return collection, root


def lathe_profile(collection, name, profile, material, sides=64, parent=None, bevel=0.025):
    vertices = []
    faces = []
    for radius, z in profile:
        for index in range(sides):
            angle = (index / sides) * math.tau
            vertices.append((math.cos(angle) * radius, math.sin(angle) * radius, z))
    for ring in range(len(profile) - 1):
        for index in range(sides):
            nxt = (index + 1) % sides
            a = ring * sides + index
            b = ring * sides + nxt
            c = (ring + 1) * sides + nxt
            d = (ring + 1) * sides + index
            faces.append((a, b, c, d))
    faces.append(tuple(range(sides - 1, -1, -1)))
    top = (len(profile) - 1) * sides
    faces.append(tuple(top + index for index in range(sides)))
    return add_mesh(collection, name, vertices, faces, material, parent=parent, bevel=bevel, smooth=True)


def leaf_mesh(collection, name, length, width, arch, material, location, direction, parent=None, segments=18):
    vertices = []
    for index in range(segments + 1):
        t = index / segments
        y = length * t
        center_z = arch * math.sin(math.pi * t) + 0.08 * math.sin(t * math.pi * 2.0)
        span = width * (math.sin(math.pi * t) ** 0.72)
        ridge = 0.08 * width * math.sin(math.pi * t)
        vertices.extend([
            (-span, y, center_z),
            (0.0, y, center_z + ridge),
            (span, y, center_z),
        ])
    faces = []
    for index in range(segments):
        current = index * 3
        following = (index + 1) * 3
        faces.extend([
            (current, following, following + 1, current + 1),
            (current + 1, following + 1, following + 2, current + 2),
        ])
    obj = add_mesh(collection, name, vertices, faces, material, parent=parent, smooth=True)
    obj.location = location
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0.0, 1.0, 0.0)).rotation_difference(Vector(direction).normalized())
    solidify = obj.modifiers.new("Leaf thickness", "SOLIDIFY")
    solidify.thickness = 0.018
    solidify.offset = 0.0
    return obj


def pinnate_leaflet(collection, name, length, width, arch, material, location, direction, parent=None, segments=5):
    """A narrow, tapered leaflet used to build an airy pinnate palm frond."""
    vertices = []
    for index in range(segments + 1):
        t = index / segments
        y = length * t
        center_z = arch * math.sin(math.pi * t)
        span = width * (math.sin(math.pi * t) ** 0.72) * (1.0 - 0.12 * t)
        ridge = 0.10 * width * math.sin(math.pi * t)
        vertices.extend([
            (-span, y, center_z),
            (0.0, y, center_z + ridge),
            (span, y, center_z),
        ])
    faces = []
    for index in range(segments):
        current = index * 3
        following = (index + 1) * 3
        faces.extend([
            (current, following, following + 1, current + 1),
            (current + 1, following + 1, following + 2, current + 2),
        ])
    obj = add_mesh(collection, name, vertices, faces, material, parent=parent, smooth=True)
    obj.location = location
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0.0, 1.0, 0.0)).rotation_difference(Vector(direction).normalized())
    # The ribbon is intentionally double-sided so the dense canopy stays
    # light enough for a single batched GLB while preserving natural angles.
    material.use_backface_culling = False
    return obj


def add_palm_frond(collection, parent, name, crown, angle, length, palm_index, frond_index, leaf_materials, rachis_material):
    """Create one arched rachis with individual left/right tapered leaflets."""
    radial = Vector((math.cos(angle), math.sin(angle), 0.0))
    lateral = Vector((-math.sin(angle), math.cos(angle), 0.0))
    crown_v = Vector(crown)

    def rachis_point(t):
        # Palm fronds lift above the crown, then roll down toward the tip.
        z = 0.34 * t + 0.20 * math.sin(math.pi * t) - 0.78 * (t ** 1.62)
        return crown_v + radial * (length * t) + Vector((0.0, 0.0, z))

    rachis_points = [tuple(rachis_point(index / 8.0)) for index in range(9)]
    add_poly_curve(collection, name + "Rachis", rachis_points, rachis_material, bevel_depth=0.026, bevel_resolution=3, parent=parent)

    leaflet_count = 34
    for side in (-1.0, 1.0):
        for leaflet_index in range(leaflet_count):
            # Leave a small naked section at the crown and keep a little air
            # between the terminal leaflets for a believable silhouette.
            t = 0.10 + 0.84 * leaflet_index / (leaflet_count - 1)
            attach = rachis_point(t)
            taper = math.sin(math.pi * ((t - 0.05) / 0.90))
            variation = 0.035 * math.sin((leaflet_index + 1) * 1.71 + frond_index * 0.67 + palm_index)
            leaflet_length = (0.34 + 0.31 * max(0.0, taper) + variation) * (0.98 + 0.04 * ((palm_index + frond_index) % 3))
            leaflet_width = 0.034 + 0.028 * max(0.0, taper)
            downward = 0.16 - 0.52 * t + 0.04 * math.sin(leaflet_index * 0.83 + frond_index)
            direction = (
                lateral * side * (0.96 - 0.10 * t)
                + radial * (0.10 + 0.16 * t)
                + Vector((0.0, 0.0, downward))
            ).normalized()
            origin = attach + radial * 0.018 + Vector((0.0, 0.0, 0.01))
            material = leaf_materials[(palm_index + frond_index + leaflet_index + (1 if side > 0 else 0)) % len(leaf_materials)]
            pinnate_leaflet(
                collection,
                "%sLeaflet%02d_%02d" % (name, int(side), leaflet_index),
                leaflet_length,
                leaflet_width,
                0.055 + 0.02 * max(0.0, taper),
                material,
                origin,
                direction,
                parent=parent,
                segments=5,
            )


def trunk(collection, parent, name, location, height, lean, material, detail_material):
    points = [
        (0.0, 0.0, 0.0),
        (lean * 0.08, 0.015, height * 0.22),
        (lean * 0.34, -0.02, height * 0.48),
        (lean * 0.72, 0.03, height * 0.74),
        (lean, 0.0, height),
    ]
    obj = add_curve(collection, name, points, material, bevel_depth=0.17, bevel_resolution=6, parent=parent)
    obj.location = location
    for index in range(1, 11):
        t = index / 11
        z = height * t
        x = lean * (t ** 1.28)
        add_torus(collection, name + "Ridge%02d" % index, (location[0] + x, location[1], location[2] + z), 0.17 - t * 0.025, 0.018, detail_material, major_segments=32, minor_segments=8, parent=parent)
    for side in (-1.0, 1.0):
        # Keep the rounded root flare tangent to the z=0 base plane.
        add_uv_sphere(collection, name + "RootFlare", (location[0] + side * 0.2, location[1], location[2] + 0.22), (0.35, 0.22, 0.22), material, segments=24, rings=16, parent=parent)
    return obj


def palm_cluster():
    collection, root = new_asset("PalmCluster")
    trunk_material = make_material("Palm trunk warm", (0.29, 0.13, 0.06), roughness=0.74)
    trunk_detail = make_material("Palm trunk ridges", (0.45, 0.23, 0.10), roughness=0.7)
    leaf_materials = [
        make_material("Palm leaf emerald", (0.025, 0.23, 0.11), roughness=0.62),
        make_material("Palm leaf sunlit", (0.08, 0.38, 0.18), roughness=0.6),
        make_material("Palm leaf teal shade", (0.02, 0.27, 0.25), roughness=0.64),
        make_material("Palm leaf olive edge", (0.10, 0.32, 0.12), roughness=0.64),
    ]
    coconut_material = make_material("Palm fruit", (0.16, 0.08, 0.035), roughness=0.55)
    palms = [
        ((-1.4, 0.15, 0.0), 4.55, 0.48, 0.92),
        ((0.1, -0.1, 0.0), 5.05, -0.36, 1.0),
        ((1.45, 0.18, 0.0), 4.2, 0.58, 0.86),
    ]
    for palm_index, (location, height, lean, scale) in enumerate(palms):
        trunk_obj = trunk(collection, root, "Palm%02dTrunk" % palm_index, location, height, lean, trunk_material, trunk_detail)
        crown_z = location[2] + height
        crown_x = location[0] + lean
        crown_y = location[1]
        for fruit_index in range(4):
            angle = (fruit_index / 4.0) * math.tau + palm_index * 0.3
            add_uv_sphere(
                collection,
                "Palm%02dFruit%02d" % (palm_index, fruit_index),
                (crown_x + math.cos(angle) * 0.28, crown_y + math.sin(angle) * 0.28, crown_z - 0.12),
                (0.12, 0.12, 0.15),
                coconut_material,
                segments=20,
                rings=12,
                parent=root,
            )
        for frond_index in range(11):
            angle = (frond_index / 11.0) * math.tau + palm_index * 0.41
            frond_length = (2.55 + 0.20 * math.sin(frond_index * 1.37 + palm_index)) * scale
            crown = (crown_x, crown_y, crown_z - 0.10 + 0.035 * (frond_index % 3))
            add_palm_frond(
                collection,
                root,
                "Palm%02dFrond%02d" % (palm_index, frond_index),
                crown,
                angle,
                frond_length,
                palm_index,
                frond_index,
                leaf_materials,
                trunk_detail,
            )
    root["base_z_m"] = 0.0
    root["height_m"] = 6.0
    root["fronds_per_trunk"] = 11
    root["leaflets_per_frond_side"] = 34
    root["foliage_style"] = "Pinnate arched fronds with individual tapered leaflets"
    root["coordinate_note"] = "Blender Z-up source, GLB exported with standard Y-up convention"
    return collection, root


def planter_cluster():
    collection, root = new_asset("TropicalPlanterCluster")
    stone = make_material("Planter ivory stone", (0.72, 0.58, 0.42), roughness=0.52)
    stone_dark = make_material("Planter shadow stone", (0.31, 0.22, 0.15), roughness=0.6)
    brass = make_material("Planter brass", (0.56, 0.29, 0.08), metallic=0.82, roughness=0.24, coat=0.45)
    soil = make_material("Planter soil", (0.075, 0.035, 0.015), roughness=0.96)
    leaves = [
        make_material("Tropical leaf deep", (0.015, 0.21, 0.10), roughness=0.63),
        make_material("Tropical leaf broad", (0.045, 0.38, 0.2), roughness=0.6),
        make_material("Tropical leaf blue green", (0.025, 0.30, 0.28), roughness=0.64),
    ]
    configs = [
        ((-1.5, 0.15, 0.0), 0.83, 2.9, 8),
        ((0.0, -0.2, 0.0), 1.0, 3.45, 10),
        ((1.55, 0.18, 0.0), 0.78, 2.65, 7),
    ]
    for planter_index, (location, radius, height, leaf_count) in enumerate(configs):
        profile = [
            (radius * 0.58, 0.0),
            (radius * 0.78, 0.09),
            (radius * 0.87, 0.25),
            (radius * 0.8, height * 0.72),
            (radius * 0.94, height * 0.9),
            (radius * 1.02, height),
        ]
        planter_body = lathe_profile(collection, "Planter%02dBody" % planter_index, profile, stone, sides=64, parent=root, bevel=0.035)
        planter_body.location = location
        add_torus(collection, "Planter%02dBase" % planter_index, (location[0], location[1], 0.08), radius * 0.63, 0.075, stone_dark, major_segments=56, minor_segments=12, parent=root)
        add_torus(collection, "Planter%02dRim" % planter_index, (location[0], location[1], height), radius * 1.02, 0.105, brass, major_segments=56, minor_segments=14, parent=root)
        add_torus(collection, "Planter%02dBand" % planter_index, (location[0], location[1], height * 0.68), radius * 0.82, 0.035, brass, major_segments=48, minor_segments=10, parent=root)
        add_cylinder(collection, "Planter%02dSoil" % planter_index, (location[0], location[1], height + 0.018), radius * 0.88, 0.06, soil, vertices=64, bevel=0.018, parent=root)
        for leaf_index in range(leaf_count):
            angle = (leaf_index / leaf_count) * math.tau + planter_index * 0.45
            layer = leaf_index % 3
            length = 1.45 + (leaf_index % 4) * 0.24
            width = 0.22 + (leaf_index % 3) * 0.07
            direction = (
                math.cos(angle) * (0.68 + 0.08 * layer),
                math.sin(angle) * (0.68 + 0.08 * layer),
                0.48 + 0.18 * ((leaf_index + planter_index) % 2),
            )
            leaf_mesh(
                collection,
                "Planter%02dLeaf%02d" % (planter_index, leaf_index),
                length,
                width,
                0.34,
                leaves[(leaf_index + planter_index) % len(leaves)],
                (location[0], location[1], height + 0.07),
                direction,
                parent=root,
                segments=18,
            )
        for stem_index in range(max(3, leaf_count // 3)):
            angle = stem_index / max(3, leaf_count // 3) * math.tau
            stem_points = [
                (location[0], location[1], height + 0.05),
                (location[0] + math.cos(angle) * 0.18, location[1] + math.sin(angle) * 0.18, height + 0.72),
                (location[0] + math.cos(angle) * 0.4, location[1] + math.sin(angle) * 0.4, height + 1.2),
            ]
            add_curve(collection, "Planter%02dStem%02d" % (planter_index, stem_index), stem_points, brass, bevel_depth=0.027, bevel_resolution=3, parent=root)
        root["cluster_base_z_m"] = 0.0
    return collection, root


def hull_mesh(collection, name, material_white, material_blue, parent=None):
    stations = [
        (-11.2, 0.16, -0.28, 0.7),
        (-10.55, 1.9, -0.78, 0.82),
        (-8.7, 3.05, -1.25, 0.92),
        (-5.4, 3.45, -1.55, 0.98),
        (-1.0, 3.55, -1.72, 1.0),
        (3.8, 3.45, -1.68, 1.0),
        (7.5, 3.2, -1.48, 0.96),
        (10.0, 2.65, -1.2, 0.86),
        (11.05, 2.05, -0.9, 0.76),
    ]
    cross = [
        (-1.0, 0.18),
        (-0.82, 0.63),
        (0.0, 1.0),
        (0.82, 0.63),
        (1.0, 0.18),
        (0.82, -0.48),
        (0.0, -1.0),
        (-0.82, -0.48),
    ]
    vertices = []
    for y, width, bottom, top in stations:
        for x_norm, z_norm in cross:
            vertices.append((x_norm * width, y, bottom + (z_norm + 1.0) * 0.5 * (top - bottom)))
    faces = []
    material_indices = []
    count = len(cross)
    for station_index in range(len(stations) - 1):
        for cross_index in range(count):
            nxt = (cross_index + 1) % count
            a = station_index * count + cross_index
            b = station_index * count + nxt
            c = (station_index + 1) * count + nxt
            d = (station_index + 1) * count + cross_index
            faces.append((a, b, c, d))
            midpoint_z = sum(vertices[index][2] for index in (a, b, c, d)) / 4.0
            material_indices.append(1 if midpoint_z < 0.02 else 0)
    obj = add_mesh(collection, name, vertices, faces, material_white, parent=parent, bevel=0.06, smooth=True)
    obj.data.materials.append(material_blue)
    for polygon, index in zip(obj.data.polygons, material_indices):
        polygon.material_index = index
    return obj


def rounded_rect_points(width, length, corner, z):
    points = []
    sections = [
        ((width - corner, length - corner), 0.0, math.pi * 0.5),
        ((-width + corner, length - corner), math.pi * 0.5, math.pi),
        ((-width + corner, -length + corner), math.pi, math.pi * 1.5),
        ((width - corner, -length + corner), math.pi * 1.5, math.tau),
    ]
    for (cx, cy), start, end in sections:
        for index in range(9):
            angle = start + (end - start) * index / 8.0
            points.append((cx + math.cos(angle) * corner, cy + math.sin(angle) * corner, z))
    return points


def deck_rail(collection, parent, name, width, length, z, material):
    outer = rounded_rect_points(width, length, 0.38, z)
    add_curve(collection, name + "Rail", outer, material, bevel_depth=0.035, bevel_resolution=3, cyclic=True, parent=parent)
    for index in range(0, len(outer), 6):
        x, y, _ = outer[index]
        add_cylinder(collection, name + "Post%02d" % index, (x, y, z - 0.48), 0.028, 0.96, material, vertices=16, bevel=0.008, parent=parent)


def ship_windows(collection, parent, material, cabin_index, z, half_width, y_start, y_end):
    positions = 8
    for index in range(positions):
        y = y_start + (y_end - y_start) * index / (positions - 1)
        for side in (-1.0, 1.0):
            add_cube(collection, "ShipCabin%02dWindow%02dSide%02d" % (cabin_index, index, int(side)), (side * (half_width + 0.015), y, z), (0.075, 0.42, 0.27), material, bevel=0.04, parent=parent)
    for index in range(6):
        x = -half_width * 0.72 + (half_width * 1.44) * index / 5.0
        add_cube(collection, "ShipCabin%02dWindow%02dFront" % (cabin_index, index), (x, y_start - 0.035, z), (0.34, 0.075, 0.27), material, bevel=0.04, parent=parent)


def yacht():
    collection, root = new_asset("LuxuryYacht")
    hull_white = make_material("Yacht hull pearl", (0.87, 0.9, 0.87), roughness=0.25, metallic=0.12, coat=0.48)
    hull_blue = make_material("Yacht waterline navy", (0.025, 0.10, 0.15), roughness=0.28, metallic=0.34, coat=0.45)
    deck_white = make_material("Yacht deck ivory", (0.93, 0.9, 0.79), roughness=0.42, coat=0.28)
    teak = make_material("Yacht teak", (0.43, 0.19, 0.07), roughness=0.58)
    teak_light = make_material("Yacht teak highlights", (0.68, 0.37, 0.13), roughness=0.52)
    glass = make_material("Yacht blue glass", (0.035, 0.17, 0.22), roughness=0.12, metallic=0.45, transmission=0.22, coat=0.85)
    metal = make_material("Yacht rail chrome", (0.55, 0.63, 0.61), roughness=0.16, metallic=0.9, coat=0.5)
    brass = make_material("Yacht warm brass", (0.64, 0.34, 0.11), roughness=0.23, metallic=0.78, coat=0.5)
    pool_water = make_material("Yacht pool water", (0.02, 0.45, 0.53), roughness=0.08, metallic=0.14, transmission=0.34, coat=0.96, emission=(0.0, 0.06, 0.08))
    orange = make_material("Yacht lifeboat orange", (0.83, 0.16, 0.05), roughness=0.34, metallic=0.15, coat=0.3)
    hull_mesh(collection, "YachtHull", hull_white, hull_blue, parent=root)
    for side in (-1.0, 1.0):
        line_points = [
            (side * 3.38, -8.3, 0.03),
            (side * 3.52, -5.1, 0.02),
            (side * 3.57, -1.0, 0.01),
            (side * 3.49, 4.0, 0.01),
            (side * 3.19, 8.3, 0.03),
        ]
        add_curve(collection, "YachtWaterline%02d" % int(side), line_points, hull_blue, bevel_depth=0.055, bevel_resolution=4, parent=root)
    decks = [
        (0.62, 3.12, 9.65),
        (1.46, 2.9, 8.0),
        (2.34, 2.52, 6.35),
        (3.26, 2.1, 4.8),
        (4.13, 1.65, 3.2),
    ]
    for deck_index, (z, half_width, half_length) in enumerate(decks):
        add_cube(collection, "YachtDeck%02d" % deck_index, (0.0, 0.85, z), (half_width * 2.0, half_length * 2.0, 0.22), deck_white, bevel=0.28, parent=root)
        add_cube(collection, "YachtTeakDeck%02d" % deck_index, (0.0, 0.85, z + 0.13), ((half_width - 0.16) * 2.0, (half_length - 0.18) * 2.0, 0.035), teak, bevel=0.12, parent=root)
        deck_rail(collection, root, "YachtDeck%02d" % deck_index, half_width - 0.12, half_length - 0.18, z + 0.6, metal)
        for stripe_index in range(-3, 4):
            y = 0.85 + stripe_index * 0.5
            add_curve(collection, "YachtTeakGrain%02d_%02d" % (deck_index, stripe_index), [(-half_width + 0.2, y, z + 0.155), (half_width - 0.2, y + 0.02, z + 0.155)], teak_light, bevel_depth=0.007, bevel_resolution=2, parent=root)
    cabin_specs = [
        (2.05, 2.35, 3.25, 1.02, 1.35),
        (2.92, 2.05, 2.62, 0.96, 1.25),
        (3.82, 1.72, 2.05, 0.86, 1.15),
    ]
    for cabin_index, (z, half_width, half_length, height, y_center) in enumerate(cabin_specs):
        add_cube(collection, "YachtCabin%02d" % cabin_index, (0.0, y_center, z), (half_width * 2.0, half_length * 2.0, height), deck_white, bevel=0.22, parent=root)
        ship_windows(collection, root, glass, cabin_index, z + 0.08, half_width, y_center - half_length * 0.72, y_center + half_length * 0.72)
        deck_rail(collection, root, "YachtCabinRail%02d" % cabin_index, half_width - 0.08, half_length - 0.12, z + height * 0.5 + 0.08, metal)
        add_cube(collection, "YachtCabinBand%02d" % cabin_index, (0.0, y_center - half_length - 0.03, z - 0.32), (half_width * 1.72, 0.05, 0.08), brass, bevel=0.025, parent=root)
    for side in (-1.0, 1.0):
        for index, y in enumerate((-1.5, 1.0, 3.3)):
            add_uv_sphere(collection, "YachtLifeboat%02d_%02d" % (int(side), index), (side * 3.16, y, 1.45), (0.72, 1.08, 0.3), orange, segments=28, rings=16, parent=root)
            add_cube(collection, "YachtLifeboatCover%02d_%02d" % (int(side), index), (side * 3.16, y, 1.7), (0.78, 1.0, 0.06), deck_white, bevel=0.06, parent=root)
    add_cube(collection, "YachtPoolRim", (0.0, -0.25, 4.6), (2.85, 3.35, 0.18), deck_white, bevel=0.28, parent=root)
    add_cube(collection, "YachtPool", (0.0, -0.25, 4.71), (2.38, 2.85, 0.08), pool_water, bevel=0.34, parent=root)
    add_torus(collection, "YachtPoolBrassTrim", (0.0, -0.25, 4.77), 1.26, 0.035, brass, rotation=(0.0, 0.0, 0.0), major_segments=56, minor_segments=10, parent=root)
    add_cube(collection, "YachtBridge", (0.0, 3.02, 4.85), (2.35, 1.75, 0.72), deck_white, bevel=0.2, parent=root)
    for index in range(7):
        x = -0.88 + index * 0.294
        add_cube(collection, "YachtBridgeWindow%02d" % index, (x, 2.12, 4.88), (0.22, 0.06, 0.29), glass, bevel=0.045, parent=root)
    add_cylinder(collection, "YachtMast", (0.0, 3.25, 6.18), 0.07, 2.25, metal, vertices=24, bevel=0.015, parent=root)
    add_torus(collection, "YachtRadar", (0.0, 3.25, 7.3), 0.34, 0.035, brass, rotation=(math.pi * 0.5, 0.0, 0.0), major_segments=40, minor_segments=10, parent=root)
    add_curve(collection, "YachtMastBrace", [(-0.8, 3.15, 5.7), (0.0, 3.25, 6.18), (0.8, 3.15, 5.7)], metal, bevel_depth=0.028, bevel_resolution=3, parent=root)
    for side in (-1.0, 1.0):
        add_curve(collection, "YachtBowRail%02d" % int(side), [(side * 0.4, -10.7, 0.85), (side * 1.7, -9.8, 1.02), (side * 2.65, -8.4, 1.12)], metal, bevel_depth=0.036, bevel_resolution=3, parent=root)
    root["waterline_z_m"] = 0.0
    root["length_y_m"] = 22.25
    root["width_x_m"] = 7.15
    root["prow_direction"] = "negative Blender Y, prow at approximately -11 m"
    return collection, root


def stadium_points(a, radius, count_per_section=24):
    points = []
    for index in range(count_per_section):
        x = -a + 2.0 * a * index / (count_per_section - 1)
        points.append((x, radius))
    for index in range(1, count_per_section):
        angle = math.pi * 0.5 - math.pi * index / (count_per_section - 1)
        points.append((a + math.cos(angle) * radius, math.sin(angle) * radius))
    for index in range(1, count_per_section):
        x = a - 2.0 * a * index / (count_per_section - 1)
        points.append((x, -radius))
    for index in range(1, count_per_section - 1):
        # Sweep the left cap through x=-a-radius.  The previous positive
        # sweep folded this cap inward and made the stadium asymmetric.
        angle = -math.pi * 0.5 - math.pi * index / (count_per_section - 1)
        points.append((-a + math.cos(angle) * radius, math.sin(angle) * radius))
    return points


def ring_mesh(collection, name, outer, inner, z_bottom, z_top, material, parent=None, bevel=0.025):
    vertices = []
    for z in (z_top, z_bottom):
        vertices.extend([(x, y, z) for x, y in outer])
        vertices.extend([(x, y, z) for x, y in inner])
    count = len(outer)
    faces = []
    for index in range(count):
        nxt = (index + 1) % count
        ot = index
        ont = nxt
        it = count + index
        int_ = count + nxt
        ob = count * 2 + index
        onb = count * 2 + nxt
        ib = count * 3 + index
        inb = count * 3 + nxt
        faces.extend([
            (ot, ont, int_, it),
            (ob, ib, inb, onb),
            (ot, ob, onb, ont),
            (it, int_, inb, ib),
        ])
    return add_mesh(collection, name, vertices, faces, material, parent=parent, bevel=bevel, smooth=True)


def baggage_belt():
    collection, root = new_asset("BaggageBelt")
    metal = make_material("Belt brushed metal", (0.28, 0.32, 0.31), metallic=0.85, roughness=0.25, coat=0.38)
    metal_dark = make_material("Belt shadow metal", (0.07, 0.11, 0.12), metallic=0.76, roughness=0.3)
    rubber = make_material("Belt dark rubber", (0.018, 0.026, 0.028), metallic=0.08, roughness=0.62)
    brass = make_material("Belt warm brass rail", (0.62, 0.32, 0.08), metallic=0.84, roughness=0.22, coat=0.44)
    planter_stone = make_material("Belt planter stone", (0.38, 0.28, 0.18), roughness=0.64)
    planter_gold = make_material("Belt planter trim", (0.71, 0.39, 0.10), metallic=0.82, roughness=0.2)
    leaf_mat = make_material("Belt planter foliage", (0.025, 0.25, 0.16), roughness=0.62)
    # The parent scene follows this exact stadium centerline.  `a` is the
    # half length of each straight, `radius` is each semicircle radius.
    # This gives a 6.0 m straight and 1.6 m cap radius, with the belt surface
    # at z=1.10 m, while the shadow skirt stays close to the requested
    # 11 m x 5 m footprint.
    outer = stadium_points(3.0, 1.95, 36)
    inner = stadium_points(2.55, 1.22, 36)
    ring_mesh(collection, "BeltMetalOuterBase", outer, inner, 0.16, 0.96, metal, parent=root, bevel=0.04)
    outer_shadow = stadium_points(3.15, 2.35, 36)
    inner_shadow = stadium_points(2.45, 1.05, 36)
    ring_mesh(collection, "BeltShadowSkirt", outer_shadow, inner_shadow, 0.05, 0.28, metal_dark, parent=root, bevel=0.035)
    path = stadium_points(3.0, 1.6, 36)
    slat_width = 0.76
    for index, (x, y) in enumerate(path):
        prev_point = path[(index - 1) % len(path)]
        next_point = path[(index + 1) % len(path)]
        tangent = Vector((next_point[0] - prev_point[0], next_point[1] - prev_point[1], 0.0)).normalized()
        length = max(0.22, math.sqrt((next_point[0] - prev_point[0]) ** 2 + (next_point[1] - prev_point[1]) ** 2) * 0.82)
        obj = add_cube(collection, "BeltRubberSlat%03d" % index, (x, y, 1.0575), (length, slat_width, 0.085), rubber, bevel=0.035, parent=root)
        obj.rotation_euler[2] = math.atan2(tangent.y, tangent.x)
    add_poly_curve(collection, "BeltOuterBrassRail", [(x, y, 1.045) for x, y in outer], brass, bevel_depth=0.045, bevel_resolution=5, cyclic=True, parent=root)
    add_poly_curve(collection, "BeltInnerBrassRail", [(x, y, 1.025) for x, y in inner], brass, bevel_depth=0.04, bevel_resolution=4, cyclic=True, parent=root)
    for rail_name, rail_path in (("Outer", outer), ("Inner", inner)):
        for index in range(0, len(rail_path), 5):
            x, y = rail_path[index]
            add_cylinder(collection, "Belt%sRailPost%03d" % (rail_name, index), (x, y, 0.785), 0.038, 0.52, brass, vertices=18, bevel=0.012, parent=root)
    for index, x in enumerate((-4.1, -2.05, 0.0, 2.05, 4.1)):
        add_cube(collection, "BeltUnderframe%02d" % index, (x, 0.0, 0.14), (0.16, 2.1, 0.24), metal_dark, bevel=0.05, parent=root)
        add_cylinder(collection, "BeltFoot%02d" % index, (x, 0.0, 0.05), 0.16, 0.1, metal, vertices=32, bevel=0.025, parent=root)
    add_cube(collection, "BeltCenterPlanterBody", (0.0, 0.0, 0.43), (7.2, 0.96, 0.68), planter_stone, bevel=0.24, parent=root)
    add_cube(collection, "BeltCenterPlanterTop", (0.0, 0.0, 0.81), (6.7, 0.64, 0.08), metal_dark, bevel=0.04, parent=root)
    add_curve(collection, "BeltCenterPlanterTrim", [(-3.32, -0.45, 0.85), (3.32, -0.45, 0.85)], planter_gold, bevel_depth=0.04, bevel_resolution=3, parent=root)
    for index in range(11):
        x = -3.18 + index * 0.636
        height = 0.18 + (index % 4) * 0.035
        direction = ((-0.14 + (index % 3) * 0.14), (-0.9 if index % 2 else 0.9), 0.18 + (index % 2) * 0.03)
        leaf_mesh(collection, "BeltPlanterLeaf%02d" % index, 0.76 + (index % 3) * 0.06, 0.15 + (index % 2) * 0.035, 0.10, leaf_mat, (x, 0.0, 0.84), direction, parent=root, segments=16)
        add_curve(collection, "BeltPlanterStem%02d" % index, [(x, 0.0, 0.82), (x + direction[0] * 0.32, direction[1] * 0.16, 0.82 + height)], planter_gold, bevel_depth=0.018, bevel_resolution=2, parent=root)
    root["footprint_x_m"] = 11.0
    root["footprint_y_m"] = 5.0
    root["height_m"] = 1.1
    root["belt_surface_z_m"] = 1.1
    root["path_half_straight_m"] = 3.0
    root["path_straight_length_m"] = 6.0
    root["path_radius_m"] = 1.6
    root["path_top_y_m"] = 1.6
    root["path_bottom_y_m"] = -1.6
    root["path_left_x_m"] = -4.6
    root["path_right_x_m"] = 4.6
    root["path_perimeter_m"] = round(4.0 * 3.0 + 2.0 * math.pi * 1.6, 6)
    root["path_points_json"] = json.dumps([[round(x, 5), round(y, 5), 1.1] for x, y in path], separators=(",", ":"))
    root["animation_path"] = "Stadium centerline, straight half-length 3.0 m, cap radius 1.6 m, surface z 1.1 m"
    return collection, root


def descendants(root):
    result = []
    for obj in bpy.context.scene.objects:
        current = obj
        while current:
            if current == root:
                result.append(obj)
                break
            current = current.parent
    return result


def stats_for_root(root):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    objects = [obj for obj in descendants(root) if obj.type == "MESH"]
    min_corner = Vector((float("inf"), float("inf"), float("inf")))
    max_corner = Vector((float("-inf"), float("-inf"), float("-inf")))
    triangles = 0
    for obj in objects:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        triangles += len(mesh.loop_triangles)
        for vertex in mesh.vertices:
            world = evaluated.matrix_world @ vertex.co
            min_corner.x = min(min_corner.x, world.x)
            min_corner.y = min(min_corner.y, world.y)
            min_corner.z = min(min_corner.z, world.z)
            max_corner.x = max(max_corner.x, world.x)
            max_corner.y = max(max_corner.y, world.y)
            max_corner.z = max(max_corner.z, world.z)
        evaluated.to_mesh_clear()
    dimensions = max_corner - min_corner
    drawcalls = 0
    for obj in objects:
        drawcalls += max(1, len(obj.data.materials))
    return {
        "min": [round(value, 4) for value in min_corner],
        "max": [round(value, 4) for value in max_corner],
        "dimensions_m": [round(value, 4) for value in dimensions],
        "triangle_count": triangles,
        "mesh_object_count": len(objects),
        "estimated_drawcalls": drawcalls,
    }


def normalize_palm_height(root, target_top=6.0):
    """Scale only the palm asset's local Z so the measured top reaches target."""
    before = stats_for_root(root)
    top = before["max"][2]
    if top > 0.0:
        root.scale.z *= target_top / top
    root["height_m"] = target_top
    root["measured_top_z_m"] = target_top


def apply_all_modifiers(obj):
    if obj.type != "MESH" or not obj.modifiers:
        return
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    for modifier in list(obj.modifiers):
        try:
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        except RuntimeError:
            # Export can still evaluate an unsupported modifier, keep the
            # asset build moving and leave that object unbatched if needed.
            pass
    obj.select_set(False)


def apply_object_transform(obj):
    """Bake a child mesh's local transform before it is joined with siblings."""
    if obj.type != "MESH":
        return
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    try:
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    except RuntimeError:
        pass
    obj.select_set(False)


def bake_evaluated_mesh(obj, depsgraph):
    """Bake modifiers and the child-local transform without operator overhead."""
    if obj.type != "MESH":
        return
    evaluated = obj.evaluated_get(depsgraph)
    try:
        baked_mesh = bpy.data.meshes.new_from_object(
            evaluated,
            depsgraph=depsgraph,
            preserve_all_data_layers=True,
        )
    except TypeError:
        baked_mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph)
    if baked_mesh is None:
        return
    old_mesh = obj.data
    local_matrix = obj.matrix_basis.copy()
    baked_mesh.transform(local_matrix)
    obj.data = baked_mesh
    obj.location = (0.0, 0.0, 0.0)
    obj.rotation_mode = "XYZ"
    obj.rotation_euler = (0.0, 0.0, 0.0)
    obj.scale = (1.0, 1.0, 1.0)
    for modifier in list(obj.modifiers):
        obj.modifiers.remove(modifier)
    if old_mesh.users == 0:
        bpy.data.meshes.remove(old_mesh)


def merge_material_group(root, material_name, group):
    """Merge a material group directly, avoiding thousands of join operators."""
    vertices = []
    faces = []
    smooth_flags = []
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in group:
        evaluated = None
        source_mesh = obj.data
        if obj.modifiers:
            evaluated = obj.evaluated_get(depsgraph)
            source_mesh = evaluated.to_mesh()
        local_matrix = obj.matrix_basis.copy()
        offset = len(vertices)
        vertices.extend([tuple(local_matrix @ vertex.co) for vertex in source_mesh.vertices])
        for polygon in source_mesh.polygons:
            faces.append(tuple(offset + index for index in polygon.vertices))
            smooth_flags.append(polygon.use_smooth)
        if evaluated is not None:
            evaluated.to_mesh_clear()
    mesh = bpy.data.meshes.new(root.name + "_" + material_name.replace(" ", "_") + "Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for polygon, smooth in zip(mesh.polygons, smooth_flags):
        polygon.use_smooth = smooth
    mesh.materials.append(group[0].data.materials[0])
    collection = root.users_collection[0]
    merged = bpy.data.objects.new(root.name + "_" + material_name.replace(" ", "_"), mesh)
    collection.objects.link(merged)
    merged.parent = root
    for obj in group:
        old_mesh = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if old_mesh.users == 0:
            bpy.data.meshes.remove(old_mesh)
    return merged


def batch_static_meshes(root):
    """Convert curves and merge one-material meshes to reduce GLB drawcalls."""
    for obj in list(descendants(root)):
        if obj.type != "CURVE":
            continue
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        try:
            bpy.ops.object.convert(target="MESH")
        except TypeError:
            bpy.ops.object.convert(target="MESH", keep_original=False)
        bpy.context.object.select_set(False)
    groups = {}
    for obj in descendants(root):
        if obj.type != "MESH" or len(obj.data.materials) != 1:
            continue
        material = obj.data.materials[0]
        groups.setdefault(material.name, []).append(obj)
    for material_name, group in groups.items():
        if len(group) >= 2:
            merge_material_group(root, material_name, group)
    root["batching"] = "Static meshes merged by material, curves converted to mesh before export"


def select_root(root):
    bpy.ops.object.select_all(action="DESELECT")
    selected = descendants(root)
    for obj in selected:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root


def export_glb(root, filename):
    select_root(root)
    filepath = os.path.join(GLB_DIR, filename)
    try:
        bpy.ops.export_scene.gltf(
            filepath=filepath,
            export_format="GLB",
            use_selection=True,
            export_apply=True,
            export_animations=False,
        )
    except TypeError:
        bpy.ops.export_scene.gltf(
            filepath=filepath,
            export_format="GLB",
            export_selected_objects=True,
            export_apply=True,
            export_animations=False,
        )
    for obj in descendants(root):
        obj.select_set(False)
    return filepath


def look_at(camera, target):
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def setup_render():
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"
    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = (0.055, 0.08, 0.11, 1.0)
        background.inputs["Strength"].default_value = 0.28
    ground_material = make_material("Preview warm ground", (0.22, 0.11, 0.07), roughness=0.62)
    ground = add_cube(scene.collection, "PreviewGround", (0.0, 0.0, -1.92), (80.0, 80.0, 0.25), ground_material, bevel=0.12)
    ground.hide_render = False
    camera_data = bpy.data.cameras.new("PreviewCamera")
    camera = bpy.data.objects.new("PreviewCamera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera_data.lens = 48
    camera_data.sensor_width = 36
    key_data = bpy.data.lights.new("PreviewKey", "AREA")
    key = bpy.data.objects.new("PreviewKey", key_data)
    scene.collection.objects.link(key)
    key.location = (-14.0, -16.0, 24.0)
    key_data.energy = 2500
    key_data.shape = "DISK"
    key_data.size = 10.0
    key_data.color = (1.0, 0.57, 0.33)
    look_at(key, (0.0, 0.0, 1.5))
    fill_data = bpy.data.lights.new("PreviewFill", "AREA")
    fill = bpy.data.objects.new("PreviewFill", fill_data)
    scene.collection.objects.link(fill)
    fill.location = (18.0, -8.0, 14.0)
    fill_data.energy = 1400
    fill_data.size = 12.0
    fill_data.color = (0.36, 0.67, 0.88)
    look_at(fill, (0.0, 1.0, 1.5))
    rim_data = bpy.data.lights.new("PreviewRim", "AREA")
    rim = bpy.data.objects.new("PreviewRim", rim_data)
    scene.collection.objects.link(rim)
    rim.location = (0.0, 20.0, 20.0)
    rim_data.energy = 1800
    rim_data.size = 8.0
    rim_data.color = (1.0, 0.75, 0.4)
    look_at(rim, (0.0, 0.0, 2.0))
    return camera, ground, (key, fill, rim)


def set_asset_visibility(roots, active):
    for root in roots:
        for obj in descendants(root):
            obj.hide_render = active is not None and root != active


def render_individual(root, filepath, camera):
    set_asset_visibility(ASSET_ROOTS, root)
    root.location = (0.0, 0.0, 0.0)
    bounds = stats_for_root(root)
    dimensions = Vector(bounds["dimensions_m"])
    max_dimension = max(dimensions.x, dimensions.y, dimensions.z)
    if root.name == "LuxuryYacht":
        camera.location = (max_dimension * 1.12, -max_dimension * 1.42, max_dimension * 0.78)
        target = (0.0, 0.0, 1.8)
    else:
        camera.location = (max_dimension * 1.28, -max_dimension * 1.48, max_dimension * 1.08)
        target = (0.0, 0.0, dimensions.z * 0.35)
    camera.data.lens = 55 if root.name == "LuxuryYacht" else 62
    look_at(camera, target)
    bpy.context.scene.render.filepath = filepath
    bpy.ops.render.render(write_still=True)


def render_composite(roots, filepath, camera):
    set_asset_visibility(roots, None)
    roots[0].location = (-9.0, -1.6, 0.0)
    roots[1].location = (-0.5, -5.0, 0.0)
    roots[2].location = (9.2, 1.4, 0.0)
    roots[3].location = (-1.0, 5.3, 0.0)
    camera.location = (22.0, -31.0, 24.0)
    camera.data.lens = 48
    look_at(camera, (0.0, 0.2, 1.7))
    bpy.context.scene.render.filepath = filepath
    bpy.ops.render.render(write_still=True)


clear_scene()
PALM_COLLECTION, PALM_ROOT = palm_cluster()
PLANTER_COLLECTION, PLANTER_ROOT = planter_cluster()
YACHT_COLLECTION, YACHT_ROOT = yacht()
BELT_COLLECTION, BELT_ROOT = baggage_belt()
ASSET_ROOTS = [PALM_ROOT, PLANTER_ROOT, YACHT_ROOT, BELT_ROOT]

# Normalize the palm against its measured geometry, then collapse the static
# scene props by material before stats, GLB export, and previews are produced.
normalize_palm_height(PALM_ROOT, 6.0)
for asset_root in ASSET_ROOTS:
    batch_static_meshes(asset_root)

asset_specs = [
    (PALM_ROOT, "palm_cluster.glb"),
    (PLANTER_ROOT, "tropical_planter_cluster.glb"),
    (YACHT_ROOT, "luxury_yacht.glb"),
    (BELT_ROOT, "baggage_belt.glb"),
]

provenance = {
    "generator": "build_assets.py",
    "blender_target": "Blender 5.2 LTS",
    "source": "Procedural original geometry generated in Blender, no external meshes or downloads",
    "references_inspected": [
        "docs/reference-images/Gemini-4.png",
        "docs/reference-images/GPT-2.png",
    ],
    "coordinate_system": "Blender Z-up authoring, standard glTF/GLB Y-up export",
    "assets": {},
}

for root, filename in asset_specs:
    stats = stats_for_root(root)
    export_glb(root, filename)
    provenance["assets"][root.name] = {
        "file": os.path.join("glb", filename),
        **stats,
        "custom_properties": {key: root[key] for key in root.keys()},
    }

camera, ground, lights = setup_render()
for root, filename in asset_specs:
    render_individual(root, os.path.join(RENDER_DIR, filename.replace(".glb", ".png")), camera)
render_composite(ASSET_ROOTS, os.path.join(RENDER_DIR, "composite.png"), camera)

with open(os.path.join(OUT_DIR, "provenance.json"), "w", encoding="utf-8") as handle:
    json.dump(provenance, handle, indent=2)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT_DIR, "loyalty_v2_assets.blend"))
print(json.dumps(provenance, indent=2))
