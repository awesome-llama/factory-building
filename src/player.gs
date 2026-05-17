# Player object and camera controller

%include lib/common

costumes "costumes/blank.svg";
hide;

var free_cam_speed = 2.5;
var eye_height = 1.65;
var wall_dist = 0.35;


# don't allow movement to be more than this vertically per tick
%define MAX_VERTICAL_DISPLACEMENT 0.1

# distance to snap to a floor tri
%define SNAP_DISTANCE 2.0

# additional area to capture slightly more than the triangle such as near the edges
%define TRI_INSIDE_BUFFER 0.001

# minimum area allowed for a floor triangle (avoid bad triangle data)
%define TRI_AREA_MIN 0.001


var movement_speed;
var XYZ desired_movement;
var vec_len;

on "sys.hard_reset" {
    player_x = 0.22;
    player_y = -2;
    player_z = 0;
    player_vx = 0;
    player_vy = 0;

    cam_x = player_x;
    cam_y = player_y;
    cam_z = player_z+eye_height;
    cam_rot_x = 73;
    cam_rot_y = 0;
    cam_rot_z = 160;
    cam_mode = CameraFollowMode.PLAYER;
}


on "sys.initalize" {
    step_x = player_x;
    step_y = player_y;
}


onkey "up arrow" {
    if ((cam_mode == CameraFollowMode.FREE) and not key_pressed("up arrow")) {
        free_cam_speed *= 2;
        if (free_cam_speed > 64) { free_cam_speed = 64; }
    }
}

onkey "down arrow" {
    if ((cam_mode == CameraFollowMode.FREE) and not key_pressed("down arrow")) {
        free_cam_speed /= 2;
        if (free_cam_speed < 0.125) { free_cam_speed = 0.125; }
    }
}


onkey "f" {
    if (cam_mode == CameraFollowMode.FREE) {
        cam_mode = CameraFollowMode.PLAYER;
        player_x = cam_x;
        player_y = cam_y;
        player_z = cam_z-eye_height;
    } else {
        cam_mode = CameraFollowMode.FREE;
        player_vx = 0;
        player_vy = 0;
    }
}



on "sys.stage_clicked" {
    last_mouse_x = mouse_x();
    last_mouse_y = mouse_y();
    until (not mouse_down()) {
        rotate_camera (last_mouse_x-mouse_x())*look_sensitivity, (mouse_y()-last_mouse_y)*look_sensitivity;
        last_mouse_x = mouse_x();
        last_mouse_y = mouse_y();
    }
}



proc rotate_camera delta_azi, delta_elev {
    cam_rot_z = (cam_rot_z + $delta_azi) % 360;
    cam_rot_x = cam_rot_x + $delta_elev;
    if (cam_rot_x > 175) {
        cam_rot_x = 175;
    } elif (cam_rot_x < 5) {
        cam_rot_x = 5;
    }
}


on "sys.update_player" {
    controls;
}


proc controls  {
    start_x = player_x;
    start_y = player_y;

    desired_movement.x = (cos(cam_rot_z)*(key_pressed(keybind_move_right)-key_pressed(keybind_move_left))) - (sin(cam_rot_z)*(key_pressed(keybind_move_forward)-key_pressed(keybind_move_backward)));
    desired_movement.y = (sin(cam_rot_z)*(key_pressed(keybind_move_right)-key_pressed(keybind_move_left))) + (cos(cam_rot_z)*(key_pressed(keybind_move_forward)-key_pressed(keybind_move_backward)));
    desired_movement.z = (key_pressed(keybind_move_up)-key_pressed(keybind_move_down));


    if (cam_mode == CameraFollowMode.FREE) {
        movement_speed = free_cam_speed;
        if ($tw_is_turbowarp and key_pressed("shift")) {
            movement_speed *= 4;
        }

        move_camera movement_speed, desired_movement.x, desired_movement.y, desired_movement.z;
    
    } elif (cam_mode == CameraFollowMode.PLAYER) {

        movement_speed = 2 + (($tw_is_turbowarp and key_pressed("shift")) * 1.5);

        vec_len = VEC2_LEN(desired_movement.x, desired_movement.y);
        player_ax = (desired_movement.x/vec_len) * movement_speed * 10;
        player_ay = (desired_movement.y/vec_len) * movement_speed * 10;

        player_vx += player_ax * dt;
        player_vy += player_ay * dt;
        player_vx = (0.95-(dt*3)) * player_vx;
        player_vy = (0.95-(dt*3)) * player_vy;

        actual_speed = VEC2_LEN(player_vx, player_vy);
        if (actual_speed > movement_speed) {
            # limit speed
            player_vx = (player_vx / actual_speed) * movement_speed;
            player_vy = (player_vy / actual_speed) * movement_speed;
        }

        player_x += player_vx * dt;
        player_y += player_vy * dt;

        get_floor_height player_x, player_y, player_z;
        if (abs(player_z-closest_tri_z) < SNAP_DISTANCE) {
            player_z = closest_tri_z;
        }

        check_boundary_collisions;

        # move camera to player
        cam_x = player_x;
        cam_y = player_y;
        cam_z = player_z + eye_height;
    }

    rotate_camera (key_pressed(keybind_look_left) - key_pressed(keybind_look_right)) * dt * 120, (key_pressed(keybind_look_up) - key_pressed(keybind_look_down)) * dt * 120;
}




