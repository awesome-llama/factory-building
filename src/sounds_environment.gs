# Sounds in the 3D environment. A clone is created for each sound emitter because this provides unique control over its volume and effects.

%include lib/common
%include lib/transforms

costumes "costumes/blank.svg";

sounds
"sounds/environment/vent_fan.mp3" as "vent_fan",
"sounds/environment/vent_fan.mp3" as "vent_fan2",
"sounds/environment/electric_hum.mp3" as "electric_hum",
"sounds/environment/electric_hum.mp3" as "electric_hum2";
# there are duplicates of each sound file so that the ends can be crossfaded when looping.

hide;


on "sound.start" {
    if (true) { delete_this_clone; } # delete all clones and let the original sprite create new ones
    
    is_clone = false;
    add_sound "electric_hum", 60, 5, 3.5, 1.5, 5, 9, 1; # near red light
    add_sound "vent_fan", 100, 1.9, 19, 0.5, 10, 10, 2; # garage bench
}


proc add_sound name, volume_fac, x, y, z, radius, duration, fade_duration, {
    emitter_sound_name = $name;
    emitter_volume_fac = $volume_fac;
    emitter_x = $x;
    emitter_y = $y;
    emitter_z = $z;
    emitter_radius = $radius;
    emitter_duration = $duration;
    emitter_fade_duration = $fade_duration;
    clone "_myself_";
}


on "sound.update" {
    if (is_clone) {
        ws_to_cs emitter_x, emitter_y, emitter_z;
        emitter_distance = VEC3_LEN(return_x, return_y, return_z);

        # sound blocks yield so need to be run in separate scripts
        broadcast "sound.envionment.update_volume";
        broadcast "sound.envionment.update_pan";
    }
}


on "sound.envionment.update_volume" {
    if (is_clone) {
        if (emitter_distance < emitter_radius) {
            # falloff: \left(1-\left(\frac{x}{r}\right)\right)^{n}
            emitter_volume = POW((1 - (emitter_distance / emitter_radius)), 3) * emitter_volume_fac;
        } else {
            emitter_volume = 0;
        }
        
        set_volume emitter_volume;
    }
}


on "sound.envionment.update_pan" {
    if (is_clone) {
        if (emitter_distance < emitter_radius) {
            emitter_right = DOT_PRODUCT_3D(return_x/emitter_distance, return_y/emitter_distance, return_z/emitter_distance, 1, 0, 0);

            set_pan_effect emitter_right * 50; # 100% is too unbalanced
        }
    }
}



onclone {
    is_clone = true;
    set_volume 0;
    forever {
        start_sound emitter_sound_name;
        wait emitter_duration - (emitter_fade_duration * 2);
        start_sound emitter_sound_name & "2";
        wait emitter_duration - (emitter_fade_duration * 2);
    }
}


