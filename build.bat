@echo off

:: Build the goboscript project
goboscript build src -o "project.sb3"

:: post-processing
echo Running post-process...
python3 "src/post-processing/main.py"

echo Finished!
pause