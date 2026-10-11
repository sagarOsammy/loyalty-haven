"""Create additive fleet-detail derivatives. Preserve all prior generators and GLBs."""
import bpy, hashlib, json, math, os
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get('LOYALTY_FLEET_OUT', '/private/tmp/loyalty-fleet-20261010'))
OUT.mkdir(parents=True, exist_ok=True)
source = ROOT / 'asset-sources/aircraft-realism/prepare_aircraft.py'
os.environ['LOYALTY_AIRCRAFT_REALISM_OUT'] = str(OUT)
namespace = {'__file__': str(source), '__name__': 'retained_airframe_helpers'}
exec(compile(source.read_text().split("ns['create_aircraft']()", 1)[0], str(source), 'exec'), namespace)
ns = namespace['ns']
variants = [
 ('united','UNITED',1.00,1.00,'globe'),
 ('avianca','avianca',.96,.98,'feathers'),
 ('air-canada','AIR CANADA',1.03,1.06,'maple'),
 ('virgin-atlantic','virgin',1.07,1.10,'wordmark'),
 ('vietnam-airlines','VN',1.08,1.09,'lotus'),
 ('finnair','F',1.05,1.08,'wordmark'),
 ('qatar-airways','Q',1.09,1.12,'wordmark'),
 ('british-airways','BA',1.08,1.11,'ribbon'),
]
records=[]
for slug, identifier, span, length, tail_style in variants:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    runtime = ROOT / ('asset-sources/retired-runtime/assets/airline-' + slug + '-realism.glb')
    bpy.ops.import_scene.gltf(filepath=str(runtime))
    col = bpy.data.collections.new('Detailed ' + slug)
    bpy.context.scene.collection.children.link(col)
    for obj in list(bpy.context.scene.objects):
        for c in list(obj.users_collection): c.objects.unlink(obj)
        col.objects.link(obj)
    # Existing generator builders operate in Blender coordinates, Z up, nose at Y=-6.
    skin = ns['material']('Fleet polished enamel',(.84,.87,.89),metallic=.18,roughness=.24,coat=.4)
    silver = ns['material']('Fleet brushed titanium',(.34,.38,.43),metallic=.85,roughness=.27)
    joints = ns['material']('Fleet restrained panel joints',(.22,.26,.28),roughness=.6)
    pale = ns['material']('Fleet tail ivory',(.91,.92,.89),roughness=.32)
    red = ns['material']('Fleet exit red',(.65,.025,.035),roughness=.4)
    # Re-create per-scene materials after factory reset, retained helper dicts can hold old objects.
    ns['MATS'].clear()
    def line(name, points, mat=joints, radius=.007, closed=False):
        obj = ns['add_curve'](name, points, mat, radius, col, closed)
        obj.data.bevel_resolution=1
        obj.data.resolution_u=2
        return obj
    def sphere(name, position, scale, mat=skin):
        return ns['add_uv_sphere'](name,position,scale,mat,col,segments=24,rings=12)
    # Sculpted center-wing fairing and separate nacelle-to-wing pylons.
    sphere('Blended wing-body fairing',(0,.7,.72),(.74,1.7,.27))
    for side in (-1,1):
        # Raised wing inspection panels and spoiler divisions, visible from the resort camera.
        for x, y in [(1.45,.22),(2.3,.65),(3.15,1.1),(4.0,1.52)]:
            xx=side*x
            points=[(xx,y,1.105+.045*x),(xx+side*.34,y+.12,1.12+.045*x),
                    (xx+side*.34,y+.50,1.115+.045*x),(xx,y+.48,1.10+.045*x)]
            line('Wing spoiler panel',points,closed=True,radius=.004)
        ns['add_cube']('Engine pylon fairing',(side*2.18,.05,1.11),(.17,.94,.19),skin,.045,collection=col)
        # Spinner spiral and nacelle access-panel outlines.
        line('Engine spinner spiral',[(side*2.18+.067*(1-i/40)*math.cos(i*.29),-.809+i*.001,
             .66+.067*(1-i/40)*math.sin(i*.29)) for i in range(40)],pale,.006)
        line('Engine service panel',[(side*2.18+.447,-.48,.61),(side*2.18+.44,-.08,.61),
             (side*2.18+.437,-.08,.78),(side*2.18+.448,-.48,.78)],closed=True,radius=.004)
        # Flush overwing exit frames and contrasting small door handles.
        for y in (-.25,.3):
            pts=[]
            for i in range(36):
                a=2*math.pi*i/36
                pts.append(namespace['point'](side,y+.13*math.copysign(abs(math.cos(a))**.4,math.cos(a)),
                    .02+.4*math.copysign(abs(math.sin(a))**.4,math.sin(a)),.010))
            line('Overwing exit frame',pts,closed=True,radius=.005)
            line('Exit handle',[namespace['point'](side,y-.04,.06,.014),namespace['point'](side,y+.06,.06,.014)],red,.009)
        # Metallic wheel axles and molded tyre grooves.
        for dx in (-.115,.115):
            for offset in (-.026,0,.026):
                wheel = ns['add_torus']('Main tyre circumferential groove',(side*.91+dx+offset,.91,.177),
                    .164,.003,joints,(0,math.pi/2,0),col)
                reduce = wheel.modifiers.new('Runtime groove reduction','DECIMATE')
                reduce.ratio=.2
        # Tail graphics are authored identity cues, with no external model dependency.
        sx=side*.064
        if tail_style=='globe':
            center=(4.70,2.68)
            for radius in (.48,.34,.17):
                line('Globe tail latitude',[(sx,center[0]+radius*math.cos(a),center[1]+.48*math.sin(a))
                    for a in [2*math.pi*i/64 for i in range(64)]],pale,.012,True)
            for z in (2.40,2.68,2.96):
                line('Globe tail longitude',[(sx,4.32,z),(sx,5.04,z)],pale,.013)
        elif tail_style in ('feathers','lotus'):
            for i in range(5):
                a=(i-2)*.36
                line('Tail feather motif',[(sx,4.74,2.27),(sx,4.74+math.sin(a)*.45,2.74),
                     (sx,4.74+math.sin(a)*.55,3.13),(sx,4.74,2.27)],pale,.024)
        elif tail_style=='maple':
            pts=[]
            for i in range(24):
                a=2*math.pi*i/24
                radius=.42 if i%2==0 else .22
                pts.append((sx,4.68+radius*math.cos(a),2.67+radius*math.sin(a)))
            line('Maple tail motif',pts,pale,.028,True)
            line('Maple stem',[(sx,4.68,2.35),(sx,4.68,2.16)],pale,.026)
        elif tail_style=='ribbon':
            for d in (-.12,.12):
                line('Swept tail ribbon',[(sx,4.22,2.38+d),(sx,4.57,2.65+d),(sx,4.92,3.04+d)],pale,.055)
        else:
            data=bpy.data.curves.new('Tail identity '+slug,'FONT')
            data.body=identifier;data.align_x='CENTER';data.align_y='CENTER';data.size=.34 if slug=='virgin-atlantic' else .6
            obj=bpy.data.objects.new('Tail identity '+slug,data);col.objects.link(obj)
            bpy.context.view_layer.objects.active=obj;obj.select_set(True)
            bpy.ops.object.convert(target='MESH');obj=bpy.context.object
            for vertex in obj.data.vertices:
                x,y=vertex.co.x,vertex.co.y
                vertex.co=(sx,4.68+side*x,2.7+y)
            obj.data.materials.append(pale)
        for y in (-4.8,-4.58):
            sphere('Cockpit sensor probe',(side*.39,y,1.34),(.025,.14,.025),silver)
    sphere('Satellite radome',(0,1.6,1.89),(.18,.4,.12))
    # Apply distinct proportions consistently to every component, retaining airline mapping.
    bpy.context.view_layer.update()
    for obj in list(col.objects):
        obj.location.x*=span;obj.location.y*=length
        obj.scale.x*=span;obj.scale.y*=length
    bpy.context.view_layer.update()
    objects=list(col.objects)
    target=Path(ns['export_asset']('airline-'+slug+'-fleet',objects))
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / ('airline-'+slug+'-fleet.blend')))
    records.append({'source':str(runtime.relative_to(ROOT)),
        'sourceSha256':hashlib.sha256(runtime.read_bytes()).hexdigest(),
        'runtime':'public/assets/'+target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
        'bytes':target.stat().st_size,'triangles':ns['triangle_count'](objects),
        'proportions':{'span':span,'length':length},'tailDetail':tail_style})
    print('FLEET_ASSET',slug,target.stat().st_size,flush=True)
(OUT/'fleet-provenance.json').write_text(json.dumps({'generator':'asset-sources/aircraft-realism/prepare_fleet.py',
    'generatorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'transformations':['Additive geometry detail','Distinct span and length proportions','Authored tail identity motifs',
        'Wing inspection and spoiler panels','Wing-body and pylon fairings','Spinner spirals and nacelle access panels',
        'Exit frames and handles, tyre grooves, cockpit probes and satellite radome','Batch static geometry by material'],
    'limitations':'Detailed authored airliner models, approximate airline identity cues and proportions, not exact aircraft replicas or official liveries.',
    'outputs':records},indent=2)+'\n')
