"""Second aircraft pass, preserving the original generator and both previous GLBs."""
import bpy, hashlib, json, math, os
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get('LOYALTY_AIRCRAFT_REALISM_OUT', '/private/tmp/loyalty-aircraft-realism-final-20260915'))
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = ROOT / 'asset-sources/aircraft/build_assets.py'
os.environ['ASSET_EXPORT_DIR'] = str(OUT)
os.environ['ASSET_RENDER_DIR'] = str(OUT)
os.environ['ASSET_SOURCE_DIR'] = str(SOURCE.parent / 'sources')
ns = {'__name__': 'preserved_aircraft_source', '__file__': str(SOURCE)}
exec(compile(SOURCE.read_text(), str(SOURCE), 'exec'), ns)
ns['clean_scene']()
ns['make_materials']()
m = ns['MATS']
mesh, sphere = ns['create_mesh'], ns['add_uv_sphere']
def curve(*args, **kwargs):
    obj=ns['add_curve'](*args, **kwargs)
    obj.data.resolution_u=2
    obj.data.bevel_resolution=1
    return obj
cylinder, torus, cube = ns['add_cylinder'], ns['add_torus'], ns['add_cube']
for key in ['airframe_white', 'airframe_shadow', 'united_navy', 'united_blue', 'avianca_red', 'avianca_wine', 'aircanada_red', 'aircanada_grey']:
    node = m[key].node_tree.nodes.get('Principled BSDF')
    node.inputs['Metallic'].default_value = .10 if key == 'airframe_shadow' else .035
    node.inputs['Roughness'].default_value = .28
m['airframe_shadow'].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (.65,.69,.71,1)
m['glass'].node_tree.nodes.get('Principled BSDF').inputs['Transmission Weight'].default_value = 0
m['glass'].node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .16
seam = ns['material']('Airframe fine panel joints', (.24,.28,.30), roughness=.55)
metal = m['engine_fan']
# A narrower cabin, rounded radome and long taper. The length and wing footprint stay fixed.
profile = [(-6.02,.018,.018,1.16),(-5.88,.17,.14,1.17),(-5.65,.34,.29,1.19),
 (-5.32,.49,.44,1.23),(-4.88,.58,.56,1.25),(-4.25,.62,.62,1.25),
 (-3.4,.63,.63,1.25),(0,.64,.63,1.25),(2.7,.62,.62,1.25),
 (3.7,.55,.54,1.28),(4.55,.41,.40,1.33),(5.2,.25,.24,1.39),
 (5.72,.10,.10,1.43),(6.02,.018,.018,1.46)]
def cross(y):
    for i in range(len(profile)-1):
        a,b=profile[i:i+2]
        if a[0] <= y <= b[0]:
            t=(y-a[0])/(b[0]-a[0]); t2=t*t; t3=t2*t
            p=profile[max(0,i-1)]; q=profile[min(len(profile)-1,i+2)]
            vals=[]
            for k in range(1,4):
                d0=(b[k]-p[k])/(b[0]-p[0])*(b[0]-a[0])
                d1=(q[k]-a[k])/(q[0]-a[0])*(b[0]-a[0])
                vals.append((2*t3-3*t2+1)*a[k]+(t3-2*t2+t)*d0+(-2*t3+3*t2)*b[k]+(t3-t2)*d1)
            return vals
    return profile[0][1:] if y<profile[0][0] else profile[-1][1:]
def point(side,y,phi,offset=.006):
    rx,rz,cz=cross(y)
    return (side*(rx+offset)*math.cos(phi), y, cz+(rz+offset)*math.sin(phi))
def fuselage(c):
    verts=[]; faces=[]; ids=[]; n=64; rings=129
    for i in range(rings):
        y=-6.02+12.04*i/(rings-1);rx,rz,cz=cross(y)
        for j in range(n):
            a=2*math.pi*j/n;verts.append((rx*math.cos(a),y,cz+rz*math.sin(a)))
    for i in range(rings-1):
        for j in range(n):
            faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
            ids.append(1 if math.sin(2*math.pi*(j+.5)/n)<-.50 else 0)
    faces.extend([tuple(reversed(range(n))),tuple((rings-1)*n+j for j in range(n))]);ids.extend([0,1])
    obj=mesh('Smooth cabin and radome',verts,[f[::-1] for f in faces],[m['airframe_white'],m['united_blue']],ids,c)
    return obj
