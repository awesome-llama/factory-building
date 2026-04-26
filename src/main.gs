%include lib/common

costumes "costumes/blank.svg";
hide;


on "sys.start_main_loop" {
    last_time = days_since_2000();
    forever {
        # delta time
        dt = 86400 * (days_since_2000() - last_time);
        if dt > 0.1 {dt = 0.1;}
        FPS = round(1/dt);
        last_time = days_since_2000();

        # tick
        f = (1/tan((FOV/2))) * screen_radius; # pre-calculated scale fac to convert cs to ss

        UI_last_hovered_group = UI_hovered_group;
        UI_last_hovered_element = UI_hovered_element;
        UI_hovered_group = "";
        UI_hovered_element = "";
        
        erase_all;
        broadcast "sys.update_player";
        broadcast "sys.render_geometry";
        broadcast "sys.render_UI";
        broadcast "sound.update";
    }
}


