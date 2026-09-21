import math
import os
import struct
import zlib

def make_png(width, height, draw_func):
    """Create an RGBA PNG using only standard library."""
    # RGBA raw buffer
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # Filter type None
        for x in range(width):
            r, g, b, a = draw_func(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    # Compress IDAT chunk
    compressed = zlib.compress(bytes(raw_data), level=9)
    
    png = bytearray(b"\x89PNG\r\n\x1a\n")
    
    # IHDR chunk
    ihdr_data = struct.pack("!IIBBBBB", width, height, 8, 6, 0, 0, 0)
    ihdr_crc = zlib.crc32(b"IHDR" + ihdr_data)
    png.extend(struct.pack("!I", 13) + b"IHDR" + ihdr_data + struct.pack("!I", ihdr_crc))
    
    # IDAT chunk
    idat_crc = zlib.crc32(b"IDAT" + compressed)
    png.extend(struct.pack("!I", len(compressed)) + b"IDAT" + compressed + struct.pack("!I", idat_crc))
    
    # IEND chunk
    iend_crc = zlib.crc32(b"IEND")
    png.extend(struct.pack("!I", 0) + b"IEND" + struct.pack("!I", iend_crc))
    
    return bytes(png)


def draw_icon(x, y, w, h, maskable=False):
    # Normalized coords [0, 1]
    nx = x / w
    ny = y / h
    
    # Corner radius
    cx, cy = 0.5, 0.5
    dx = abs(nx - cx)
    dy = abs(ny - cy)
    
    corner_r = 0.22 if not maskable else 0.0
    corner_center_x = 0.5 - corner_r
    corner_center_y = 0.5 - corner_r
    
    if not maskable and (dx > corner_center_x and dy > corner_center_y):
        cdx = dx - corner_center_x
        cdy = dy - corner_center_y
        dist = math.sqrt(cdx * cdx + cdy * cdy)
        if dist > corner_r:
            # Anti-aliased boundary
            alpha = max(0.0, min(1.0, (corner_r - dist) * w + 0.5))
            if alpha <= 0:
                return (0, 0, 0, 0)
    
    # Background gradient: Indigo (#6366f1) -> Dark Slate/Indigo (#1e1b4b)
    t = (nx + ny) / 2.0
    r_bg = int(99 * (1 - t) + 30 * t)
    g_bg = int(102 * (1 - t) + 27 * t)
    b_bg = int(241 * (1 - t) + 75 * t)
    
    # Brain shape rendering
    bx = (nx - 0.5) * 2.2
    by = (ny - 0.5) * 2.2
    
    # Distance to brain curves
    dist_brain = math.sqrt(bx * bx + by * by)
    
    # Inner glowing brain symbol
    if 0.15 <= dist_brain <= 0.65:
        # Brain hemisphere arcs
        angle = math.atan2(by, bx)
        pattern = math.sin(angle * 6) * 0.08 + math.cos(dist_brain * 12) * 0.05
        if abs(dist_brain - 0.45 + pattern) < 0.14:
            # Blend with bright white/cyan
            glow_intensity = max(0.0, 1.0 - abs(dist_brain - 0.45 + pattern) / 0.14)
            r = int(r_bg * (1 - glow_intensity) + 255 * glow_intensity)
            g = int(g_bg * (1 - glow_intensity) + 255 * glow_intensity)
            b = int(b_bg * (1 - glow_intensity) + 255 * glow_intensity)
            return (r, g, b, 255)
    
    # Center node
    if dist_brain < 0.12:
        return (255, 255, 255, 255)
        
    return (r_bg, g_bg, b_bg, 255)


def generate_all():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(script_dir, ".."))
    out_dir = os.path.join(root_dir, "frontend", "public", "icons")
    os.makedirs(out_dir, exist_ok=True)
    
    for size, name, mask in [
        (192, "icon-192.png", False),
        (512, "icon-512.png", False),
        (512, "icon-maskable.png", True),
    ]:
        path = os.path.join(out_dir, name)
        png_bytes = make_png(size, size, lambda x, y, w, h: draw_icon(x, y, w, h, maskable=mask))
        with open(path, "wb") as f:
            f.write(png_bytes)
        print(f"Generated {path} ({size}x{size})")

if __name__ == "__main__":
    generate_all()
