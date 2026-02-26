FROM node:20-bookworm

WORKDIR /app

# node-gyp 用に最低限のビルドツール
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python-is-python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

CMD ["bash", "-lc", "npm ci && tail -f /dev/null"]
