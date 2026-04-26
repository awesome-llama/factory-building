import os
import post_processing


ROOT_DIR = ''
PATH_SOURCE_PROJECT = os.path.join(ROOT_DIR, 'project.sb3')
PATH_TARGET_PROJECT = os.path.join(ROOT_DIR, 'Factory Building 3D.sb3')



with post_processing.ScratchProject(PATH_SOURCE_PROJECT, PATH_TARGET_PROJECT) as project:
    project.order_sprites(['_', 'main', 'loader', 'player', 'model_renderer', 'UI', 'sounds_environment', 'sounds_steps'])
    project.clean_up_blocks()
    project.remove_field_text()
    project.move_turbowarp_comment()

    
    # Fix the costume sizes

    # backdrop checker
    costume = project.get_costume_by_name('Stage', 'darkchecker')
    costume['bitmapResolution'] = 1
    # for some reason, not setting these lets the backdrop work for Scratch *and* TurboWarp custom resolution:
    if 'rotationCenterX' in costume: costume.pop('rotationCenterX')
    if 'rotationCenterY' in costume: costume.pop('rotationCenterY')

    # thumbnail (960x720)
    costume = project.get_costume_by_name('_', 'awesome-llama')
    costume['bitmapResolution'] = 2
    costume['rotationCenterX'] = 480
    costume['rotationCenterY'] = 360




    project.add_build_comment('Factory Building\nCreated by awesome-llama\nhttps://scratch.mit.edu/projects/773175240\nhttps://github.com/awesome-llama/factory-building')


