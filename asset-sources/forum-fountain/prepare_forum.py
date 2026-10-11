"""Separate the original forum's merged parts into a reversible fountain derivative."""
import bpy,json,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
SOURCE=ROOT/'public/assets/forum.glb'
DEST=ROOT/'public/assets/forum-fountain.glb'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
for o in list(bpy.context.scene.objects):
 if o.type=='MESH':
  bpy.ops.object.select_all(action='DESELECT')
  o.select_set(True)
  bpy.context.view_layer.objects.active=o
  bpy.ops.object.mode_set(mode='EDIT')
  bpy.ops.mesh.select_all(action='SELECT')
  bpy.ops.mesh.remove_doubles(threshold=.000001)
  bpy.ops.mesh.separate(type='LOOSE')
  bpy.ops.object.mode_set(mode='OBJECT')
records=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 vs=[o.matrix_world@v.co for v in o.data.vertices]
 lo=[min(v[i] for v in vs) for i in range(3)]
 hi=[max(v[i] for v in vs) for i in range(3)]
 records.append({'name':o.name,'mat':o.data.materials[0].name,'lo':[round(v,3) for v in lo],'hi':[round(v,3) for v in hi]})
removed=[]
pillars=[]
for a in records:
 o=bpy.data.objects[a['name']]
 lo,hi=a['lo'],a['hi']
 size=[hi[i]-lo[i] for i in range(3)]
 # Every stage/seating part is below 1.8m. Retain all ten column plinths.
 plinth=a['mat']=='ForumWarmStone' and abs(size[0]-.8)<.002 and abs(size[1]-.8)<.002 and hi[2]<.37
 if hi[2]<=1.801 and not plinth:
  removed.append(a)
  bpy.data.objects.remove(o,do_unlink=True)
 elif a['mat']=='PaleTravertine' and 3.99<size[2]<4.01 and size[0]<.5:
  pillars.append(a)
assert len(removed)==28, f'Unexpected removed parts: {len(removed)}'
assert len(pillars)==10, f'Expected all ten unchanged pillars: {len(pillars)}'
helpers={'__file__':str(ROOT/'asset-sources/architecture/create_assets.py')}
source_code=(ROOT/'asset-sources/architecture/create_assets.py').read_text()
exec(compile(source_code.rsplit('\nmain()',1)[0],helpers['__file__'],'exec'),helpers)
col=helpers['collection']('ForumFountainArchitecture')
for o in list(bpy.context.scene.objects):
 if o.type=='MESH':helpers['move_to_collection'](o,col)
 elif o.type=='EMPTY':bpy.data.objects.remove(o,do_unlink=True)
helpers['merge_static_by_material'](col)
helpers['select_collection'](col)
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'forum-fountain.blend'))
bpy.ops.export_scene.gltf(filepath=str(DEST),export_format='GLB',use_selection=True,export_apply=True,export_cameras=False,export_lights=False,export_yup=True)
(HERE/'provenance.json').write_text(json.dumps({
 'source':str(SOURCE.relative_to(ROOT)),
 'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
 'destination':str(DEST.relative_to(ROOT)),
 'destination_sha256':hashlib.sha256(DEST.read_bytes()).hexdigest(),
 'transformation':'Separate merged components, remove only stage, seating, turntable, obsolete plaque and entry steps. Retain original columns, plinths, arches, entablature and portable materials. Merge retained geometry by material.',
 'removed_parts':removed,'retained_pillars':pillars,'metrics':helpers['metrics'](col)
},indent=2)+'\n')
