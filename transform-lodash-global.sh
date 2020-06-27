npx jscodeshift \
  -t https://gist.githack.com/40thieves/0b495af3fb0ad5fe08915ce5159a2b7b/raw/9c583c0a5b0cbd83a66538a07591b41332efda6a/transform-lodash.js \
  --ignore-pattern frontend/js/vendor \
  --noSemi=true \
  frontend/js

npx jscodeshift \
  -t https://gist.githack.com/40thieves/0b495af3fb0ad5fe08915ce5159a2b7b/raw/9c583c0a5b0cbd83a66538a07591b41332efda6a/transform-lodash.js \
  --noSemi=true \
  test/frontend

for MODULE in admin-panel launchpad open-in-overleaf
do	
  npx jscodeshift \
    -t https://gist.githack.com/40thieves/0b495af3fb0ad5fe08915ce5159a2b7b/raw/9c583c0a5b0cbd83a66538a07591b41332efda6a/transform-lodash.js \
    --noSemi=true \
  modules/$MODULE/frontend/js
done

npx jscodeshift \
  -t https://gist.githack.com/40thieves/0b495af3fb0ad5fe08915ce5159a2b7b/raw/9c583c0a5b0cbd83a66538a07591b41332efda6a/transform-lodash.js \
  --noSemi=true \
  modules/rich-text/frontend/js

npx jscodeshift \
  -t https://gist.githack.com/40thieves/0b495af3fb0ad5fe08915ce5159a2b7b/raw/9c583c0a5b0cbd83a66538a07591b41332efda6a/transform-lodash.js \
  --noSemi=true \
  modules/rich-text/test/frontend

make format_fix