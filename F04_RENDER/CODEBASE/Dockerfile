# LACRIMAE F04 — Remotion Docker Image
# Adapte de OMNIS-WATCH F03A
FROM node:20-slim

# Installer FFmpeg et Chromium pour Remotion
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Variables d'environnement pour Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV REMOTION_CHROME_EXECUTABLE=/usr/bin/chromium

WORKDIR /app

# Copier package.json et installer les dependances
COPY package.json ./
RUN npm install --production

# Copier le code source
COPY . .

# Creer le dossier OUT
RUN mkdir -p OUT

# Commande par defaut: rendu du premier clip (codex multi-clips — la composition
# porte l'id du clip, plus de composition globale "OmniComposition")
CMD ["sh", "-c", "CID=$(node -e 'const c=require(\"./public/codex.json\");const clips=c.clips||[c];console.log(clips[0].id||\"clip_001\")' 2>/dev/null || echo clip_001); npx remotion render src/index.jsx \"$CID\" OUT/video_finale.mp4 --codec h264 --image-format jpeg"]
