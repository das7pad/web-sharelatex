MODULE_DIR := modules/overleaf-integration
DOCKER_COMPOSE_FLAGS := -f $(MODULE_DIR)/docker-compose.yml

test_acceptance: test_acceptance_start_service test_acceptance_run test_acceptance_stop_service

test_acceptance_start_service:
	cd ../../ && \
	MODULE_DIR=$(MODULE_DIR) \
	docker-compose -f docker-compose.yml ${DOCKER_COMPOSE_FLAGS} up -d test_acceptance

test_acceptance_stop_service:
	cd ../../ && \
	MODULE_DIR=$(MODULE_DIR) \
	docker-compose -f docker-compose.yml ${DOCKER_COMPOSE_FLAGS} stop test_acceptance redis mongo

test_acceptance_run:
	cd ../../ && \
	MODULE_DIR=$(MODULE_DIR) \
	docker-compose -f docker-compose.yml ${DOCKER_COMPOSE_FLAGS} exec -T test_acceptance npm run test:acceptance:dir -- ${MOCHA_ARGS} $(MODULE_DIR)/test/acceptance/js
