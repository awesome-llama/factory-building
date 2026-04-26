

proc draw_dot_ws x, y, z {
    ws_to_cs $x, $y, $z;
    if (return_z > zclip) {
        goto ((return_x*f)/return_z), ((return_y*f)/return_z);
        pen_down;
        pen_up;
    }
}


proc draw_line_ws x0, y0, z0, x1, y1, z1 {
    ws_to_cs $x0, $y0, $z0;
    if (return_z > zclip) {
        goto ((return_x*f)/return_z), ((return_y*f)/return_z);
        ws_to_cs $x1, $y1, $z1;
        if (return_z > zclip) {
            pen_down;
            goto ((return_x*f)/return_z), ((return_y*f)/return_z);
            pen_up;
        }
    }
}


proc go_to_ws x, y, z {
    ws_to_cs $x, $y, $z;
    goto ((return_x*f)/return_z), ((return_y*f)/return_z);
}



# transform point, world space to camera space
proc ws_to_cs x, y, z {
    temp_x = ($x-cam_x);
    temp_y = ($y-cam_y);
    temp_z = ($z-cam_z);
    return_x = ((temp_x*cos(cam_rot_z)) + (temp_y*sin(cam_rot_z)));
    xform_temp = ((temp_y*cos(cam_rot_z)) - (temp_x*sin(cam_rot_z)));
    return_y = ((xform_temp*cos(cam_rot_x)) + (temp_z*sin(cam_rot_x)));
    return_z = 0-((temp_z*cos(cam_rot_x)) - (xform_temp*sin(cam_rot_x)));
}
