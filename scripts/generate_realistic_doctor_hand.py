import math
from PIL import Image, ImageDraw, ImageFilter

def create_doctor_hand(is_left=False, output_path="frontend/public/assets/avatars/dr_hand_gesturing.png"):
    # Render at 2x resolution for ultra-crisp antialiasing
    scale = 2
    w, h = 500 * scale, 600 * scale
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Doctor Color Palette (calibrated to doctor portrait):
    skin_base = (208, 145, 114, 255)
    skin_shadow = (168, 108, 80, 255)
    skin_deep_shadow = (135, 82, 58, 255)
    skin_highlight = (232, 178, 146, 255)
    skin_pink = (220, 140, 120, 255) # Subsurface fingertip blush
    nail_color = (235, 195, 180, 255)

    coat_base = (240, 242, 246, 255)
    coat_shadow = (195, 202, 212, 255)
    coat_deep = (165, 175, 188, 255)
    shirt_blue = (105, 140, 180, 255)
    shirt_shadow = (75, 105, 140, 255)

    # Center origin for right hand
    ox = 250 * scale
    oy = 340 * scale

    # --- 1. SLEEVE & FOREARM (White Medical Lab Coat) ---
    sleeve_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sleeve_draw = ImageDraw.Draw(sleeve_layer)

    sleeve_pts = [
        (ox - 30 * scale, h),
        (ox - 50 * scale, oy + 70 * scale), # Left wrist
        (ox + 85 * scale, oy + 45 * scale), # Right wrist
        (ox + 160 * scale, oy + 180 * scale),
        (ox + 190 * scale, h)
    ]
    sleeve_draw.polygon(sleeve_pts, fill=coat_base)

    # Cylindrical fabric shading
    for i in range(15):
        alpha = int(120 * (1 - i / 15))
        sleeve_draw.line(
            [(ox - 50 * scale + i * 4 * scale, oy + 70 * scale + i * 5 * scale),
             (ox - 30 * scale + i * 5 * scale, h)],
            fill=(coat_shadow[0], coat_shadow[1], coat_shadow[2], alpha),
            width=3 * scale
        )

    # Fabric folds
    sleeve_draw.line(
        [(ox + 15 * scale, oy + 120 * scale), (ox + 75 * scale, oy + 90 * scale)],
        fill=coat_shadow, width=4 * scale
    )
    sleeve_draw.line(
        [(ox - 10 * scale, oy + 150 * scale), (ox + 50 * scale, oy + 130 * scale)],
        fill=coat_deep, width=3 * scale
    )

    # Blue Dress Shirt Cuff Peek
    shirt_pts = [
        (ox - 48 * scale, oy + 70 * scale),
        (ox - 44 * scale, oy + 54 * scale),
        (ox + 83 * scale, oy + 29 * scale),
        (ox + 85 * scale, oy + 45 * scale)
    ]
    sleeve_draw.polygon(shirt_pts, fill=shirt_blue)
    sleeve_draw.line([(ox - 44 * scale, oy + 54 * scale), (ox + 83 * scale, oy + 29 * scale)], fill=shirt_shadow, width=2 * scale)

    # White Lab Coat Hem Seam
    sleeve_draw.line([(ox - 50 * scale, oy + 70 * scale), (ox + 85 * scale, oy + 45 * scale)], fill=coat_deep, width=5 * scale)
    sleeve_draw.line([(ox - 50 * scale, oy + 68 * scale), (ox + 85 * scale, oy + 43 * scale)], fill=(255, 255, 255, 220), width=2 * scale)

    img.paste(sleeve_layer, (0, 0), sleeve_layer)

    # --- 2. PHYSICIAN GESTURING HAND ---
    hand_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    hand_draw = ImageDraw.Draw(hand_layer)

    # Helper: draw smooth shaded finger
    def draw_finger(base_x, base_y, mid_x, mid_y, tip_x, tip_y, thickness):
        # Draw segmented bone joints
        # Base to mid
        hand_draw.line([(base_x, base_y), (mid_x, mid_y)], fill=skin_shadow, width=int(thickness * 1.15))
        hand_draw.line([(base_x, base_y), (mid_x, mid_y)], fill=skin_base, width=int(thickness))
        # Mid to tip
        hand_draw.line([(mid_x, mid_y), (tip_x, tip_y)], fill=skin_shadow, width=int(thickness * 0.95))
        hand_draw.line([(mid_x, mid_y), (tip_x, tip_y)], fill=skin_base, width=int(thickness * 0.82))

        # Knuckle joints (ellipses)
        r_knuckle = thickness * 0.58
        hand_draw.ellipse([base_x - r_knuckle, base_y - r_knuckle, base_x + r_knuckle, base_y + r_knuckle], fill=skin_base)
        hand_draw.ellipse([mid_x - r_knuckle*0.85, mid_y - r_knuckle*0.85, mid_x + r_knuckle*0.85, mid_y + r_knuckle*0.85], fill=skin_base)

        # Fingertip pad (blushed subsurface scattering)
        r_tip = thickness * 0.46
        hand_draw.ellipse([tip_x - r_tip, tip_y - r_tip, tip_x + r_tip, tip_y + r_tip], fill=skin_pink)

        # Fingernail
        n_w = r_tip * 0.75
        n_h = r_tip * 0.95
        hand_draw.ellipse([tip_x - n_w, tip_y - n_h, tip_x + n_w, tip_y + n_h*0.3], fill=nail_color)

    # Palm Base & Wrist Joint
    wrist_pts = [
        (ox - 38 * scale, oy + 54 * scale),
        (ox - 42 * scale, oy + 10 * scale),
        (ox + 68 * scale, oy - 15 * scale),
        (ox + 78 * scale, oy + 32 * scale)
    ]
    hand_draw.polygon(wrist_pts, fill=skin_base)

    # Palm Body
    palm_pts = [
        (ox - 42 * scale, oy + 10 * scale),  # thumb joint
        (ox - 55 * scale, oy - 35 * scale),  # thumb knuckle
        (ox - 30 * scale, oy - 95 * scale),  # index knuckle
        (ox + 5 * scale, oy - 105 * scale),   # middle knuckle
        (ox + 45 * scale, oy - 95 * scale),  # ring knuckle
        (ox + 75 * scale, oy - 70 * scale),  # pinky knuckle
        (ox + 82 * scale, oy - 10 * scale),  # outer palm
        (ox + 68 * scale, oy - 15 * scale)
    ]
    hand_draw.polygon(palm_pts, fill=skin_base)

    # Palm Creases (Life line / Thenar crease)
    hand_draw.arc(
        [ox - 35 * scale, oy - 45 * scale, ox + 35 * scale, oy + 25 * scale],
        start=30, end=150, fill=skin_deep_shadow, width=int(2.5 * scale)
    )
    hand_draw.arc(
        [ox - 10 * scale, oy - 70 * scale, ox + 60 * scale, oy - 15 * scale],
        start=50, end=170, fill=skin_shadow, width=int(2 * scale)
    )

    # --- DRAW 5 ARTICULATED FINGERS (Open Reassuring Medical Gesture) ---

    # 1. Pinky Finger (Curved naturally)
    draw_finger(
        base_x=ox + 70 * scale, base_y=oy - 70 * scale,
        mid_x=ox + 92 * scale, mid_y=oy - 125 * scale,
        tip_x=ox + 102 * scale, tip_y=oy - 170 * scale,
        thickness=14 * scale
    )

    # 2. Ring Finger
    draw_finger(
        base_x=ox + 42 * scale, base_y=oy - 95 * scale,
        mid_x=ox + 55 * scale, mid_y=oy - 165 * scale,
        tip_x=ox + 60 * scale, tip_y=oy - 225 * scale,
        thickness=16 * scale
    )

    # 3. Middle Finger (Longest, gently extending upward)
    draw_finger(
        base_x=ox + 5 * scale, base_y=oy - 105 * scale,
        mid_x=ox + 10 * scale, mid_y=oy - 180 * scale,
        tip_x=ox + 12 * scale, tip_y=oy - 250 * scale,
        thickness=17 * scale
    )

    # 4. Index Finger (Explaining gesture, slightly curved toward center)
    draw_finger(
        base_x=ox - 28 * scale, base_y=oy - 95 * scale,
        mid_x=ox - 32 * scale, mid_y=oy - 165 * scale,
        tip_x=ox - 25 * scale, tip_y=oy - 235 * scale,
        thickness=17 * scale
    )

    # 5. Thumb (Extended outward reassuringly)
    draw_finger(
        base_x=ox - 52 * scale, base_y=oy - 30 * scale,
        mid_x=ox - 92 * scale, mid_y=oy - 75 * scale,
        tip_x=ox - 118 * scale, tip_y=oy - 125 * scale,
        thickness=19 * scale
    )

    # Soft ambient occlusion shadow under palm
    hand_draw.ellipse([ox - 35 * scale, oy - 20 * scale, ox + 45 * scale, oy + 25 * scale], fill=(skin_shadow[0], skin_shadow[1], skin_shadow[2], 90))

    img.paste(hand_layer, (0, 0), hand_layer)

    if is_left:
        # Flip horizontally for left hand
        img = img.transpose(Image.FLIP_LEFT_RIGHT)

    # Downscale with Lanczos for anti-aliasing
    final_img = img.resize((500, 600), Image.Resampling.LANCZOS)
    final_img.save(output_path, "PNG")
    print(f"Generated realistic doctor hand sprite at: {output_path}")

if __name__ == "__main__":
    create_doctor_hand(is_left=False, output_path="frontend/public/assets/avatars/dr_hand_right.png")
    create_doctor_hand(is_left=True, output_path="frontend/public/assets/avatars/dr_hand_left.png")

