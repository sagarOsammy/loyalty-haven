"""Create an additive, articulated derivative of the original hangar GLB."""
import bpy
import hashlib
import json
import os
from pathlib import Path
from mathutils import Vector

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = Path(os.environ.get('LOYALTY_REAR_GATE_OUT', '/private/tmp/loyalty-rear-gates-20261010'))
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
static = helpers['collection']('RearGateHangarStatic')
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
    # Only the three original dark panels and their vertical brass jambs move.
    is_panel = name.startswith('DeepInterior') and center.y > 6.8 and size.z > 4.6
    is_jamb = name.startswith('AgedChampagneBrass') and center.y > 6.7 and 4.8 < size.z < 5.1 and size.x < .25
    if is_panel or is_jamb:
        index = min(range(3), key=lambda i: abs(center.x - (-7.85 + i * 7.85)))
        helpers['move_to_collection'](obj, gates[index])
        moving.append((obj, index))
    else:
        helpers['move_to_collection'](obj, static)
assert rear_wall is not None, 'Original rear wall must be identified'
assert len(moving) == 9, f'Expected three panels and six jambs, got {len(moving)}'
lo, hi = bounds(rear_wall)
stone = rear_wall.data.materials[0]
# Preserve the solid clerestory backing. The lower backing is split into
# retractable sections, so lifting the dark gates exposes a real opening.
helpers['cube'](static, 'RearWallUpper', ((lo.x + hi.x)/2, (lo.y + hi.y)/2, (5.3 + hi.z)/2), (hi.x-lo.x, hi.y-lo.y, hi.z-5.3), stone, .05)
for i in range(3):
    width = (hi.x-lo.x)/3
    backer = helpers['cube'](gates[i], f'RearGateBacking{i+1}', (lo.x+(i+.5)*width, (lo.y+hi.y)/2, (lo.z+5.3)/2), (width, hi.y-lo.y, 5.3-lo.z), stone, .03)
    moving.append((backer, i))
bpy.data.objects.remove(rear_wall, do_unlink=True)
helpers['merge_static_by_material'](static)
helpers['ensure_uvs'](static)
for col in gates:
    helpers['ensure_uvs'](col)
for obj, index in moving:
    world = obj.matrix_world.copy()
    obj.parent = roots[index]
    obj.matrix_world = world
bpy.ops.object.select_all(action='DESELECT')
for obj in list(bpy.context.scene.objects):
    if obj.type in ('MESH', 'EMPTY'):
        obj.select_set(True)
output = OUT / 'hangar-rear-gates.glb'
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', use_selection=True, export_apply=True, export_cameras=False, export_lights=False, export_yup=True)
proof = {'source': 'asset-sources/retired-runtime/assets/hangar.glb', 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'destination': 'public/assets/hangar-rear-gates.glb', 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'transformation': 'Preserve original hangar geometry and materials, articulate the three rear brown panels and their lower wall backings. Retain solid upper rear wall.', 'gate_nodes': [r.name for r in roots], 'gate_ceiling_y': 5.3, 'rear_wall_world_z': [-4-hi.y, -4-lo.y], 'license': 'Derivative of the original locally authored hangar, no external assets.'}
(OUT / 'rear-gates-provenance.json').write_text(json.dumps(proof, indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'hangar-rear-gates.blend'))
print(json.dumps(proof, indent=2))
