# Renders the model

%include lib/common
%include lib/transforms

costumes "costumes/blank.svg";
hide;


list fill_temp;
list depth;
list time;

var DISPLAY__Resolution = 2; # Deliberately kept separate from global resolution var so the tri filler can be edited separately

on "sys.initalize" {
    INTERNAL__Internal_Setup;
}

on "sys.hard_reset" {
    delete fill_temp;
    delete depth;
    delete time;
}




on "sys.render_geometry" {
    apply_object_transform require_transform_all;
    require_transform_all = false;

    DISPLAY__Resolution = resolution;

    if (DISPLAY__Resolution < 1) { DISPLAY__Resolution = 1; }
    if (last_resolution != DISPLAY__Resolution) { INTERNAL__Internal_Setup; }

    # Render layers:
    if (show_render_layer_texture) { render_textured_scene; }
    if (show_render_layer_refs) {
        render_refs;
        #render_points;
        #render_wireframe;
        #render_bounding_boxes;
        #render_collision;
    }
}



proc displace fac, x, y, z {
    object_location.x += $x * $fac;
    object_location.y += $y * $fac;
    object_location.z += $z * $fac;
}


var XYZ object_location;

proc apply_object_transform all {
    # transform object space verts to world space
    i = 0;
    repeat (length object_names) {
        if (objects[i+5] or $all) { # only update position if dynamic or all=true
            object_location = VEC3(objects[i+2], objects[i+3], objects[i+4]);

            # hard-coded implementation
            #if (objects[i+5]) {
            #    local name = objects[i+1];
            #    
            #}


            j = objects[i+15] + 1;
            repeat (objects[i+16]) {
                vtx_position_ws[j] = VEC3(
                    object_location.x + vtx_position[j].x,
                    object_location.y + vtx_position[j].y,
                    object_location.z + vtx_position[j].z
                );
                j++;
            }
        }
        i += OBJECT_ARRAY_SIZE;
    }

    # create triangle normals using world space verts
    i = 0;
    repeat (length object_names) {
        if ($all) { # only update position if all=true (not dynamic because it only handles translation)
            j = objects[i+17] + 1;
            repeat (objects[i+18]) {
                # vectors 0 to 1 and 0 to 2
                local XYZ d0 = VEC3(vtx_position_ws[tri_vi1[j]].x - vtx_position_ws[tri_vi0[j]].x, vtx_position_ws[tri_vi1[j]].y - vtx_position_ws[tri_vi0[j]].y, vtx_position_ws[tri_vi1[j]].z - vtx_position_ws[tri_vi0[j]].z);
                local XYZ d1 = VEC3(vtx_position_ws[tri_vi2[j]].x - vtx_position_ws[tri_vi0[j]].x, vtx_position_ws[tri_vi2[j]].y - vtx_position_ws[tri_vi0[j]].y, vtx_position_ws[tri_vi2[j]].z - vtx_position_ws[tri_vi0[j]].z);
                
                # cross product 0,1 and 0,2
                local cpx = ((d0.y * d1.z) - (d0.z * d1.y));
                local cpy = ((d0.z * d1.x) - (d0.x * d1.z));
                local cpz = ((d0.x * d1.y) - (d0.y * d1.x));
                local len = VEC3_LEN(cpx, cpy, cpz);
                tri_normal[j] = VEC3(cpx/len, cpy/len, cpz/len);
                j++;
            }
        }
        i += OBJECT_ARRAY_SIZE;
    }

    # pre-calculate
    local cos_crz = cos(cam_rot_z);
    local sin_crz = sin(cam_rot_z);
    local cos_crx = cos(cam_rot_x);
    local sin_crx = sin(cam_rot_x);

    # for rendering (only handle objects when inside their bounding box)
    i = 0;
    repeat (length object_names) {

        # bb inside check
        objects[i+14] = (cam_x > objects[i+8] and cam_y > objects[i+9] and cam_z > objects[i+10] and cam_x < objects[i+11] and cam_y < objects[i+12] and cam_z < objects[i+13]);

        if (objects[i+14]) {
            j = objects[i+15] + 1;
            repeat (objects[i+16]) {
                temp_x = (vtx_position_ws[j].x - cam_x);
                temp_y = (vtx_position_ws[j].y - cam_y);
                temp_z = (vtx_position_ws[j].z - cam_z);

                vert_x = ((temp_x*cos_crz) + (temp_y*sin_crz));
                xform_temp = ((temp_y*cos_crz) - (temp_x*sin_crz));
                vert_y = ((xform_temp*cos_crx) + (temp_z*sin_crx));
                vert_z = 0-((temp_z*cos_crx) - (xform_temp*sin_crx));
                
                vtx_position_cs[j].x = vert_x;
                vtx_position_cs[j].y = vert_y;
                vtx_position_cs[j].z = vert_z;

                vtx_position_ss[j].x = ((vert_x/vert_z)*f);
                vtx_position_ss[j].y = ((vert_y/vert_z)*f);
                vtx_position_ss[j].z = vert_z;

                j++;
            }
        }
        i += OBJECT_ARRAY_SIZE;
    }
}





