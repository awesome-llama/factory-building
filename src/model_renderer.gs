# Renders the model

%include lib/common
%include lib/transforms

costumes "costumes/large.svg";
hide;


list TTF_Fill_Temp;
list TTF_Depth;
list TTF_Time;

var TTF_Resolution = 2; # Deliberately kept separate from global resolution var so the tri filler can be edited separately

on "sys.initalize" {
    TTF_Internal_Setup;
}

on "sys.hard_reset" {
    delete TTF_Fill_Temp;
    delete TTF_Depth;
    delete TTF_Time;
}




on "sys.render_geometry" {
    apply_object_transform require_transform_all;
    require_transform_all = false;

    TTF_Resolution = resolution;

    if (TTF_Resolution < 1) { TTF_Resolution = 1; }
    if (last_resolution != TTF_Resolution) { TTF_Internal_Setup; }

    # Render layers:
    if (show_render_layer_texture) { render_textured_scene; }
    if (show_render_layer_refs) {
        render_refs;
        #render_points;
        #render_wireframe;
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





%define LERP_U_A(START, END) (((START) * (1-t_a)) + ((END) * t_a))
%define LERP_U_B(START, END) (((START) * (1-t_b)) + ((END) * t_b))

proc render_textured_scene {
    TTF_This_Frame = ((TTF_This_Frame+1)%256);

    i = 0;
    repeat (length object_names) {
        if (objects[i+14]) { # in bounding box

            TTF_Texture_Offset = 1;
            TTF_Texture_Width = 440;
            TTF_Texture_Height = 440;

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
                                TTF_Fill_Scanline_Triangle vtx_position_ss[tri_vi0[j]].x, vtx_position_ss[tri_vi0[j]].y, vtx_position_ss[tri_vi1[j]].x, vtx_position_ss[tri_vi1[j]].y, vtx_position_ss[tri_vi2[j]].x, vtx_position_ss[tri_vi2[j]].y, depth_v0, depth_v1, depth_v2, tri_tex0[j].x, tri_tex0[j].y, tri_tex1[j].x, tri_tex1[j].y, tri_tex2[j].x, tri_tex2[j].y;
                            } else {
                                # v2 behind
                                t_a = UNLERP(depth_v0, depth_v2, zclip);
                                t_b = UNLERP(depth_v1, depth_v2, zclip);
                                TTF_Fill_Scanline_Triangle vtx_position_ss[tri_vi0[j]].x, vtx_position_ss[tri_vi0[j]].y, vtx_position_ss[tri_vi1[j]].x, vtx_position_ss[tri_vi1[j]].y, LERP_U_A(vtx_position_cs[tri_vi0[j]].x, vtx_position_cs[tri_vi2[j]].x)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi0[j]].y, vtx_position_cs[tri_vi2[j]].y)*f/zclip, depth_v0, depth_v1, zclip, tri_tex0[j].x, tri_tex0[j].y, tri_tex1[j].x, tri_tex1[j].y, LERP_U_A(tri_tex0[j].x, tri_tex2[j].x), LERP_U_A(tri_tex0[j].y, tri_tex2[j].y);
                                TTF_Fill_Scanline_Triangle LERP_U_A(vtx_position_cs[tri_vi0[j]].x, vtx_position_cs[tri_vi2[j]].x)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi0[j]].y, vtx_position_cs[tri_vi2[j]].y)*f/zclip, vtx_position_ss[tri_vi1[j]].x, vtx_position_ss[tri_vi1[j]].y, LERP_U_B(vtx_position_cs[tri_vi1[j]].x, vtx_position_cs[tri_vi2[j]].x)*f/zclip, LERP_U_B(vtx_position_cs[tri_vi1[j]].y, vtx_position_cs[tri_vi2[j]].y)*f/zclip, zclip, depth_v1, zclip, LERP_U_A(tri_tex0[j].x, tri_tex2[j].x), LERP_U_A(tri_tex0[j].y, tri_tex2[j].y), tri_tex1[j].x, tri_tex1[j].y, LERP_U_B(tri_tex1[j].x, tri_tex2[j].x), LERP_U_B(tri_tex1[j].y, tri_tex2[j].y);
                            }
                        } else {
                            if (depth_v2 > zclip) {
                                # v1 behind
                                t_a = UNLERP(depth_v0, depth_v1, zclip);
                                t_b = UNLERP(depth_v2, depth_v1, zclip);
                                TTF_Fill_Scanline_Triangle vtx_position_ss[tri_vi0[j]].x, vtx_position_ss[tri_vi0[j]].y, LERP_U_A(vtx_position_cs[tri_vi0[j]].x, vtx_position_cs[tri_vi1[j]].x)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi0[j]].y, vtx_position_cs[tri_vi1[j]].y)*f/zclip, vtx_position_ss[tri_vi2[j]].x, vtx_position_ss[tri_vi2[j]].y, depth_v0, zclip, depth_v2, tri_tex0[j].x, tri_tex0[j].y, LERP_U_A(tri_tex0[j].x, tri_tex1[j].x), LERP_U_A(tri_tex0[j].y, tri_tex1[j].y), tri_tex2[j].x, tri_tex2[j].y;
                                TTF_Fill_Scanline_Triangle LERP_U_A(vtx_position_cs[tri_vi0[j]].x, vtx_position_cs[tri_vi1[j]].x)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi0[j]].y, vtx_position_cs[tri_vi1[j]].y)*f/zclip, LERP_U_B(vtx_position_cs[tri_vi2[j]].x, vtx_position_cs[tri_vi1[j]].x)*f/zclip, LERP_U_B(vtx_position_cs[tri_vi2[j]].y, vtx_position_cs[tri_vi1[j]].y)*f/zclip, vtx_position_ss[tri_vi2[j]].x, vtx_position_ss[tri_vi2[j]].y, zclip, zclip, depth_v2, LERP_U_A(tri_tex0[j].x, tri_tex1[j].x), LERP_U_A(tri_tex0[j].y, tri_tex1[j].y), LERP_U_B(tri_tex2[j].x, tri_tex1[j].x), LERP_U_B(tri_tex2[j].y, tri_tex1[j].y), tri_tex2[j].x, tri_tex2[j].y;
                            } else {
                                # v1 and v2 behind
                                t_a = UNLERP(depth_v0, depth_v1, zclip);
                                t_b = UNLERP(depth_v0, depth_v2, zclip);
                                TTF_Fill_Scanline_Triangle vtx_position_ss[tri_vi0[j]].x, vtx_position_ss[tri_vi0[j]].y, LERP_U_A(vtx_position_cs[tri_vi0[j]].x, vtx_position_cs[tri_vi1[j]].x)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi0[j]].y, vtx_position_cs[tri_vi1[j]].y)*f/zclip, LERP_U_B(vtx_position_cs[tri_vi0[j]].x, vtx_position_cs[tri_vi2[j]].x)*f/zclip, LERP_U_B(vtx_position_cs[tri_vi0[j]].y, vtx_position_cs[tri_vi2[j]].y)*f/zclip, depth_v0, zclip, zclip, tri_tex0[j].x, tri_tex0[j].y, LERP_U_A(tri_tex0[j].x, tri_tex1[j].x), LERP_U_A(tri_tex0[j].y, tri_tex1[j].y), LERP_U_B(tri_tex0[j].x, tri_tex2[j].x), LERP_U_B(tri_tex0[j].y, tri_tex2[j].y);
                            }
                        }
                    } else {
                        if (depth_v1 > zclip) {
                            if (depth_v2 > zclip) {
                                # v0 behind
                                t_a = UNLERP(depth_v1, depth_v0, zclip);
                                t_b = UNLERP(depth_v2, depth_v0, zclip);
                                TTF_Fill_Scanline_Triangle LERP_U_A(vtx_position_cs[tri_vi1[j]].x, vtx_position_cs[tri_vi0[j]].x)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi1[j]].y, vtx_position_cs[tri_vi0[j]].y)*f/zclip, vtx_position_ss[tri_vi1[j]].x, vtx_position_ss[tri_vi1[j]].y, vtx_position_ss[tri_vi2[j]].x, vtx_position_ss[tri_vi2[j]].y, zclip, depth_v1, depth_v2, LERP_U_A(tri_tex1[j].x, tri_tex0[j].x), LERP_U_A(tri_tex1[j].y, tri_tex0[j].y), tri_tex1[j].x, tri_tex1[j].y, tri_tex2[j].x, tri_tex2[j].y;
                                TTF_Fill_Scanline_Triangle LERP_U_B(vtx_position_cs[tri_vi2[j]].x, vtx_position_cs[tri_vi0[j]].x)*f/zclip, LERP_U_B(vtx_position_cs[tri_vi2[j]].y, vtx_position_cs[tri_vi0[j]].y)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi1[j]].x, vtx_position_cs[tri_vi0[j]].x)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi1[j]].y, vtx_position_cs[tri_vi0[j]].y)*f/zclip, vtx_position_ss[tri_vi2[j]].x, vtx_position_ss[tri_vi2[j]].y, zclip, zclip, depth_v2, LERP_U_B(tri_tex2[j].x, tri_tex0[j].x), LERP_U_B(tri_tex2[j].y, tri_tex0[j].y), LERP_U_A(tri_tex1[j].x, tri_tex0[j].x), LERP_U_A(tri_tex1[j].y, tri_tex0[j].y), tri_tex2[j].x, tri_tex2[j].y;
                            } else {
                                # v0 and v2 behind
                                t_a = UNLERP(depth_v1, depth_v0, zclip);
                                t_b = UNLERP(depth_v1, depth_v2, zclip);
                                TTF_Fill_Scanline_Triangle LERP_U_A(vtx_position_cs[tri_vi1[j]].x, vtx_position_cs[tri_vi0[j]].x)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi1[j]].y, vtx_position_cs[tri_vi0[j]].y)*f/zclip, vtx_position_ss[tri_vi1[j]].x, vtx_position_ss[tri_vi1[j]].y, LERP_U_B(vtx_position_cs[tri_vi1[j]].x, vtx_position_cs[tri_vi2[j]].x)*f/zclip, LERP_U_B(vtx_position_cs[tri_vi1[j]].y, vtx_position_cs[tri_vi2[j]].y)*f/zclip, zclip, depth_v1, zclip, LERP_U_A(tri_tex1[j].x, tri_tex0[j].x), LERP_U_A(tri_tex1[j].y, tri_tex0[j].y), tri_tex1[j].x, tri_tex1[j].y, LERP_U_B(tri_tex1[j].x, tri_tex2[j].x), LERP_U_B(tri_tex1[j].y, tri_tex2[j].y);
                            }
                        } else {
                            if (depth_v2 > zclip) {
                                # v0 and v1 behind
                                t_a = UNLERP(depth_v2, depth_v0, zclip);
                                t_b = UNLERP(depth_v2, depth_v1, zclip);
                                TTF_Fill_Scanline_Triangle LERP_U_A(vtx_position_cs[tri_vi2[j]].x, vtx_position_cs[tri_vi0[j]].x)*f/zclip, LERP_U_A(vtx_position_cs[tri_vi2[j]].y, vtx_position_cs[tri_vi0[j]].y)*f/zclip, LERP_U_B(vtx_position_cs[tri_vi2[j]].x, vtx_position_cs[tri_vi1[j]].x)*f/zclip, LERP_U_B(vtx_position_cs[tri_vi2[j]].y, vtx_position_cs[tri_vi1[j]].y)*f/zclip, vtx_position_ss[tri_vi2[j]].x, vtx_position_ss[tri_vi2[j]].y, zclip, zclip, depth_v2, LERP_U_A(tri_tex2[j].x, tri_tex0[j].x), LERP_U_A(tri_tex2[j].y, tri_tex0[j].y), LERP_U_B(tri_tex2[j].x, tri_tex1[j].x), LERP_U_B(tri_tex2[j].y, tri_tex1[j].y), tri_tex2[j].x, tri_tex2[j].y;
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






proc TTF_Fill_Scanline_Triangle x1, y1, x2, y2, x3, y3, z1, z2, z3, u1, v1, u2, v2, u3, v3 {
    TTF_Fill_Temp[1] = $x1;
    TTF_Fill_Temp[2] = $x2;
    TTF_Fill_Temp[3] = $x3;
    TTF_Fill_Temp[4] = $y1;
    TTF_Fill_Temp[5] = $y2;
    TTF_Fill_Temp[6] = $y3;
    TTF_Fill_Temp[7] = (1/($z1*10)); # modified so that z is arbitrarily larger to prevent mysterious UV issues
    TTF_Fill_Temp[8] = (1/($z2*10));
    TTF_Fill_Temp[9] = (1/($z3*10));
    TTF_Fill_Temp[10] = ($u1/($z1*10));
    TTF_Fill_Temp[11] = ($u2/($z2*10));
    TTF_Fill_Temp[12] = ($u3/($z3*10));
    TTF_Fill_Temp[13] = ($v1/($z1*10));
    TTF_Fill_Temp[14] = ($v2/($z2*10));
    TTF_Fill_Temp[15] = ($v3/($z3*10));
    set_pen_size (TTF_Resolution*1.1);
    TTF_Lower_Vert = (4+($y2 < $y1));
    TTF_Lower_Vert += ((6-TTF_Lower_Vert)*($y3 < TTF_Fill_Temp[TTF_Lower_Vert]));
    TTF_Upper_Vert = (4+($y2 > $y1));
    TTF_Upper_Vert += ((6-TTF_Upper_Vert)*($y3 > TTF_Fill_Temp[TTF_Upper_Vert]));
    TTF_Middle_Vert = (15-(TTF_Upper_Vert+TTF_Lower_Vert));
    TTF_Inner_Fill TTF_Fill_Temp[(TTF_Lower_Vert-3)], TTF_Fill_Temp[(TTF_Middle_Vert-3)], TTF_Fill_Temp[(TTF_Upper_Vert-3)], TTF_Fill_Temp[TTF_Lower_Vert], TTF_Fill_Temp[TTF_Middle_Vert], TTF_Fill_Temp[TTF_Upper_Vert], TTF_Fill_Temp[(TTF_Lower_Vert+3)], TTF_Fill_Temp[(TTF_Middle_Vert+3)], TTF_Fill_Temp[(TTF_Upper_Vert+3)], TTF_Fill_Temp[(TTF_Lower_Vert+6)], TTF_Fill_Temp[(TTF_Middle_Vert+6)], TTF_Fill_Temp[(TTF_Upper_Vert+6)], TTF_Fill_Temp[(TTF_Lower_Vert+9)], TTF_Fill_Temp[(TTF_Middle_Vert+9)], TTF_Fill_Temp[(TTF_Upper_Vert+9)];
}


proc TTF_Inner_Fill lower_x, middle_x, higher_x, lower_y, middle_y, higher_y, lower_z, middle_z, higher_z, lower_u, middle_u, higher_u, lower_v, middle_v, higher_v {
    TTF_triy = (ceil(($lower_y/TTF_Resolution))*TTF_Resolution);
    TTF_triy += ((TTF_Lim-TTF_triy)*(TTF_triy < TTF_Lim));
    TTF_t2 = ((TTF_triy-$lower_y)/($middle_y-$lower_y));
    TTF_x1 = ($lower_x+(($middle_x-$lower_x)*TTF_t2));
    TTF_z1 = ($lower_z+(($middle_z-$lower_z)*TTF_t2));
    TTF_u1 = ($lower_u+(($middle_u-$lower_u)*TTF_t2));
    TTF_v1 = ($lower_v+(($middle_v-$lower_v)*TTF_t2));
    TTF_t2 = ((TTF_triy-$lower_y)/($higher_y-$lower_y));
    TTF_x2 = ($lower_x+(($higher_x-$lower_x)*TTF_t2));
    TTF_z2 = ($lower_z+(($higher_z-$lower_z)*TTF_t2));
    TTF_u2 = ($lower_u+(($higher_u-$lower_u)*TTF_t2));
    TTF_v2 = ($lower_v+(($higher_v-$lower_v)*TTF_t2));
    TTF_t4 = (TTF_Resolution/(TTF_triy-$middle_y));
    TTF_t5 = (TTF_Resolution/(TTF_triy-$higher_y));
    TTF_dx2 = ((TTF_x2-$higher_x)*TTF_t5);
    TTF_dz2 = ((TTF_z2-$higher_z)*TTF_t5);
    TTF_du2 = ((TTF_u2-$higher_u)*TTF_t5);
    TTF_dv2 = ((TTF_v2-$higher_v)*TTF_t5);
    TTF_Fill_Tri_Until ($middle_y+((180-$middle_y)*($middle_y > 180))), ((TTF_x1-$middle_x)*TTF_t4), ((TTF_z1-$middle_z)*TTF_t4), ((TTF_u1-$middle_u)*TTF_t4), ((TTF_v1-$middle_v)*TTF_t4), TTF_dx2, TTF_dz2, TTF_du2, TTF_dv2;
    if ($middle_y > 180) {
        stop_this_script;
    }
    TTF_t2 = ((TTF_triy-$middle_y)/($higher_y-$middle_y));
    TTF_x1 = ($middle_x+(($higher_x-$middle_x)*TTF_t2));
    TTF_z1 = ($middle_z+(($higher_z-$middle_z)*TTF_t2));
    TTF_u1 = ($middle_u+(($higher_u-$middle_u)*TTF_t2));
    TTF_v1 = ($middle_v+(($higher_v-$middle_v)*TTF_t2));
    TTF_t4 = (TTF_Resolution/(TTF_triy-$higher_y));
    TTF_Fill_Tri_Until ($higher_y+((180-$higher_y)*($higher_y > 180))), ((TTF_x1-$higher_x)*TTF_t4), ((TTF_z1-$higher_z)*TTF_t4), ((TTF_u1-$higher_u)*TTF_t4), ((TTF_v1-$higher_v)*TTF_t4), TTF_dx2, TTF_dz2, TTF_du2, TTF_dv2;
}


proc TTF_Fill_Tri_Until target, dx1, dz1, du1, dv1, dx2, dz2, du2, dv2 {
    until (TTF_triy > $target) {
        TTF_trix = (ceil(((TTF_x1-((TTF_x1-TTF_x2)*(TTF_x1 > TTF_x2)))/TTF_Resolution))*TTF_Resolution);
        TTF_tri_target = (ceil(((TTF_x2-((TTF_x2-TTF_x1)*(TTF_x1 > TTF_x2)))/TTF_Resolution))*TTF_Resolution);
        TTF_trix += ((abs(TTF_trix) > 240)*(((TTF_trix/abs(TTF_trix))*240)-TTF_trix));
        TTF_tri_target += ((abs(TTF_tri_target) > 240)*(((TTF_tri_target/abs(TTF_tri_target))*240)-TTF_tri_target));
        TTF_Divisions = abs(((TTF_trix-TTF_tri_target)/TTF_Resolution));
        TTF_t3 = ((TTF_trix-TTF_x1)/(TTF_x2-TTF_x1));
        TTF_triz = (TTF_z1+((TTF_z2-TTF_z1)*TTF_t3));
        TTF_triu = (TTF_u1+((TTF_u2-TTF_u1)*TTF_t3));
        TTF_triv = (TTF_v1+((TTF_v2-TTF_v1)*TTF_t3));
        TTF_t3 = ((TTF_tri_target-TTF_x1)/(TTF_x2-TTF_x1));
        TTF_tridz = (((TTF_z1+((TTF_z2-TTF_z1)*TTF_t3))-TTF_triz)/TTF_Divisions);
        TTF_tridu = (((TTF_u1+((TTF_u2-TTF_u1)*TTF_t3))-TTF_triu)/TTF_Divisions);
        TTF_tridv = (((TTF_v1+((TTF_v2-TTF_v1)*TTF_t3))-TTF_triv)/TTF_Divisions);
        TTF_Index = (((TTF_trix+240)/TTF_Resolution)+(((TTF_triy+180)*480)/(TTF_Resolution*TTF_Resolution)));
        goto ((TTF_Resolution/2)+TTF_trix), ((TTF_Resolution/2)+TTF_triy);
        repeat TTF_Divisions {
            if ((TTF_triz > TTF_Depth[TTF_Index]) or (not (TTF_This_Frame == TTF_Time[TTF_Index]))) {
                TTF_Depth[TTF_Index] = TTF_triz;
                TTF_Time[TTF_Index] = TTF_This_Frame;
                set_pen_color loaded_texture_pixels[TTF_Texture_Offset+(floor((((TTF_triu%1)/TTF_triz)*TTF_Texture_Width))+(floor(((TTF_triv/TTF_triz)*TTF_Texture_Height))*TTF_Texture_Width))];
                pen_down;
            } else {
                pen_up;
            }
            TTF_trix += TTF_Resolution;
            TTF_triu += TTF_tridu;
            TTF_triv += TTF_tridv;
            TTF_triz += TTF_tridz;
            TTF_Index++;
            change_x TTF_Resolution;
        }
        pen_up;
        TTF_x1 += $dx1;
        TTF_z1 += $dz1;
        TTF_u1 += $du1;
        TTF_v1 += $dv1;
        TTF_x2 += $dx2;
        TTF_z2 += $dz2;
        TTF_u2 += $du2;
        TTF_v2 += $dv2;
        TTF_triy += TTF_Resolution;
    }
}


proc TTF_Internal_Setup  {
    last_resolution = TTF_Resolution;
    TTF_This_Frame = (TTF_This_Frame + 1) % 256;
    TTF_Lim = ceil(-180/TTF_Resolution) * TTF_Resolution;
    delete TTF_Fill_Temp;
    repeat 15 {
        add 0 to TTF_Fill_Temp;
    }
    delete TTF_Depth;
    delete TTF_Time;
    repeat ((480*360)/(TTF_Resolution*TTF_Resolution)) {
        add 0 to TTF_Depth;
        add 0 to TTF_Time;
    }
}

