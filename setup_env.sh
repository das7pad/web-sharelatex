#!/bin/bash

set -B

# monkey patch: east want to create a `.migrations` file
chown node:node /app/migrations

rm -rf /app/data
mkdir -p /app/data/{dumpFolder,logs,pdf,uploads,zippedProjects}
chmod -R 0755 /app/data/
chown -R node:node /app/data/