proc render_refs {
    # axes (right-handed)
    set_pen_size 1;
    set_pen_color "#ff0000";
    draw_line_ws 0, 0, 0, 1, 0, 0;
    set_pen_color "#00ff00";
    draw_line_ws 0, 0, 0, 0, 1, 0;
    set_pen_color "#0000ff";
    draw_line_ws 0, 0, 0, 0, 0, 1;

    # grid points
    set_pen_color "#808080";
    draw_dot_ws -10, -10, 0;
    draw_dot_ws 10, -10, 0;
    draw_dot_ws -10, 10, 0;
    draw_dot_ws 10, 10, 0;

    # player
    set_pen_color "#00ffff";
    set_pen_size 3;
    draw_dot_ws player_x, player_y, player_z;
    set_pen_transparency 50;
    set_pen_size 1;
    local wd = "player"."wall_dist";
    i = 0;
    repeat 16 {
        draw_line_ws player_x+cos(i*22.5)*wd, player_y+sin(i*22.5)*wd, player_z, player_x+cos((i+1)*22.5)*wd, player_y+sin((i+1)*22.5)*wd, player_z;
        i += 1;
    }
    set_pen_transparency 0;
    draw_line_ws player_x, player_y, player_z, player_x, player_y, player_z+("player"."eye_height");
}


proc render_points {
    set_pen_color "#ffff00";
    set_pen_transparency 50;
    set_pen_size 2;
    i = 0;
    repeat (length object_names) {
        if (objects[i+14]) { # in bounding box
            # vertices
            j = objects[i+15] + 1;
            repeat (objects[i+16]) {
                if (vtx_position_ss[j].z > zclip) {
                    goto vtx_position_ss[j].x, vtx_position_ss[j].y;
                    pen_down;
                    pen_up;
                }
                j++;
            }
        }
        i += OBJECT_ARRAY_SIZE;
        change_pen_hue 38.1966; # calculated from golden angle
    }
}


proc render_wireframe {
    set_pen_color "#ffff00";
    set_pen_transparency 50;
    set_pen_size 1;
    i = 0;
    repeat (length object_names) {
        if (objects[i+14]) { # in bounding box
            j = objects[i+17] + 1;
            repeat (objects[i+18]) {
                if ((vtx_position_ss[tri_vi0[j]].z > zclip) and(vtx_position_ss[tri_vi1[j]].z > zclip) and (vtx_position_ss[tri_vi2[j]].z > zclip)) {
                    goto vtx_position_ss[tri_vi0[j]].x, vtx_position_ss[tri_vi0[j]].y;
                    pen_down;
                    goto vtx_position_ss[tri_vi1[j]].x, vtx_position_ss[tri_vi1[j]].y;
                    goto vtx_position_ss[tri_vi2[j]].x, vtx_position_ss[tri_vi2[j]].y;
                    goto vtx_position_ss[tri_vi0[j]].x, vtx_position_ss[tri_vi0[j]].y;
                    pen_up;
                }
                j++;
            }
        }
        i += OBJECT_ARRAY_SIZE;
        change_pen_hue 38.1966; # calculated from golden angle
    }
}


