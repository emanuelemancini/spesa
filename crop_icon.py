import sys
from PIL import Image, ImageDraw

def create_rounded_icon(input_path, output_path, corner_radius_ratio=0.225):
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    
    bg_color = img.getpixel((0, 0))
    threshold = 40
    
    min_x, max_x = width, 0
    min_y, max_y = height, 0
    
    pixels = img.load()
    for y in range(height):
        for x in range(width):
            p = pixels[x, y]
            diff = abs(p[0]-bg_color[0]) + abs(p[1]-bg_color[1]) + abs(p[2]-bg_color[2])
            if diff > threshold:
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
                
    sq_size = max_x - min_x
    max_y_square = min_y + sq_size
    
    print(f"Detected bounds: x({min_x}, {max_x}), y({min_y}, {max_y})")
    print(f"Assuming square box: ({min_x}, {min_y}, {max_x}, {max_y_square}) size: {sq_size}")
    
    if sq_size <= 0:
        print("Could not detect icon.")
        return

    # Crop out the icon exactly
    cropped = img.crop((min_x, min_y, max_x, max_y_square))
    
    # Create antialiased mask
    scale = 4
    mask_size = (sq_size * scale, sq_size * scale)
    mask = Image.new('L', mask_size, 0)
    draw = ImageDraw.Draw(mask)
    
    r = int(sq_size * corner_radius_ratio * scale)
    draw.rounded_rectangle((0, 0, mask_size[0], mask_size[1]), radius=r, fill=255)
    
    mask = mask.resize((sq_size, sq_size), Image.Resampling.LANCZOS)
    
    # Put mask as alpha
    final = cropped.copy()
    final.putalpha(mask)
    
    final.save(output_path, "PNG")

create_rounded_icon("public/original_icon.png", "public/icon.png")
