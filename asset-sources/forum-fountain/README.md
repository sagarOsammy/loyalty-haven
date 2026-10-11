# Fountain-ready forum derivative

`prepare_forum.py` imports the preserved `public/assets/forum.glb`, separates the merged material batches, and removes 28 low stage, seating, turntable, obsolete plaque and entry-step components. All ten pillars and their plinths, arches and upper bands retain their original coordinates. It batches the retained architecture into three meshes and exports `public/assets/forum-fountain.glb`, with a separate editable Blender source.

`provenance.json` records source and destination hashes, every removed component, the retained pillar bounds and resulting metrics. The original GLB and original architecture sources remain intact.

The fitted basins, coping, water, jets, droplets, ripples and four underwater lights are authored in `lib/scene/fountains.ts` as a dedicated scene group. They use the existing local water normal map. All movement follows the world's phase, including its pause control. No supplied 3D asset or Tripo export is required for this stage.

Following local review, `lib/scene/fountain-effects.ts` replaces outlined ripple rings and looping tubes with 59 upright turbulent streams, a seven-jet central crown, 8,496 falling/impact particles and irregular animated foam. The slate-blue water material adds layered wave motion and view-dependent transparency. The first review's runtime source is preserved as `fountains-first-review.ts.txt`. The basin and GLB derivative are unchanged.