def patch(name,side,coords,mat,c):
    # Bilinear tessellation in fuselage coordinates keeps panes attached to the skin.
    verts=[];faces=[];n=5
    for i in range(n+1):
        for j in range(n+1):
            u=i/n;v=j/n
            y=(1-u)*(coords[0][0]*(1-v)+coords[1][0]*v)+u*(coords[3][0]*(1-v)+coords[2][0]*v)
            phi=(1-u)*(coords[0][1]*(1-v)+coords[1][1]*v)+u*(coords[3][1]*(1-v)+coords[2][1]*v)
            verts.append(point(side,y,phi,.009))
    for i in range(n):
        for j in range(n):
            a=i*(n+1)+j;f=(a,a+1,a+n+2,a+n+1);faces.append(f if side>0 else f[::-1])
    obj=mesh(name,verts,faces,[mat],None,c)
    mat.use_nodes=True
    return obj

def windows(c):
    for side in (-1,1):
        for idx,coords in enumerate([
            [(-5.35,.70),(-5.22,1.45),(-4.95,1.44),(-4.88,.69)],
            [(-4.84,.67),(-4.91,1.37),(-4.55,1.05),(-4.48,.53)],
            [(-4.44,.52),(-4.51,.99),(-4.30,.85),(-4.29,.48)],
        ]):
            patch('Cockpit pane %s %s'%(side,idx),side,coords,m['glass'],c)
        for i in range(29):
            y=-3.55+i*.25
            if abs(y+3.95)<.3 or abs(y-3.75)<.3 or abs(y-.45)<.22:continue
            verts=[point(side,y,.36,.009)]
            for j in range(24):
                a=2*math.pi*j/24
                verts.append(point(side,y+.045*math.cos(a),.36+.13*math.sin(a),.010))
            faces=[(0,j+1,(j+1)%24+1) for j in range(24)]
            obj=mesh('Oval cabin glass %s %s'%(side,i),verts,faces,[m['glass']],None,c)
            # Export double-sided decals to retain outward visibility on both sides.
            m['glass'].use_backface_culling=False
        for y in (-3.97,3.58):
            pts=[]
            for j in range(40):
                a=2*math.pi*j/40
                yy=y+.205*math.copysign(abs(math.cos(a))**.4,math.cos(a))
                pp=.02+.60*math.copysign(abs(math.sin(a))**.4,math.sin(a))
                pts.append(point(side,yy,pp,.008))
            curve('Flush passenger door outline',pts,seam,.006,c,True)
            curve('Door handle',[point(side,y+.1,.04,.017),point(side,y+.17,.04,.017)],metal,.009,c)
        # Short, flush radome seam is visible in raking light, without raised panels.
        curve('Radome joint',[point(side,-5.58,-math.pi/2+j*math.pi/32,.003) for j in range(33)],seam,.003,c)
    return []

def wing(name,side,c,zbase=1.02,span=5.72,root_x=.55):
    xs=[root_x,1.2,2.2,3.5,4.8,span]
    leads=[-1.2,-.97,-.48,.25,1.0,1.67];trails=[2.02,2.0,2.12,2.23,2.32,2.42]
    ts=[0,.015,.04,.09,.18,.30,.45,.62,.78,.9,1]
    verts=[];faces=[];ids=[]
    for x,le,tr in zip(xs,leads,trails):
        chord=tr-le
        for sign in (1,-1):
            for t in ts:
                thick=5*.065*chord*(.2969*math.sqrt(t)-.126*t-.3516*t*t+.2843*t**3-.1036*t**4)
                verts.append((side*x,le+t*chord,zbase+.045*x+sign*thick+.02*math.sin(math.pi*t)))
    row=len(ts)*2
    for i in range(len(xs)-1):
        for half in (0,1):
            for j in range(len(ts)-1):
                a=i*row+half*len(ts)+j
                f=(a,a+1,a+row+1,a+row)
                faces.append(f[::-1] if (side>0)==(half==0) else f);ids.append(half)
    o=mesh(name,verts,faces,[m['airframe_white'],m['airframe_shadow']],ids,c)
    for frac in (.17,.75):
        curve(name+' slat or flap joint',[(side*x,le+(tr-le)*frac,zbase+.045*x+.06) for x,le,tr in zip(xs[1:],leads[1:],trails[1:])],seam,.004,c)
    for x in (1.65,2.6,3.7):
        sphere(name+' flap track fairing',(side*x,2.2,.94+.045*x),(.055,.37,.075),m['airframe_shadow'],c,segments=16,rings=8)
    # Slim, swept upward tip, preserving the established 11.56m maximum span.
    v=[(side*5.70,1.67,1.27),(side*5.70,2.42,1.27),(side*5.78,2.34,1.95),(side*5.76,2.13,1.98)]
    tip=mesh(name+' swept wingtip',v,[(0,1,2,3)],[m['united_navy']],None,c)
    solid=tip.modifiers.new('Wingtip thickness','SOLIDIFY');solid.thickness=.016
    return [o,tip]