proc render_bounding_boxes {
    set_pen_color "#ffffa0";
    set_pen_transparency 70;
    set_pen_size 1;
    i = 0;
    repeat (length object_names) {
        
        # don't draw if any values are infinite
        draw_line_ws objects[i+8], objects[i+9], objects[i+10], objects[i+11], objects[i+12], objects[i+13];

        i += OBJECT_ARRAY_SIZE;
        change_pen_hue 38.1966; # calculated from golden angle
    }
}



proc render_collision {
    set_pen_color "#c69292";
    set_pen_transparency 50;
    set_pen_size 2;
    i = 1;
    repeat (length wall_start) {
        draw_line_ws floor_triangles_v0[i].x, floor_triangles_v0[i].y, floor_triangles_v0[i].z, floor_triangles_v1[i].x, floor_triangles_v1[i].y, floor_triangles_v1[i].z;
        draw_line_ws floor_triangles_v1[i].x, floor_triangles_v1[i].y, floor_triangles_v1[i].z, floor_triangles_v2[i].x, floor_triangles_v2[i].y, floor_triangles_v2[i].z;
        draw_line_ws floor_triangles_v2[i].x, floor_triangles_v2[i].y, floor_triangles_v2[i].z, floor_triangles_v0[i].x, floor_triangles_v0[i].y, floor_triangles_v0[i].z;
        i++;
    }

    set_pen_color "#ca4d4d";
    set_pen_transparency 30;
    set_pen_size 3;
    i = 1;
    repeat (length wall_start) {
        draw_line_ws wall_start[i].x, wall_start[i].y, wall_start[i].z, wall_end[i].x, wall_end[i].y, wall_end[i].z;
        i++;
    }
}




var INTERNAL__trix;
var INTERNAL__triy;
var INTERNAL__triz;

var loaded_textures_index;


%define LERP_U_A(START, END) (((START) * (1-t_a)) + ((END) * t_a))
%define LERP_U_B(START, END) (((START) * (1-t_b)) + ((END) * t_b))

