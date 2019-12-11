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

build_app:
	WEBPACK_ENV=production npm run webpack:production

format:
	npm -q run format

format_fix:
	npm -q run format:fix

lint:
	npm -q run lint

build: clean_build_artifacts
	docker build \
		--cache-from ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-cache \
		--tag ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-base \
		--target base \
		.

	docker build \
		--cache-from ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-base \
		--tag ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER) \
		--tag ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-dev \
		--target dev \
		.

build_prod: clean_build_artifacts
	docker run \
		--rm \
		--entrypoint tar \
		ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-dev \
			--create \
			--gzip \
			app.js \
			app/src \
			app/templates \
			app/views \
			config \
			modules/*/app/ \
			modules/*/index.js \
			public/js/manifest.json \
			setup_env.sh \
			test/smoke/src \
		> build_artifacts.tar.gz

	docker build \
		--build-arg RELEASE=$(RELEASE) \
		--build-arg COMMIT=$(COMMIT) \
		--build-arg BASE=ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-base \
		--cache-from ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-cache \
		--tag ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-prod \
		--file=Dockerfile.production \
		.

clean_ci: clean_build_artifacts
clean_build_artifacts:
	rm -f build_artifacts.tar.gz

clean_ci: clean_build
clean_build:
	docker rmi -f \
		ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER) \
		ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-base \
		ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-dev \
		ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-prod \
		ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-cache \

MODULE_TARGETS = \
	$(TEST_ACCEPTANCE_MODULES) \
	$(TEST_ACCEPTANCE_CI_MODULES) \
	$(CLEAN_TEST_ACCEPTANCE_MODULES) \

$(MODULE_TARGETS): $(MODULE_MAKEFILES)
	$(MAKE) -C $(dir $@) $(notdir $@)

.PHONY: $(MODULE_TARGETS) \
	all test test_unit test_frontend test_acceptance \
	test_acceptance_run clean
