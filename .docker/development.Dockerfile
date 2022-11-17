FROM node:16-alpine AS builder
ARG node_env_type=development

WORKDIR /app
COPY ./app .

ENV NODE_ENV ${node_env_type}
RUN yarn
CMD [ "yarn", "start:dev" ]
