# Docker Running Instructions
## Building
In order to build a docker container navigate to `/backend` and run `docker build -t <example_tag_name> .` This will build a docker image of the server backend.

## Running
Once the image is built it can be run with `docker run -d -p 3000:3000 -e OPENAI_API_KEY=<openai_key_here> --restart=always <example_tag_name>`. This will start the backend server on port 3000 and will restart after crashes.

In order for the server to run properly we need to have an available Valkey or Redis instance available. A docker container containing a Redis instance can be started by running `docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 --restart=always docker.io/redis/redis-stack:latest`. If this is running on the same host as the server, the Valkey/Redis instance should be connected to automatically, otherwise the `REDIS_URL` environment variable must be set for the environment where the server is running (in this case set it in the server's `docker run` command).
