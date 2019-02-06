WEBPACK_ENV=production make minify
make --no-print-directory format
make --no-print-directory lint

npm install git+https://github.com/sharelatex/translations-sharelatex.git#master

chmod -R 0755 /app/public
chown -R node:node /app/public

rm -rf /app/data
mkdir -p /data/{dumpFolder,logs,pdf,uploads,zippedProjects}
chmod -R 0755 /data/
chown -R node:node /data/
ln -s /data/ /app/data
