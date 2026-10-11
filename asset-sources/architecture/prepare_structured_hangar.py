"""Create a connected hangar frame with fixed pillars and articulated rear shutters."""
import bpy
import hashlib
import json
import os
from pathlib import Path
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = Path(os.environ.get('LOYALTY_REAR_GATE_OUT', '/private/tmp/loyalty-structured-hangar-20261010'))
OUT.mkdir(parents=True, exist_ok=True)
helpers = {'__file__': str(HERE / 'create_assets.py')}
exec(compile((HERE / 'create_assets.py').read_text().rsplit('\nmain()', 1)[0], str(HERE / 'create_assets.py'), 'exec'), helpers)
helpers['clear_file']()
source = ROOT / 'asset-sources/retired-runtime/assets/hangar.glb'
bpy.ops.import_scene.gltf(filepath=str(source))
# Material batches contain disconnected authored pieces. Recover those pieces
# while retaining the original UVs, textures and evaluated geometry.
bpy.ops.object.select_all(action='DESELECT')
for obj in list(bpy.context.scene.objects):
    if obj.type == 'MESH':
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.000001)
bpy.ops.mesh.separate(type='LOOSE')
bpy.ops.object.mode_set(mode='OBJECT')
bpy.context.view_layer.update()
static = helpers['collection']('HangarStructureStatic')
gates = [helpers['collection'](f'RearGateParts{i + 1}') for i in range(3)]
roots = []
for i in range(3):
    root = bpy.data.objects.new(f'RearGate{i + 1}', None)
    bpy.context.scene.collection.objects.link(root)
    roots.append(root)

def bounds(obj):
    verts = [obj.matrix_world @ v.co for v in obj.data.vertices]
    return Vector(tuple(min(v[i] for v in verts) for i in range(3))), Vector(tuple(max(v[i] for v in verts) for i in range(3)))

rear_wall = None
moving = []
removed = []
front_piers = []
rear_jambs = []
for obj in list(bpy.context.scene.objects):
    if obj.type != 'MESH':
        continue
    lo, hi = bounds(obj)
    center = (lo + hi) * .5
    size = hi - lo
    name = obj.data.materials[0].name if obj.data.materials else ''
    if center.y > 6.9 and size.x > 23 and size.z > 7:
        rear_wall = obj
        continue
    is_panel = name.startswith('DeepInterior') and center.y > 6.8 and size.z > 4.6
    is_jamb = name.startswith('AgedChampagneBrass') and center.y > 6.7 and 4.8 < size.z < 5.1 and size.x < .25
    is_unused_sign = name.startswith('DeepInterior') and center.y < -7.2 and 5.5 < size.x < 5.9 and .4 < size.z < .8
    is_front_pier = name.startswith('PaleTravertine') and center.y < -6.9 and .4 < size.x < .6 and 5.5 < size.z < 6
    if is_unused_sign:
        removed.append(obj)
    elif is_panel:
        index = min(range(3), key=lambda i: abs(center.x - (-7.85 + i * 7.85)))
        # Widen the existing dark panels inside the new fixed frame.
        # Imported material batches share an origin. Re-center each panel
        # before adjusting its width and thickness.
        obj.data.transform(obj.matrix_world)
        obj.data.transform(Matrix.Translation(-center))
        obj.matrix_world = Matrix.Translation(center)
        obj.scale.x = 7.35 / size.x
        obj.scale.y = .22 / size.y
        obj.location.y = 7.11
        helpers['move_to_collection'](obj, gates[index])
        moving.append((obj, index))
    elif is_jamb:
        rear_jambs.append(obj)
        removed.append(obj)
    elif is_front_pier:
        front_piers.append((center.x, center.y, lo.z, helpers['arch_height'](center.x)))
        removed.append(obj)
    else:
        helpers['move_to_collection'](obj, static)