proc move_camera speed, x, y, z {
    vec_len = VEC3_LEN($x, $y, $z);
    cam_x += ((dt*$speed)*($x/vec_len));
    cam_y += ((dt*$speed)*($y/vec_len));
    cam_z += ((dt*$speed)*($z/vec_len));
}



proc get_floor_height x, y, z {
    
    # it is likely the triangle found last time is still the closest triangle
    if (last_tri_index > 0) {
        i = last_tri_index;
        check_inside_triangle $x, $y, floor_triangles_v0[i].x, floor_triangles_v0[i].y, floor_triangles_v1[i].x, floor_triangles_v1[i].y, floor_triangles_v2[i].x, floor_triangles_v2[i].y;
        if ((a0+a1+a2) < (_at+TRI_AREA_MIN) and (_at > TRI_AREA_MIN)) {
            # plane intersection using normal and first vertex
            tri_z = (floor_triangles_v0[i].z - (((floor_triangle_normals[i].x*($x-floor_triangles_v0[i].x)) + (floor_triangle_normals[i].y*($y-floor_triangles_v0[i].y))) / floor_triangle_normals[i].z));
            last_tri_index = i;
            if (abs(($z-tri_z)) < abs(($z-closest_tri_z))) {
                closest_tri_z = tri_z;
                if (abs(($z-closest_tri_z)) < MAX_VERTICAL_DISPLACEMENT) {
                    stop_this_script; # stop early only if tri z is close enough to camera
                }
            }
        }
    }

    # enumerate over every triangle to find the floor
    closest_tri_z = 1000;
    i = 1;
    repeat (length floor_triangles_v0) {
        check_inside_triangle $x, $y, floor_triangles_v0[i].x, floor_triangles_v0[i].y, floor_triangles_v1[i].x, floor_triangles_v1[i].y, floor_triangles_v2[i].x, floor_triangles_v2[i].y;
        if ((a0+a1+a2) < (_at+TRI_AREA_MIN) and (_at > TRI_AREA_MIN)) {
            # plane intersection using normal and first vertex
            tri_z = (floor_triangles_v0[i].z - (((floor_triangle_normals[i].x*($x-floor_triangles_v0[i].x)) + (floor_triangle_normals[i].y*($y-floor_triangles_v0[i].y))) / floor_triangle_normals[i].z));
            last_tri_index = i;
            if (abs(($z-tri_z)) < abs(($z-closest_tri_z))) {
                closest_tri_z = tri_z;
                if (abs(($z-closest_tri_z)) < MAX_VERTICAL_DISPLACEMENT) {
                    stop_this_script; # stop early only if tri z is close enough to camera
                }
            }
        }
        i++;
    }
}


proc check_inside_triangle x, y, x0, y0, x1, y1, x2, y2 {
    # these variables are used as return
    a0 = abs((($x*($y1-$y2))+(($x1*($y2-$y))+($x2*($y-$y1)))));
    a1 = abs((($x*($y2-$y0))+(($x2*($y0-$y))+($x0*($y-$y2)))));
    a2 = abs((($x*($y0-$y1))+(($x0*($y1-$y))+($x1*($y-$y0)))));
    _at = abs((($x0*($y1-$y2))+(($x1*($y2-$y0))+($x2*($y0-$y1)))));
}



