# This file was auto-generated, do not edit it directly.
# Instead run bin/update_build_scripts from
# https://github.com/das7pad/sharelatex-dev-env

FROM node:14.15.0 AS base

CMD ["node", "--expose-gc", "app.js"]

WORKDIR /app

COPY docker_cleanup.sh /

COPY package.json package-lock.json /app/

FROM base AS dev-deps

RUN /docker_cleanup.sh npm ci

FROM dev-deps as dev

COPY . /app

RUN DATA_DIRS="data/dumpFolder data/logs data/pdf data/uploads data/zippedProjects" \
&&  mkdir -p ${DATA_DIRS} \
&&  chown node:node ${DATA_DIRS}

VOLUME /app/data

USER node

FROM dev as webpack
USER root

# generate the translations modules -- used by backend and frontend
RUN /docker_cleanup.sh make build_lngs_full

RUN /docker_cleanup.sh npm run webpack:production

# precompile views
RUN /docker_cleanup.sh make build_views_full
