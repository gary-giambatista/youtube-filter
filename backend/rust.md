# Guide to the Rust Backend
This is an guide to the Rust backend and how to build
## Prerequisites
This guide assumes that you are using an Ubuntu dev environment
1. Install [rustup](https://rustup.rs/) (this is rust's toolchain installer)
2. Install the required Ubuntu prerequisites
```bash
sudo apt update
sudo apt install build-essential
```
*Optional*

If you want to target windows builds the prerequisites for cross compiling the app must be installed
```bash
sudo apt install mingw-w64
rustup target add x86_64-pc-windows-gnu
```

## Running the backend
To run the app locally navigate to the `/backend` directory and run `cargo run` in your terminal. This will download the necessary rust libraries, compile the app, and run it.

## Building locally
To build the app navigate to the `backend` folder and run `cargo build`. To build for windows append the `--target x86_64-pc-windows-gnu` flag. To build a release build append the `-r` flag.

## Running locally
1. After building find the executable you want to run in the `/target` directory
2. Set the environment variable for your api key in the terminal. For windows open Powershell and run `$env:OPENAI_API_KEY="your key here"`. For bash `export OPENAI_API_KEY = "your_key_here"`