# Convenience targets for common dev tasks.
# Use `make help` to list available targets.
#
# Dev servers bind to 127.0.0.1 by design — when running on a remote
# VPS, reach them via SSH tunnel from your laptop:
#
#   ssh -L 3000:localhost:3000 -L 8000:localhost:8000 user@your-server
#
# Then open http://localhost:3000 in your browser. Setup is identical
# on any host (Hetzner, AWS, your laptop) — only the SSH endpoint changes.

.DEFAULT_GOAL := help
.PHONY: help up down logs ps restart \
        backend-install backend-serve backend-shell backend-test backend-fmt backend-lint \
        web-install web-dev web-build web-lint web-fmt \
        dev fresh seed

help: ## Show this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ---------- Docker stack ----------
up: ## Start all infra (postgres, redis, mailpit, minio)
	docker compose up -d

down: ## Stop all infra
	docker compose down

logs: ## Tail infra logs
	docker compose logs -f

ps: ## Show running services
	docker compose ps

restart: ## Restart all infra
	docker compose restart

# ---------- Backend (Laravel) ----------
backend-install: ## composer install in backend/
	cd backend && composer install

backend-serve: ## Start Laravel API on 127.0.0.1:8000
	cd backend && php artisan serve --host=127.0.0.1 --port=8000

backend-shell: ## Open a shell in backend/
	cd backend && bash

backend-test: ## Run Pest tests
	cd backend && ./vendor/bin/pest --colors=always

backend-fmt: ## Format with Pint
	cd backend && ./vendor/bin/pint

backend-lint: ## Static analysis with Larastan
	cd backend && ./vendor/bin/phpstan analyse --memory-limit=2G

# ---------- Web admin (Next.js) ----------
web-install: ## pnpm install in web-admin/
	cd web-admin && pnpm install

web-dev: ## Start Next dev server on 127.0.0.1:3000
	cd web-admin && HOSTNAME=127.0.0.1 PORT=3000 pnpm dev

web-build: ## Production build
	cd web-admin && pnpm build

web-lint: ## ESLint + tsc
	cd web-admin && pnpm lint && pnpm typecheck

web-fmt: ## Prettier
	cd web-admin && pnpm format

# ---------- Combined ----------
dev: ## Run backend + web dev servers in parallel (Ctrl+C stops both)
	@echo "Backend → http://127.0.0.1:8000"
	@echo "Web     → http://127.0.0.1:3000"
	@echo "Reach from laptop: ssh -L 3000:localhost:3000 -L 8000:localhost:8000 user@host"
	@trap 'kill 0' INT TERM; \
	  ($(MAKE) backend-serve) & \
	  ($(MAKE) web-dev) & \
	  wait

fresh: ## Reset DB and reseed
	cd backend && php artisan migrate:fresh --seed

seed: ## Run seeders only
	cd backend && php artisan db:seed
