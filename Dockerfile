# 의존성 단계 — better-sqlite3 는 네이티브 모듈이다. 프리빌드 내려받기가 막혀도
# 빌드되도록 컴파일러를 갖춰 둔다. 이 단계는 최종 이미지에 남지 않는다.
FROM node:24-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# 빌드 단계 — 프론트를 정적 파일로 굽고, 런타임에 필요 없는 의존성을 덜어낸다
FROM deps AS build
COPY . .
RUN npm run build && npm prune --omit=dev

# 실행 단계 — 같은 프로세스가 API 와 정적 파일을 함께 서빙한다
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    DATA_DIR=/data \
    PORT=3000

# 학습일이 로컬 시간 기준이라 타임존 데이터가 필요하다
RUN apt-get update \
 && apt-get install -y --no-install-recommends tzdata \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json tsconfig.json ./
COPY server ./server
COPY shared ./shared

EXPOSE 3000
CMD ["npm", "run", "start"]
