from PIL import Image, ImageDraw

BG = (16, 17, 20, 255)       # near-black
GOLD = (232, 184, 75, 255)   # accent gold

def bookmark_points(size, w_ratio=0.40, h_ratio=0.55, notch_ratio=0.22):
    cx, cy = size / 2, size / 2
    w = size * w_ratio
    h = size * h_ratio
    x0, x1 = cx - w / 2, cx + w / 2
    y0 = cy - h / 2
    y1 = cy + h / 2
    notch_y = y1 - h * notch_ratio
    return [
        (x0, y0), (x1, y0),
        (x1, y1), (cx, notch_y), (x0, y1),
    ]

def render(size, maskable=False):
    img = Image.new('RGBA', (size, size), BG)
    draw = ImageDraw.Draw(img)
    ratio = 0.34 if maskable else 0.42
    pts = bookmark_points(size, w_ratio=ratio, h_ratio=ratio * 1.4)
    draw.polygon(pts, fill=GOLD)
    return img

for name, size, maskable in [
    ('icon-180.png', 180, False),
    ('icon-192.png', 192, False),
    ('icon-512.png', 512, False),
    ('icon-512-maskable.png', 512, True),
]:
    render(size, maskable).save(f'icons/{name}')
    print('wrote', name)
