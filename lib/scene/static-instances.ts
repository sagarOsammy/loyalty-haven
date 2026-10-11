import * as THREE from "three";

/** Reuse selected asset geometry and maps across fixed furnishing placements. */
export class StaticInstances {
  private batches: THREE.InstancedMesh[] = [];

  batch(root: THREE.Group) {
    let added = 0;
    root.updateMatrixWorld(true);
    const inverseRoot = root.matrixWorld.clone().invert();
    const groups = new Map<string, THREE.Mesh[]>();
    root.traverse(object => {
      if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const key = [object.geometry.uuid, ...materials.map(material => material.uuid)].join(":");
      const group = groups.get(key) ?? [];
      group.push(object);
      groups.set(key, group);
    });
    for (const meshes of groups.values()) {
      if (meshes.length < 2) continue;
      const source = meshes[0];
      const batch = new THREE.InstancedMesh(source.geometry, source.material, meshes.length);
      batch.name = `Shared ${source.name}, ${meshes.length} placements`;
      batch.castShadow = source.castShadow;
      batch.receiveShadow = source.receiveShadow;
      meshes.forEach((mesh, index) => {
        batch.setMatrixAt(index, inverseRoot.clone().multiply(mesh.matrixWorld));
        mesh.removeFromParent();
      });
      batch.computeBoundingBox();
      batch.computeBoundingSphere();
      root.add(batch);
      this.batches.push(batch);
      added += 1;
    }
    return added;
  }

  dispose() {
    this.batches.forEach(batch => batch.dispose());
    this.batches = [];
  }
}
