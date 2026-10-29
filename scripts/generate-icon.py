#!/usr/bin/env python3
import os
import subprocess
from PIL import Image, ImageDraw, ImageFilter

def create_mac_icon():
    os.makedirs('build', exist_ok=True)
    master_path = os.path.join(os.path.dirname(__file__), '../build/master-icon.jpg')
    if not os.path.exists(master_path):
        raise FileNotFoundError(f"Master icon not found: {master_path}")

    raw_img = Image.open(master_path).convert('RGBA')

    # macOS Big Sur+ standard: ~824x824 squircle centered in 1024x1024 with 100px padding
    canvas_size = 1024
    target_size = 824
    offset = (canvas_size - target_size) // 2  # 100
    radius = 185  # Apple standard 22.5% corner radius for 824px

    # Crop the central squircle from the 3D rendered master (Concept 2: Tactile Engraved Orb Fusion)
    crop_box = (114, 114, 910, 910)
    squircle_crop = raw_img.crop(crop_box)
    squircle_resized = squircle_crop.resize((target_size, target_size), Image.Resampling.LANCZOS)

    # Create 4x supersampled squircle mask for razor-sharp, anti-aliased curves
    scale = 4
    super_size = target_size * scale
    super_radius = radius * scale

    mask = Image.new('L', (super_size, super_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, super_size, super_size], radius=super_radius, fill=255)
    smooth_mask = mask.resize((target_size, target_size), Image.Resampling.LANCZOS)

    # Apply squircle mask
    squircle_masked = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
    squircle_masked.paste(squircle_resized, (0, 0), smooth_mask)

    # Add subtle specular top/inner highlight ring
    border_draw = ImageDraw.Draw(squircle_masked)
    border_draw.rounded_rectangle(
        [0, 0, target_size - 1, target_size - 1],
        radius=radius,
        outline=(255, 255, 255, 55),
        width=2
    )

    # Create final 1024x1024 transparent RGBA canvas
    final_icon = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))

    # Soft ambient drop shadow beneath squircle
    shadow_offset_y = 28
    shadow_radius = 24
    shadow_layer = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_layer)
    shadow_draw.rounded_rectangle(
        [offset, offset + shadow_offset_y, offset + target_size, offset + target_size + shadow_offset_y],
        radius=radius,
        fill=(0, 0, 0, 95)
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(shadow_radius))

    # Merge shadow + squircle
    final_icon = Image.alpha_composite(final_icon, shadow_layer)
    final_icon.paste(squircle_masked, (offset, offset), squircle_masked)

    # Save 1024x1024 master PNG
    png_path = 'build/icon.png'
    final_icon.save(png_path, 'PNG')
    print(f"Created {png_path} (1024x1024 RGBA)")

    # Generate macOS .iconset
    iconset_dir = 'build/icon.iconset'
    os.makedirs(iconset_dir, exist_ok=True)

    sizes = [
        (16, '16x16'),
        (32, '16x16@2x'),
        (32, '32x32'),
        (64, '32x32@2x'),
        (128, '128x128'),
        (256, '128x128@2x'),
        (256, '256x256'),
        (512, '256x256@2x'),
        (512, '512x512'),
        (1024, '512x512@2x')
    ]

    for size, name in sizes:
        resized = final_icon.resize((size, size), Image.Resampling.LANCZOS)
        out_file = os.path.join(iconset_dir, f'icon_{name}.png')
        resized.save(out_file)

    # Compile .iconset into .icns using iconutil
    icns_path = 'build/icon.icns'
    cmd = ['iconutil', '-c', 'icns', iconset_dir, '-o', icns_path]
    subprocess.run(cmd, check=True)
    print(f"Successfully compiled {icns_path}")

if __name__ == '__main__':
    create_mac_icon()
