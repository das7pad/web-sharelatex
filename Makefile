MODULE_DIR := modules/$(notdir $(shell pwd))
DOCKER_COMPOSE_FLAGS := -f $(MODULE_DIR)/docker-compose.yml
DOCKER_COMPOSE := cd ../../ && MODULE_DIR=$(MODULE_DIR) docker-compose -f docker-compose.yml ${DOCKER_COMPOSE_FLAGS}

test_acceptance: test_acceptance_start_service test_acceptance_run test_acceptance_stop_service

test_acceptance_start_service: test_acceptance_stop_service
	$(DOCKER_COMPOSE) up -d test_acceptance

test_acceptance_stop_service:
	$(DOCKER_COMPOSE) stop test_acceptance redis mongo

test_acceptance_run:
	$(DOCKER_COMPOSE) exec -T test_acceptance npm -q run test:acceptance:dir -- ${MOCHA_ARGS} $(MODULE_DIR)/test/acceptance/js