def tail(c):
    verts=[(-.055,3.04,1.53),(-.055,5.65,1.48),(-.055,5.12,3.54),(-.055,4.47,3.54)]
    verts += [(abs(x),y,z) for x,y,z in verts]
    fin=mesh('Swept vertical tail',verts,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],[m['united_navy']],None,c)
    for poly in fin.data.polygons:poly.use_smooth=False
    for side in (-1,1):
        v=[(side*.35,3.5,1.58),(side*.35,5.17,1.58),(side*2.22,5.5,1.73),(side*2.22,4.89,1.73)]
        o=mesh('Swept horizontal stabilizer',v,[(0,1,2,3)],[m['airframe_shadow']],None,c)
        sol=o.modifiers.new('Tail airfoil thickness','SOLIDIFY');sol.thickness=.035
        curve('Rudder hinge',[(side*.059,5.28,1.8),(side*.059,4.96,3.50)],seam,.005,c)
    return [fin]

def engine(name,x,c):
    x=math.copysign(2.18,x);z=.66
    def rev(name,*args):
        obj=ns['create_revolved'](name,*args)
        if 'throat' not in name:obj.data.flip_normals()
        return obj
    rev(name+' sculpted nacelle',x,z,[(-1.03,.40),(-.97,.45),(-.82,.465),(-.5,.45),(.05,.40),(.48,.32),(.72,.28)],m['airframe_white'],c)
    rev(name+' intake throat',x,z,[(-1.03,.40),(-.94,.38),(-.67,.355),(-.57,.34)],m['engine_dark'],c)
    torus(name+' polished intake lip',(x,-1.015,z),.414,.027,metal,(math.pi/2,0,0),c)
    cylinder(name+' recessed fan shadow',(x,-.565,z),.347,.012,m['engine_dark'],48,(math.pi/2,0,0),c)
    for i in range(24):
        a=2*math.pi*i/24;v=[]
        for r,twist,width in [(.075,0,.045),(.20,.19,.04),(.342,.43,.026)]:
            for off in (-width,width):v.append((x+r*math.cos(a+twist+off),-.64+.055*r,z+r*math.sin(a+twist+off)))
        mesh(name+' swept fan blade',v,[(0,1,3,2),(2,3,5,4)],[metal],None,c)
    sphere(name+' conical spinner',(x,-.67,z),(.089,.145,.089),metal,c,segments=24,rings=12)
    rev(name+' exhaust inner nozzle',x,z,[(.43,.235),(.80,.20),(.98,.10)],m['engine_dark'],c)
    rev(name+' heat resistant exhaust',x,z,[(.48,.29),(.78,.23)],metal,c)
    cube(name+' mounting pylon',(x,.06,1.08),(.12,.78,.14),m['airframe_shadow'],.04,collection=c)
    # Fine cowl seams and fasteners avoid dark decorative stripes.
    torus(name+' cowl joint',(x,-.37,z),.439,.003,seam,(math.pi/2,0,0),c)
    return []

def rod(name,a,b,r,mat,c):
    o=cylinder(name,(Vector(a)+Vector(b))*.5,r,(Vector(b)-Vector(a)).length,mat,16,collection=c)
    o.rotation_euler=(Vector(b)-Vector(a)).to_track_quat('Z','Y').to_euler();return o

def gear(c):
    for side in (-1,1):
        x=side*.91
        rod('Main oleo',(x,.91,.25),(x,.91,.91),.035,metal,c)
        rod('Main drag brace',(x,.91,.28),(side*.64,1.35,.83),.023,m['airframe_shadow'],c)
        for dx in (-.115,.115):
            torus('Main tire',(x+dx,.91,.177),.118,.058,m['rubber'],(0,math.pi/2,0),c)
            cylinder('Main wheel hub',(x+dx,.91,.177),.075,.082,metal,24,(0,math.pi/2,0),c)
        cube('Main gear door',(x+side*.18,.94,.63),(.022,.36,.45),m['airframe_white'],.015,collection=c)
    rod('Nose oleo',(0,-4.14,.16),(0,-4.14,.77),.026,metal,c)
    rod('Nose drag brace',(0,-4.14,.25),(0,-3.77,.65),.02,m['airframe_shadow'],c)
    for x in (-.09,.09):
        torus('Nose tire',(x,-4.14,.118),.078,.039,m['rubber'],(0,math.pi/2,0),c)
        cylinder('Nose hub',(x,-4.14,.118),.046,.047,metal,20,(0,math.pi/2,0),c)
    return []

