%include lib/common

costumes "costumes/darkchecker.png";


################################
#             Misc             #
################################

# reset the project on first load (the variable defaults to false). This allows hard_reset to run.
var goboscript_init_done = false;

# first time the user plays, to set things like resolution
var first_time_playing = true;

# delta time, the elapsed time since the last frame.
var dt;

# frames per second display
var FPS;


list PTE_font "data/5x7 printable ASCII.txt";


################################
#            Camera            #
################################
var cam_x;
var cam_y;
var cam_z;
var cam_rot_x;
#var cam_rot_y; # unused
var cam_rot_z;
var cam_mode = CameraFollowMode.FREE;


################################
#            Player            #
################################
var player_x;
var player_y;
var player_z;

# touch screen is not supported due to difficulties in supporting multi-touch (which is almost necessary)

var keybind_move_left;
var keybind_move_right;
var keybind_move_backward;
var keybind_move_forward;
var keybind_move_down;
var keybind_move_up;
var keybind_sprint;

var look_method; # click and drag, pointerlock, 4 buttons
var keybind_look_left;
var keybind_look_right;
var keybind_look_down;
var keybind_look_up;
var look_sensitivity;


proc reset_keybinds {
    keybind_move_left = "A";
    keybind_move_right = "D";
    keybind_move_backward = "S";
    keybind_move_forward = "W";
    keybind_move_down = "Q";
    keybind_move_up = "E";
    keybind_sprint = "shift";

    look_method = "click and drag"; # click and drag, pointerlock, 4 buttons
    keybind_look_left = "left arrow";
    keybind_look_right = "right arrow";
    keybind_look_down = "down arrow";
    keybind_look_up = "up arrow";
    look_sensitivity = 0.6;
}


################################
#           Renderer           #
################################

var FOV;
var zclip;
var f;
var screen_radius;

var resolution = 2;
var require_transform_all = false;

var show_render_layer_refs;
var show_render_layer_texture;

list resolution_options = [20, 1, 2, 3, 4, 5, 6, 9, 12, 15];

################################
#            Model             #
################################

# all static and dynamic vertices occupy the same list. A separate list keeps track of the regions in this list and their behavior.

# a single object consists of a set of verts, set of triangles, material, dynamic/static state, unique name.

list region_names "models/region_names.txt";
list regions "models/regions.txt";

list loaded_texture_pixels "models/texture.txt";


list object_names;
list objects; # loaded object data

list XYZ vtx_position; # object space
list XYZ vtx_position_ws; # world space
list XYZ vtx_position_cs; # camera space
list XYZ vtx_position_ss; # screen space

# triangle indices
list tri_vi0;
list tri_vi1;
list tri_vi2;

# texture location (UV)
list XY tri_tex0;
list XY tri_tex1;
list XY tri_tex2;

# normal (calculated from verts)
list XYZ tri_normal;

# collision
list XYZ wall_start;
list XYZ wall_end;
list XYZ floor_triangles_v0;
list XYZ floor_triangles_v1;
list XYZ floor_triangles_v2;
list XYZ floor_triangle_normals;



################################


on "sys.hard_reset" {
    first_time_playing = true;

    FOV = 110;
    zclip = 0.1;
    screen_radius = 240;

    show_render_layer_refs = false;
    show_render_layer_texture = true;

    reset_keybinds;
}


onflag {
    if (goboscript_init_done == false) {
        goboscript_init_done = true;
        broadcast "sys.hard_reset";
    }

    if (first_time_playing) {
        if ($tw_is_compiled) {
            resolution = 4;
        } else {
            resolution = 12;
        }
        first_time_playing = false;
    }

    broadcast "sys.initalize"; # all receivers must complete within the frame, no loops allowed to start. Think of it as a soft reset.
    broadcast "sys.start_main_loop"; # schedule main loop start after init
    broadcast "sound.start";
}


onclick {
    broadcast "sys.stage_clicked";
}