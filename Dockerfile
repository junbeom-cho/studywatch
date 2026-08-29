# 빌드 단계 — 프론트를 정적 파일로 굽는다
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 실행 단계 — 같은 프로세스가 API와 정적 파일을 함께 서빙한다
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    DATA_DIR=/data \
    PORT=3000

# 학습일 경계(04:00)가 로컬 시간 기준이라 타임존 데이터가 필요하다
RUN apt-get update \
 && apt-get install -y --no-install-recommends tzdata \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
COPY shared ./shared
COPY tsconfig.json ./

EXPOSE 3000
CMD ["npm", "run", "start"]
