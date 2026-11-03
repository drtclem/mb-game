# White uniform character checkpoint — November 3, 2026

Taylor approved the white uniform concept, then requested smooth shoulders (no epaulettes) and matching neutral white jacket and trousers. The silver sash, helmet, plume and silver-plated instrument remain the appearance target. Half the eventual cast must be women. The approved image is `approved-white-uniform.png`.

## Original asset provenance

- Concept and isolated adult woman A-pose input generated specifically for this project with the built-in image generator. Input: `woman-marcher-modeling-reference.png`.
- Reference photos supplied by Taylor guide the style; no corps logo, photo texture, recording, or premade character is shipped.
- Meshy 7.1 image-to-3D: High Detail, Ultra 4K geometry, 4K texture, A-pose, private. The UI quoted 35 credits. Taylor authorized at most 100 credits for this first character, including rigging. Do not infer authorization for subsequent characters from that limit.
- Remeshed with the 30K triangle target, displayed result 31,096 faces / 15,503 vertices. Remeshing quoted zero credits.
- Humanoid rig, Mixamo skeleton naming, 2.15 m total model height including helmet/plume. Landmarks adjusted to actual chin, shoulders, elbows, wrists, crotch, knees and ankles.
- Source export: `Meshy_AI_Ivory_Plume_Marcher_20261103_animated_mixamo_All_animation.glb`, retained locally in Downloads, 40,803,044 bytes. Contains one mesh, one skin, and two provider preview animations.
- Runtime: `public/models/white-marcher-woman.glb`, 9,359,180 bytes. Embedded textures reduced to 2048 px; normal map retained as PNG, color and metallic/roughness packed map encoded as high-quality JPEG. The original high-detail export remains untouched. Provider preview animation definitions removed; the game uses original count-driven animation.

## What this checkpoint demonstrates

`/uniform.html` loads the real textured mesh and skeleton in Three.js. Front/side/back/face inspection, original procedural forward/backward leg targets, and a separate experimental arm-position study are available. No stock motion is used. Source appearance can be reviewed independently from animation.

## Remaining work

This is one woman character, not the completed 12-person cast. The playable field still uses the earlier procedural models. Do not describe the whole band as using this detailed asset. Finish believable foot roll, shoe-ground contact and hands-on-instrument posing; add the detailed baritone; review this character with Taylor before extending the asset pipeline. Generate the male counterpart and cast variation while preserving the six-women/six-men requirement. Share geometries/textures between instances and profile on phone before the full band rollout.

Original marching motion reference: https://www.youtube.com/watch?v=_RKfyF29eTs (especially 0:19–0:20). This is visual reference only, not a game asset.
