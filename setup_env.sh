#!/bin/bash

set -B

rm -rf /app/data
mkdir -p /app/data/{dumpFolder,logs,pdf,uploads,zippedProjects}
chmod -R 0755 /app/data/
chown -R node:node /app/data/
