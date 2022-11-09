FROM node:16-alpine AS builder
ARG node_env_type=production

WORKDIR /app

COPY ./app .

ENV NODE_ENV ${node_env_type}

RUN yarn