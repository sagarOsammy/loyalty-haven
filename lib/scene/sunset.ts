import * as THREE from "three";

export const SUNSET_SKY = "/assets/sunset-sky-20261010.png";
export const HORIZON_FRACTION = 0.14;
const WATERLINE = -1.12;

/** Fit a distant sky and level sea horizon without moving the resort camera. */
export class SunsetAtmosphere {
  readonly root = new THREE.Group();
  readonly sky: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  readonly seabed: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  readonly lightDirection = new THREE.Vector3();
  readonly sunPosition = new THREE.Vector3();
  horizonFraction = HORIZON_FRACTION;
  readonly mountains = new THREE.Group();
  private mountainBounds?: THREE.Box3;
  private texture?: THREE.Texture;
  private disposed = false;
  private raycaster = new THREE.Raycaster();

  constructor() {
    this.root.name = "SunsetAtmosphere";
    this.sky = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: { skyMap: { value: null }, skyReady: { value: false }, skyBounds: { value: new THREE.Vector4() }, sunCenter: { value: new THREE.Vector2(0.886, 0.214) },
        sunAspect: { value: 1 } },
      vertexShader: `varying vec2 skyPoint;
        void main() { skyPoint = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D skyMap; uniform bool skyReady; uniform vec4 skyBounds; uniform vec2 sunCenter; uniform float sunAspect;
        varying vec2 skyPoint;
        void main() {
          vec2 uv = (skyPoint - skyBounds.xy) / skyBounds.zw;
          vec2 skyUv = clamp(uv,0.0,1.0);
          vec3 color = skyReady ? texture2D(skyMap,skyUv).rgb : mix(vec3(0.76,0.42,0.30),vec3(0.93,0.64,0.39),uv.x);
          // Retain the previous clouds, replacing only its painted terrain below the new model.
          float terrain = smoothstep(0.64,0.68,uv.x) * (1.0 - smoothstep(0.125,0.15,uv.y));
          vec3 clearHorizon = skyReady ? texture2D(skyMap,vec2(skyUv.x,0.15)).rgb : color;
          color = mix(color,clearHorizon,terrain);
          float oldSun = 1.0 - smoothstep(0.012,0.022,length((uv - vec2(0.886,0.214)) * vec2(1.0,0.333333)));
          vec3 neighboringSky = skyReady ? texture2D(skyMap,vec2(0.841,skyUv.y)).rgb : color;
          color = mix(color,neighboringSky,oldSun);
          vec2 delta = (uv - sunCenter) * vec2(sunAspect, 1.0);
          float disk = 1.0 - smoothstep(0.073, 0.080, length(delta));
          float glow = exp(-dot(delta,delta) * 22.0) * 0.28;
          color += vec3(1.0,0.56,0.13) * glow;
          color = mix(color,vec3(1.0,0.98,0.83),disk);
          gl_FragColor = vec4(color,1.0);
          #include <colorspace_fragment>
        }`,
      depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false,
    }));
    this.sky.name = "RestoredSunsetCloudBackdrop";
    this.mountains.name = "TripoDistantMountains";
    this.seabed = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: "#1c3b4a", toneMapped: true }));
    this.seabed.name = "WaterTransparencyUnderlay";
    this.root.add(this.sky, this.seabed, this.mountains);
  }

  async load() {
    const texture = await new THREE.TextureLoader().loadAsync(SUNSET_SKY);
    if (this.disposed) { texture.dispose(); return; }
    this.texture = texture;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.sky.material.uniforms.skyMap.value = texture;
    this.sky.material.uniforms.skyReady.value = true;
  }

  /** Retain all mountain geometry and embedded maps, normalized to unit width. */
  useMountain(model: THREE.Group) {
    if (this.disposed) return;
    model.rotation.y = Math.PI / 2;
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const scale = 1 / bounds.getSize(new THREE.Vector3()).x;
    const center = bounds.getCenter(new THREE.Vector3());
    model.scale.multiplyScalar(scale);
    model.position.set(-center.x * scale,-bounds.min.y * scale,-center.z * scale);
    const wrapper = new THREE.Group();
    wrapper.add(model);
    wrapper.updateMatrixWorld(true);
    this.mountainBounds = new THREE.Box3().setFromObject(wrapper);
    // Anchor the upper ridgeline, avoiding the submerged rectangular terrain apron.
    const ridge = new THREE.Box3();
    const point = new THREE.Vector3();
    const threshold = this.mountainBounds.max.y * 0.60;
    wrapper.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const vertices = object.geometry.getAttribute("position");
      for (let i = 0; i < vertices.count; i++) {
        point.fromBufferAttribute(vertices,i).applyMatrix4(object.matrixWorld);
        if (point.y >= threshold) ridge.expandByPoint(point);
      }
    });
    if (!ridge.isEmpty()) this.mountainBounds = ridge;
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = false;
      object.receiveShadow = false;
    });
    this.mountains.add(wrapper);
  }

  fit(camera: THREE.PerspectiveCamera, sea: THREE.Mesh, viewportHeight: number) {
    const away = camera.getWorldDirection(new THREE.Vector3());
    away.y = 0;
    away.normalize();
    const right = new THREE.Vector3().crossVectors(away, new THREE.Vector3(0, 1, 0));
    this.horizonFraction = Math.max(HORIZON_FRACTION, Math.min(0.22, 140 / viewportHeight));
    const horizonNdc = 1 - this.horizonFraction * 2;
    this.raycaster.setFromCamera(new THREE.Vector2(0, horizonNdc), camera);
    const horizon = this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0), -WATERLINE), new THREE.Vector3())!;
    const backdropPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(away, horizon);
    const screenPoint = (x: number, y: number) => {
      this.raycaster.setFromCamera(new THREE.Vector2(x,y), camera);
      return this.raycaster.ray.intersectPlane(backdropPlane, new THREE.Vector3())!;
    };
    const top = screenPoint(0,1);
    const left = screenPoint(-1,horizonNdc);
    const width = horizon.clone().sub(left).length() * 2;
    const height = top.y - WATERLINE;
    this.sky.position.copy(horizon);
    this.sky.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, new THREE.Vector3(0,1,0), away.clone().negate()));
    // Overscan covers the sky in the reflected camera as well as the visible view.
    this.sky.scale.set(2400, 1200, 1);
    this.sky.material.uniforms.skyBounds.value.set(-width / 4800, 0, width / 2400, height / 1200);
    this.sky.material.uniforms.sunAspect.value = width / height;
    // Increase all three presentation dimensions by the requested 25 percent.
    this.mountains.position.copy(horizon).addScaledVector(away,8).setY(WATERLINE - width * 0.011 * 1.25);
    this.mountains.quaternion.copy(this.sky.quaternion);
    this.mountains.scale.set(width * 0.40 * 1.25,width * 0.15 * 1.25,width * 0.08 * 1.25);
    if (this.mountainBounds) {
      // Solve the camera projection so the terrain stays flush with the right edge.
      const projection = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
      const shift = new THREE.Vector4(right.x,right.y,right.z,0).applyMatrix4(projection);
      let offset = Infinity;
      for (const x of [this.mountainBounds.min.x,this.mountainBounds.max.x]) {
        for (const y of [this.mountainBounds.min.y,this.mountainBounds.max.y]) {
          for (const z of [this.mountainBounds.min.z,this.mountainBounds.max.z]) {
            const corner = new THREE.Vector3(x,y,z).multiply(this.mountains.scale).applyQuaternion(this.mountains.quaternion).add(this.mountains.position);
            const clip = new THREE.Vector4(corner.x,corner.y,corner.z,1).applyMatrix4(projection);
            offset = Math.min(offset,(clip.w * 1.03 - clip.x) / (shift.x - shift.w * 1.03));
          }
        }
      }
      this.mountains.position.addScaledVector(right,offset);
    }
    // Keep the sun to the left of the fixed scene buttons in smaller panels.
    const sunU = Math.min(0.886, 1 - 190 / (viewportHeight * camera.aspect));
    this.sky.material.uniforms.sunCenter.value.set(sunU,0.214);
    this.sunPosition.copy(horizon).addScaledVector(right, width * (sunU - 0.5)).setY(WATERLINE + height * 0.214);
    this.lightDirection.copy(this.sunPosition).setY(0).normalize();
    // A low golden-hour key produces long shadows toward the lower-left plaza.
    this.lightDirection.multiplyScalar(Math.cos(THREE.MathUtils.degToRad(19)));
    this.lightDirection.y = Math.sin(THREE.MathUtils.degToRad(19));
    const depth = 700;
    const seaCenter = horizon.clone().addScaledVector(away, -depth / 2);
    sea.position.copy(seaCenter);
    sea.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, away, new THREE.Vector3(0,1,0)));
    sea.scale.set(1800, depth, 1);
    this.seabed.position.copy(seaCenter).setY(-4.5);
    this.seabed.quaternion.copy(sea.quaternion);
    this.seabed.scale.copy(sea.scale);
  }

  dispose() { this.disposed = true; this.texture?.dispose(); }
}
