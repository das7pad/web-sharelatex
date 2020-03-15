# This file was auto-generated, do not edit it directly.
# Instead run bin/update_build_scripts from
# https://github.com/das7pad/sharelatex-dev-env

FROM node:12.16.1 AS base

CMD ["node", "--expose-gc", "app.js"]

WORKDIR /app

COPY docker_cleanup.sh /

COPY package.json package-lock.json /app/

FROM base AS dev

RUN /docker_cleanup.sh npm ci

COPY . /app

RUN /docker_cleanup.sh make build_app

RUN /app/setup_env.sh
USER node

FROM dev as webpack
USER root
RUN /docker_cleanup.sh npm run webpack:production