var start_x;
var start_y;

proc check_boundary_collisions {
    return_x = player_x;
    return_y = player_y;

    # Static walls of region:
    i = 1;
    repeat (length wall_start) {
        # check if player z is in range of the wall
        if (player_z > (wall_start[i].z - 1.5) and player_z < (wall_end[i].z + 1.5)) {
            
            line_segment_intersection start_x, start_y, return_x, return_y, wall_start[i].x, wall_start[i].y, wall_end[i].x, wall_end[i].y;
            if (x != "") {
                d = VEC2_LEN(return_x-start_x, return_y-start_y);
                return_x = (x-(wall_dist*((return_x-start_x)/d)));
                return_y = (y-(wall_dist*((return_y-start_y)/d)));
            }
            line_segment_repulsion return_x, return_y, wall_start[i].x, wall_start[i].y, wall_end[i].x, wall_end[i].y, wall_dist;
        }

        i++;
    }
    
    player_x = return_x;
    player_y = return_y;
}



# does not handle z axis
proc custom_boundary x1, y1, x2, y2 {
    line_segment_intersection start_x, start_y, return_x, return_y, $x1, $y1, $x2, $y2;
    if (x != "") {
        d = VEC2_LEN(return_x-start_x, return_y-start_y);
        return_x = (x-(wall_dist*((return_x-start_x)/d)));
        return_y = (y-(wall_dist*((return_y-start_y)/d)));
    }
    line_segment_repulsion return_x, return_y, $x1, $y1, $x2, $y2, wall_dist;
}



proc line_segment_repulsion x, y, x1, y1, x2, y2, radius {
    len = sqrt(((($x2-$x1)*($x2-$x1))+(($y2-$y1)*($y2-$y1))));
    h = (((($x2-$x1)*($x-$x1))+(($y-$y1)*($y2-$y1)))/(len*len));
    if (h < 0) {
        dist_to_line = sqrt(((($x-$x1)*($x-$x1))+(($y-$y1)*($y-$y1))));
        if (dist_to_line < $radius) {
            return_x = ($x1+(($x-$x1)*($radius/dist_to_line)));
            return_y = ($y1+(($y-$y1)*($radius/dist_to_line)));
        } else {
            return_x = $x;
            return_y = $y;
        }
    } else {
        if (h > 1) {
            dist_to_line = sqrt(((($x-$x2)*($x-$x2))+(($y-$y2)*($y-$y2))));
            if (dist_to_line < $radius) {
                return_x = ($x2+(($x-$x2)*($radius/dist_to_line)));
                return_y = ($y2+(($y-$y2)*($radius/dist_to_line)));
            } else {
                return_x = $x;
                return_y = $y;
            }
        } else {
            dist_to_line = (((($x2-$x1)*($y1-$y))-(($x1-$x)*($y2-$y1)))/len);
            if (abs(dist_to_line) < $radius) {
                if (dist_to_line < 0) {
                    return_x = ($x-((($y1-$y2)/len)*(abs(dist_to_line)-$radius)));
                    return_y = ($y-((($x2-$x1)/len)*(abs(dist_to_line)-$radius)));
                } else {
                    return_x = ($x+((($y1-$y2)/len)*(abs(dist_to_line)-$radius)));
                    return_y = ($y+((($x2-$x1)/len)*(abs(dist_to_line)-$radius)));
                }
            } else {
                return_x = $x;
                return_y = $y;
            }
        }
    }
}



proc line_segment_intersection p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y {
    d = ((($p1x-$p2x)*($p3y-$p4y))-(($p1y-$p2y)*($p3x-$p4x)));
    if (d == 0) {
        x = "";
        y = "";
    } else {
        u = ((($p1x-$p3x)*($p1y-$p2y))-(($p1y-$p3y)*($p1x-$p2x)));
        if ((u > 0) and (u < d)) {
            v = ((($p1x-$p3x)*($p3y-$p4y))-(($p1y-$p3y)*($p3x-$p4x)));
            if ((v > 0) and (v < d)) {
                x = ($p3x+((u/d)*($p4x-$p3x)));
                y = ($p3y+((u/d)*($p4y-$p3y)));
            } else {
                x = "";
                y = "";
            }
        } else {
            x = "";
            y = "";
        }
    }
}
