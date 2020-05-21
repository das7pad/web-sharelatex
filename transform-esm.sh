for FRONTEND_PATH in $(dirname ./modules/*/frontend/js)
do
  npx jscodeshift \
  -t node_modules/5to6-codemod/transforms/amd.js \
  --parser babylon \
  ${FRONTEND_PATH}/js
done

for TEST_PATH in $(dirname ./modules/*/test/frontend)
do
  npx jscodeshift \
  -t node_modules/5to6-codemod/transforms/amd.js \
  --parser babylon \
  ${TEST_PATH}/frontend
done
