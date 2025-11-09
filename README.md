# Ajo App (MVP)

## Overview

Thrift contribution MVP composed of four services, orchestrated via Docker Compose:

- `api-gateway` (NestJS): single entry point; proxies to other services.
- `user-service` (Laravel): registration, login, user profile.
- `transaction-service` (NestJS): groups, cycles, scheduler, transfers (MVP scope).
- `investment-service` (.NET): optional for MVP.

## Quick Start

Prereqs:
- Docker Desktop (WSL2 on Windows)
- Node.js 18+
- PHP 8.2+ & Composer
- .NET SDK (only if building investment-service)

Start the stack:
```bash
docker compose up -d
```

Default ports (host):
- Gateway: `http://localhost:8080`
- User-service (MySQL-backed): `http://localhost:8000` (MySQL on `localhost:3307`)
- Transaction-service (Postgres-backed): `http://localhost:3001` (Postgres on `localhost:5432`)

JWT configuration (HS256 default):
- Set `JWT_SECRET` in `docker-compose.yml` (gateway, services) or per-service `.env`.

## Verify End-to-End

Register via gateway → login → call transactions:
```bash
# Register (via gateway → user-service)
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"MVP User","email":"mvp_$(date +%s)@example.com","password":"Secret123!","password_confirmation":"Secret123!"}'

# Login (captures JWT token)
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<same_email>","password":"Secret123!"}'

# Example transactions call without verified header → expect 401/403
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/transactions/cycles/nonexistent/status

# Verified header → expect 200
curl -H "Authorization: Bearer <token>" -H "x-email-verified: true" \
  http://localhost:8080/transactions/groups
```

## Testing

Run unit tests:
```bash
# API gateway
cd services/api-gateway && npm ci && npm test

# Transaction-service
cd ../transaction-service && npm ci && npm test

# User-service
cd ../user-service && composer install --no-interaction --prefer-dist && php artisan test
```

Live e2e through gateway (optional):
```bash
# Bring up services
docker compose up -d

# Enable live e2e
export LIVE_E2E=true
export GATEWAY_BASE_URL=http://localhost:8080

# Run gateway tests (will hit running services)
cd services/api-gateway && npm ci && npm test

# Tear down
docker compose down
```

## Migrations

User-service (MySQL):
```bash
docker compose exec user-service php artisan migrate --force
```

Transaction-service (Postgres):
```bash
docker compose run --rm transaction-service npm run migration:run
```

## CI (MVP)

GitHub Actions workflow added: `.github/workflows/mvp-ci.yml`
- Runs tests for gateway, transaction-service, and user-service on every push/PR.

## Troubleshooting

- Port in use (3000/3306/5432): remap in `docker-compose.yml`, then `docker compose up -d --force-recreate --remove-orphans`.
- Docker pull TLS timeout: restart Docker Desktop/WSL; pre-pull images; set DNS (8.8.8.8/1.1.1.1).
- MySQL/Postgres health: check logs `docker compose logs -f mysql|postgres` and verify env credentials.

## Contributing

Issues and PRs welcome. Keep scope focused on MVP reliability and connectivity.