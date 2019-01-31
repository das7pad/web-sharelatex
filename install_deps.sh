WEBPACK_ENV=production make minify

npm install git+https://github.com/sharelatex/translations-sharelatex.git#master

chmod -R 0766 /app/public
chown -R node:node /app/public

rm -rf /app/data
mkdir -p /data/{dumpFolder,logs,pdf,uploads,zippedProjects}
chmod -R 0666 /data/
chown -R node:node /data/
ln -s /data/ /app/data
