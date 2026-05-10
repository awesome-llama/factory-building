# Foot step sounds

%include lib/common

hide;

costumes "costumes/blank.svg";

sounds
"sounds/steps/stepstone1.wav" as "stepstone1",
"sounds/steps/stepstone2.wav" as "stepstone2",
"sounds/steps/stepstone3.wav" as "stepstone3",
"sounds/steps/crackle1.wav" as "crackle1",
"sounds/steps/crackle2.wav" as "crackle2",
"sounds/steps/crackle3.wav" as "crackle3";



on "sound.start" {
    step_x = player_x;
    step_y = player_y;

    forever {
        until (cam_mode == CameraFollowMode.PLAYER) {}

        distance_from_last_step = VEC2_LEN(player_x - step_x, player_y - step_y);
        player_speed = VEC2_LEN(player_vx, player_vy);
        if (distance_from_last_step > REMAP(0, 3, 0.5, 1, player_speed)) {
            broadcast "sound.steps.update_volume";
            broadcast "sound.steps.update_pitch";
            broadcast "sound.steps.start_sound";
            
            step_x = player_x + (0.05 * random("-1.0", "1.0"));
            step_y = player_y + (0.05 * random("-1.0", "1.0"));
        }
    }
}


on "sound.steps.update_volume" {
    set_volume REMAP(0, 3.5, 25, 100, player_speed);
}

on "sound.steps.update_pitch" {
    set_pitch_effect random(-30, -20);
}

on "sound.steps.start_sound" {
    # use different sounds for different locations:
    if ((player_x < -11) and (player_y < 22.1)) {
        start_sound "crackle" & random(1, 3);
    } else {
        start_sound "stepstone" & random(1, 3);
    }
}