import os
import post_processing


ROOT_DIR = ''
PATH_SOURCE_PROJECT = os.path.join(ROOT_DIR, 'project.sb3')
PATH_TARGET_PROJECT = os.path.join(ROOT_DIR, 'Factory Building 3D.sb3')



with post_processing.ScratchProject(PATH_SOURCE_PROJECT, PATH_TARGET_PROJECT) as project:
    project.list_items_to_numbers('PTE_font')
    project.list_items_to_numbers('loaded_texture_pixels')
    project.order_sprites(['_', 'main', 'loader', 'player', 'model_renderer', 'UI', 'sounds_environment', 'sounds_steps'])
    project.remove_field_text()
    project.move_turbowarp_comment()
    project.add_build_comment('Factory Building\nCreated by awesome-llama\nhttps://scratch.mit.edu/projects/773175240\nhttps://github.com/awesome-llama/factory-building')