proc render_textured_scene {
    _3D__This_Frame = ((_3D__This_Frame+1)%256);

    i = 0;
    repeat (length object_names) {
        if (objects[i+14]) { # in bounding box

            _3D__Texture_Offset = 0;
            _3D__Texture_Width = 440;
            _3D__Texture_Height = 440;

            j = objects[i+17] + 1;
            repeat (objects[i+18]) {
                # backface culling
                if (((vtx_position_ws[tri_vi0[j]].x-cam_x) * tri_normal[j].x) + ((vtx_position_ws[tri_vi0[j]].y-cam_y) * tri_normal[j].y) + ((vtx_position_ws[tri_vi0[j]].z-cam_z) * tri_normal[j].z) < 0) {

                    local depth_v0 = vtx_position_ss[tri_vi0[j]].z;
                    local depth_v1 = vtx_position_ss[tri_vi1[j]].z;
                    local depth_v2 = vtx_position_ss[tri_vi2[j]].z;

                    # there are 8 cases for clipping a triangle
                    if (depth_v0 > zclip) {
                        if (depth_v1 > zclip) {
                            if (depth_v2 > zclip) {
                                # fully visible
                                Fill_Scanline_Triangle vtx_position_ss[tri_vi0[j]].x, vtx_position_ss[tri_vi0[j]].y, vtx_position_ss[tri_vi1[j]].x, vtx_position_ss[tri_vi1[j]].y, vtx_position_ss[tri_vi2[j]].x, vtx_position_ss[tri_vi2[j]].y, depth_v0, depth_v1, depth_v2, tri_tex0[j].x, tri_tex0[j].y, tri_tex1[j].x, tri_tex1[j].y, tri_tex2[j].x, tri_tex2[j].y;
                            } else {
                                # v2 behind
                                t_a = UNLERP(depth_v0, depth_v2, zclip);
                                t_b = UNLERP(depth_v1, depth_v2, zclip);
                                Fill_Scanline_Triangle vtx_position_ss[tri_vi0[j]].x, vtx_position_ss[tri_vi0[j]].y, vtx_position_ss[tri_vi1[j]].x, vtx_position_ss[tri_vi1[j]].y, LERP_U_A(vtx_position_cs[tri_vi0[j]].x, vtx_position_cs[tri_vi2[j]].x)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi0[j]].y, vtx_position_cs[tri_vi2[j]].y)*f/zclip, depth_v0, depth_v1, zclip, tri_tex0[j].x, tri_tex0[j].y, tri_tex1[j].x, tri_tex1[j].y, LERP_U_A(tri_tex0[j].x, tri_tex2[j].x), LERP_U_A(tri_tex0[j].y, tri_tex2[j].y);
                                Fill_Scanline_Triangle LERP_U_A(vtx_position_cs[tri_vi0[j]].x, vtx_position_cs[tri_vi2[j]].x)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi0[j]].y, vtx_position_cs[tri_vi2[j]].y)*f/zclip, vtx_position_ss[tri_vi1[j]].x, vtx_position_ss[tri_vi1[j]].y, LERP_U_B(vtx_position_cs[tri_vi1[j]].x, vtx_position_cs[tri_vi2[j]].x)*f/zclip, LERP_U_B(vtx_position_cs[tri_vi1[j]].y, vtx_position_cs[tri_vi2[j]].y)*f/zclip, zclip, depth_v1, zclip, LERP_U_A(tri_tex0[j].x, tri_tex2[j].x), LERP_U_A(tri_tex0[j].y, tri_tex2[j].y), tri_tex1[j].x, tri_tex1[j].y, LERP_U_B(tri_tex1[j].x, tri_tex2[j].x), LERP_U_B(tri_tex1[j].y, tri_tex2[j].y);
                            }
                        } else {
                            if (depth_v2 > zclip) {
                                # v1 behind
                                t_a = UNLERP(depth_v0, depth_v1, zclip);
                                t_b = UNLERP(depth_v2, depth_v1, zclip);
                                Fill_Scanline_Triangle vtx_position_ss[tri_vi0[j]].x, vtx_position_ss[tri_vi0[j]].y, LERP_U_A(vtx_position_cs[tri_vi0[j]].x, vtx_position_cs[tri_vi1[j]].x)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi0[j]].y, vtx_position_cs[tri_vi1[j]].y)*f/zclip, vtx_position_ss[tri_vi2[j]].x, vtx_position_ss[tri_vi2[j]].y, depth_v0, zclip, depth_v2, tri_tex0[j].x, tri_tex0[j].y, LERP_U_A(tri_tex0[j].x, tri_tex1[j].x), LERP_U_A(tri_tex0[j].y, tri_tex1[j].y), tri_tex2[j].x, tri_tex2[j].y;
                                Fill_Scanline_Triangle LERP_U_A(vtx_position_cs[tri_vi0[j]].x, vtx_position_cs[tri_vi1[j]].x)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi0[j]].y, vtx_position_cs[tri_vi1[j]].y)*f/zclip, LERP_U_B(vtx_position_cs[tri_vi2[j]].x, vtx_position_cs[tri_vi1[j]].x)*f/zclip, LERP_U_B(vtx_position_cs[tri_vi2[j]].y, vtx_position_cs[tri_vi1[j]].y)*f/zclip, vtx_position_ss[tri_vi2[j]].x, vtx_position_ss[tri_vi2[j]].y, zclip, zclip, depth_v2, LERP_U_A(tri_tex0[j].x, tri_tex1[j].x), LERP_U_A(tri_tex0[j].y, tri_tex1[j].y), LERP_U_B(tri_tex2[j].x, tri_tex1[j].x), LERP_U_B(tri_tex2[j].y, tri_tex1[j].y), tri_tex2[j].x, tri_tex2[j].y;
                            } else {
                                # v1 and v2 behind
                                t_a = UNLERP(depth_v0, depth_v1, zclip);
                                t_b = UNLERP(depth_v0, depth_v2, zclip);
                                Fill_Scanline_Triangle vtx_position_ss[tri_vi0[j]].x, vtx_position_ss[tri_vi0[j]].y, LERP_U_A(vtx_position_cs[tri_vi0[j]].x, vtx_position_cs[tri_vi1[j]].x)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi0[j]].y, vtx_position_cs[tri_vi1[j]].y)*f/zclip, LERP_U_B(vtx_position_cs[tri_vi0[j]].x, vtx_position_cs[tri_vi2[j]].x)*f/zclip, LERP_U_B(vtx_position_cs[tri_vi0[j]].y, vtx_position_cs[tri_vi2[j]].y)*f/zclip, depth_v0, zclip, zclip, tri_tex0[j].x, tri_tex0[j].y, LERP_U_A(tri_tex0[j].x, tri_tex1[j].x), LERP_U_A(tri_tex0[j].y, tri_tex1[j].y), LERP_U_B(tri_tex0[j].x, tri_tex2[j].x), LERP_U_B(tri_tex0[j].y, tri_tex2[j].y);
                            }
                        }
                    } else {
                        if (depth_v1 > zclip) {
                            if (depth_v2 > zclip) {
                                # v0 behind
                                t_a = UNLERP(depth_v1, depth_v0, zclip);
                                t_b = UNLERP(depth_v2, depth_v0, zclip);
                                Fill_Scanline_Triangle LERP_U_A(vtx_position_cs[tri_vi1[j]].x, vtx_position_cs[tri_vi0[j]].x)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi1[j]].y, vtx_position_cs[tri_vi0[j]].y)*f/zclip, vtx_position_ss[tri_vi1[j]].x, vtx_position_ss[tri_vi1[j]].y, vtx_position_ss[tri_vi2[j]].x, vtx_position_ss[tri_vi2[j]].y, zclip, depth_v1, depth_v2, LERP_U_A(tri_tex1[j].x, tri_tex0[j].x), LERP_U_A(tri_tex1[j].y, tri_tex0[j].y), tri_tex1[j].x, tri_tex1[j].y, tri_tex2[j].x, tri_tex2[j].y;
                                Fill_Scanline_Triangle LERP_U_B(vtx_position_cs[tri_vi2[j]].x, vtx_position_cs[tri_vi0[j]].x)*f/zclip, LERP_U_B(vtx_position_cs[tri_vi2[j]].y, vtx_position_cs[tri_vi0[j]].y)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi1[j]].x, vtx_position_cs[tri_vi0[j]].x)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi1[j]].y, vtx_position_cs[tri_vi0[j]].y)*f/zclip, vtx_position_ss[tri_vi2[j]].x, vtx_position_ss[tri_vi2[j]].y, zclip, zclip, depth_v2, LERP_U_B(tri_tex2[j].x, tri_tex0[j].x), LERP_U_B(tri_tex2[j].y, tri_tex0[j].y), LERP_U_A(tri_tex1[j].x, tri_tex0[j].x), LERP_U_A(tri_tex1[j].y, tri_tex0[j].y), tri_tex2[j].x, tri_tex2[j].y;
                            } else {
                                # v0 and v2 behind
                                t_a = UNLERP(depth_v1, depth_v0, zclip);
                                t_b = UNLERP(depth_v1, depth_v2, zclip);
                                Fill_Scanline_Triangle LERP_U_A(vtx_position_cs[tri_vi1[j]].x, vtx_position_cs[tri_vi0[j]].x)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi1[j]].y, vtx_position_cs[tri_vi0[j]].y)*f/zclip, vtx_position_ss[tri_vi1[j]].x, vtx_position_ss[tri_vi1[j]].y, LERP_U_B(vtx_position_cs[tri_vi1[j]].x, vtx_position_cs[tri_vi2[j]].x)*f/zclip, LERP_U_B(vtx_position_cs[tri_vi1[j]].y, vtx_position_cs[tri_vi2[j]].y)*f/zclip, zclip, depth_v1, zclip, LERP_U_A(tri_tex1[j].x, tri_tex0[j].x), LERP_U_A(tri_tex1[j].y, tri_tex0[j].y), tri_tex1[j].x, tri_tex1[j].y, LERP_U_B(tri_tex1[j].x, tri_tex2[j].x), LERP_U_B(tri_tex1[j].y, tri_tex2[j].y);
                            }
                        } else {
                            if (depth_v2 > zclip) {
                                # v0 and v1 behind
                                t_a = UNLERP(depth_v2, depth_v0, zclip);
                                t_b = UNLERP(depth_v2, depth_v1, zclip);
                                Fill_Scanline_Triangle LERP_U_A(vtx_position_cs[tri_vi2[j]].x, vtx_position_cs[tri_vi0[j]].x)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi2[j]].y, vtx_position_cs[tri_vi0[j]].y)*f/zclip, LERP_U_B(vtx_position_cs[tri_vi2[j]].x, vtx_position_cs[tri_vi1[j]].x)*f/zclip, LERP_U_B(vtx_position_cs[tri_vi2[j]].y, vtx_position_cs[tri_vi1[j]].y)*f/zclip, vtx_position_ss[tri_vi2[j]].x, vtx_position_ss[tri_vi2[j]].y, zclip, zclip, depth_v2, LERP_U_A(tri_tex2[j].x, tri_tex0[j].x), LERP_U_A(tri_tex2[j].y, tri_tex0[j].y), LERP_U_B(tri_tex2[j].x, tri_tex1[j].x), LERP_U_B(tri_tex2[j].y, tri_tex1[j].y), tri_tex2[j].x, tri_tex2[j].y;
                            } else {
                                # fully behind, don't draw
                            }
                        }
                    }

                }

                j++;
            }
        }
        i += OBJECT_ARRAY_SIZE;
    }
}






