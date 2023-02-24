FROM node:18-alpine AS base
RUN apk update && apk upgrade
WORKDIR /app


FROM base AS development
ARG node_env_type=development

COPY ./app .

ENV NODE_ENV ${node_env_type}
RUN yarn install
CMD [ "yarn", "start:dev" ]
