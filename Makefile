MAKEFLAGS += --silent --keep-going
OS_TYPE = $(shell uname)

# CURR_PATH = $(shell pwd)
ENV_FILE = $(shell echo "./app/.env")
DEFAULT_ENV_FILE = $(shell echo "./app/.env.example")
SERVICE_NAME = $(shell echo "connector-capacity-service")
DOCKER_COMPOSE_DEV = $(shell echo "docker-compose.yml")
DOCKER_COMPOSE_STAGE = $(shell echo "docker-compose.yml")
# DOCKER_COMPOSE_PROD = $(shell echo "docker-compose.stage.yml")

########################################################################################
####                              Auxiliary Functions                               ####
########################################################################################
.PHONY: check-env-file setup-env-file copy-env-os-save import-or-setup-env-file import-env-file

define import_env
	$(eval include $(ENV_FILE))
	$(eval export)
endef

check-env-file:
ifeq ("$(wildcard $(ENV_FILE))","")
	@echo "[ERRR] Missing environmental file: $(ENV_FILE)! Aborting..."
	exit 1
endif

setup-env-file:
ifeq ("$(wildcard $(ENV_FILE))","")
	@echo "[WARN] Mising environmental file: $(ENV_FILE). Using default $(DEFAULT_ENV_FILE)"
	@make copy-env-os-save
endif

copy-env-os-save:
ifeq ($(OS_TYPE),)
	@echo "[INFO] Recognized Windows machine - copying $(DEFAULT_ENV_FILE) in Windows fashion... "
	@echo "[INFO] Please ignore non-exiting error messages "
	powershell cp $(DEFAULT_ENV_FILE) $(ENV_FILE)
# Additionally, for Windows (docker-compose) the .env file has to be present in the project root dir...
# https://github.com/docker/compose/issues/6965
	powershell cp $(DEFAULT_ENV_FILE) .env
	@echo "[WARN] On Windows .env file doesn't get imported to Makefile :("
else
	@echo "[INFO] Recognized Linux/MacOS machine - copying $(DEFAULT_ENV_FILE) in Unix fashion... "
	cp $(DEFAULT_ENV_FILE) $(ENV_FILE)
endif

import-or-setup-env-file: setup-env-file
	$(import_env)
	@echo "[INFO] Successfully imported '$(APP_NAME)' .env file"

import-env-file: check-env-file
	$(import_env)
	@echo "[INFO] Successfully imported '$(APP_NAME)' .env file"

########################################################################################
####                            Development Environment                             ####
########################################################################################
.PHONY: build-dev-env run-dev-env down-dev-env
.PHONY: run-unit-tests run-ut-coverage-html

build-dev-env: import-or-setup-env-file
	@docker-compose \
 		--file $(DOCKER_COMPOSE_DEV) \
 		build
	@echo "[INFO] $(APP_NAME):$(APP_VERSION) dev instance was successfully built"

# Run DEV instance
run-dev-env: import-or-setup-env-file
	@docker-compose \
		--file $(DOCKER_COMPOSE_DEV) up \
		--detach
	@echo "[INFO] $(APP_NAME):$(APP_VERSION) dev instance was successfully started!"

# Run unit tests on DEV instance
run-unit-tests: import-or-setup-env-file
	@docker-compose \
		--file $(DOCKER_COMPOSE_DEV) run \
		--rm \
		$(SERVICE_NAME) \
		yarn test:unit
	@echo "[INFO] Unit Tests on $(APP_NAME):$(VERSION) dev instance was successfully run!"
#
# Run unit tests on DEV instance with coverage report in HTML
run-ut-coverage-html: import-or-setup-env-file
	@docker-compose \
		--file $(DOCKER_COMPOSE_DEV) run \
		--rm \
		$(SERVICE_NAME) \
		yarn test:coverage
	@echo "[INFO] Unit Tests on $(APP_NAME):$(VERSION) dev instance was successfully run! Preview report in ./app/coverage/index.html"

# Stop and clear DEV instance
down-dev-env: import-or-setup-env-file
	@docker-compose \
		--file $(DOCKER_COMPOSE_DEV) \
 		down --remove-orphans
	@echo "[INFO] $(APP_NAME):$(APP_VERSION) dev instance was successfully downed."


########################################################################################
####                              Staging Environment                               ####
########################################################################################
.PHONY: build-stage-env pull-stage-env run-stage-env down-stage-env

# Build stage services instances on your local machine
build-stage-env: import-or-setup-env-file
	@docker-compose \
 		--file $(DOCKER_COMPOSE_STAGE) \
 		build
	@echo "[INFO] $(APP_NAME):$(APP_VERSION) stage instance was successfully built!"

# Pull stage services instances on your local machine
pull-stage-env: import-or-setup-env-file
	@docker-compose \
 		--file $(DOCKER_COMPOSE_STAGE) \
 		pull
	@echo "[INFO] $(APP_NAME):$(APP_VERSION) stage instance was successfully pulled!"

# Run stage instance
run-stage-env: import-or-setup-env-file
	@docker-compose \
		--file $(DOCKER_COMPOSE_STAGE) up \
		--detach
	@echo "[INFO] $(APP_NAME):$(APP_VERSION) stage instance was successfully started!"

# Stop and clear stage instance
down-stage-env: import-or-setup-env-file
	@docker-compose \
		--file $(DOCKER_COMPOSE_STAGE) \
 		down --remove-orphans
	@echo "[INFO] $(APP_NAME):$(APP_VERSION) stage instance was successfully downed."


########################################################################################
####                             Production Environment                             ####
########################################################################################
# .PHONY: pull-prod-env run-prod-env down-prod-env

# # Pull prod services instances on your local machine
# pull-prod-env: import-env-file
# 	@docker-compose \
#  		--file $(DOCKER_COMPOSE_PROD) \
#  		pull
# 	@echo "[INFO] $(APP_NAME):$(APP_VERSION) prod instance was successfully pulled!"

# # Run prod instance
# run-prod-env: import-env-file
# 	@docker-compose \
# 		--file $(DOCKER_COMPOSE_PROD) up \
# 		--detach
# 	@echo "[INFO] $(APP_NAME):$(APP_VERSION) prod instance was successfully started!"

# # Stop and clear prod instance
# down-prod-env: import-env-file
# 	@docker-compose \
# 		--file $(DOCKER_COMPOSE_PROD) \
#  		down --remove-orphans
# 	@echo "[INFO] $(APP_NAME):$(APP_VERSION) prod instance was successfully downed."