proc Fill_Scanline_Triangle x1, y1, x2, y2, x3, y3, z1, z2, z3, u1, v1, u2, v2, u3, v3 {
    fill_temp[1] = $x1;
    fill_temp[2] = $x2;
    fill_temp[3] = $x3;
    fill_temp[4] = $y1;
    fill_temp[5] = $y2;
    fill_temp[6] = $y3;
    fill_temp[7] = (1/($z1*10)); # modified so that z is arbitrarily larger to prevent mysterious UV issues
    fill_temp[8] = (1/($z2*10));
    fill_temp[9] = (1/($z3*10));
    fill_temp[10] = ($u1/($z1*10));
    fill_temp[11] = ($u2/($z2*10));
    fill_temp[12] = ($u3/($z3*10));
    fill_temp[13] = ($v1/($z1*10));
    fill_temp[14] = ($v2/($z2*10));
    fill_temp[15] = ($v3/($z3*10));
    set_pen_size (DISPLAY__Resolution*1.1);
    INTERNAL__Lower_Vert = (4+($y2 < $y1));
    INTERNAL__Lower_Vert += ((6-INTERNAL__Lower_Vert)*($y3 < fill_temp[INTERNAL__Lower_Vert]));
    INTERNAL__Upper_Vert = (4+($y2 > $y1));
    INTERNAL__Upper_Vert += ((6-INTERNAL__Upper_Vert)*($y3 > fill_temp[INTERNAL__Upper_Vert]));
    INTERNAL__Middle_Vert = (15-(INTERNAL__Upper_Vert+INTERNAL__Lower_Vert));
    Inner_Fill fill_temp[(INTERNAL__Lower_Vert-3)], fill_temp[(INTERNAL__Middle_Vert-3)], fill_temp[(INTERNAL__Upper_Vert-3)], fill_temp[INTERNAL__Lower_Vert], fill_temp[INTERNAL__Middle_Vert], fill_temp[INTERNAL__Upper_Vert], fill_temp[(INTERNAL__Lower_Vert+3)], fill_temp[(INTERNAL__Middle_Vert+3)], fill_temp[(INTERNAL__Upper_Vert+3)], fill_temp[(INTERNAL__Lower_Vert+6)], fill_temp[(INTERNAL__Middle_Vert+6)], fill_temp[(INTERNAL__Upper_Vert+6)], fill_temp[(INTERNAL__Lower_Vert+9)], fill_temp[(INTERNAL__Middle_Vert+9)], fill_temp[(INTERNAL__Upper_Vert+9)];
}


