# This file was auto-generated, do not edit it directly.
# Instead run bin/update_build_scripts from
# https://github.com/das7pad/sharelatex-dev-env

FROM node:12.13.1 AS base

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

FROM base as prod

RUN /docker_cleanup.sh npm ci --only=prod

ADD build_artifacts.tar.gz /app

RUN /app/setup_env.sh

USER node

ARG RELEASE
ARG COMMIT
ENV \
    SERVICE_NAME="web" \
    RELEASE=${RELEASE} \
    SENTRY_RELEASE=${RELEASE} \
    COMMIT=${COMMIT}
