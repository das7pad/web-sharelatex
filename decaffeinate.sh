#!/usr/bin/env bash
set -ex

GIT_AUTHOR="decaffeinate <`git config user.email`>"
ARGS=$@

function decaffeinateClean() {
    npx bulk-decaffeinate clean
}
function decaffeinateDirectory() {
    [[ -e "$1/coffee" ]] || return 0

    npx bulk-decaffeinate convert ${ARGS} --dir "$1/coffee"
}
function decaffeinateSingle() {
    [[ -e "$1.coffee" ]] || return 0

    npx bulk-decaffeinate convert ${ARGS} --file "$1.coffee"
}

function gitCommit() {
    [[ `git status --porcelain` ]] || return 0

    git commit --author "$GIT_AUTHOR" -a -m "decaffeinate: $@"
}
function gitRename() {
    [[ -e "$1/coffee" ]] || return 0

    git mv "$1/coffee" "$1/src"
}

function prettierDirectory() {
    [[ -e "$1/src" ]] || return 0

    npx prettier-eslint --write "$1/src/**/*.js"

    # apparently the output is not stable and some files* receive more changes
    #  upon a second run through prettier-eslint.
    # lets rerun prettier on any changed file.
    #
    # * - e.g. app/src/infrastructure/RandomLogging.js looses line 6
    git status --porcelain | cut -d' ' -f3 | xargs npx prettier-eslint --write
}
function prettierSingle() {
    [[ -e "$1.js" ]] || return 0

    npx prettier-eslint --write "$1.js"

    # see comment above
    git status --porcelain | grep -q "$1.js" || return 0
    npx prettier-eslint --write "$1.js"
}

function processSingleFile() {
    name=$1
    echo "----------------------------------------"
    echo "--- processSingleFile $name.coffee"
    echo "----------------------------------------"

    decaffeinateSingle "$name"
    decaffeinateClean

    prettierSingle "$name"
    gitCommit "Convert $name.js to Prettier format"
}
function processSingleFileInModules() {
    name=$1
    echo "----------------------------------------"
    echo "--- processSingleFileInModules $name.coffee"
    echo "----------------------------------------"

    if [[ -e modules ]]; then
        for module in modules/*; do
            decaffeinateSingle "$module/$name"
        done
        decaffeinateClean

        for module in modules/; do
            prettierSingle "$module/$name"
        done
        gitCommit "Convert $name.js of modules to Prettier format"
    fi
}
function processDirectory() {
    dir=$1
    echo "----------------------------------------"
    echo "--- processDirectory $dir/coffee"
    echo "----------------------------------------"

    decaffeinateDirectory "$dir"
    if [[ -e modules ]]; then
        for module in modules/*; do
            decaffeinateDirectory "$module/$dir"
        done
    fi
    decaffeinateClean

    gitRename "$dir"
    if [[ -e modules ]]; then
        for module in modules/*; do
            gitRename "$module/$dir"
        done
    fi
    gitCommit "Rename $dir/coffee to $dir/src"

    prettierDirectory "$dir"
    if [[ -e modules ]]; then
        for module in modules/*; do
            prettierDirectory "$module/$dir"
        done
    fi
    gitCommit "Convert $dir/src to Prettier format"
}

echo "----------------------------------------"
echo "-------GIT CLEANING UNUSED FILES--------"
echo "----------------------------------------"

git clean -fd

echo "----------------------------------------"
echo "--------------DECAFFEINATE--------------"
echo "----------------------------------------"

processSingleFile app
processSingleFileInModules index

processSingleFile Gruntfile

processDirectory app
processDirectory test/unit
processDirectory test/acceptance
processDirectory test/smoke

echo "----------------------------------------"
echo "-----------FIX REQUIRE PATHS------------"
echo "----------------------------------------"

# enable to glob modules/**/index.js
DEMO_MODULE=modules/__decaffeinate__/
mkdir -p "$DEMO_MODULE/src"
touch "$DEMO_MODULE/index.js"

find \
  app.js \
  Gruntfile.js \
  app/src/ \
  test/ \
  modules/ \
  scripts/ \
  -name '*.js' \
| xargs sed -i \
  -E "s#(['\`].*)(/app|/test/acceptance|test/smoke)/js(.*['\`])#\1\2/src\3#g"
# assume that all require calls use single quotes by now - enforced via Prettier

rm -rf "$DEMO_MODULE"

# Fix formatting after rewriting paths - extra character can make a difference
make format_fix

gitCommit "Fix require paths after decaffeination"
