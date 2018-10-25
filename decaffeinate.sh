set -ex

npx bulk-decaffeinate convert --dir public/coffee

for module in modules/**/public/coffee; do
  npx bulk-decaffeinate convert --dir $module
done

git mv public/coffee public/src

for module in modules/**/public; do
  if [ -e $module/coffee ]; then
    git mv $module/coffee $module/src
  fi
done

git commit -m "Rename public/coffee dir to public/src"

npx bulk-decaffeinate convert --dir test/unit_frontend/coffee

for module in modules/**/test/unit_frontend/coffee; do
  npx bulk-decaffeinate convert --dir $module
done

git mv test/unit_frontend/coffee test/unit_frontend/src

for module in modules/**/test/unit_frontend; do
  if [ -e $module/coffee ]; then
    git mv $module/coffee $module/src
  fi
done

git commit -m "Rename test/unit_frontend/coffee to test/unit_frontend/src"

echo "done"
