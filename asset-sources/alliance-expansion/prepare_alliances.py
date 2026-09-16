"""Reuse the approved airframe builders, preserving all prior scripts and models."""
import bpy, hashlib, json, math, os
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get('LOYALTY_ALLIANCE_OUT', '/private/tmp/loyalty-alliance-expansion-20260915'))
OUT.mkdir(parents=True, exist_ok=True)
source = ROOT / 'asset-sources/aircraft-realism/prepare_aircraft.py'
os.environ['LOYALTY_AIRCRAFT_REALISM_OUT'] = str(OUT)
scope = {'__name__': 'approved_airframe_builders', '__file__': str(source)}
prefix = source.read_text().split("ns['create_aircraft']()", 1)[0]
exec(compile(prefix, str(source), 'exec'), scope)
ns, mats = scope['ns'], scope['m']
ns['create_aircraft']()
for obj in bpy.data.collections['AIRCRAFT_UNITED'].objects:
    if obj.name.startswith('Top Antenna'): obj.location.z = 1.93
    elif obj.name == 'Tail Beacon': obj.location = (0, 4, 1.80)
    elif 'Navigation Light' in obj.name:
        obj.location = (math.copysign(5.73, obj.location.x), 2.22, 1.91)
        obj.scale *= .65

def paint(name, color):
    return ns['material'](name, color, metallic=.035, roughness=.28, coat=.25)

white = (.82, .86, .89)
navy = (.012, .025, .10)
red = (.64, .012, .032)
burgundy = (.27, .015, .08)
teal = (.009, .19, .23)
gold = (.75, .49, .13)
# Artist-selected approximations, not exact paint standards or replica liveries.
variants = [
    ('virgin-atlantic', 'Virgin Atlantic', 'virgin atlantic', 'V', red, white, burgundy, white),
    ('vietnam-airlines', 'Vietnam Airlines', 'Vietnam Airlines', 'VN', teal, white, gold, teal),
    ('finnair', 'Finnair', 'FINNAIR', 'F', navy, white, navy, white),
    ('qatar-airways', 'Qatar Airways', 'QATAR', 'Q', white, (.65,.68,.70), burgundy, white),
    ('british-airways', 'British Airways', 'BRITISH AIRWAYS', 'BA', navy, navy, navy, white),
]
records = []
for slug, title, wordmark, mark, tail, belly, lettering, body in variants:
    key = 'airline-' + slug + '-realism'
    collection_name = 'AIRCRAFT_' + slug.upper().replace('-', '_')
    tail_mat, belly_mat, logo_mat, body_mat = [paint(title + suffix, value) for suffix, value in
        [(' tail', tail), (' belly', belly), (' lettering', lettering), (' cabin', body)]]
    objects = ns['duplicate_aircraft_variant'](key, collection_name, title, '', tail_mat, belly_mat, logo_mat, wordmark)
    collection = bpy.data.collections[collection_name]
    for obj in objects:
        if obj.name.endswith('Smooth cabin and radome'):
            obj.data.materials[0] = body_mat
        if 'Engine' in obj.name and hasattr(obj.data, 'materials'):
            for i, material in enumerate(obj.data.materials):
                if material and material.name == 'Airframe White Aluminum':
                    obj.data.materials[i] = tail_mat if slug in ('virgin-atlantic', 'vietnam-airlines') else body_mat
    # Simple initials distinguish tails without claiming to reproduce airline logos.
    tail_ink = paint(title + ' tail initials', gold if slug == 'vietnam-airlines' else burgundy if slug == 'qatar-airways' else white)
    for side in (-1, 1):
        data = bpy.data.curves.new(title + ' Tail Initials', 'FONT')
        data.body, data.size, data.align_x, data.align_y = mark, .44, 'CENTER', 'CENTER'
        obj = bpy.data.objects.new(title + ' Tail Initials', data)
        collection.objects.link(obj)
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target='MESH')
        for vertex in obj.data.vertices:
            x, y = vertex.co.x, vertex.co.y
            vertex.co = (side * .062, 4.63 + side * x, 2.67 + y)
        obj.data.materials.append(tail_ink)
        tail_ink.use_backface_culling = False
    ns['ASSETS'][key] = [o for o in collection.objects if o.type in {'MESH', 'CURVE'}]

bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'alliance-aircraft.blend'))
for slug, *_ in variants:
    key = 'airline-' + slug + '-realism'
    target = Path(ns['export_asset'](key, ns['ASSETS'][key]))
    records.append({'runtime': 'public/assets/' + target.name, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'bytes': target.stat().st_size})
(OUT / 'provenance.json').write_text(json.dumps({
    'source': str(source.relative_to(ROOT)), 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'originalGenerator': 'asset-sources/aircraft/build_assets.py',
    'originalGeneratorSha256': hashlib.sha256((ROOT / 'asset-sources/aircraft/build_assets.py').read_bytes()).hexdigest(),
    'transformations': ['Approved component geometry reused', 'Airline-specific paint and projected text', 'Simple tail initials', 'Static geometry batched by material'],
    'limitations': 'Generic airframes with approximate paint and text. Tail initials are authored identifiers, not official airline logos. No exact aircraft type or current livery claim.',
    'outputs': records,
}, indent=2) + '\n')
print('ALLIANCE_EXPORT_COMPLETE', json.dumps(records), flush=True)

# Inspect each serialized GLB in the same studio framing.
for slug, *_ in variants:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(OUT / ('airline-' + slug + '-realism.glb')))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    corners = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    bounds = [[min(v[i] for v in corners), max(v[i] for v in corners)] for i in range(3)]
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 12
    scene.world = bpy.data.worlds.new('Soft studio')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.25,.29,.35,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .5
    for loc, energy, size in [((5,-8,11),1800,7),((-8,-3,6),1300,8),((0,8,10),2000,6)]:
        bpy.ops.object.light_add(type='AREA', location=loc)
        light = bpy.context.object
        light.data.energy, light.data.size = energy, size
        light.rotation_euler = (Vector((0,0,1)) - light.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.025))
    floor = bpy.data.materials.new('Studio floor')
    floor.diffuse_color = (.11,.14,.18,1)
    bpy.context.object.data.materials.append(floor)
    bpy.ops.object.camera_add(location=(13,-16,7))
    camera = bpy.context.object
    camera.data.lens = 54
    camera.rotation_euler = (Vector((0,0,1.2)) - camera.location).to_track_quat('-Z','Y').to_euler()
    scene.camera = camera
    scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = 1000, 714, 100
    scene.render.filepath = str(OUT / (slug + '-preview.png'))
    bpy.ops.render.render(write_still=True)
    print('SERIALIZED_BOUNDS', slug, json.dumps(bounds), flush=True)
