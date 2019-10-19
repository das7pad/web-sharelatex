# This file was auto-generated, do not edit it directly.
# Instead run bin/update_build_scripts from
# https://github.com/das7pad/sharelatex-dev-env

DOCKER_COMPOSE_FLAGS ?= -f docker-compose.yml

BUILD_NUMBER ?= local
BRANCH_NAME ?= $(shell git rev-parse --abbrev-ref HEAD)
COMMIT ?= $(shell git rev-parse HEAD)
RELEASE ?= $(shell git describe --tags | sed 's/-g/+/;s/^v//')
PROJECT_NAME = web
BUILD_DIR_NAME = $(shell pwd | xargs basename | tr -cd '[a-zA-Z0-9_.\-]')

DOCKER_COMPOSE := BUILD_NUMBER=$(BUILD_NUMBER) \
	BRANCH_NAME=$(BRANCH_NAME) \
	PROJECT_NAME=$(PROJECT_NAME) \
	MOCHA_GREP=${MOCHA_GREP} \
	docker-compose ${DOCKER_COMPOSE_FLAGS}

MODULE_DIRS := $(shell find modules -mindepth 1 -maxdepth 1 -type d -not -name '.git' )
MODULE_MAKEFILES := $(MODULE_DIRS:=/Makefile)

BABEL := node_modules/.bin/babel --source-maps true
GRUNT := node_modules/.bin/grunt
LESSC := node_modules/.bin/lessc
CLEANCSS := node_modules/.bin/cleancss

FRONT_END_SRC_FILES := $(shell find public/src -name '*.js')
TEST_SRC_FILES := $(shell find test/unit_frontend/src -name '*.js')
MODULE_MAIN_SRC_FILES := $(shell find modules -type f -wholename '*main/index.js')
MODULE_IDE_SRC_FILES := $(shell find modules -type f -wholename '*ide/index.js')
SRC_FILES := $(FRONT_END_SRC_FILES) $(TEST_SRC_FILES)
OUTPUT_SRC_FILES := $(subst src,js,$(SRC_FILES))
LESS_FILES := $(shell find public/stylesheets -name '*.less')
LESSC_COMMON_FLAGS := --source-map --autoprefix="last 2 versions, ie >= 10" --relative-urls
CLEANCSS_FLAGS := --s0 --source-map

LESS_SL_FILE := public/stylesheets/sl-style.less
CSS_SL_FILE := public/stylesheets/sl-style.css
LESS_OL_FILE := public/stylesheets/style.less
CSS_OL_FILE := public/stylesheets/style.css
LESS_OL_LIGHT_FILE := public/stylesheets/light-style.less
CSS_OL_LIGHT_FILE := public/stylesheets/light-style.css
LESS_OL_IEEE_FILE := public/stylesheets/ieee-style.less
CSS_OL_IEEE_FILE := public/stylesheets/ieee-style.css

CSS_FILES := $(CSS_SL_FILE) $(CSS_OL_FILE) $(CSS_OL_LIGHT_FILE) $(CSS_OL_IEEE_FILE)

# The automatic variable $(@D) is the target directory name
public/js/%.js: public/src/%.js
	@mkdir -p $(@D)
	$(BABEL) $< --out-file $@

test/unit_frontend/js/%.js: test/unit_frontend/src/%.js
	@mkdir -p $(@D)
	$(BABEL) $< --out-file $@

INJECTED_MARKER := INJECTED BY MAKEFILE
MODULE_INCLUDES_MARKER = OPTIONAL MODULE INCLUDES
public/src/ide.js: $(MODULE_IDE_SRC_FILES)
public/src/main.js: $(MODULE_MAIN_SRC_FILES)
public/src/ide.js public/src/main.js:
	sed -i '/$(INJECTED_MARKER)/d' $@
	IDE_OR_MAIN=$(notdir $(basename $@)); \
	for MODULE in $$(echo $^ | sort | sed -E 's=modules/([^/]+)/\S+=\1=g'); do \
		LABEL=""; \
		sed -i \
			"/$(MODULE_INCLUDES_MARKER)/a \
			\ \ \/* $(INJECTED_MARKER) *\/ '$$IDE_OR_MAIN\/$$MODULE\/index'," \
		$@; \
	done
	npx prettier-eslint $@ --write
	touch --reference $(firstword $?) $@

public/stylesheets/%.css: $(LESS_FILES)
	$(LESSC) $(LESSC_COMMON_FLAGS) $(@D)/$*.less $(@D)/$*.css

css_full: $(CSS_FILES)

css: $(CSS_OL_FILE)

minify: $(CSS_FILES) $(OUTPUT_SRC_FILES)
	$(GRUNT) compile:minify
	$(MAKE) minify_css
	$(MAKE) minify_es
	$(MAKE) hash_static_files

hash_static_files:
	MINIFIED_JS='true' node app/src/infrastructure/HashedFiles.js

minify_css: $(CSS_FILES)
	$(CLEANCSS) $(CLEANCSS_FLAGS) -o $(CSS_SL_FILE) $(CSS_SL_FILE)
	$(CLEANCSS) $(CLEANCSS_FLAGS) -o $(CSS_OL_FILE) $(CSS_OL_FILE)
	$(CLEANCSS) $(CLEANCSS_FLAGS) -o $(CSS_OL_LIGHT_FILE) $(CSS_OL_LIGHT_FILE)
	$(CLEANCSS) $(CLEANCSS_FLAGS) -o $(CSS_OL_IEEE_FILE) $(CSS_OL_IEEE_FILE)

