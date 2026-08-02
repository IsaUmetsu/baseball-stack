FROM python:3.11-slim

WORKDIR /app

# 必要パッケージ (firefox-esr は Selenium用)
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    unzip \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    firefox-esr \
    && rm -rf /var/lib/apt/lists/*

# geckodriver インストール (コンテナアーキテクチャに合わせる)
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then \
        GECKO_ARCH="linux-aarch64"; \
    else \
        GECKO_ARCH="linux64"; \
    fi && \
    curl -sL "https://github.com/mozilla/geckodriver/releases/download/v0.35.0/geckodriver-v0.35.0-${GECKO_ARCH}.tar.gz" \
    | tar -xz -C /usr/local/bin/ && \
    chmod +x /usr/local/bin/geckodriver

# requirements.txt インストール (Selenium等)
COPY py_baseball/requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt

# playwright インストール
RUN pip install playwright \
    && playwright install --with-deps
