# Flowering trees, stage 7

The selected source is Tripo Option A, a flowering tree with white blossoms, realistic branches, and trunk:

https://studio.tripo3d.ai/3d-model/flowering-tree-with-white-blossoms-realistic-branches-and-trunk-d07a87b2-1421-4f1b-92e9-779226e76b3c

The supplied export is preserved at `source/flower.glb`. The implementation adapter uses a separate optimized derivative, with no procedural substitute.

The model page showed 195,138 triangle faces and 111,752 vertices at 2026-10-11T15:50:49Z. The preserved local source has the same counts and SHA-256 `94f7b0539437fee36f3836fed0a3997a8515b9a472c0f30c5601631a8e38f86e`.

The runtime derivative is `public/assets/flowering-tree-tripo.glb`, with 25,165 exported vertices, 30,246 triangles, one embedded 2048px color map, and a 1,350,564 byte file size. Its normalized Blender dimensions are approximately 5.062 by 4.766 by 4.202 metres, grounded at zero with a uniform scale. Rendered evidence is available in `source-preview.png` and `derivative-preview.png`.

Record both source and runtime counts before repetition:

- source mesh count, vertices, and triangles
- exported GLB mesh count, vertices, and triangles
- embedded material and texture count
- normalized world bounds
- repeated six-instance draw and memory cost

The derivative preserves the visible branch structure and white blossoms while reducing repeated-instance cost. Keep the original Tripo export byte-identical, and place any derivative beside it with a provenance record.

The scene adapter adds six lightweight shared planting wells under the imported trees, each 1.7 metres in diameter with 0.15 metre soil and 0.18 metre pale-stone coping. These bases are separate from the source GLB and are disposed once with the stage.
