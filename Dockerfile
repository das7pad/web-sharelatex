FROM node:10.15.3 as app

WORKDIR /app

#wildcard as some files may not be in all repos
COPY package.json npm-shrinkwrap.json /app/

RUN npm install --quiet


COPY . /app

RUN make compile_full

FROM node:10.15.3

CMD ["node", "--expose-gc", "app.js"]

WORKDIR /app



COPY --from=app /app /app

RUN /app/setup_env.sh

USER node

ARG RELEASE
ARG COMMIT
ENV RELEASE=${RELEASE} \
    SENTRY_RELEASE=${RELEASE} \
    COMMIT=${COMMIT}
