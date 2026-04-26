# Sounds in the 3D environment. A clone is created for each sound emitter because this provides unique control over its volume and effects.

%include lib/common

costumes "costumes/blank.svg";

sounds
"sounds/environment/vent_fan.mp3" as "vent_fan",
"sounds/environment/vent_fan.mp3" as "vent_fan2",
"sounds/environment/electric_hum.mp3" as "electric_hum",
"sounds/environment/electric_hum.mp3" as "electric_hum2";
# there are duplicates of each sound file so that the ends can be crossfaded when looping.

hide;

list sound_data;

var clone_ID = 0;


%define ABI(LIST_NUMBER) (((clone_ID - 1) * 8) + (LIST_NUMBER))
%define ABD(LIST_NUMBER) sound_data[ABI(LIST_NUMBER)]


on "sys.initalize" {
    if (true) { delete_this_clone; } # only the original sprite can continue with this script

    # Add sounds:
    delete sound_data;
    clone_ID = 0;
    add_sound "electric_hum", 60, 5, 3.5, 1.5, 5, 9, 1; # near red light
    add_sound "vent_fan", 100, 1.9, 19, 0.5, 6, 16, 2; # garage bench

    clone_ID = 0; # 0 is the original sprite

    forever {
        broadcast_and_wait "update sound effects";
    }
}


proc add_sound name, volume_fac, x, y, z, radius, duration, fade_duration, {
    clone_ID += 1;
    add $name to sound_data;
    add $volume_fac to sound_data;
    add $x to sound_data;
    add $y to sound_data;
    add $z to sound_data;
    add $radius to sound_data;
    add $duration to sound_data;
    add $fade_duration to sound_data;
    clone "_myself_";
}


on "sound.update" {
    if (clone_ID > 0) {
        sound_dx = cam_x - ABD(3);
        sound_dy = cam_y - ABD(4);
        sound_dz = cam_z - ABD(5);
        sound_dist = VEC3_LEN(sound_dx, sound_dy, sound_dz);
        sound_radius = ABD(6);

        if (sound_dist > sound_radius) {
            emitter_loudness = 0;
        } else {
            # falloff: \left(1-\left(\frac{x}{r}\right)\right)^{n}
            emitter_loudness = POW((1 - (sound_dist / sound_radius)), 3) * ABD(2);
        }
        
        set_volume emitter_loudness;
    }
}


onclone {
    set_volume 0;
    forever {
        start_sound ABD(1);
        wait ABD(7) - (ABD(8) * 2);
        start_sound ABD(1) & "2";
        wait ABD(7) - (ABD(8) * 2);
    }
}


