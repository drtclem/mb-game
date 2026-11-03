import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

for (const gender of ["woman", "man"]) {
  const file = readFileSync(
    new URL(`../public/models/white-marcher-${gender}.glb`, import.meta.url),
  );
  const jsonLength = file.readUInt32LE(12);
  const asset = JSON.parse(file.subarray(20, 20 + jsonLength).toString());

  describe(`original ${gender} character runtime asset`, () => {
    it("contains a complete humanoid skeleton and skinned geometry", () => {
      expect(asset.skins).toHaveLength(1);
      const names = asset.nodes.map((n: { name?: string }) => n.name);
      for (const side of ["Left", "Right"])
        for (const joint of [
          "UpLeg",
          "Leg",
          "Foot",
          "Arm",
          "ForeArm",
          "Hand",
        ]) {
          expect(names).toContain(`mixamorig:${side}${joint}`);
        }
      const attributes = asset.meshes[0].primitives[0].attributes;
      expect(attributes.JOINTS_0).toBeDefined();
      expect(attributes.WEIGHTS_0).toBeDefined();
    });
    it("preserves color, normal and material textures but ships no stock animation clips", () => {
      expect(asset.images).toHaveLength(3);
      expect(asset.materials[0].normalTexture).toBeDefined();
      expect(
        asset.materials[0].pbrMetallicRoughness.baseColorTexture,
      ).toBeDefined();
      expect(asset.animations).toBeUndefined();
      expect(file.byteLength).toBeLessThan(10 * 1024 * 1024);
    });
  });
}
