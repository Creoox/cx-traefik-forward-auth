FROM node:18-alpine AS base
RUN apk update && apk upgrade
WORKDIR /app


FROM base AS build-base
COPY ./app .
RUN yarn install --silent 
RUN yarn build


FROM base AS prod-modules
COPY --from=build-base /app/package*.json /app/
RUN yarn install --prod --silent 
RUN mv node_modules prod_node_modules


FROM base AS production
ARG node_env_type=production

COPY --chown=node:node --from=build-base /app/dist /app/dist
COPY --chown=node:node --from=build-base /app/public /app/public
COPY --chown=node:node --from=prod-modules /app/prod_node_modules /app/node_modules

ENV NODE_ENV ${node_env_type}
RUN mkdir -p /app/logs
USER node

ENTRYPOINT [ "node" ]
CMD [ "/app/dist/app.js" ]
