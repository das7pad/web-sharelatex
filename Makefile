DOCKER_COMPOSE_FLAGS ?= -f docker-compose.yml


BUILD_NUMBER ?= local
BRANCH_NAME ?= $(shell git rev-parse --abbrev-ref HEAD)
PROJECT_NAME = web
BUILD_DIR_NAME = $(shell pwd | xargs basename | tr -cd '[a-zA-Z0-9_.\-]')

DOCKER_COMPOSE := BUILD_NUMBER=$(BUILD_NUMBER) \
	BRANCH_NAME=$(BRANCH_NAME) \
	PROJECT_NAME=$(PROJECT_NAME) \
	MOCHA_GREP=${MOCHA_GREP} \
	docker-compose ${DOCKER_COMPOSE_FLAGS}

MODULE_DIRS := $(shell find modules -mindepth 1 -maxdepth 1 -type d -not -name '.git' )
MODULE_MAKEFILES := $(MODULE_DIRS:=/Makefile)

COFFEE := node_modules/.bin/coffee -m $(COFFEE_OPTIONS)
COFFEE := node_modules/.bin/coffee $(COFFEE_OPTIONS)
BABEL := node_modules/.bin/babel
GRUNT := node_modules/.bin/grunt
LESSC := node_modules/.bin/lessc
CLEANCSS := node_modules/.bin/cleancss

APP_COFFEE_FILES := $(shell find app/coffee -name '*.coffee')
FRONT_END_SRC_FILES := $(shell find public/src -name '*.js')
TEST_COFFEE_FILES := $(shell find test/*/coffee -name '*.coffee')
TEST_SRC_FILES := $(shell find test/*/src -name '*.js')
MODULE_MAIN_SRC_FILES := $(shell find modules -type f -wholename '*main/index.js')
MODULE_IDE_SRC_FILES := $(shell find modules -type f -wholename '*ide/index.js')
COFFEE_FILES := app.coffee $(APP_COFFEE_FILES) $(FRONT_END_COFFEE_FILES) $(TEST_COFFEE_FILES)
SRC_FILES := $(FRONT_END_SRC_FILES) $(TEST_SRC_FILES)
JS_FILES := $(subst coffee,js,$(COFFEE_FILES))
OUTPUT_SRC_FILES := $(subst src,js,$(SRC_FILES))
LESS_FILES := $(shell find public/stylesheets -name '*.less')
LESSC_COMMON_FLAGS := --source-map --autoprefix="last 2 versions, ie >= 10"
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
app.js: app.coffee
	$(COFFEE) --compile -o $(@D) $< 

app/js/%.js: app/coffee/%.coffee
	@mkdir -p $(@D)
	$(COFFEE) --compile -o $(@D) $<

public/js/%.js: public/src/%.js
	@mkdir -p $(@D)
	$(BABEL) $< --out-file $@

test/unit/js/%.js: test/unit/coffee/%.coffee
	@mkdir -p $(@D)
	$(COFFEE) --compile -o $(@D) $<

test/acceptance/js/%.js: test/acceptance/coffee/%.coffee
	@mkdir -p $(@D)
	$(COFFEE) --compile -o $(@D) $<

test/unit_frontend/js/%.js: test/unit_frontend/src/%.js
	@mkdir -p $(@D)
	$(BABEL) $< --out-file $@

test/smoke/js/%.js: test/smoke/coffee/%.coffee
	@mkdir -p $(@D)
	$(COFFEE) --compile -o $(@D) $<