def logo(c,path,airline,mat,fallback):
    for side in (-1,1):
        data=bpy.data.curves.new(airline+' flush Wordmark','FONT');data.body=fallback;data.align_x='CENTER';data.align_y='CENTER';data.size=.235
        obj=bpy.data.objects.new(airline+' Wordmark',data);ns['link_object'](obj,c)
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH');obj=bpy.context.object
        # Project every letter vertex onto the skin. The old slim-body derivative
        # retained the original wider-body placement, leaving its wordmark floating.
        for v in obj.data.vertices:
            u,vv=v.co.x,v.co.y;y=-2.15+side*u;z=1.62+vv
            rx,rz,cz=cross(y);frac=max(-.99,min(.99,(z-cz)/rz))
            v.co=(side*(rx*math.sqrt(1-frac*frac)+.008),y,z)
        ns['assign_mat'](obj,mat)
        for poly in obj.data.polygons:poly.use_smooth=True
        mat.use_backface_culling=False

ns.update(create_fuselage=fuselage,create_wing=wing,create_tail=tail,create_engine=engine,add_aircraft_windows=windows,add_gear=gear,add_airline_logo=logo)
ns['create_aircraft']()
# Reposition inherited antennae and navigation lights onto the revised surfaces.
for obj in bpy.data.collections['AIRCRAFT_UNITED'].objects:
    if obj.name.startswith('Top Antenna'):obj.location.z=1.93
    elif obj.name=='Tail Beacon':obj.location=(0,4.0,1.80)
    elif 'Navigation Light' in obj.name:obj.location=(math.copysign(5.73,obj.location.x),2.22,1.91);obj.scale*=.65
ns['duplicate_aircraft_variant']('airline-avianca','AIRCRAFT_AVIANCA','Avianca',ns['AVIANCA_LOGO_PATH'],m['avianca_red'],m['avianca_wine'],m['avianca_red'],'avianca')
ns['duplicate_aircraft_variant']('airline-air-canada','AIRCRAFT_AIR_CANADA','Air Canada',ns['AIR_CANADA_LOGO_PATH'],m['aircanada_red'],m['aircanada_grey'],m['aircanada_wordmark'],'AIR CANADA')
# Keep editable components with all three variants in a recoverable authoring file.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'aircraft-realism.blend'))
records=[]
for name,objects in ns['ASSETS'].items():
    for obj in objects:
        if obj.type=='MESH':obj.data.validate(verbose=False);obj.data.update()
    target=Path(ns['export_asset'](name+'-realism',objects))
    records.append({'source':'asset-sources/retired-runtime/assets/'+name+'-detail.glb','sourceSha256':hashlib.sha256((ROOT/'asset-sources/retired-runtime/assets'/(name+'-detail.glb')).read_bytes()).hexdigest(),'runtime':'public/assets/'+target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size})
# Reimport the serialized asset for studio verification.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT/'airline-united-realism.glb'))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.world=bpy.data.worlds.new('Soft studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.29,.35,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
for loc,energy,size,color in [((5,-8,11),1800,7,(1,.9,.8)),((-8,-3,6),1300,8,(.65,.8,1)),((0,8,10),2000,6,(1,1,1))]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=energy;o.data.size=size;o.data.color=color;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.025));o=bpy.context.object
floor=bpy.data.materials.new('Studio floor');floor.diffuse_color=(.11,.14,.18,1);o.data.materials.append(floor)
bpy.ops.object.camera_add(location=(13,-16,7));cam=bpy.context.object;cam.data.lens=54;scene.camera=cam
scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
for filename,loc,target in [('aircraft-realism-preview.png',(13,-16,7),(0,0,1.2)),('aircraft-nose-preview.png',(7,-11,4),(.1,-2.5,1.2))]:
    cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/filename);bpy.ops.render.render(write_still=True)
(OUT/'provenance.json').write_text(json.dumps({'sourceGenerator':str(SOURCE.relative_to(ROOT)),'sourceGeneratorSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'changes':['Narrower smoothly interpolated cabin and rounded radome','Swept thin airfoils, slat and flap joints, swept stabilizers','Recessed intake throat with 24 swept fan blades, spinner and tapered exhaust','Flush projected upright airline wordmarks and fine door outlines','Oval cabin windows, six cockpit panes and paired landing wheels'],'outputs':records,'limitations':'Authored generic airliner approximations with retained airline colors and wordmark references, not exact aircraft types or certified liveries'},indent=2)+'\n')
print('REALISM_EXPORT_COMPLETE',json.dumps(records))
