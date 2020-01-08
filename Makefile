# This file was auto-generated, do not edit it directly.
# Instead run bin/update_build_scripts from
# https://github.com/das7pad/sharelatex-dev-env

BUILD_NUMBER ?= local
BRANCH_NAME ?= $(shell git rev-parse --abbrev-ref HEAD)
COMMIT ?= $(shell git rev-parse HEAD)
RELEASE ?= $(shell git describe --tags | sed 's/-g/+/;s/^v//')
PROJECT_NAME = web
BUILD_DIR_NAME = $(shell pwd | xargs basename | tr -cd '[a-zA-Z0-9_.\-]')
DOCKER_COMPOSE_FLAGS ?= -f docker-compose.yml
DOCKER_COMPOSE := BUILD_NUMBER=$(BUILD_NUMBER) \
	BRANCH_NAME=$(BRANCH_NAME) \
	PROJECT_NAME=$(PROJECT_NAME) \
	MOCHA_GREP=${MOCHA_GREP} \
	docker-compose ${DOCKER_COMPOSE_FLAGS}

clean_ci: clean
clean_ci: clean_build

clean_build:
	docker rmi \
		ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER) \
		ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-base \
		ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-dev \
		ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-prod \
		ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-webpack \
		ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-cache \
		--force

clean:

test: lint
GIT_PREVIOUS_SUCCESSFUL_COMMIT ?= $(shell \
	git rev-parse --abbrev-ref --symbolic-full-name dev@{u} 2>/dev/null \
	| grep -e /dev \
	|| echo origin/dev)

NEED_FULL_LINT ?= \
	$(shell git diff $(GIT_PREVIOUS_SUCCESSFUL_COMMIT) --name-only \
			| grep --max-count=1 \
				-e .eslintignore \
				-e .eslintrc \
				-e package-lock.json \
	)

ifeq (,$(NEED_FULL_LINT))
lint: lint_partial
else
lint: lint_full
endif

RUN_LINT ?= $(DOCKER_COMPOSE) run --rm test_unit npx eslint
lint_full:
	$(RUN_LINT) .

FILES_FOR_LINT ?= \
	$(shell git diff $(GIT_PREVIOUS_SUCCESSFUL_COMMIT) --name-only \
			| grep --invert-match \
				-e vendor \
			| grep \
				-e .js \
				-e .less \
	)

lint_partial:
ifneq (,$(FILES_FOR_LINT))
	$(RUN_LINT) $(FILES_FOR_LINT)
endif

NEED_FULL_FORMAT ?= \
	$(shell git diff $(GIT_PREVIOUS_SUCCESSFUL_COMMIT) --name-only \
			| grep --max-count=1 \
				-e .prettierignore \
				-e .prettierrc \
				-e package-lock.json \
	)

ifeq (,$(NEED_FULL_FORMAT))
format: format_partial
format_fix: format_fix_partial
else
format: format_full
format_fix: format_fix_full
endif

RUN_FORMAT ?= $(DOCKER_COMPOSE) run --rm test_unit npx prettier-eslint
format_full:
	$(RUN_FORMAT) '**/*.{js,less}' --list-different
format_fix_full:
	$(RUN_FORMAT) '**/*.{js,less}' --write

format_partial:
ifneq (,$(FILES_FOR_LINT))
	$(RUN_FORMAT) $(FILES_FOR_LINT) --list-different
endif
format_fix_partial:
ifneq (,$(FILES_FOR_LINT))
	$(RUN_FORMAT) $(FILES_FOR_LINT) --write
endif

UNIT_TEST_DOCKER_COMPOSE ?= \
	COMPOSE_PROJECT_NAME=unit_test_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE)

test: test_unit
test_unit:
	$(UNIT_TEST_DOCKER_COMPOSE) run --rm test_unit

clean_ci: clean_test_unit
clean_test_unit:
	$(UNIT_TEST_DOCKER_COMPOSE) down --timeout 0

ACCEPTANCE_TEST_DOCKER_COMPOSE ?= \
	COMPOSE_PROJECT_NAME=acceptance_test_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE)

test: test_acceptance
test_acceptance: test_acceptance_app
test_acceptance_run: test_acceptance_app_run
test_acceptance_app: clean_test_acceptance_app
test_acceptance_app: test_acceptance_app_run

test_acceptance_app_run:
	$(ACCEPTANCE_TEST_DOCKER_COMPOSE) run --rm test_acceptance

test_acceptance_app_run: test_acceptance_pre_run
test_acceptance_pre_run:

clean_ci: clean_test_acceptance
clean_test_acceptance: clean_test_acceptance_app
clean_test_acceptance_app:
	$(ACCEPTANCE_TEST_DOCKER_COMPOSE) down --volumes --timeout 0

FRONTEND_DOCKER_COMPOSE ?= \
	COMPOSE_PROJECT_NAME=frontend_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE)

build_test_frontend:
	$(FRONTEND_DOCKER_COMPOSE) build test_frontend

test: test_frontend
test_frontend: test_frontend_build_run
test_frontend_build_run: build_test_frontend
test_frontend_build_run: test_frontend_run

test_frontend_run:
	$(FRONTEND_DOCKER_COMPOSE) run --rm test_frontend

clean_test_acceptance: clean_test_frontend
clean_test_frontend:
	$(FRONTEND_DOCKER_COMPOSE) down --rmi local

build_app:

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
	docker build \
		--cache-from ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-dev \
		--tag ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-webpack \
		--target webpack \
		.
	docker run \
		--rm \
		--entrypoint tar \
		ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)-webpack \
			--create \
			--gzip \
			app.js \
			app/src \
			app/templates \
			app/views \
			config \
			modules/*/app/ \
			modules/*/index.js \
			public/manifest.json \
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

MODULE_DIRS := $(shell find modules -mindepth 1 -maxdepth 1 -type d -not -name '.git' )
MODULE_MAKEFILES := $(MODULE_DIRS:=/Makefile)

$(MODULE_MAKEFILES): Makefile.module
	cp Makefile.module $@

clean: clean_Makefiles
clean_Makefiles:
	rm -f $(MODULE_MAKEFILES)

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

MODULE_TARGETS = \
	$(TEST_ACCEPTANCE_MODULES) \
	$(TEST_ACCEPTANCE_CI_MODULES) \
	$(CLEAN_TEST_ACCEPTANCE_MODULES) \

$(MODULE_TARGETS): $(MODULE_MAKEFILES)
	$(MAKE) -C $(dir $@) $(notdir $@)

.PHONY: $(MODULE_TARGETS)

.PHONY: clean test test_unit test_acceptance test_clean build
