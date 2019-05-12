#!/bin/bash

npm install git+https://github.com/sharelatex/translations-sharelatex.git#master & TRANSLATIONS=$!
WEBPACK_ENV=production make minify & MINIFY=$!

wait $TRANSLATIONS && echo "Translations install complete" || exit 1
wait $MINIFY && echo "Minifiy complete" || exit 1

set -B

rm -rf /app/data
mkdir -p /app/data/{dumpFolder,logs,pdf,uploads,zippedProjects}
chmod -R 0755 /app/data/
chown -R node:node /app/data/