assert rear_wall is not None, 'Original rear wall must be identified'
assert len(moving) == 3, 'Only the three dark shutters belong to animated groups'
assert len(front_piers) == 4, 'All four front pillars must be rebuilt'
assert len(rear_jambs) == 6, 'All six rear jambs must be fixed in the new frame'
assert len(removed) == 12, 'Expected two unused plates, four front pillars and six rear jambs'
lo, hi = bounds(rear_wall)
stone = rear_wall.data.materials[0]
brass = bpy.data.materials['AgedChampagneBrass']
# The upper wall, piers and jambs are all fixed. Only the dark panels retract.
helpers['cube'](static, 'RearWallUpper', ((lo.x + hi.x)/2, (lo.y + hi.y)/2, (5.3 + hi.z)/2), (hi.x-lo.x, hi.y-lo.y, hi.z-5.3), stone, .05)
for i, center in enumerate((-7.85, 0, 7.85)):
    for side in (-1, 1):
        helpers['cube'](static, f'FixedRearJamb{i+1}_{side}', (center+side*3.675, 6.88*.991407752, 2.75), (.12, .16, 5), brass, .025)
    helpers['cube'](static, f'RearShutterHousing{i+1}', (center, 7.05, 5.23), (7.46, .44, .36), brass, .055)
    # The shutters are opaque through their full thickness, no moving masonry.
# Four rear supports reach the roof ribs and remain present while gates open.
for i, (left, right) in enumerate(((lo.x,-11.525),(-4.175,-3.675),(3.675,4.175),(11.525,hi.x)), 1):
    center=(left+right)/2
    top=helpers['arch_height'](center)
    helpers['cube'](static, f'FixedRearPier{i}', (center, 7.09, (lo.z+top)/2), (right-left,.5,top-lo.z), stone, .045)
    helpers['cube'](static, f'FixedRearPierFoot{i}', (center, 7.09, .43), (right-left+.14,.64,.2), brass, .025)
# Extend the original front supports to touch the barrel-vault roof.
for i,(x,y,bottom,top) in enumerate(sorted(front_piers),1):
    helpers['cube'](static, f'ConnectedFrontPier{i}', (x,y,(bottom+top)/2), (.46,.46,top-bottom), stone, .055)
helpers['cube'](static, 'ConnectedFrontTieBeam', (0,-7.09,5.85), (24.35,.46,.35), stone, .055)
helpers['cube'](static, 'FrontTieBeamBrassInlay', (0,-7.34,5.85), (24.35,.04,.06), brass, .012)
for side in (-1,1):
    helpers['cube'](static, f'ConnectedSideRoofRail{side}', (side*12.1,0,5.85), (.26,14.65,.3), brass, .035)
for x in (-4.8,4.8):
    top=helpers['arch_height'](x)
    helpers['cube'](static, f'FixedSignRoofMount{x}', (x,-7.36,(8.0+top)/2), (.09,.12,top-8.0), brass, .012)
for obj in [rear_wall,*removed]:
    bpy.data.objects.remove(obj, do_unlink=True)
helpers['merge_static_by_material'](static)
helpers['ensure_uvs'](static)
for col in gates:
    helpers['ensure_uvs'](col)
bpy.context.view_layer.update()
for obj, index in moving:
    world = obj.matrix_world.copy()
    obj.parent = roots[index]
    obj.matrix_world = world
bpy.ops.object.select_all(action='DESELECT')
for obj in list(bpy.context.scene.objects):
    if obj.type in ('MESH', 'EMPTY'):
        obj.select_set(True)
output = OUT / 'hangar-structure.glb'
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', use_selection=True, export_apply=True, export_cameras=False, export_lights=False, export_yup=True)
proof = {
    'source': 'asset-sources/retired-runtime/assets/hangar.glb',
    'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'destination': 'public/assets/hangar-structure.glb',
    'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
    'transformation': 'Retain original roof, glazing, floors and materials. Replace detached front pillars with roof-connected pillars and tie beam. Retain fixed rear piers and jambs, animate only widened dark shutters. Remove two unused blank sign plates. Add roof rails and sign suspension mounts.',
    'gate_nodes': [r.name for r in roots],
    'gate_ceiling_y': 5.3,
    'clear_opening_width': 7.23,
    'gate_centers_x': [-7.85,0,7.85],
    'rear_wall_world_z': [-4-hi.y,-4-lo.y],
    'removed_unused_sign_plates': 2,
    'fixed_front_pillars': 4,
    'fixed_rear_pillars': 4,
    'fixed_rear_jambs': 6,
    'license': 'Derivative of the original locally authored hangar, no external assets.'
}
(OUT / 'structure-provenance.json').write_text(json.dumps(proof, indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'hangar-structure.blend'))
print(json.dumps(proof, indent=2))
