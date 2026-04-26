# Foot step sounds

%include lib/common

costumes "costumes/blank.svg";

sounds
"sounds/steps/stepstone1.wav" as "stepstone1",
"sounds/steps/stepstone2.wav" as "stepstone2",
"sounds/steps/stepstone3.wav" as "stepstone3",
"sounds/steps/crackle1.wav" as "crackle1",
"sounds/steps/crackle2.wav" as "crackle2",
"sounds/steps/crackle3.wav" as "crackle3";

hide;


on "sound.start" {
    step_x = player_x;
    step_y = player_y;
    
    set_volume 100;
    forever {
        until (cam_mode == CameraFollowMode.PLAYER) {}

        dist = VEC2_LEN(player_x - step_x, player_y - step_y);
        if (dist > 1) {
            set_pitch_effect random(-40, -20);

            # use different sounds for different locations:
            if ((player_x < -11) and (player_y < 22.1)) {
                start_sound "crackle" & random(1, 3);
            } else {
                start_sound "stepstone" & random(1, 3);
            }
            step_x = player_x + (0.05 * random("-1.0", "1.0"));
            step_y = player_y + (0.05 * random("-1.0", "1.0"));
        }
    }
}
