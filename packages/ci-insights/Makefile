.PHONY: dev dev-down dev-logs db db-down db-reset migrate seed generate install lint typecheck test test-watch build clean

# ── Local Development ────────────────────────────────────────

dev: ## Full local setup: DB + deps + migrate + dev server
	@echo "Starting PostgreSQL..."
	docker compose up -d db
	@echo "Waiting for PostgreSQL to be ready..."
	@until docker compose exec db pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
	@echo "PostgreSQL ready."
	npm install
	npx prisma generate
	npx prisma db push
	@echo "Starting Next.js dev server..."
	npm run dev

dev-down: ## Stop all services
	docker compose down

dev-logs: ## Tail database logs
	docker compose logs -f db

# ── Database ─────────────────────────────────────────────────

db: ## Start only PostgreSQL
	docker compose up -d db
	@until docker compose exec db pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
	@echo "PostgreSQL ready on localhost:5432"

db-down: ## Stop PostgreSQL
	docker compose down db

db-reset: ## Drop and recreate database
	docker compose down -v
	$(MAKE) db
	npx prisma db push

migrate: ## Apply Prisma migrations
	npx prisma db push

generate: ## Generate Prisma client
	npx prisma generate

# ── Code Quality ─────────────────────────────────────────────

install: ## Install dependencies
	npm install
	npx prisma generate

lint: ## Run ESLint
	npm run lint

typecheck: ## Run TypeScript type check
	npx tsc --noEmit

test: ## Run tests
	npm test

test-watch: ## Run tests in watch mode
	npm run test:watch

build: ## Production build
	npm run build

# ── Cleanup ──────────────────────────────────────────────────

clean: ## Remove build artifacts and deps
	rm -rf .next node_modules

# ── Help ─────────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