proc Inner_Fill lower_x, middle_x, higher_x, lower_y, middle_y, higher_y, lower_z, middle_z, higher_z, lower_u, middle_u, higher_u, lower_v, middle_v, higher_v {
    INTERNAL__triy = (ceil(($lower_y/DISPLAY__Resolution))*DISPLAY__Resolution);
    INTERNAL__triy += ((INTERNAL__Lim-INTERNAL__triy)*(INTERNAL__triy < INTERNAL__Lim));
    INTERNAL__t2 = ((INTERNAL__triy-$lower_y)/($middle_y-$lower_y));
    INTERNAL__x1 = ($lower_x+(($middle_x-$lower_x)*INTERNAL__t2));
    INTERNAL__z1 = ($lower_z+(($middle_z-$lower_z)*INTERNAL__t2));
    INTERNAL__u1 = ($lower_u+(($middle_u-$lower_u)*INTERNAL__t2));
    INTERNAL__v1 = ($lower_v+(($middle_v-$lower_v)*INTERNAL__t2));
    INTERNAL__t2 = ((INTERNAL__triy-$lower_y)/($higher_y-$lower_y));
    INTERNAL__x2 = ($lower_x+(($higher_x-$lower_x)*INTERNAL__t2));
    INTERNAL__z2 = ($lower_z+(($higher_z-$lower_z)*INTERNAL__t2));
    INTERNAL__u2 = ($lower_u+(($higher_u-$lower_u)*INTERNAL__t2));
    INTERNAL__v2 = ($lower_v+(($higher_v-$lower_v)*INTERNAL__t2));
    INTERNAL__t4 = (DISPLAY__Resolution/(INTERNAL__triy-$middle_y));
    INTERNAL__t5 = (DISPLAY__Resolution/(INTERNAL__triy-$higher_y));
    INTERNAL__dx2 = ((INTERNAL__x2-$higher_x)*INTERNAL__t5);
    INTERNAL__dz2 = ((INTERNAL__z2-$higher_z)*INTERNAL__t5);
    INTERNAL__du2 = ((INTERNAL__u2-$higher_u)*INTERNAL__t5);
    INTERNAL__dv2 = ((INTERNAL__v2-$higher_v)*INTERNAL__t5);
    Fill_Tri_Until_target___s_point_1__s__s__s__s_point_2__s__s__s__s ($middle_y+((180-$middle_y)*($middle_y > 180))), ((INTERNAL__x1-$middle_x)*INTERNAL__t4), ((INTERNAL__z1-$middle_z)*INTERNAL__t4), ((INTERNAL__u1-$middle_u)*INTERNAL__t4), ((INTERNAL__v1-$middle_v)*INTERNAL__t4), INTERNAL__dx2, INTERNAL__dz2, INTERNAL__du2, INTERNAL__dv2;
    if ($middle_y > 180) {
        stop_this_script;
    }
    INTERNAL__t2 = ((INTERNAL__triy-$middle_y)/($higher_y-$middle_y));
    INTERNAL__x1 = ($middle_x+(($higher_x-$middle_x)*INTERNAL__t2));
    INTERNAL__z1 = ($middle_z+(($higher_z-$middle_z)*INTERNAL__t2));
    INTERNAL__u1 = ($middle_u+(($higher_u-$middle_u)*INTERNAL__t2));
    INTERNAL__v1 = ($middle_v+(($higher_v-$middle_v)*INTERNAL__t2));
    INTERNAL__t4 = (DISPLAY__Resolution/(INTERNAL__triy-$higher_y));
    Fill_Tri_Until_target___s_point_1__s__s__s__s_point_2__s__s__s__s ($higher_y+((180-$higher_y)*($higher_y > 180))), ((INTERNAL__x1-$higher_x)*INTERNAL__t4), ((INTERNAL__z1-$higher_z)*INTERNAL__t4), ((INTERNAL__u1-$higher_u)*INTERNAL__t4), ((INTERNAL__v1-$higher_v)*INTERNAL__t4), INTERNAL__dx2, INTERNAL__dz2, INTERNAL__du2, INTERNAL__dv2;
}


