"""Repack an original GLB with <=2K textures. Requires Pillow; source stays untouched."""
import argparse
import io
import json
import struct
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path)
parser.add_argument("destination", type=Path)
args = parser.parse_args()
if args.source.resolve() == args.destination.resolve():
    parser.error("Use a separate runtime destination; preserve the original export.")
data = args.source.read_bytes()
magic, version, length = struct.unpack_from("<III", data)
if magic != 0x46546C67 or version != 2 or length != len(data):
    raise ValueError("Expected a complete GLB 2 file")
json_length = struct.unpack_from("<I", data, 12)[0]
asset = json.loads(data[20:20 + json_length])
binary = data[28 + json_length:]
images = {image["bufferView"]: image for image in asset.get("images", [])}
normal_textures = {material["normalTexture"]["index"] for material in asset.get("materials", []) if "normalTexture" in material}
normal_images = {asset["textures"][index]["source"] for index in normal_textures}
normal_views = {asset["images"][index]["bufferView"] for index in normal_images}
packed = bytearray()
views = []
for index, view in enumerate(asset["bufferViews"]):
    offset = view.get("byteOffset", 0)
    chunk = binary[offset:offset + view["byteLength"]]
    if index in images:
        picture = Image.open(io.BytesIO(chunk)).convert("RGB")
        picture.thumbnail((2048, 2048))
        output = io.BytesIO()
        if index in normal_views:
            picture.save(output, format="PNG", optimize=True)
            images[index]["mimeType"] = "image/png"
        else:
            picture.save(output, format="JPEG", quality=94, subsampling=0)
            images[index]["mimeType"] = "image/jpeg"
        chunk = output.getvalue()
    packed.extend(b"\0" * (-len(packed) % 4))
    views.append({**view, "byteOffset": len(packed), "byteLength": len(chunk)})
    packed.extend(chunk)
asset["bufferViews"] = views
asset["buffers"] = [{"byteLength": len(packed)}]
asset.pop("animations", None)
encoded = json.dumps(asset, separators=(",", ":")).encode()
encoded += b" " * (-len(encoded) % 4)
packed.extend(b"\0" * (-len(packed) % 4))
result = struct.pack("<III", 0x46546C67, 2, 28 + len(encoded) + len(packed))
result += struct.pack("<II", len(encoded), 0x4E4F534A) + encoded
result += struct.pack("<II", len(packed), 0x004E4942) + packed
args.destination.parent.mkdir(parents=True, exist_ok=True)
args.destination.write_bytes(result)
print(f"Source: {len(data):,} bytes; runtime: {len(result):,} bytes")
