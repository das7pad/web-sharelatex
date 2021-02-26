# This file was auto-generated, do not edit it directly.
# Instead run bin/update_build_scripts from
# https://github.com/das7pad/sharelatex-dev-env

ifneq (,$(wildcard .git))
git = git
else
# we are in docker, without the .git directory
git = sh -c 'false'
endif

PWD ?= $(shell pwd)
SUDO_UID ?= $(shell id -u)
SUDO_GID ?= $(shell id -g)

export BUILD_NUMBER ?= local
export BRANCH_NAME ?= $(shell $(git) rev-parse --abbrev-ref HEAD || echo master)
export COMMIT ?= $(shell $(git) rev-parse HEAD || echo HEAD)
export RELEASE ?= \
	$(shell $(git) describe --tags || echo v0.0.0 | sed 's/-g/+/;s/^v//')
export PROJECT_NAME = web
export BUILD_DIR_NAME = $(shell pwd | xargs basename | tr -cd '[a-zA-Z0-9_.\-]')
DOCKER_COMPOSE_FLAGS ?= -f docker-compose.yml
DOCKER_COMPOSE := docker-compose $(DOCKER_COMPOSE_FLAGS)

export DOCKER_REGISTRY ?= local
export SHARELATEX_DOCKER_REPOS ?= $(DOCKER_REGISTRY)/sharelatex

export IMAGE_NODE ?= $(DOCKER_REGISTRY)/node:14.16.0
export IMAGE_PROJECT ?= $(SHARELATEX_DOCKER_REPOS)/$(PROJECT_NAME)
export IMAGE_BRANCH ?= $(IMAGE_PROJECT):$(BRANCH_NAME)
export IMAGE ?= $(IMAGE_BRANCH)-$(BUILD_NUMBER)

export CACHE_CONTENT_SHA := $(shell sh -c ' \
	echo "14.16.0"; \
	cat docker_cleanup.sh; \
	cat package.json package-lock.json; \
	' | sha256sum | cut -d' ' -f1)

export IMAGE_CACHE_CONTENT_SHA ?= \
	$(IMAGE_PROJECT):cache-$(CACHE_CONTENT_SHA)$(R_TARGET)
export IMAGE_CACHE_BRANCH ?= $(IMAGE_BRANCH)$(R_TARGET)

SUFFIX ?=
export IMAGE_CI ?= ci/$(PROJECT_NAME):$(BRANCH_NAME)-$(BUILD_NUMBER)$(SUFFIX)

# Helper for creating reproducible tartifacts
REFERENCE_DATE := 2020-01-01T00:00Z
TAR_FLAGS_REPRODUCIBLE := --sort=name --mtime=$(REFERENCE_DATE)
TAR_CREATE_REPRODUCIBLE := tar --create $(TAR_FLAGS_REPRODUCIBLE)
TOUCH_FLAGS_REPRODUCIBLE := -m -d $(REFERENCE_DATE)
TOUCH_REPRODUCIBLE := touch $(TOUCH_FLAGS_REPRODUCIBLE)

clean_ci: clean
clean_ci: clean_build

clean_build: clean_docker_images
clean_docker_images:
	docker rmi \
		$(IMAGE_CI)-base \
		$(IMAGE_CI)-dev-deps \
		$(IMAGE_CI)-dev \
		$(IMAGE_CI)-prod \
		$(IMAGE_CI)-webpack \
		$(IMAGE_CI)-dev-deps-cache \
		$(IMAGE_CI)-prod-cache \
		--force

clean:

test: lint
lint:
test: format
format:

LINT_RUNNER_IMAGE ?= \
	$(SHARELATEX_DOCKER_REPOS)/lint-runner:7.0.1-web
LINT_RUNNER = \
	docker run \
		--rm \
		--tty \
		--volume $(PWD):$(PWD) \
		--workdir $(PWD) \
		--user $(SUDO_UID):$(SUDO_GID) \
		$(LINT_RUNNER_IMAGE)

GIT_PREVIOUS_SUCCESSFUL_COMMIT ?= $(shell \
	$(git) rev-parse --abbrev-ref --symbolic-full-name dev@{u} 2>/dev/null \
	| grep -e /dev \
	|| echo origin/dev)

NEED_FULL_LINT ?= \
	$(shell $(git) diff $(GIT_PREVIOUS_SUCCESSFUL_COMMIT) --name-only \
			| grep --max-count=1 \
				-e .eslintignore \
				-e .eslintrc \
				-e buildscript.txt \
	)

