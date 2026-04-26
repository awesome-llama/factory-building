This folder contains the 3D model and texture.

There is only 1 texture. It is 24-bit combined RGB, ordered left-to-right, bottom-to-top. There is no converter in this project, use [this](https://awesome-llama.github.io/utils/img-converter). Save it here as `texture.txt`.

A custom 3D model format is used for the geometry. This is because multiple objects are needed with special properties. Common formats like obj are unable to store this and require a more complicated decoder in Scratch. To generate the model files, open `scene.blend` and run its Python script. It will write files to this folder.
