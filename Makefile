# Open SaaS MVP Factory — Quality-Gate Commands
# =============================================
# All app commands use Wasp CLI.
# app/package.json has no useful scripts — Wasp is the source of truth.

.PHONY: status dev-db dev-app migrate studio e2e check

status:
	@echo "=== Open SaaS MVP Factory ==="
	@echo "App dir:     app/"
	@echo "E2E dir:     e2e-tests/"
	@echo "Docs dir:    docs/"
	@echo ""
	@echo "--- Git status ---"
	@git status --short

dev-db:
	cd app && wasp db start

dev-app:
	cd app && wasp start

migrate:
	@if [ -z "$(NAME)" ]; then \
		echo "Usage: make migrate NAME=add_your_migration"; \
		exit 1; \
	fi
	cd app && wasp db migrate-dev --name $(NAME)

studio:
	cd app && npx -p prisma@5.19.1 prisma studio

e2e:
	cd e2e-tests && npm run e2e:playwright

check:
	@echo "=== Quality Gate ==="
	@echo ""
	@echo "--- Git diff whitespace check ---"
	@git diff --check
	@echo ""
	@echo "--- Prisma validate ---"
	@cd app && DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npx -p prisma@5.19.1 prisma validate
	@echo ""
	@echo "=== Quality Gate passed ==="