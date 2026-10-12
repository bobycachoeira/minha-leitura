FROM alpine:3.20

ARG PB_VERSION=0.23.4
RUN apk add --no-cache ca-certificates unzip wget

WORKDIR /pb
RUN wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
    && unzip pocketbase_*.zip \
    && rm pocketbase_*.zip \
    && chmod +x pocketbase

COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks

EXPOSE 8090
VOLUME ["/pb/pb_data"]
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
