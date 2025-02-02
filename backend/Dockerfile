FROM docker.io/library/rust:latest AS builder

WORKDIR /usr/src/backend

COPY Cargo.toml Cargo.lock ./

COPY src ./src
RUN apt-get update
RUN apt-get install -y musl-tools
RUN rustup target add x86_64-unknown-linux-musl
RUN cargo build --target=x86_64-unknown-linux-musl --release

FROM scratch

COPY --from=builder /usr/src/backend/target/x86_64-unknown-linux-musl/release/backend /backend

EXPOSE 3000

CMD ["/backend"]
