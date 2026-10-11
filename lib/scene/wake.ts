import * as THREE from "three";
import { CRUISE_WAKE_LIFETIME, CRUISE_WAKE_WIDTH, type CruiseRoute } from "./cruise.ts";

/** World-space foam and short-lived stern spray, fading with the water's age. */
export class PropellerWake {
  readonly root = new THREE.Group();
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;
  readonly spray: THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>;
  private direction = new THREE.Vector3();
  private across = new THREE.Vector3();
  private normal = new THREE.Vector3(0,1,0);
  constructor() {
    const geometry = new THREE.PlaneGeometry(1,1);
    geometry.translate(0,0.5,0);
    const material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        { time: {value:0}, wakeAmount: {value:0}, foamColor: {value:new THREE.Color("#fff6e6")} },
      ]),
      vertexShader: `varying vec2 wakeUv; varying vec3 waterPoint;
        #include <fog_pars_vertex>
        void main() {
          wakeUv = uv;
          vec4 world = modelMatrix * vec4(position,1.0);
          waterPoint = world.xyz;
          vec4 mvPosition = viewMatrix * world;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform float time; uniform float wakeAmount; uniform vec3 foamColor;
        varying vec2 wakeUv; varying vec3 waterPoint;
        #include <fog_pars_fragment>
        float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
        }
        void main() {
          float age = wakeUv.y;
          float lateral = abs(wakeUv.x - 0.5);
          float spread = mix(0.16,0.48,pow(age,0.72));
          float dispersal = pow(1.0-age,1.65);
          float birth = 1.0-smoothstep(wakeAmount-0.025,wakeAmount,age);
          vec2 p = waterPoint.xz;
          float broad = noise(p*0.42 + vec2(time*0.11,-time*0.08));
          float fine = noise(p*2.7 + vec2(-time*0.35,time*0.20));
          float edge = spread * mix(0.86,1.10,broad);
          float bank = 1.0-smoothstep(edge*0.62,edge,lateral);
          float bubbles = smoothstep(0.28,0.65,broad*0.58+fine*0.42);
          float churn = exp(-age*9.0) * (0.55 + 0.45*fine);
          float crest = exp(-pow((lateral-edge*0.72)/0.035,2.0));
          float foam = (0.22 + bubbles*0.95 + churn*0.70 + crest*bubbles*0.32) * bank * dispersal * birth;
          float ripple = pow(0.5+0.5*sin(age*92.0-lateral*35.0-time*1.3),10.0);
          foam += ripple * bank * dispersal * birth * 0.22;
          if (foam < 0.008) discard;
          vec3 color = foamColor * mix(0.92,1.20,broad);
          gl_FragColor = vec4(color,min(foam,0.96));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
      transparent:true, depthWrite:false, side:THREE.DoubleSide, fog:true,
    });
    this.mesh = new THREE.Mesh(geometry,material);
    this.mesh.name = "FadingPropellerWake";
    this.mesh.renderOrder = 2;
    this.mesh.castShadow = this.mesh.receiveShadow = false;
    this.mesh.visible = false;
    const count = 72;
    const seeds = new Float32Array(count*3);
    for (let i=0;i<count;i++) {
      seeds[i*3] = (i*0.61803398875)%1;
      seeds[i*3+1] = (i*0.41421356237+0.2)%1;
      seeds[i*3+2] = (i*0.73205080757+0.4)%1;
    }
    const sprayGeometry = new THREE.BufferGeometry();
    sprayGeometry.setAttribute("position",new THREE.BufferAttribute(new Float32Array(count*3),3));
    sprayGeometry.setAttribute("spraySeed",new THREE.BufferAttribute(seeds,3));
    const sprayMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        { time:{value:0}, viewportHeight:{value:1168}, across:{value:new THREE.Vector3()},
          trailDirection:{value:new THREE.Vector3()}, foamColor:{value:new THREE.Color("#fff6e6")} },
      ]),
      vertexShader: `uniform float time; uniform float viewportHeight;
        uniform vec3 across; uniform vec3 trailDirection; attribute vec3 spraySeed;
        varying float sprayOpacity;
        #include <fog_pars_vertex>
        void main() {
          float flight = fract(time*(0.65+spraySeed.y*0.3)+spraySeed.z);
          float distanceBack = 0.5+flight*(5.0+spraySeed.y*5.0);
          float lateral = (spraySeed.x-0.5)*(3.0+flight*7.0);
          float height = 4.0*flight*(1.0-flight)*(0.45+spraySeed.y*0.75);
          vec3 offset = across*lateral+trailDirection*distanceBack+vec3(0,height,0);
          vec4 mvPosition = modelViewMatrix*vec4(offset,1.0);
          gl_Position = projectionMatrix*mvPosition;
          gl_PointSize = clamp((0.32+spraySeed.y*0.35)*viewportHeight*projectionMatrix[1][1]*0.5/-mvPosition.z,1.0,8.0);
          sprayOpacity = smoothstep(0.0,0.12,flight)*(1.0-smoothstep(0.60,1.0,flight));
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform vec3 foamColor; varying float sprayOpacity;
        #include <fog_pars_fragment>
        void main() {
          float droplet = 1.0-smoothstep(0.22,0.5,length(gl_PointCoord-0.5));
          if (droplet*sprayOpacity<0.02) discard;
          gl_FragColor = vec4(foamColor*1.1,droplet*sprayOpacity*0.85);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
      transparent:true, depthWrite:false, fog:true,
    });
    this.spray = new THREE.Points(sprayGeometry,sprayMaterial);
    this.spray.name = "PropellerSplashSpray";
    this.spray.renderOrder = 3;
    this.spray.frustumCulled = false;
    this.spray.visible = false;
    this.root.name = "CruiseFoamAndSpray";
    this.root.add(this.mesh,this.spray);
  }
  update(route: CruiseRoute,elapsed: number,viewportHeight = 1168) {
    const pose = route.pose(elapsed);
    const bow = new THREE.Vector3(Math.sin(pose.heading),0,Math.cos(pose.heading));
    this.mesh.position.copy(pose.position).addScaledVector(bow,-32.5).setY(-1.085);
    this.direction.copy(route.velocity).normalize().negate();
    this.across.set(-this.direction.z,0,this.direction.x);
    this.mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(this.across,this.direction,this.normal));
    this.mesh.scale.set(CRUISE_WAKE_WIDTH,route.velocity.length()*CRUISE_WAKE_LIFETIME,1);
    this.mesh.material.uniforms.time.value = elapsed;
    this.mesh.material.uniforms.wakeAmount.value = Math.min(1,elapsed/CRUISE_WAKE_LIFETIME);
    this.mesh.visible = elapsed > 0.1;
    this.spray.position.copy(this.mesh.position);
    this.spray.material.uniforms.time.value = elapsed;
    this.spray.material.uniforms.viewportHeight.value = viewportHeight;
    this.spray.material.uniforms.across.value.copy(this.across);
    this.spray.material.uniforms.trailDirection.value.copy(this.direction);
    this.spray.visible = this.mesh.visible;
  }
  dispose() {
    this.root.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.spray.geometry.dispose();
    this.spray.material.dispose();
  }
}
