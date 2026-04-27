%include lib/common
%include lib/text

costumes 
"costumes/blank.svg" as "icon", 
"costumes/large.svg" as "large",
"costumes/blank.svg" as "",
"costumes/blank.svg" as "@ascii/",
"costumes/blank.svg" as "blank";
hide;


on "sys.hard_reset" {
    show_controls = true;
}


on "sys.render_UI" {
    clear_graphic_effects;
    switch_costume "large";
    point_in_direction 90;
    set_size 100;

    render_world_debug_text;
    render_controls;

    switch_costume "icon";
}


%define ROUND_2DP(VAL) (round((VAL)*100)/100)


proc render_world_debug_text {
    set_pen_color "#b7b7b7";
    plain_text -230, 160, 1, ("FPS:  " & FPS);
    plain_text -230, 148, 1, ("Res:  " & resolution);

    if (cam_mode == CameraFollowMode.FREE) {
        plain_text -230, -150, 1, ("cam xyz:  " & ROUND_2DP(cam_x) & ", " & ROUND_2DP(cam_y) & ", " & ROUND_2DP(cam_z));
        plain_text -230, -160, 1, ("rot xz:  " & round(cam_rot_x)) & ", " & round(cam_rot_z);
        plain_text -230, -170, 1, cam_mode;
    }
}


proc render_controls {
    if (show_controls) {
        set_pen_color "#ffffff";

        plain_text -230, -100, 1, "Look:  arrow keys or click-and-drag";
        plain_text -230, -115, 1, "Move:  WASD";
        plain_text -230, -130, 1, "Set resolution:  number keys";

        if (cam_y > 0.3) { show_controls = false; }
    }
}
