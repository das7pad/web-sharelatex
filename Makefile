# This file was auto-generated, do not edit it directly.
# Instead run bin/update_build_scripts from
# https://github.com/das7pad/sharelatex-dev-env

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
MODULE_MAIN_SRC_FILES := $(shell find modules -type f -wholename '*main/index.js')
MODULE_IDE_SRC_FILES := $(shell find modules -type f -wholename '*ide/index.js')

LESSC := node_modules/.bin/lessc
CLEANCSS := node_modules/.bin/cleancss

LESS_FILES := $(shell find public/stylesheets -name '*.less')
LESSC_COMMON_FLAGS := --source-map --autoprefix="last 2 versions, ie >= 10" --relative-urls
CLEANCSS_FLAGS := --s0 --source-map

CSS_SL_FILE := public/stylesheets/sl-style.css
CSS_OL_FILE := public/stylesheets/style.css
CSS_OL_LIGHT_FILE := public/stylesheets/light-style.css
CSS_OL_IEEE_FILE := public/stylesheets/ieee-style.css

CSS_FILES := $(CSS_SL_FILE) $(CSS_OL_FILE) $(CSS_OL_LIGHT_FILE) $(CSS_OL_IEEE_FILE)

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

clean: clean_css
clean_css:
	rm -f public/stylesheets/*.css*

compile_full: css_full
css_full: $(CSS_FILES)

compile: css
css: $(CSS_OL_FILE)

minify: $(CSS_FILES)
	$(CLEANCSS) $(CLEANCSS_FLAGS) -o $(CSS_SL_FILE) $(CSS_SL_FILE)
	$(CLEANCSS) $(CLEANCSS_FLAGS) -o $(CSS_OL_FILE) $(CSS_OL_FILE)
	$(CLEANCSS) $(CLEANCSS_FLAGS) -o $(CSS_OL_LIGHT_FILE) $(CSS_OL_LIGHT_FILE)
	$(CLEANCSS) $(CLEANCSS_FLAGS) -o $(CSS_OL_IEEE_FILE) $(CSS_OL_IEEE_FILE)

$(MODULE_MAKEFILES): Makefile.module
	cp Makefile.module $@

clean: clean_Makefiles
clean_ci: clean_Makefiles
clean_Makefiles:
	rm -f $(MODULE_MAKEFILES)

test: test_unit
test_unit:
	COMPOSE_PROJECT_NAME=unit_test_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) run --rm test_unit

build_test_frontend:
	COMPOSE_PROJECT_NAME=frontend_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) build test_frontend

clean_test_acceptance: clean_test_frontend
clean_test_frontend:
	COMPOSE_PROJECT_NAME=frontend_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) down -v -t 0
	docker rmi -f frontend_$(BUILD_DIR_NAME)_test_frontend

test: test_frontend
test_frontend: compile
test_frontend: test_frontend_build_run
test_frontend_build_run: build_test_frontend
	$(MAKE) test_frontend_run

test_frontend_run:
	COMPOSE_PROJECT_NAME=frontend_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) down -v -t 0
	COMPOSE_PROJECT_NAME=frontend_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) run --rm test_frontend
	COMPOSE_PROJECT_NAME=frontend_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) down -v -t 0

test: test_acceptance
test_acceptance: test_acceptance_app
test_acceptance_run: test_acceptance_app_run
test_acceptance_app: test_acceptance_app_run
test_acceptance_app_run:
	COMPOSE_PROJECT_NAME=acceptance_test_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) down -v -t 0
	COMPOSE_PROJECT_NAME=acceptance_test_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) run --rm test_acceptance
	COMPOSE_PROJECT_NAME=acceptance_test_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) down -v -t 0

clean_ci: clean_test_acceptance
clean_test_acceptance: clean_test_acceptance_app
clean_test_acceptance_app:
	COMPOSE_PROJECT_NAME=acceptance_test_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) down -v -t 0

test_acceptance: test_acceptance_modules
test_acceptance_run: test_acceptance_modules_run
test_acceptance_modules: test_acceptance_modules_run
TEST_ACCEPTANCE_MODULES = $(addsuffix /test_acceptance,$(MODULE_DIRS))
test_acceptance_modules_run: $(TEST_ACCEPTANCE_MODULES)

TEST_ACCEPTANCE_CI_MODULES = $(addsuffix /test_acceptance_ci,$(MODULE_DIRS))
test_acceptance_modules_run_ci: $(TEST_ACCEPTANCE_CI_MODULES)

clean_test_acceptance: clean_test_acceptance_modules
CLEAN_TEST_ACCEPTANCE_MODULES = $(addsuffix /clean_test_acceptance,$(MODULE_DIRS))
clean_test_acceptance_modules: $(CLEAN_TEST_ACCEPTANCE_MODULES)

build_app: compile_full clean_Makefiles
	WEBPACK_ENV=production npm run webpack:production

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

clean_ci: clean_build
clean_build:
	docker rmi -f \
		ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER) \
		ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-cache \

tar:
	COMPOSE_PROJECT_NAME=tar_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) run --rm tar
	COMPOSE_PROJECT_NAME=tar_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) down -v -t 0

MODULE_TARGETS = \
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
