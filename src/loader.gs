# Load the region

%include lib/common

costumes "costumes/blank.svg" as "icon", "costumes/blank.svg" as "@ascii/";
hide;


on "sys.hard_reset" {
    requested_region = "main";
    region = "";

    clear_world;
}


on "sys.initialize" {
    if (length object_names == 0) {
        broadcast "sys.load_region";
    }
}



list region_data_items;

list vtx_u;
list vtx_v;


proc clear_world {
    delete object_names;
    delete objects;

    delete vtx_position_os;
    delete vtx_position_ws;
    delete vtx_position_cs;
    delete vtx_position_ss;

    delete vtx_u;
    delete vtx_v;

    delete tri_vi0;
    delete tri_vi1;
    delete tri_vi2;
    delete tri_tex0;
    delete tri_tex1;
    delete tri_tex2;
    delete tri_normal;

    delete wall_start;
    delete wall_end;
    delete floor_triangles_v0;
    delete floor_triangles_v1;
    delete floor_triangles_v2;
    delete floor_triangle_normals;
}





on "sys.load_region" {
    load_region "main";
}


proc load_region name {
    clear_world;

    region_index = $name in region_names;
    if (region_index == 0) {
        error "region not found: " & $name;
        stop_this_script;
    }

    region = region_names[region_index];
    region_data = regions[region_index];

    # split region string delimited by semicolons into list items
    delete region_data_items;
    local str = "";
    local i = 1;
    repeat (length region_data) {
        if (region_data[i] == "\\") {
            i++; # skip backslash and add next char as-is
            str &= region_data[i];
        } elif (region_data[i] == ";") { # delimiter
            add str to region_data_items;
            str = "";
        } else {
            str &= region_data[i];
        }
        i++;
    }
    add str to region_data_items; # in the case the string doesn't end with semicolon

    i = 2;

    # Read object data:
    repeat region_data_items[i] {
        i++;

        add region_data_items[i] to object_names;

        repeat (1+3+1+1) { # name + location + dynamicity + texture_name
            add region_data_items[i] to objects;
            i++;
        }
        add "missing texture pointer" to objects;

        local equals_zero = true;
        repeat (6) { # bb
            if (region_data_items[i] != 0) { equals_zero = false; }
            add region_data_items[i] to objects;
            i++;
        }
        if equals_zero {
            # use infinite bounding box. Note these must be strings to save in project.json.
            objects[(length objects)-5] = "-Infinity";
            objects[(length objects)-4] = "-Infinity";
            objects[(length objects)-3] = "-Infinity";
            objects[(length objects)-2] = "Infinity";
            objects[(length objects)-1] = "Infinity";
            objects[(length objects)-0] = "Infinity";
        }
        add false to objects; # is camera in bounding box

        # verts
        add (length vtx_position_os) to objects; # start index
        add region_data_items[i] to objects; # length
        repeat (region_data_items[i]) {
            add VEC3(region_data_items[i+1]+"0", region_data_items[i+2]+"0", region_data_items[i+3]+"0") to vtx_position_os;
            add VEC3(0,0,0) to vtx_position_ws;
            add VEC3(0,0,0) to vtx_position_cs;
            add VEC3(0,0,0) to vtx_position_ss;
            i += 3;
        }
        i++;

        # uv points
        delete vtx_u;
        delete vtx_v;
        repeat (region_data_items[i]) {
            add region_data_items[i+1]/10000 to vtx_u; # remap UVs 0-10000 to 0.0-1.0
            add region_data_items[i+2]/10000 to vtx_v;
            i += 2;
        }
        i++;

        # tris
        add (length tri_vi0) to objects; # start index
        add region_data_items[i] to objects; # length
        repeat (region_data_items[i]) {
            add region_data_items[i+1]+"1" to tri_vi0;
            add region_data_items[i+2]+"1" to tri_vi1;
            add region_data_items[i+3]+"1" to tri_vi2;

            add VEC2(vtx_u[region_data_items[i+4]+"1"], vtx_v[region_data_items[i+4]+"1"]) to tri_tex0;
            add VEC2(vtx_u[region_data_items[i+5]+"1"], vtx_v[region_data_items[i+5]+"1"]) to tri_tex1;
            add VEC2(vtx_u[region_data_items[i+6]+"1"], vtx_v[region_data_items[i+6]+"1"]) to tri_tex2;

            add VEC3(0,0,0) to tri_normal;
            i += (3 + 3); # indices + UVs
        }
    }
    i++;

    # Read wall data:
    repeat region_data_items[i] {
        if (region_data_items[i+6]+"0" > region_data_items[i+3]+"0") { # start should have the lower z value
            add VEC3(region_data_items[i+1]+"0", region_data_items[i+2]+"0", region_data_items[i+3]+"0") to wall_start;
            add VEC3(region_data_items[i+4]+"0", region_data_items[i+5]+"0", region_data_items[i+6]+"0") to wall_end;
        } else {
            add VEC3(region_data_items[i+4]+"0", region_data_items[i+5]+"0", region_data_items[i+6]+"0") to wall_start;
            add VEC3(region_data_items[i+1]+"0", region_data_items[i+2]+"0", region_data_items[i+3]+"0") to wall_end;
        }
        i += 6;
    }
    i++;

    # Read floor data:
    repeat region_data_items[i] {
        add VEC3(region_data_items[i+1]+"0", region_data_items[i+2]+"0", region_data_items[i+3]+"0") to floor_triangles_v0;
        add VEC3(region_data_items[i+4]+"0", region_data_items[i+5]+"0", region_data_items[i+6]+"0") to floor_triangles_v1;
        add VEC3(region_data_items[i+7]+"0", region_data_items[i+8]+"0", region_data_items[i+9]+"0") to floor_triangles_v2;

        # cross product 0,1 and 0,2
        local cpx = (((floor_triangles_v1["last"].y - floor_triangles_v0["last"].y) * (floor_triangles_v2["last"].z - floor_triangles_v0["last"].z)) - ((floor_triangles_v1["last"].z - floor_triangles_v0["last"].z) * (floor_triangles_v2["last"].y - floor_triangles_v0["last"].y)));
        local cpy = (((floor_triangles_v1["last"].z - floor_triangles_v0["last"].z) * (floor_triangles_v2["last"].x - floor_triangles_v0["last"].x)) - ((floor_triangles_v1["last"].x - floor_triangles_v0["last"].x) * (floor_triangles_v2["last"].z - floor_triangles_v0["last"].z)));
        local cpz = (((floor_triangles_v1["last"].x - floor_triangles_v0["last"].x) * (floor_triangles_v2["last"].y - floor_triangles_v0["last"].y)) - ((floor_triangles_v1["last"].y - floor_triangles_v0["last"].y) * (floor_triangles_v2["last"].x - floor_triangles_v0["last"].x)));
        local len = VEC3_LEN(cpx, cpy, cpz);
        add  VEC3(cpx/len, cpy/len, cpz/len) to floor_triangle_normals;

        i += 9;
    }
    i++;

    delete region_data_items;

    require_transform_all = true;
}