ifeq (,$(NEED_FULL_LINT))
lint: lint_partial
lint_fix: lint_fix_partial
else
lint: lint_full
lint_fix: lint_fix_full
endif

RUN_LINT ?= $(LINT_RUNNER) eslint
lint_full:
	$(RUN_LINT) .

lint_fix_full:
	$(RUN_LINT) --fix .

GIT_DIFF_CMD_FORMAT ?= \
	$(git) diff $(GIT_PREVIOUS_SUCCESSFUL_COMMIT) --name-only \
	| grep --invert-match \
		-e vendor \
	| grep \
		-e '\.js$$' \
		-e '\.less$$' \
	| sed 's|^|$(PWD)/|'

FILES_FOR_FORMAT ?= $(wildcard $(shell $(GIT_DIFF_CMD_FORMAT)))
FILES_FOR_LINT ?= $(wildcard $(shell $(GIT_DIFF_CMD_FORMAT) | grep -e '\.js$$'))

lint_partial:
ifneq (,$(FILES_FOR_LINT))
	$(RUN_LINT) $(FILES_FOR_LINT)
endif

lint_fix_partial:
ifneq (,$(FILES_FOR_LINT))
	$(RUN_LINT) --fix $(FILES_FOR_LINT)
endif

NEED_FULL_FORMAT ?= \
	$(shell $(git) diff $(GIT_PREVIOUS_SUCCESSFUL_COMMIT) --name-only \
			| grep --max-count=1 \
				-e .prettierignore \
				-e .prettierrc \
				-e buildscript.txt \
	)

ifeq (,$(NEED_FULL_FORMAT))
format: format_partial
format_fix: format_fix_partial
else
format: format_full
format_fix: format_fix_full
endif

RUN_FORMAT ?= $(LINT_RUNNER) prettier
format_full:
	$(RUN_FORMAT) '$(PWD)/**/*.{js,less}' --list-different
format_fix_full:
	$(RUN_FORMAT) '$(PWD)/**/*.{js,less}' --write

format_partial:
ifneq (,$(FILES_FOR_LINT))
	$(RUN_FORMAT) $(FILES_FOR_FORMAT) --list-different
endif
format_fix_partial:
ifneq (,$(FILES_FOR_LINT))
	$(RUN_FORMAT) $(FILES_FOR_FORMAT) --write
endif

UNIT_TEST_DOCKER_COMPOSE ?= \
	COMPOSE_PROJECT_NAME=unit_test_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE)

test: test_unit
test_unit: test_unit_app
test_unit_app:
	$(UNIT_TEST_DOCKER_COMPOSE) run --rm test_unit
	$(MAKE) clean_test_unit_app

clean_ci: clean_test_unit
clean_test_unit: clean_test_unit_app
clean_test_unit_app:
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
	$(MAKE) clean_test_acceptance_app

test_acceptance_app_run: test_acceptance_pre_run
test_acceptance_pre_run:

clean_ci: clean_test_acceptance
clean_test_acceptance: clean_test_acceptance_app
clean_test_acceptance_app:
	$(ACCEPTANCE_TEST_DOCKER_COMPOSE) down --volumes --timeout 0

FRONTEND_DOCKER_COMPOSE ?= \
	COMPOSE_PROJECT_NAME=frontend_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE)

build_test_frontend:

test: test_frontend
test_frontend: test_frontend_build_run
test_frontend_build_run: build_test_frontend
test_frontend_build_run: test_frontend_run

test_frontend_run:
	$(FRONTEND_DOCKER_COMPOSE) run --rm test_frontend
	$(FRONTEND_DOCKER_COMPOSE) down -t 0

clean_test_acceptance: clean_test_frontend
clean_test_frontend:
	$(FRONTEND_DOCKER_COMPOSE) down

KARMA_DOCKER_COMPOSE ?= \
	COMPOSE_PROJECT_NAME=karma_$(BUILD_DIR_NAME) $(DOCKER_COMPOSE)

test_karma_build: build_test_karma
build_test_karma:
	$(KARMA_DOCKER_COMPOSE) build --force-rm test_karma

test: test_karma
test_karma: test_karma_build_run
test_karma_build_run: build_test_karma
test_karma_build_run: test_karma_run

test_karma_run:
	$(KARMA_DOCKER_COMPOSE) run --rm test_karma
	$(KARMA_DOCKER_COMPOSE) down -t 0

