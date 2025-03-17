FROM node:20-slim

# Git, Claude CLI関連の依存パッケージをインストール
RUN apt-get update && apt-get install -y \
    git \
    curl \
    zsh \
    jq \
    && rm -rf /var/lib/apt/lists/*

ENV SHELL /bin/zsh

# アプリケーションディレクトリを作成
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存パッケージをインストール
RUN npm ci

# ソースコードをコピー
COPY . .

RUN npm install -g @anthropic-ai/claude-code

RUN npm run build

# エントリポイントの設定
ENTRYPOINT ["node", "/app/dist/index.js"]
