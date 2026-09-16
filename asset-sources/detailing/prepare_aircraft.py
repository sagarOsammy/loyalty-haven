"""Refine the retained aircraft generator without overwriting its source assets."""
import bpy
import hashlib
import json
import math
import os
import re
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get("LOYALTY_AIRCRAFT_DETAIL_OUT", "/private/tmp/loyalty-aircraft-detail-final-20260914"))
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = ROOT / "asset-sources/aircraft/build_assets.py"
os.environ["ASSET_EXPORT_DIR"] = str(OUT)
os.environ["ASSET_RENDER_DIR"] = str(OUT)
os.environ["ASSET_SOURCE_DIR"] = str(SOURCE.parent / "sources")

profile = [
    (-6.02, .025, .025, 1.15), (-5.85, .20, .20, 1.17),
    (-5.55, .43, .42, 1.19), (-5.18, .61, .57, 1.20),
    (-4.60, .74, .71, 1.17), (-3.80, .78, .74, 1.13),
    (-2.40, .80, .75, 1.10), (0, .81, .76, 1.10),
    (2.55, .80, .75, 1.10), (3.75, .76, .70, 1.11),
    (4.55, .64, .61, 1.12), (5.05, .46, .45, 1.14),
    (5.47, .27, .28, 1.17), (5.82, .095, .11, 1.20),
    (6.02, .025, .025, 1.22),
]
text = SOURCE.read_text()
text = re.sub(r'(def create_fuselage\(collection\):\n    sections = )\[.*?\n    \]', lambda m: m[1] + repr(profile), text, count=1, flags=re.S)
text = re.sub(r'FUSELAGE_PROFILE = \[.*?\n\]', 'FUSELAGE_PROFILE = '+repr(profile), text, count=1, flags=re.S)
text = text.replace('leads = [-0.84, -0.65, -0.30, 0.22, 0.68, 1.10]', 'leads = [-1.0, -0.85, -0.42, 0.22, 1.0, 1.75]')
text = text.replace('trails = [2.15, 2.18, 2.30, 2.48, 2.62, 2.72]', 'trails = [2.15, 2.18, 2.30, 2.48, 2.70, 2.86]')
text = text.replace('winglet_x, 1.06', 'winglet_x, 1.72').replace('span + 0.06), 1.06','span + 0.06), 1.72')
text = text.replace('winglet_x, 1.48', 'winglet_x, 2.02').replace('span + 0.06), 1.48','span + 0.06), 2.02')
text = text.replace('cockpit_ranges = [(-4.52, 0.10, 0.40), (-4.08, 0.15, 0.52)]', 'cockpit_ranges = [(-5.28, 0.56, 1.42), (-4.90, 0.48, 1.02)]')
text = text.replace('(0.42, 0.49, 0.54), metallic=0.55', '(0.68, 0.72, 0.75), metallic=0.30')
text = text.replace('coat=0.55, transmission=0.18', 'coat=0.55, transmission=0.0')
text = text.replace('        batched.name =', '        batched.data.validate(verbose=False)\n        batched.data.update()\n        batched.name =')
text = text.replace('5.72, 1.22, 1.32', '5.72, 1.82, 1.32')
text = text.replace('(0.0, -1.2, 2.03)', '(0.0, -1.2, 1.94)').replace('(0.0, 2.8, 2.03)', '(0.0, 2.8, 1.92)').replace('(0.0, 4.0, 2.03)', '(0.0, 4.0, 1.82)')
ns = {'__name__': 'aircraft_derivative_source', '__file__': str(SOURCE)}
exec(compile(text, str(SOURCE), 'exec'), ns)
ns['clean_scene']()
ns['make_materials']()
ns['create_aircraft']()
m = ns['MATS']
ns['duplicate_aircraft_variant']('airline-avianca', 'AIRCRAFT_AVIANCA', 'Avianca', ns['AVIANCA_LOGO_PATH'], m['avianca_red'], m['avianca_wine'], m['avianca_red'], 'avianca')
ns['duplicate_aircraft_variant']('airline-air-canada', 'AIRCRAFT_AIR_CANADA', 'Air Canada', ns['AIR_CANADA_LOGO_PATH'], m['aircanada_red'], m['aircanada_grey'], m['aircanada_wordmark'], 'AIR CANADA')
records = []
for name, objects in ns['ASSETS'].items():
    target = Path(ns['export_asset'](name+'-detail', objects))
    original = ROOT / 'public/assets' / (name+'.glb')
    records.append({'source':str(original.relative_to(ROOT)), 'sourceSha256':hashlib.sha256(original.read_bytes()).hexdigest(), 'runtime':'public/assets/'+target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size})

# Render the exported GLB, so the review includes serialization and materials.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT/'airline-united-detail.glb'))
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=24
scene.world=bpy.data.worlds.new('Aircraft studio')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.20,.25,.32,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
for loc,energy,size,color in [((9,-9,13),1700,7,(1,.84,.66)),((-9,-4,6),1200,8,(.47,.65,1)),((1,11,9),1600,5,(.78,.88,1))]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    o=bpy.context.object
    o.data.energy,o.data.size,o.data.color=energy,size,color
    o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(14.5,-17.5,8))
o=bpy.context.object
o.rotation_euler=(Vector((0,.25,1.2))-o.location).to_track_quat('-Z','Y').to_euler()
o.data.lens=56
scene.camera=o
scene.render.resolution_x,scene.render.resolution_y=1000,760
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(OUT/'aircraft-detail-preview.png')
bpy.ops.render.render(write_still=True)
(OUT/'provenance.json').write_text(json.dumps({'sourceGenerator':'asset-sources/aircraft/build_assets.py','sourceGeneratorSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'changes':['Slimmer tapered fuselage, unchanged 12.04 m length','More swept and tapered main wings','Raised forward wraparound cockpit glazing with opaque reflective treatment','Lower-contrast passenger door panels','Original engines, gear, wordmarks and airline colors retained'],'outputs':records,'limitations':'Authored approximations, not aircraft scans or exact liveries'},indent=2)+'\n')
print(json.dumps(records,indent=2))
