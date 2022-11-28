FROM node:16-alpine AS builder
ARG node_env_type=production

WORKDIR /app
COPY ./app .

ENV NODE_ENV development
RUN yarn

# Copy compilation product (dist folder) from builder
FROM builder AS final

WORKDIR /app

ENV NODE_ENV ${node_env_type}
RUN yarn build
RUN rm -rf src tests
CMD [ "node", "dist/app.js" ]