minify_es:
	npm -q run webpack:production

compile: compile_app $(OUTPUT_SRC_FILES) css public/js/main.js public/js/ide.js

compile_app: compile_modules

compile_full:
	$(BABEL) public/src --out-dir public/js
	$(BABEL) test/unit_frontend/src --out-dir test/unit_frontend/js
	$(MAKE) css_full
	$(MAKE) compile_modules_full

compile_css_full:
	$(MAKE) css_full

COMPILE_MODULES = $(addsuffix /compile,$(MODULE_DIRS))
compile_modules: $(COMPILE_MODULES)

COMPILE_FULL_MODULES = $(addsuffix /compile_full,$(MODULE_DIRS))
compile_modules_full: $(COMPILE_FULL_MODULES)

$(MODULE_MAKEFILES): Makefile.module
	cp Makefile.module $@

clean: clean_frontend clean_css clean_tests clean_modules

clean_frontend:
	rm -rf public/js/{analytics,directives,es,filters,ide,main,modules,services,utils}
	rm -f public/js/*.{js,map}

clean_tests:
	rm -rf test/unit_frontend/js

clean_modules:
	rm -f $(MODULE_MAKEFILES)

clean_css:
	rm -f public/stylesheets/*.css*

clean_test_acceptance: clean_test_acceptance_app
clean_test_acceptance: clean_test_acceptance_modules
clean_test_acceptance: clean_test_frontend

clean_ci: clean_build
clean_ci: clean_test_acceptance
clean_ci: clean_Makefiles

clean_Makefiles:
	rm -f $(MODULE_MAKEFILES)

test: test_unit test_frontend test_acceptance

test_unit:
	COMPOSE_PROJECT_NAME=unit_test_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) run --rm test_unit

test_unit_app:
	npm -q run test:unit:app -- ${MOCHA_ARGS}

test_frontend: compile build_test_frontend test_frontend_run

test_frontend_run:
	COMPOSE_PROJECT_NAME=frontend_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) down -v -t 0
	COMPOSE_PROJECT_NAME=frontend_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) run --rm test_frontend
	COMPOSE_PROJECT_NAME=frontend_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) down -v -t 0

test_frontend_build_run: build_test_frontend test_frontend_run

test_acceptance: test_acceptance_app_run test_acceptance_modules_run

test_acceptance_app: test_acceptance_app_run

test_acceptance_run: test_acceptance_app_run test_acceptance_modules_run

test_acceptance_app_run:
	COMPOSE_PROJECT_NAME=acceptance_test_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) down -v -t 0
	COMPOSE_PROJECT_NAME=acceptance_test_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) run --rm test_acceptance
	COMPOSE_PROJECT_NAME=acceptance_test_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) down -v -t 0

clean_test_acceptance_app:
	COMPOSE_PROJECT_NAME=acceptance_test_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) down -v -t 0

TEST_ACCEPTANCE_MODULES = $(addsuffix /test_acceptance,$(MODULE_DIRS))
test_acceptance_modules_run: $(TEST_ACCEPTANCE_MODULES)

TEST_ACCEPTANCE_CI_MODULES = $(addsuffix /test_acceptance_ci,$(MODULE_DIRS))
test_acceptance_modules_run_ci: $(TEST_ACCEPTANCE_CI_MODULES)

CLEAN_TEST_ACCEPTANCE_MODULES = $(addsuffix /clean_test_acceptance,$(MODULE_DIRS))
clean_test_acceptance_modules: $(CLEAN_TEST_ACCEPTANCE_MODULES)

build_app: compile_full clean_Makefiles
	WEBPACK_ENV=production $(MAKE) minify

install_translations:
	npm install git+https://github.com/sharelatex/translations-sharelatex.git#master

ci:
	MOCHA_ARGS="--reporter tap" \
	$(MAKE) test

format:
	npm -q run format

format_fix:
	npm -q run format:fix

lint:
	npm -q run lint

build:
	docker build --tag ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER) \
		--cache-from ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-cache \
		--build-arg RELEASE=$(RELEASE) \
		--build-arg COMMIT=$(COMMIT) \
		.

clean_build:
	docker rmi -f \
		ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER) \
		ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-cache \

build_test_frontend:
	COMPOSE_PROJECT_NAME=frontend_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) build test_frontend

clean_test_frontend:
	COMPOSE_PROJECT_NAME=frontend_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) down -v -t 0
	docker rmi -f frontend_$(BUILD_DIR_NAME)_test_frontend

publish:
	docker push $(DOCKER_REPO)/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)

tar:
	COMPOSE_PROJECT_NAME=tar_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) run --rm tar
	COMPOSE_PROJECT_NAME=tar_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) down -v -t 0

MODULE_TARGETS = \
	$(COMPILE_MODULES) \
	$(COMPILE_FULL_MODULES) \
	$(TEST_ACCEPTANCE_MODULES) \
	$(TEST_ACCEPTANCE_CI_MODULES) \
	$(CLEAN_TEST_ACCEPTANCE_MODULES) \

$(MODULE_TARGETS): $(MODULE_MAKEFILES)
	$(MAKE) -C $(dir $@) $(notdir $@)

.PHONY:
	$(MODULE_TARGETS) \
	all add install update test test_unit test_frontend test_acceptance \
	test_acceptance_start_service test_acceptance_stop_service \
	test_acceptance_run ci ci_clean compile clean css
