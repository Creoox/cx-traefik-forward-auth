# Creoox Traefik Forward-Auth

cx-traefik-forward-auth is a standalone authorization middleware for [traefik](https://traefik.io/traefik/) that provides OIDC authentication and/or opaque token validation for the traefik reverse proxy. 

TODO: Elaborate description

# Project usage

## Prerequisites 

1. Prepared traefik-based infrastructure

# Project setup (containerized)

## Prerequisites 

1. [docker](https://docs.docker.com/get-docker/)
2. [docker-compose](https://docs.docker.com/compose/install/)
3. [Optional & <u>HIGHLY</u> Recommended] **GNU make** (see below)

### GNU make - Make use of _Makefile_

It is recommended to make use of _make_ commands and in order to do so install *GNU make*

* Unix/Linux -> ready-to-go [more info](https://makefiletutorial.com/#running-the-examples)
* Windows (Powershell) -> [install chocolatey](https://chocolatey.org/install) and then run `choco install make` in **Powershell**
* MacOS -> for most recent versions you should be ready-to-go, if not try installing it with [homebrew](https://formulae.brew.sh/formula/make)

## Environments setup

**Mind that all below commands can be run natively using docker-compose (not recommended, see _Makefile_ for details)**

<br/>

<details>
<summary>Development Environment:</summary>

### Prepare development environment

```shell
make build-dev-env
```

### Run development environment

```shell
make run-dev-env
```

### See application logs

```shell
make attach-dev-env
```

### Run unit tests (in separate container)

```shell
make run-unit-tests
```

### Run unit tests with coverage HTML-report (in separate container)

```shell
make run-ut-coverage-html
```

### Shut down and clean development environment

```
make down-dev-env
```

</details>

<br/>

<details>
<summary>Staging Environment:</summary>

### Prepare staging environment

Login to creoox [dockerhub](https://hub.docker.com/u/creoox) (**USE PERSONAL TOKEN!**)

```shell
docker login --username creoox
```

and provide your \<personal-token\>. Then, pull service image:

```shell
make pull-stage-env
```

Use `make build-stage-env` for environment build - **developers only**!

### Run staging environment

```shell
make run-stage-env
```

### Shut down and clean staging environment

```shell
make down-stage-env
```

</details>

<br/>

<details>
<summary>Production Environment:</summary>

Analogous to **Staging Environment** if not decided otherwise.

</details>
