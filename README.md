# Creoox Traefik Forward-Auth

cx-traefik-forward-auth is a standalone authorization middleware for [traefik](https://traefik.io/traefik/) that provides OIDC authentication and/or opaque token validation for the traefik reverse proxy.

TODO: Elaborate description

# Project usage

## Prerequisites

1. Prepared traefik-based infrastructure

## Examples

<br/>

<details>
<summary>Environmental variables:</summary>

```t
## Application settings
APP_NAME=cx-traefik-forward-auth
APP_VERSION=1.0.0
APP_PORT=4181

## Environment settings
HOST_URI=http://localhost
ENVIRONMENT=development<development | production>

## OIDC Provider settings
OIDC_ISSUER_URL=https://dev.accounts.creoox.com/realms/creoox
OIDC_CLIENT_ID=<client-id>
OIDC_CLIENT_SECRET=<client-secret>
OIDC_VERIFICATION_TYPE=<jwt | introspection>

## Middelware behaviour settings
JWT_STRICT_AUDIENCE=false
AUTH_ENDPOINT=/_oauth
LOGIN_WHEN_NO_TOKEN=true
LOGIN_AUTH_FLOW=code
LOGIN_SCOPE=openid email profile
LOGIN_COOKIE_NAME=cx_forward_auth
LOGIN_SESSION_SECRET=<random-value>
```

</details>

<br/>

<details>
<summary>Docker Standalone:</summary>

```yml
traefik:
    image: traefik:latest
    container_name: cx-example-traefik
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    networks:
      - cx-example-net
    ports:
      - 80:80
      - 443:443
    volumes:
      - /etc/localtime:/etc/localtime:ro
      # - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/traefik.toml:/etc/traefik/traefik.toml:ro
      - ./traefik/services.toml:/etc/traefik/services.toml:ro
      - ./traefik/acme.json:/etc/traefik/acme.json
      - ./logs/traefik-access.log:/traefik-access.log
      - ./logs/traefik-service.log:/traefik-service.log
    labels:
      - "traefik.enable=true"
      - "traefik.http.middlewares.traefik-https-redirect.redirectscheme.scheme=https"
      # - "traefik.http.middlewares.traefik-auth.basicauth.users=dummy:$$apr1$$iHNcpXTy$$cSNZ9EJt3fChWLn3s.v2L1"
      
      - "traefik.http.routers.traefik.entrypoints=web"
      - "traefik.http.routers.traefik.rule=Host(`localhost`)"
      - "traefik.http.routers.traefik.middlewares=traefik-https-redirect"

      - "traefik.http.routers.traefik-secure.entrypoints=websecure"
      - "traefik.http.routers.traefik-secure.rule=Host(`localhost`)"
      - "traefik.http.routers.traefik-secure.tls=true"
      - "traefik.http.routers.traefik-secure.tls.certresolver=hypercpq"
      - "traefik.http.routers.traefik-secure.service=api@internal"
      # - "traefik.http.routers.traefik-secure.middlewares=traefik-auth"
      - "traefik.http.routers.traefik-secure.middlewares=traefik-forward-auth"

  # https://doc.traefik.io/traefik/providers/docker/#docker-api-access
  socket-proxy:
      image: tecnativa/docker-socket-proxy
      container_name: cx-example-socket-proxy
      restart: unless-stopped
      volumes:
        - /var/run/docker.sock:/var/run/docker.sock:ro
      environment:
        CONTAINERS: 1
      networks:
        - cx-example-net

  traefik-forward-auth:
    # image: thomseddon/traefik-forward-auth:2
    image: creoox/cx-traefik-forward-auth:1.0.0
    container_name: cx-example-traefik-forward-auth
    env_file:
      - ./cx-traefik-forward-auth.env
    networks:
      - cx-example-net
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=cx-example-net"
      - "traefik.http.middlewares.traefik-forward-auth.forwardauth.address=http://traefik-forward-auth:4181"
      - "traefik.http.middlewares.traefik-forward-auth.forwardauth.authResponseHeaders=X-Forwarded-User"
      - "traefik.http.services.traefik-forward-auth.loadbalancer.server.port=4181"
```

</details>

<br/>

<details>
<summary>Docker Swarm:</summary>

Not tested -> TODO

</details>

<br/>

<details>
<summary>Kubernetes:</summary>

Not implemented -> TODO

</details>

<br/>

# Project setup (containerized)

## Prerequisites

1. [docker](https://docs.docker.com/get-docker/)
2. [docker-compose](https://docs.docker.com/compose/install/)
3. [Optional & <u>HIGHLY</u> Recommended] **GNU make** (see below)

### GNU make - Make use of _Makefile_

It is recommended to make use of _make_ commands and in order to do so install _GNU make_

- Unix/Linux -> ready-to-go [more info](https://makefiletutorial.com/#running-the-examples)
- Windows (Powershell) -> [install chocolatey](https://chocolatey.org/install) and then run `choco install make` in **Powershell**
- MacOS -> for most recent versions you should be ready-to-go, if not try installing it with [homebrew](https://formulae.brew.sh/formula/make)

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

### Run unit tests (in separate container)

```shell
make run-unit-tests
```

### Run unit tests with coverage HTML-report (in separate container)

```shell
make run-ut-coverage-html
```

### Run lint check (in separate container)

```shell
make run-lint-check
```

### Shut down and clean development environment

```
make down-dev-env
```

</details>

<br/>

<details>
<summary>Production Environment:</summary>

### Prepare production environment

```shell
make pull-prod-env
```

You may use `make build-prod-env` for environment build, mind that it's meant for **developers only**!

### Run production environment

```shell
make run-prod-env
```

### Shut down and clean production environment

```shell
make down-prod-env
```

</details>
