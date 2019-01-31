WEBPACK_ENV=production make minify

npm install git+https://github.com/sharelatex/translations-sharelatex.git#master

chmod -R 0766 /app/public
chown -R node:node /app/public

rm -rf /app/data
mkdir -p /data/dumpFolder
mkdir -p /data/logs
mkdir -p /data/pdf
mkdir -p /data/uploads
mkdir -p /data/zippedProjects
chmod -R 0766 /data/
chown -R node:node /data/
ln -s /data/ /app/data

cat /app/node_modules/metrics-sharelatex/package.json

#apt-get update && apt-get install vim -y
