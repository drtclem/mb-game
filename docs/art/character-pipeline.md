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

## Male and instrument extension

Taylor explicitly approved 200 additional Meshy credits. Generation used 35 for
the man and 35 for the instrument: **70 / 200 credits consumed**. Remeshing and
humanoid rigging quoted zero. No further generation is needed for this checkpoint.

- Original project-generated inputs: `man-marcher-modeling-reference.png` and
  `baritone-modeling-reference.png`.
- Male source: `Meshy_AI_Ivory_Sentinel_20261103_animated_mixamo_Running.glb`,
  retained in Downloads. Runtime `white-marcher-man.glb`: 10,401,684 bytes,
  31,216 faces, independent Mixamo humanoid/finger skeleton. Provider animation removed.
- Instrument source: `Meshy_AI_Silver_Cornet_on_Gray_1103170341_texture.glb`,
  retained in Downloads. The provider filename says cornet; the submitted original
  reference and game use are a marching baritone. Runtime `silver-baritone.glb`:
  6,489,504 bytes, 30,959 faces. Embedded textures reduced to 2048 pixels.

## Earlier checkpoint (superseded studio pose)

The earlier `/uniform.html` loaded both textured characters and the separate instrument. Taylor rejected that hand/arm result; it is not the approved final pose.
Front/side/back/face inspection and original count-driven forward/backward leg
motion are available. The playable field now uses these assets for all twelve
marchers, six women and six men, with shared geometry/textures and independent
skeletons. Shoe rotation includes ankle-pivot compensation at heel/toe contact.

Taylor supplied three additional baritone-player photos on November 3 to guide
elbows, support-hand placement and curved valve fingers. These are visual references,
not shipped game assets. The woman's generated rig has duplicate wrist helpers but
no individual finger joints. Consolidating the helper weights prevents glove tearing;
a separate grip morph curls distal glove geometry while preserving wrist/palm.
The male export has individual finger joints and uses joint curls instead.

## Remaining work

Grip shapes approximate contact rather than a fully articulated hand rig. Inspect
finger/tube intersections, improve thumb placement and add individual valve motion
if needed. Only two base faces and height variants are present; this is not twelve
unique character sculpts. Profile the full cast on phones before calling the art
pass complete. The visible drum major and wider field/environment polish remain
outstanding. No stock motion or real corps logo is shipped.

Original marching motion reference: https://www.youtube.com/watch?v=_RKfyF29eTs
(especially 0:19–0:20). This is visual reference only, not a game asset.

## Combined pose revision — November 3

Taylor authorized a new approach: model one woman with arms, hands and horn
already in a playing pose. Keep upper body fixed and assess that pose before
adding marching or extending to the cast. Built-in image generation produced
`posed-baritone-woman-reference.png`; Taylor then requested fingertips on the
valve buttons and the left support hand at the central valve block, guided by
`images-4.jpeg`. The revised input is `posed-baritone-woman-reference-v2.png`.
Prompt records: `posed-marcher-prompt.txt`.

Two combined image-to-3D generations used 35 credits each. Including the previous
70-credit male/instrument generation, extension spending is now **140 / 200
credits**, leaving 60. Meshy balance changed from 3,095 before these two attempts
to 3,025. Pose normalization and image enhancement were disabled to preserve
hands/instrument contact. The first attempt remains in Meshy as a comparison;
it was superseded by the corrected reference. Remeshing is quoted at zero.

The revised studio loads a single static sculpt through `posed-marcher.ts`.
It does not use wrist IK, hand morphs, or a separately positioned horn. Static
review is intentional: no marching controls imply that locomotion is finished.
The playable game's older independent rigs remain unchanged by this prototype.
Next: assess the combined 3D grip, preserve this upper body while rigging legs,
then create the matching man and retain the six-women/six-men cast requirement.

Corrected combined source: `Meshy_AI_Silver_Fanfare_1103175939_texture.glb`,
retained in Downloads (50,436,020 bytes). Meshy 7.1 High Detail, Ultra 4K geometry,
4K texture, private. Remeshed after texturing at the 100K target: 103,516 faces,
123,877 vertices. Runtime `public/models/posed-baritone-woman.glb`: 12,889,668
bytes, one rigid mesh, three embedded PBR images, no skeleton and no animations.
Reproducible texture repack: `scripts/optimize-model.py` (Python plus Pillow),
retaining normal PNG and reducing embedded images to at most 2048 pixels.
