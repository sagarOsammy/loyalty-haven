import * as THREE from "three";

export type FountainJet = { x: number; z: number; y: number; height: number; seed: number };

const noiseGLSL = `
  float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p) {
    vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
      mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
  }
`;

/** Turbulent upright streams, falling spray and irregular foam, with no outlined rings. */
export class FountainEffects {
  readonly root = new THREE.Group();
  readonly streams: THREE.InstancedMesh;
  readonly foam: THREE.InstancedMesh;
  readonly spray: THREE.Points;
  private time = {value: 0};
  private viewport = {value: 1278};

  constructor(jets: FountainJet[]) {
    this.root.name = "Grand animated fountain streams and foamy splashes";
    const streamGeometry = new THREE.CylinderGeometry(0.024,0.065,1,8,24,true);
    streamGeometry.translate(0,0.5,0);
    streamGeometry.setAttribute("jetSeed",new THREE.InstancedBufferAttribute(
      new Float32Array(jets.map(j=>j.seed)),1));
    const streamMaterial = new THREE.ShaderMaterial({
      uniforms: {time:this.time}, transparent:true, depthWrite:false, side:THREE.DoubleSide,
      vertexShader:`attribute float jetSeed;
        uniform float time;
        varying vec2 waterUv; varying float seed; varying float sheen;
        void main() {
          waterUv=uv; seed=jetSeed;
          vec3 p=position;
          float h=p.y;
          float wave=sin(h*44.0-time*9.0+jetSeed*8.0);
          p.x += h*h*(sin(h*12.0-time*2.8+jetSeed)*0.018+sin(jetSeed)*0.025);
          p.z += h*h*(cos(h*10.0-time*2.4+jetSeed)*0.018);
          p.xz *= 1.0+wave*0.16;
          vec4 view=modelViewMatrix*instanceMatrix*vec4(p,1.0);
          vec3 n=normalize(normalMatrix*mat3(instanceMatrix)*normal);
          sheen=pow(1.0-abs(dot(n,normalize(-view.xyz))),2.0);
          gl_Position=projectionMatrix*view;
        }`,
      fragmentShader:`uniform float time;
        varying vec2 waterUv; varying float seed; varying float sheen;
        ${noiseGLSL}
        void main() {
          float flow=noise(vec2(waterUv.x*13.0,waterUv.y*54.0-time*6.0+seed*17.0));
          float tip=1.0-smoothstep(0.64,1.0,waterUv.y);
          float strands=mix(0.32,0.78,flow)+sheen*0.22;
          vec3 cool=vec3(0.52,0.68,0.75);
          vec3 lit=vec3(1.55,1.33,0.95);
          vec3 color=mix(cool,lit,clamp(sheen*0.65+flow*0.4,0.0,1.0));
          gl_FragColor=vec4(color,strands*tip);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.streams = new THREE.InstancedMesh(streamGeometry,streamMaterial,jets.length);
    this.streams.frustumCulled = false;
    this.streams.name = "Tapered shimmering upright water jets";
    this.streams.renderOrder = 4;
    const transform = new THREE.Object3D();
    jets.forEach((jet,i)=>{
      transform.position.set(jet.x,jet.y,jet.z);
      transform.rotation.set(0,jet.seed,0);
      transform.scale.set(1,jet.height,1);
      transform.updateMatrix();
      this.streams.setMatrixAt(i,transform.matrix);
    });
    this.root.add(this.streams);

    const foamGeometry = new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
    foamGeometry.setAttribute("jetSeed",new THREE.InstancedBufferAttribute(
      new Float32Array(jets.map(j=>j.seed)),1));
    const foamMaterial = new THREE.ShaderMaterial({
      uniforms:{time:this.time},transparent:true,depthWrite:false,
      vertexShader:`attribute float jetSeed; varying vec2 foamUv; varying float seed;
        void main() {
          foamUv=uv; seed=jetSeed;
          gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);
        }`,
      fragmentShader:`uniform float time; varying vec2 foamUv; varying float seed;
        ${noiseGLSL}
        void main() {
          vec2 p=(foamUv-0.5)*2.0;
          float broad=noise(p*4.2+vec2(time*0.4,seed));
          float fine=noise(p*24.0+vec2(seed-time*0.8,time*0.7));
          float envelope=exp(-dot(p,p)*mix(3.8,6.8,broad));
          float bubbles=smoothstep(0.33,0.62,broad*0.42+fine*0.58);
          float churn=noise(p*10.0-vec2(time*1.1,seed))*exp(-dot(p,p)*10.0);
          float alpha=envelope*(bubbles*0.66+churn*0.24);
          if(alpha<0.015) discard;
          gl_FragColor=vec4(vec3(1.3,1.24,1.08),alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.foam = new THREE.InstancedMesh(foamGeometry,foamMaterial,jets.length);
    this.foam.name = "Broken turbulent foam at jet impacts";
    this.foam.frustumCulled = false;
    this.foam.renderOrder = 3;
    jets.forEach((jet,i)=>{
      transform.position.set(jet.x,jet.y+0.012,jet.z);
      transform.rotation.set(0,jet.seed,0);
      transform.scale.setScalar(jet.height>3.5?1.75:jet.height>2.6?1.25:1.05);
      transform.updateMatrix();
      this.foam.setMatrixAt(i,transform.matrix);
    });
    this.root.add(this.foam);

    const positions:number[] = [], flights:number[] = [], variations:number[] = [];
    jets.forEach(jet=>{
      // 112 falling droplets plus 32 small impact splashes per nozzle.
      for(let i=0;i<144;i++) {
        const random = (n:number)=>((Math.sin(n*91.713+jet.seed*17.13)*43758.5453)%1+1)%1;
        const splash = i>=112;
        positions.push(jet.x,jet.y,jet.z);
        flights.push(random(i+3),random(i+91)*Math.PI*2,
          splash?0.08+random(i+331)*0.28:jet.height*(0.76+random(i+331)*0.24),
          splash?0.16+random(i+48)*0.24:0.15+random(i+48)*0.42);
        variations.push(splash?1:0,random(i+771),random(i+283),jet.seed);
      }
    });
    const sprayGeometry = new THREE.BufferGeometry();
    sprayGeometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
    sprayGeometry.setAttribute("flight",new THREE.Float32BufferAttribute(flights,4));
    sprayGeometry.setAttribute("variation",new THREE.Float32BufferAttribute(variations,4));
    const sprayMaterial = new THREE.ShaderMaterial({
      uniforms:{time:this.time,viewportHeight:this.viewport},transparent:true,depthWrite:false,
      vertexShader:`attribute vec4 flight; attribute vec4 variation;
        uniform float time; uniform float viewportHeight;
        varying float opacity; varying float warm;
        void main() {
          float t=fract(time*(variation.x>0.5?1.25:0.54)+flight.x);
          float angle=flight.y;
          vec3 p=position;
          float spread=flight.w*t;
          p.xz+=vec2(cos(angle),sin(angle))*spread;
          p.y+=flight.z*4.0*t*(1.0-t);
          p.xz+=vec2(sin(t*15.0+variation.w),cos(t*18.0+variation.w))*0.015*t;
          vec4 view=modelViewMatrix*vec4(p,1.0);
          gl_Position=projectionMatrix*view;
          float size=variation.x>0.5?0.065:0.025+variation.y*0.035;
          gl_PointSize=clamp(viewportHeight*size/-view.z,1.0,7.0);
          opacity=(0.27+variation.z*0.48)*(1.0-smoothstep(0.88,1.0,t));
          warm=variation.y;
        }`,
      fragmentShader:`varying float opacity; varying float warm;
        void main() {
          float d=length(gl_PointCoord-0.5);
          float alpha=(1.0-smoothstep(0.08,0.5,d))*opacity;
          if(alpha<0.01) discard;
          gl_FragColor=vec4(mix(vec3(0.87,1.0,1.13),vec3(1.7,1.4,0.95),warm),alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.spray = new THREE.Points(sprayGeometry,sprayMaterial);
    this.spray.name = "Falling water spray and foamy impact splashes";
    this.spray.frustumCulled = false;
    this.spray.renderOrder = 5;
    this.root.add(this.spray);
  }

  update(phase:number,viewportHeight:number) {
    this.time.value=phase;
    this.viewport.value=viewportHeight;
  }

  dispose() {
    this.streams.dispose();
    this.foam.dispose();
    this.spray.geometry.dispose();
    (this.spray.material as THREE.ShaderMaterial).dispose();
  }
}
