FROM node:20-slim

# Git, Claude CLI関連の依存パッケージをインストール
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# アプリケーションディレクトリを作成
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存パッケージをインストール
RUN npm ci

# ソースコードをコピー
COPY . .

# TypeScriptをコンパイル
RUN npm run build

# Claude CLIの設定
RUN npm run setting

# エントリポイントの設定
ENTRYPOINT ["node", "/app/dist/index.js"]