clean_test_acceptance: clean_test_karma
clean_test_karma:
	$(KARMA_DOCKER_COMPOSE) down --rmi local

build_app:

# GNU Makes wildcard pattern '**' does not match empty or deep components
VIEW_FILES:=$(shell \
	find app/views modules/*/app/views -name '*.pug' \
	| grep -v -e '/_' \
	| sed 's|^|generated/views/|;s/.pug/.js/' \
)

build_views_full:
	node build/views

build_views: $(VIEW_FILES)
.PHONY: $(VIEW_FILES)
$(VIEW_FILES): generated/views/%.js:
	node build/views $*

build_lngs_full:
	node build/translations

LNGS = $(patsubst locales/%.json,generated/lng/%.js,$(wildcard locales/*.json))
build_lng: $(LNGS)
$(LNGS): $(wildcard build/translations/*.js)
$(LNGS): locales/en.json
$(LNGS): generated/lng/%.js: locales/%.json
	node build/translations $*

webpack_production:
	$(MAKE) --no-print-directory -j build_lng
	npm run webpack:production

build_dev_deps: clean_build_artifacts
	docker build \
		--force-rm=true \
		--cache-from $(IMAGE_CI)-dev-deps-cache \
		--tag $(IMAGE_CI)-base \
		--target base \
		.

	docker build \
		--force-rm=true \
		--cache-from $(IMAGE_CI)-base \
		--cache-from $(IMAGE_CI)-dev-deps-cache \
		--tag $(IMAGE_CI)-dev-deps \
		--target dev-deps \
		.

build_dev: clean_build_artifacts
	docker build \
		--force-rm=true \
		--cache-from $(IMAGE_CI)-dev-deps \
		--tag $(IMAGE_CI)-dev \
		--target dev \
		.

build_webpack: clean_build_artifacts
	docker build \
		--force-rm=true \
		--cache-from $(IMAGE_CI)-dev \
		--tag $(IMAGE_CI)-webpack \
		--target webpack \
		.

build_prod: clean_build_artifacts
	docker build \
		--force-rm=true \
		--cache-from $(IMAGE_CI)-webpack \
		--tag $(IMAGE_CI)-base \
		--target base \
		.

	docker build \
		--force-rm=true \
		--build-arg BASE=$(IMAGE_CI)-base \
		--cache-from $(IMAGE_CI)-base \
		--cache-from $(IMAGE_CI)-prod-base-cache \
		--tag $(IMAGE_CI)-prod-base \
		--file=Dockerfile.production \
		--target prod-base \
		.

	docker run \
		--rm \
		$(IMAGE_CI)-webpack \
		$(TAR_CREATE_REPRODUCIBLE) \
			app.js \
			app/src \
			app/templates \
			app/views \
			config \
			generated/lng/ \
			generated/views/ \
			modules/*/app/ \
			modules/*/index.js \
			public/manifest.json \
			test/smoke/src \
	| gzip \
	> build_artifacts.tar.gz
	$(TOUCH_REPRODUCIBLE) build_artifacts.tar.gz

	docker build \
		--force-rm=true \
		--build-arg RELEASE=$(RELEASE) \
		--build-arg COMMIT=$(COMMIT) \
		--build-arg BASE=$(IMAGE_CI)-base \
		--cache-from $(IMAGE_CI)-prod-base \
		--cache-from $(IMAGE_CI)-prod-cache \
		--tag $(IMAGE_CI)-prod \
		--file=Dockerfile.production \
		.

clean_build: clean_build_artifacts
clean_build_artifacts:
	rm -f build_artifacts.tar.gz

clean_ci: clean_output
clean_output:
ifneq (,$(wildcard output/* output/.*))
	docker run --rm \
		--volume $(PWD)/output:/home/node \
		--user node \
		--network none \
		$(IMAGE_NODE) \
		sh -c 'find /home/node -mindepth 1 | xargs rm -rfv'
	rm -rfv output
endif

pull_node:
	docker pull $(IMAGE_NODE)
	docker tag $(IMAGE_NODE) node:14.16.0

pull_cache_branch:
	docker pull $(IMAGE_CACHE_BRANCH)
	docker tag $(IMAGE_CACHE_BRANCH) $(IMAGE_CI)$(TARGET)-cache

pull_cache_branch_gracefully:
	make pull_cache_branch || echo 'cache miss'

pull_cache:
	docker pull $(IMAGE_CACHE_CONTENT_SHA)
	docker tag $(IMAGE_CACHE_CONTENT_SHA) $(IMAGE_CI)$(TARGET)-cache

pull_cache_gracefully:
	make pull_cache || echo 'cache miss'

clean_pull_cache:
	docker rmi --force \
		$(IMAGE_CACHE_CONTENT_SHA) \
		$(IMAGE_CACHE_BRANCH) \

push_cache:
	docker tag $(IMAGE_CI)$(TARGET) $(IMAGE_CACHE_CONTENT_SHA)
	docker push $(IMAGE_CACHE_CONTENT_SHA)

push_cache_branch:
	docker tag $(IMAGE_CI)$(TARGET) $(IMAGE_CACHE_BRANCH)
	docker push $(IMAGE_CACHE_BRANCH)

push_target:
	docker tag $(IMAGE_CI)$(TARGET) $(IMAGE)$(R_TARGET)
	docker push $(IMAGE)$(R_TARGET)

log_image_digest:
	docker inspect -f '{{ index .RepoDigests 0 }}' $(IMAGE)$(R_TARGET) \
	| cut -d: -f2 \
	> docker-image$(R_TARGET).digest.txt

clean_push_prod:
	rm -f docker-image$(R_TARGET).digest.txt
	docker rmi --force \
		$(IMAGE)$(R_TARGET) \
		$(IMAGE_CACHE_CONTENT_SHA) \
		$(IMAGE_CACHE_BRANCH) \
		$(IMAGE_CACHE_BRANCH)-prod-base \
		$(IMAGE_CI)-prod-base \

clean_push_dev_deps:
	docker rmi --force \
		$(IMAGE_CACHE_CONTENT_SHA) \
		$(IMAGE_CACHE_BRANCH) \

prepare_ci_stage: build_dev_with_cache
build_dev_with_cache: pull_node
build_dev_with_cache:
	docker pull $(IMAGE_CACHE_CONTENT_SHA)-dev-deps
	docker tag $(IMAGE_CACHE_CONTENT_SHA)-dev-deps $(IMAGE_CI)-dev-deps
	$(MAKE) --no-print-directory build_dev

prepare_ci_stage: create_output
create_output:
	mkdir --parents --mode=777 output

clean_ci_stage: clean_output
clean_ci_stage: clean_stage_images
clean_stage_images:
	docker rmi --force \
		$(IMAGE_CACHE_CONTENT_SHA)-dev-deps \
		$(IMAGE_CI)-dev-deps \
		$(IMAGE_CI)-dev \
		$(IMAGE_CI)-prod-base-cache \

compress_public: public.tar.gz
.PHONY: public.tar.gz
public.tar.gz:
	docker run \
		--rm \
		--volume $(PWD)/compress.sh:/compress.sh \
		--workdir /app/public \
		--entrypoint sh \
		$(IMAGE_CI)-webpack \
		-c '/compress.sh && $(TAR_CREATE_REPRODUCIBLE) .' \
	| gzip -9 \
	> public.tar.gz
	sha256sum public.tar.gz | awk '{ print $$1 }' > public.tar.gz.checksum.txt
	$(TOUCH_REPRODUCIBLE) public.tar.gz public.tar.gz.checksum.txt

clean/public.tar.gz:
	rm -f public.tar.gz public.tar.gz.checksum.txt

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

test_unit: test_unit_modules
test_unit_run: test_unit_modules_run
test_unit_modules: test_unit_modules_run
TEST_UNIT_MODULES = $(addsuffix /test_unit,$(MODULE_DIRS))
test_unit_modules_run: $(TEST_UNIT_MODULES)

clean_test_unit: clean_test_unit_modules
CLEAN_TEST_UNIT_MODULES = $(addsuffix /clean_test_unit,$(MODULE_DIRS))
clean_test_unit_modules: $(CLEAN_TEST_UNIT_MODULES)

MODULE_TARGETS = \
	$(TEST_ACCEPTANCE_MODULES) \
	$(TEST_ACCEPTANCE_CI_MODULES) \
	$(CLEAN_TEST_ACCEPTANCE_MODULES) \
	$(TEST_UNIT_MODULES) \
	$(CLEAN_TEST_UNIT_MODULES) \

$(MODULE_TARGETS): $(MODULE_MAKEFILES)
	$(MAKE) -C $(dir $@) $(notdir $@)

.PHONY: $(MODULE_TARGETS)

.PHONY: clean test test_unit test_acceptance test_clean build