public/js/ide.js: public/src/ide.js $(MODULE_IDE_SRC_FILES)
public/js/main.js: public/src/main.js $(MODULE_MAIN_SRC_FILES)
public/js/main.js public/js/ide.js:
	@echo Compiling and injecting module includes into $@
	@INCLUDES=""; \
	DEST=$(shell basename $(basename $@)); \
	for dir in modules/*; \
	do \
		MODULE=`echo $$dir | cut -d/ -f2`; \
		if [ -e $$dir/$(basename $<)/index.js ]; then \
			INCLUDES="\"$$DEST/$$MODULE/index\",$$INCLUDES"; \
		fi \
	done; \
	INCLUDES=$${INCLUDES%?}; \
	$(BABEL) $< | \
		sed -E s=\'__[A-Z]+_CLIENTSIDE_INCLUDES__\'=$$INCLUDES= \
		> $@

public/stylesheets/%.css: $(LESS_FILES)
	$(LESSC) $(LESSC_COMMON_FLAGS) $(@D)/$*.less $(@D)/$*.css

css_full: $(CSS_FILES)

css: $(CSS_OL_FILE)

minify: $(CSS_FILES) $(JS_FILES) $(OUTPUT_SRC_FILES)
	$(GRUNT) compile:minify
	$(MAKE) minify_css
	$(MAKE) minify_es

minify_css: $(CSS_FILES) 
	$(CLEANCSS) $(CLEANCSS_FLAGS) -o $(CSS_SL_FILE) $(CSS_SL_FILE)
	$(CLEANCSS) $(CLEANCSS_FLAGS) -o $(CSS_OL_FILE) $(CSS_OL_FILE)
	$(CLEANCSS) $(CLEANCSS_FLAGS) -o $(CSS_OL_LIGHT_FILE) $(CSS_OL_LIGHT_FILE)
	$(CLEANCSS) $(CLEANCSS_FLAGS) -o $(CSS_OL_IEEE_FILE) $(CSS_OL_IEEE_FILE)

minify_es:
	npm -q run webpack:production

compile: compile_app $(OUTPUT_SRC_FILES) css public/js/main.js public/js/ide.js

compile_app: $(JS_FILES)
	@$(MAKE) compile_modules

compile_full:
	$(COFFEE) -c -p app.coffee > app.js
	$(COFFEE) -o app/js -c app/coffee
	$(BABEL) public/src --out-dir public/js
	$(COFFEE) -o test/acceptance/js -c test/acceptance/coffee
	$(COFFEE) -o test/smoke/js -c test/smoke/coffee
	$(COFFEE) -o test/unit/js -c test/unit/coffee
	$(BABEL) test/unit_frontend/src --out-dir test/unit_frontend/js
	rm -f public/js/ide.js public/js/main.js # We need to generate ide.js, main.js manually later
	$(MAKE) css_full
	$(MAKE) compile_modules_full
	$(MAKE) compile # ide.js, main.js, share.js, and anything missed

compile_css_full:
	$(MAKE) css_full

COMPILE_MODULES = $(addsuffix /compile,$(MODULE_DIRS))
compile_modules: $(COMPILE_MODULES)

COMPILE_FULL_MODULES = $(addsuffix /compile_full,$(MODULE_DIRS))
compile_modules_full: $(COMPILE_FULL_MODULES)

$(MODULE_MAKEFILES): Makefile.module
	cp Makefile.module $@

clean: clean_app clean_frontend clean_css clean_tests clean_modules

clean_app:
	rm -f app.js app.js.map
	rm -rf app/js

clean_frontend:
	rm -rf public/js/{analytics,directives,es,filters,ide,main,modules,services,utils}
	rm -f public/js/*.{js,map}

clean_tests:
	rm -rf test/unit/js
	rm -rf test/unit_frontend/js
	rm -rf test/acceptance/js

clean_modules:
	for dir in modules/*; \
	do \
		rm -f $$dir/index.js; \
		rm -rf $$dir/app/js; \
		rm -rf $$dir/test/unit/js; \
		rm -rf $$dir/test/acceptance/js; \
	done

clean_css:
	rm -f public/stylesheets/*.css*

clean_ci: clean_build
clean_ci: clean_test_acceptance_modules
clean_ci: clean_test_frontend
	$(DOCKER_COMPOSE) down -v -t 0

test: test_unit test_frontend test_acceptance

test_unit:
	@[ ! -d test/unit ] && echo "web has no unit tests" || COMPOSE_PROJECT_NAME=unit_test_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) run --name unit_test_$(BUILD_DIR_NAME) --rm test_unit

test_unit_app:
	npm -q run test:unit:app -- ${MOCHA_ARGS}

test_frontend: compile build_test_frontend test_frontend_run

test_frontend_run:
	COMPOSE_PROJECT_NAME=frontend_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) down -v -t 0
	COMPOSE_PROJECT_NAME=frontend_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) run --rm test_frontend
	COMPOSE_PROJECT_NAME=frontend_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) down -v -t 0

test_frontend_build_run: build_test_frontend test_frontend_run

test_acceptance: compile test_acceptance_app_run test_acceptance_modules_run

test_acceptance_app: compile test_acceptance_app_run

test_acceptance_run: test_acceptance_app_run test_acceptance_modules_run

test_acceptance_app_run:
	COMPOSE_PROJECT_NAME=acceptance_test_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) down -v -t 0
	COMPOSE_PROJECT_NAME=acceptance_test_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) run --rm test_acceptance npm -q run test:acceptance:run_dir test/acceptance/js
	COMPOSE_PROJECT_NAME=acceptance_test_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE) down -v -t 0

TEST_ACCEPTANCE_MODULES = $(addsuffix /test_acceptance,$(MODULE_DIRS))
test_acceptance_modules_run: $(TEST_ACCEPTANCE_MODULES)

CLEAN_TEST_ACCEPTANCE_MODULES = $(addsuffix /clean_test_acceptance,$(MODULE_DIRS))
clean_test_acceptance_modules: $(CLEAN_TEST_ACCEPTANCE_MODULES)

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
	docker build --pull --tag ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER) \
		--tag gcr.io/overleaf-ops/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER) \
		.

clean_build:
	docker rmi -f \
		ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER) \
		gcr.io/overleaf-ops/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER) \

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
	$(CLEAN_TEST_ACCEPTANCE_MODULES) \

$(MODULE_TARGETS): $(MODULE_MAKEFILES)
	$(MAKE) -C $(dir $@) $(notdir $@)

.PHONY:
	$(MODULE_TARGETS) \
	all add install update test test_unit test_frontend test_acceptance \
	test_acceptance_start_service test_acceptance_stop_service \
	test_acceptance_run ci ci_clean compile clean css