proc Fill_Tri_Until_target___s_point_1__s__s__s__s_point_2__s__s__s__s target, dx1, dz1, du1, dv1, dx2, dz2, du2, dv2 {
    until (INTERNAL__triy > $target) {
        INTERNAL__trix = (ceil(((INTERNAL__x1-((INTERNAL__x1-INTERNAL__x2)*(INTERNAL__x1 > INTERNAL__x2)))/DISPLAY__Resolution))*DISPLAY__Resolution);
        INTERNAL__tri_target = (ceil(((INTERNAL__x2-((INTERNAL__x2-INTERNAL__x1)*(INTERNAL__x1 > INTERNAL__x2)))/DISPLAY__Resolution))*DISPLAY__Resolution);
        INTERNAL__trix += ((abs(INTERNAL__trix) > 240)*(((INTERNAL__trix/abs(INTERNAL__trix))*240)-INTERNAL__trix));
        INTERNAL__tri_target += ((abs(INTERNAL__tri_target) > 240)*(((INTERNAL__tri_target/abs(INTERNAL__tri_target))*240)-INTERNAL__tri_target));
        INTERNAL__Divisions = abs(((INTERNAL__trix-INTERNAL__tri_target)/DISPLAY__Resolution));
        INTERNAL__t3 = ((INTERNAL__trix-INTERNAL__x1)/(INTERNAL__x2-INTERNAL__x1));
        INTERNAL__triz = (INTERNAL__z1+((INTERNAL__z2-INTERNAL__z1)*INTERNAL__t3));
        INTERNAL__triu = (INTERNAL__u1+((INTERNAL__u2-INTERNAL__u1)*INTERNAL__t3));
        INTERNAL__triv = (INTERNAL__v1+((INTERNAL__v2-INTERNAL__v1)*INTERNAL__t3));
        INTERNAL__t3 = ((INTERNAL__tri_target-INTERNAL__x1)/(INTERNAL__x2-INTERNAL__x1));
        INTERNAL__tridz = (((INTERNAL__z1+((INTERNAL__z2-INTERNAL__z1)*INTERNAL__t3))-INTERNAL__triz)/INTERNAL__Divisions);
        INTERNAL__tridu = (((INTERNAL__u1+((INTERNAL__u2-INTERNAL__u1)*INTERNAL__t3))-INTERNAL__triu)/INTERNAL__Divisions);
        INTERNAL__tridv = (((INTERNAL__v1+((INTERNAL__v2-INTERNAL__v1)*INTERNAL__t3))-INTERNAL__triv)/INTERNAL__Divisions);
        INTERNAL__Index = (((INTERNAL__trix+240)/DISPLAY__Resolution)+(((INTERNAL__triy+180)*480)/(DISPLAY__Resolution*DISPLAY__Resolution)));
        goto ((DISPLAY__Resolution/2)+INTERNAL__trix), ((DISPLAY__Resolution/2)+INTERNAL__triy);
        repeat INTERNAL__Divisions {
            if ((INTERNAL__triz > depth[INTERNAL__Index]) or (not (_3D__This_Frame == time[INTERNAL__Index]))) {
                depth[INTERNAL__Index] = INTERNAL__triz;
                time[INTERNAL__Index] = _3D__This_Frame;
                set_pen_color loaded_texture_pixels[_3D__Texture_Offset+(floor((((INTERNAL__triu%1)/INTERNAL__triz)*_3D__Texture_Width))+(floor(((INTERNAL__triv/INTERNAL__triz)*_3D__Texture_Height))*_3D__Texture_Width))];
                pen_down;
            } else {
                pen_up;
            }
            INTERNAL__trix += DISPLAY__Resolution;
            INTERNAL__triu += INTERNAL__tridu;
            INTERNAL__triv += INTERNAL__tridv;
            INTERNAL__triz += INTERNAL__tridz;
            INTERNAL__Index++;
            change_x DISPLAY__Resolution;
        }
        pen_up;
        INTERNAL__x1 += $dx1;
        INTERNAL__z1 += $dz1;
        INTERNAL__u1 += $du1;
        INTERNAL__v1 += $dv1;
        INTERNAL__x2 += $dx2;
        INTERNAL__z2 += $dz2;
        INTERNAL__u2 += $du2;
        INTERNAL__v2 += $dv2;
        INTERNAL__triy += DISPLAY__Resolution;
    }
}

proc INTERNAL__Internal_Setup  {
    last_resolution = DISPLAY__Resolution;
    _3D__This_Frame = ((_3D__This_Frame+1)%256);
    INTERNAL__Lim = (ceil((-180/DISPLAY__Resolution))*DISPLAY__Resolution);
    delete fill_temp;
    repeat 15 {
        add 0 to fill_temp;
    }
    delete depth;
    delete time;
    repeat ((480*360)/(DISPLAY__Resolution*DISPLAY__Resolution)) {
        add 0 to depth;
        add 0 to time;
    }
}

