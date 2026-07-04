FROM node:24-bookworm-slim

ENV CI=true
ENV npm_config_fund=false
ENV npm_config_audit=false

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

CMD ["npm", "run", "verify"]
