# vextris — falling-block puzzle with vex spell system
# Run `just` for a menu of every project command.

set shell := ["bash", "-uc"]
# `.env` is auto-loaded by default; set JUST_NO_DOTENV=1 to disable

# ── Menu ───────────────────────────────────────────────────────────

default:
    @just --list

# ── Dev lifecycle ──────────────────────────────────────────────────

# Install dependencies (idempotent)
[group('dev')]
install:
    @npm install

# Start the dev server with hot reload
[group('dev')]
dev:
    @npm run dev

# Type-check and build into dist/
[group('dev')]
build:
    @npm run build

# Preview the production build locally
[group('dev')]
preview:
    @npm run preview

# ── Tests ─────────────────────────────────────────────────────────

# Run the full test suite once
[group('test')]
test:
    @npm test

# Run tests in watch mode
[group('test')]
test-watch:
    @npm run test:watch

# Run a single test file by name (usage: just test-only spell)
[group('test')]
test-only name:
    npx vitest run -t "{{name}}"

# ── Linting ───────────────────────────────────────────────────────

# Run ESLint on all source files
[group('lint')]
lint:
    @npx eslint src/

# Run ESLint with auto-fix
[group('lint')]
lint-fix:
    @npx eslint src/ --fix

# ── Agent handoff ─────────────────────────────────────────────────

# Drop a handoff brief next to this justfile
[group('agent')]
handoff out="_handoff.md":
    @echo "# Handoff brief for {{justfile_directory()}}" > {{out}}
    @echo "" >> {{out}}
    @echo "## Available commands" >> {{out}}
    @just --list >> {{out}}
    @echo "" >> {{out}}
    @echo "## Last commits" >> {{out}}
    @git log --oneline -10 >> {{out}}
    @echo "Wrote {{out}}"

# Show what files a new agent should read first
[group('agent')]
agent-context:
    @echo "1. justfile (this file)"
    @echo "2. README.md"
    @echo "3. AGENTS.md (if present)"
    @echo "4. UPGRADE_ROADMAP.md (if present)"
    @echo "5. vextris-codebase-audit-report-codex.md (if present)"

# ── Maintenance ───────────────────────────────────────────────────

# Remove dist/ and Vite cache
[group('maintenance')]
clean:
    rm -rf dist .vite

[confirm('Delete dist/, node_modules/, and Vite cache? This is destructive. (y/N)')]
[group('maintenance')]
nuke:
    rm -rf dist .vite node_modules
    @echo "Run 'just install' to restore dependencies."

# Deploy dist/ to GitHub Pages (requires gh token or credential manager)
[group('deploy')]
deploy: build
    @npx -y gh-pages -d dist -m "deploy: $(git log -1 --format='%h %s')"
