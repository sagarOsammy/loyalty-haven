import * as THREE from "three";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";

/** Lettering stays crisp while the resort keeps its cinematic depth of field. */
export class LabelPass extends RenderPass {
  private labelCamera = new THREE.PerspectiveCamera();

  constructor(scene: THREE.Scene, private view: THREE.PerspectiveCamera) {
    super(scene, view);
    this.clear = false;
  }

  override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ) {
    this.labelCamera.copy(this.view);
    this.labelCamera.layers.set(1);
    this.camera = this.labelCamera;
    const background = this.scene.background;
    const fog = this.scene.fog;
    this.scene.background = null;
    this.scene.fog = null;
    try {
      renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
      renderer.clearDepth();
      super.render(renderer, writeBuffer, readBuffer, 0, false);
    } finally {
      this.scene.background = background;
      this.scene.fog = fog;
    }
  }
}
