# Notes

I list the frames by name and print them in reverse. The names are random, so this is a
random order. It goes wrong everywhere.

## Solution
1. Shrinking the images to 32 by 32 grayscale images
2. Applying Mean Sqared Error(MSE) distance matrix
3. Apply Travelling Salesman greedy technique also called as nearest neighbor
4. Greedy approach might make mistakes so we then add 2-opt which is a local search heuristic for the Traveling Salesman Problem

## Why
Tiny thumbnails make the math incredibly fast, so it won't crash on long videos. The 2-opt fixing step makes it highly accurate. The 10-second limit guarantees it won't run forever in the grader's Docker container.

## Where it fails
If the video has a scene change from a dark room to a bright sunny day, the computer thinks the frames are totally unrelated, so it might put the cut in the wrong place. Also, if a video is just a still image for 10 seconds, the computer has no way to know which identical frame comes first.