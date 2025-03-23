# Docker Running Instructions
## Building
In order to build a docker container navigate to `/backend` and run `docker build -t <example_tag_name> .` This will build a docker image of the server backend.

## Running
Once the image is built it can be run with `podman run -d -p 3000:3000 -e OPENAI_API_KEY=<openai_key_here> --restart=always <example_tag_name>`. This will start the backend server on port 3000 and will restart after crashes.
