# Time Capsule

A family chronicle. Record the events of family life (births, first steps, weddings, trips) and browse them later as a timeline. Each event has a date, a title, a longer description and photos.

The project is at an early stage. Milestones work end to end: the API has CRUD for them, the web app lists, adds, edits and deletes them and shows each one on its own page, and a shared package holds the contract between the two. A milestone has an optional category from a fixed list and a description written in Markdown (with a Write/Preview editor). Family members (humans and pets) work end to end as well: each has optional birth and death dates, a mother and a father from the family, and a Markdown description, and a milestone can list the family members who took part in it. Locations (a named point on the map) and places (a named, described spot with an optional location) work end to end too: a milestone records where it happened by location, and shows the place that owns that location. Locations are picked on an OpenStreetMap map (Leaflet), so the maps need internet access for their tiles. Milestones and family members have photos: up to 10 per milestone and 100 per family member, JPEG, PNG, WebP or GIF up to 20 MB each, kept in S3-compatible storage (RustFS in development, see `docs/adr/002-media-storage.md`). The browser uploads them straight to storage, and a photo can be reused from the library on another milestone or family member. Milestones are browsed as a timeline grouped by year. The interface is a mobile-first medieval chronicle (parchment pages, engraved icons, drop caps and wax seals, with EB Garamond, Cinzel and Pirata One, all OFL-1.1) that follows the system's light or dark preference. The web app speaks English and Polish: it follows the browser's language on the first visit, and the switcher in the header remembers the choice. Milestones is the reference implementation for new features.

## Structure

A pnpm-workspaces monorepo:

| Path         | What                                        |
| ------------ | ------------------------------------------- |
| `apps/api`   | NestJS backend                              |
| `apps/web`   | React SPA (Vite, TanStack Router + Query, React Hook Form, Tailwind + shadcn/ui) |
| `packages/shared` | `@time-capsule/shared`: api/web contract (zod schemas + types) |
| `compose.yml`| MySQL (`database`), S3 storage (`storage`: RustFS, plus the one-shot `storage-init` that creates the bucket) |

## Requirements

- Node 24 (see `.nvmrc`)
- pnpm, the version pinned in `package.json` (`corepack enable` picks it up)
- Docker, for the database and the media storage
- Host port 9000 free: the storage service publishes it on `127.0.0.1`, because the browser uploads and loads photos there
- The external Docker network `net-time-capsule`. Both `compose.yml` and the dev container join it, and neither creates it. Create it once, on the host:

  ```bash
  docker network create net-time-capsule
  ```

Or open the repo in the dev container (`.devcontainer/`), which already has all of these except the network. The network must exist before you open the dev container, or the container won't start.

## Getting started

```bash
docker network create net-time-capsule  # once, on the host
docker compose up -d                    # start MySQL and the storage, create the bucket (on the host)
cp apps/api/.env.example apps/api/.env  # first time only; with an older .env, copy its S3_* lines over
pnpm install                     # always from the repo root
pnpm --filter api db:migrate     # apply migrations
pnpm api:start:dev               # builds packages/shared, then API + shared in watch mode on $PORT (default 3000)
pnpm front:start:dev             # web app on http://localhost:5173
```

`docker compose ps -a` should show `storage` healthy and `storage-init` exited with code 0. Photos survive `docker compose down`/`up`; `docker compose down -v` deletes them together with the database.

From the dev container the database host is `database` and the storage host is `storage` (the compose service names on `net-time-capsule`), which is what `.env.example` uses. The browser reaches the storage at `S3_PUBLIC_ENDPOINT` (`http://127.0.0.1:9000`). If you run the API directly on the host instead, publish port 3306 (for example in `compose.override.yml`) and use `localhost` in `DATABASE_URL`.

The web app calls the API directly, so the API only accepts cross-origin requests from `CORS_ORIGIN` (default `http://localhost:5173`). If the web app is served from a different origin, for example because VS Code forwarded port 5173 to another port on the host, set `CORS_ORIGIN` in `apps/api/.env` to match.

In the other direction, the web app finds the API through `VITE_API_URL`, set to `http://localhost:3000` in `apps/web/.env`. That file is committed, because the value ends up in the public bundle anyway. If the API is reachable at a different URL, for example because VS Code forwarded port 3000 to another port on the host, put `VITE_API_URL=http://localhost:<port>` in `apps/web/.env.local` (gitignored) and reload the page. Open the web app at exactly the `CORS_ORIGIN` origin (`http://localhost:5173` by default, not 5174 if Vite had to pick another port). The storage's bucket CORS rule (set by `storage-init` in `compose.yml`) accepts uploads from `http://localhost:5173` and `http://127.0.0.1:5173`; to use `127.0.0.1`, set `CORS_ORIGIN=http://127.0.0.1:5173` in `apps/api/.env`. For any other origin, add it to the rule in `compose.yml` and run `docker compose up storage-init` again.

## Scripts (from the root)

```bash
pnpm build     # build every package (shared first)
pnpm lint      # lint every package
pnpm test      # unit tests of every package, from the root (Vitest projects: api, shared, web)
pnpm test --project web      # one package
pnpm test:e2e  # api e2e tests (needs the database; the storage test also needs the storage, and skips with a warning without it)
pnpm api:test:unit  # api unit tests only
pnpm api:test:e2e   # api e2e tests only (same as test:e2e)
pnpm api:test       # api unit, then api e2e
pnpm front:test     # web tests only
pnpm format    # format every package
pnpm --filter api <script>   # run any api script
```

## Build output

Each package builds into its own `dist/` folder: `packages/shared/dist`, `apps/api/dist` and `apps/web/dist`. The web build bundles with Vite first (which also regenerates `src/routeTree.gen.ts`), then type-checks with `tsc -b`.

`packages/shared/dist` is only used by Node when it runs the compiled api (`start:prod`, `nest start`). Everything else (editors, type-checks, tests, the web app) reads the shared TypeScript source directly, so `pnpm build` is needed before `start:prod`, and `pnpm api:start:dev` builds and watches shared for you.

The api has two TypeScript configs:

- `tsconfig.json` is **type-check only** (`noEmit: true`). It covers `src/` and `test/` and is used by the editor, Vitest and oxlint.
- `tsconfig.build.json` is the **only config that emits**. It compiles `src/` to `dist/`, so `dist/main.js` exists for `start:prod`.

Build with `pnpm build` (or `nest build`), not plain `tsc`. Plain `tsc` only type-checks.
