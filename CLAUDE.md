# CLAUDE.md

This file gives Claude Code guidance for working in this repository.

## Project overview

**Time Capsule** is a family chronicle: an app for recording events (milestones) in family life, such as births, first steps, weddings and trips, so they can be browsed later as a timeline.

### MVP domain

The core entity is an **Event** (milestone):

| Field         | Notes                                                        |
| ------------- | ------------------------------------------------------------ |
| `date`        | When the event happened                                      |
| `title`       | Short name of the event                                      |
| `description` | Longer story in Markdown, at most 65,535 UTF-8 bytes (MySQL `TEXT`) |
| `category`    | Optional, one of a fixed list of slugs (`MILESTONE_CATEGORIES`) |
| `media`       | Zero or more photos (JPEG/PNG/WebP/GIF, up to 20 MB each), at most 10 per milestone and 100 per family member, from a shared library |
| participants  | Zero or more family members (`familyMemberIds` on requests, `familyMembers` on responses) |

A **family member** is a human or an animal (pets are family too; never "person"/"people" in code, routes, keys or UI):

| Field                   | Notes                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| `name`                  | Required, 1–255 characters                                         |
| `kind`                  | `human` or `animal` (`FAMILY_MEMBER_KINDS`)                        |
| `description`           | Optional Markdown, same limit as a milestone's                     |
| `birthDate`/`deathDate` | Optional `YYYY-MM-DD`; death not before birth                      |
| `motherId`/`fatherId`   | Optional family members; not oneself, not the same one twice. Deleting a parent leaves them unknown (`SET NULL`) |
| `media`                 | Photos, like a milestone's (detail response only)                  |

Implemented so far: CRUD for milestones, end to end, with an optional category and a Markdown description. The api serves `/milestones` (`GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`); the web app has `/milestones` (the **Timeline**: grouped by year, newest first, with a year jump nav), `/milestones/new`, the milestone page `/milestones/$milestoneId` (rendered Markdown, edit, delete) and `/milestones/$milestoneId/edit` (Markdown editor with Write/Preview tabs); `packages/shared` holds their contract. Family members work end to end too: `/family-members` on the api (`GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`; detail, POST and PATCH answer the detail with mother, father, children and milestones) and on the web (`/family-members` list, `/family-members/new`, the page `/family-members/$familyMemberId` and `/edit`, linked from the main navigation as "Family"). Milestones have participants: the milestone form picks family members, the milestone page links to them, and a family member's page lists their milestones. Locations (a name and a point, `/locations` CRUD on the api) and places (a name, a Markdown description and an optional location, `/places` CRUD; the detail lists the milestones on its location) work end to end: the web has `/places` (list, new, page with a map, edit) and `/locations` (list, new, edit; `/locations/$locationId` redirects to the editor), linked from the main navigation as "Places" (active on `/locations` too; a Places | Locations sub-nav switches between them), with a Leaflet/OpenStreetMap picker and read-only maps. A milestone stores only `locationId`; its place is **derived** (the place whose UNIQUE `location_id` matches), and the milestone form offers places and free locations in one select, plus an inline "New location" dialog. Deleting a location is always allowed (places and milestones keep a null location); deleting a place leaves its location and milestones alone. The UI is bilingual, English and Polish (react-i18next, switcher in the header); the contract's validation messages are i18n keys. Photos (media) work end to end too: one shared library (`media` table) linked to milestones (`milestone_media`, at most 10) and family members (`family_member_media`, at most 100) in a chosen order. The browser uploads straight to S3-compatible storage (RustFS in dev, `docs/adr/002-media-storage.md`) with a presigned POST from `POST /media`, then `POST /media/:id/confirm`; `PUT /milestones/:id/media` and `PUT /family-members/:id/media` (`{ mediaIds, baseMediaIds }`) replace an owner's ordered set of ready photos (unlink, link from the library, reorder; 409 `validation.media.stale` when `baseMediaIds` isn't the current set); `GET /media` lists the library and `DELETE /media/:id` removes a photo everywhere. Images only (`MEDIA_CONTENT_TYPES`), up to 20 MB, originals (no resizing or thumbnails). The milestone and family-member pages show a `MediaSection` (counter "n / 10" or "n / 100", gallery with remove and move, uploader with progress, "Choose from the library" dialog); a thumbnail opens the photo in a lightbox (`MediaLightbox`). The UI is a mobile-first medieval chronicle: parchment theme with a candlelight dark variant that follows `prefers-color-scheme`, EB Garamond / Cinzel / Pirata One, engraved SVG icons, ornaments (drop caps, fleuron dividers, brass frames, wax seals), and one main navigation (Chronicle, Family, Places) fixed at the bottom on phones and inline in the header from `md` up, plus a skip link. **Milestones is the reference implementation**: copy its structure for new features (see the `add-feature` skill). `date` is a MySQL `DATE` and goes over the API as `YYYY-MM-DD`.

## Guiding rule: YAGNI

"You aren't gonna need it" applies to the whole project: api, web, shared packages, tooling and infrastructure. Build only what the current task needs.

- Add a dependency, tool, package, abstraction or config option only when a feature needs it now, not because it might be useful later.
- ADRs (`docs/adr/`) say which tool to use once it's needed. They are not a to-do list. Adopt each choice only when a feature needs it.
- Prefer the simplest thing that works. Don't generalize code for use cases that don't exist yet.
- If something seems worth adding ahead of time, ask first.

## Architecture

A pnpm-workspaces monorepo (`pnpm-workspace.yaml`: `apps/*`, `packages/*`):

- `apps/api`: NestJS backend (Drizzle ORM + mysql2, zod validation, `@nestjs/config`)
- `apps/web`: React SPA, the stack chosen in `docs/adr/001-frontend_technology_stack.md`: Vite + React + TypeScript, TanStack Router (file-based), TanStack Query, React Hook Form + zod, Tailwind CSS v4 + shadcn/ui, plus i18next + react-i18next (EN/PL) and react-markdown. Zustand isn't adopted yet (no client-only state).
- `packages/shared` (`@time-capsule/shared`): the api↔web contract (zod request/response schemas and their types)
- MySQL database, run through Docker Compose (`compose.yml`)

There is one lockfile (`pnpm-lock.yaml`) at the root. Each package keeps its own dependencies and tooling in its own `package.json`. There is no build orchestrator yet; the root scripts use `pnpm -r` / `pnpm --filter` (`pnpm -r` runs in dependency order, so `packages/shared` builds before the api). Unit tests of every package run from the root through Vitest projects (`vitest.config.ts`).

## Repository layout

```
.
├── .devcontainer/        # Dev container: Node 24 (Debian trixie), pnpm store mount, Claude Code,
│                         # AWS CLI (profile `rustfs` in aws-config, for inspecting local storage)
├── .github/workflows/ci.yml # CI: lint, build, unit tests; api e2e with MySQL + RustFS service containers
├── compose.yml           # Docker Compose: `database` (mysql:lts), `storage` (RustFS 1.0.1, S3 API on 127.0.0.1:9000),
│                         # `storage-init` (one-shot: private bucket + CORS); external network net-time-capsule
├── compose.override.yml  # Local overrides (gitignored)
├── package.json          # Root: private, convenience scripts + root devDependency vitest
├── pnpm-workspace.yaml   # Workspace globs, dependency catalog, allowBuilds
├── pnpm-lock.yaml        # Single lockfile for the whole workspace
├── vitest.config.ts      # Root Vitest `projects`: every package's vitest.config.ts
├── docs/adr/             # Architecture decision records (001 frontend stack, 002 media storage)
├── packages/
│   └── shared/           # @time-capsule/shared: api<->web contract
│       ├── src/          # <feature>.ts (schemas + types: milestones, family-members, locations, places, media),
│       │                 # messages.ts (i18n message keys), common.ts (idSchema, isoDateSchema,
│       │                 # descriptionSchema, placeNameSchema),
│       │                 # summaries.ts (leaf: shapes embedded across features), index.ts (barrel), *.spec.ts
│       ├── tsconfig.json # type-check only; tsconfig.build.json emits dist/ (JS only, gitignored)
│       └── vitest.config.ts
└── apps/
    ├── web/              # Vite + React SPA
    │   ├── .env          # VITE_API_URL (committed, public); local overrides in .env.local (gitignored)
    │   ├── components.json # shadcn/ui config (aliases use ~/)
    │   ├── index.html    # HTML entry, loads src/main.tsx
    │   ├── src/
    │   │   ├── main.tsx, app-providers.tsx, router.tsx  # QueryClient + router setup
    │   │   ├── env.ts            # zod-validated import.meta.env
    │   │   ├── index.css         # Tailwind + the chronicle theme (tokens, fonts, texture, ornaments)
    │   │   ├── i18n/             # index.ts (init, helpers, hooks, typed keys), locales/{en,pl}.ts
    │   │   ├── routes/           # file-based routes (thin: params, loader, wiring)
    │   │   ├── routeTree.gen.ts  # generated by the router plugin (committed, never edit)
    │   │   ├── features/<feature>/  # api.ts, queries.ts, components, *.spec.tsx (milestones (+ timeline,
    │   │   │                        # timeline-entry, year-nav, group-by-year, categories, category-seal),
    │   │   │                        # family-members (+ kind-icons),
    │   │   │                        # locations (+ maps: location-map, lazy-maps, coordinates), places,
    │   │   │                        # media (use-media-uploader, media-section, -gallery, -lightbox, -uploader,
    │   │   │                        # -library-dialog))
    │   │   ├── lib/              # api-client.ts (apiRequest, ApiError, NetworkError, toErrorMessage),
    │   │   │                     # upload.ts (uploadToStorage: XHR multipart POST to storage, StorageUploadError),
    │   │   │                     # form-errors.ts, dates.ts (formatDate), markdown-excerpt.ts (toPlainExcerpt),
    │   │   │                     # route-params.ts, utils.ts
    │   │   ├── components/       # app-nav, page-heading, route-states, language-switcher, field-error-message,
    │   │   │                     # markdown (+ -renderer, -editor); icons/ = engraved SVG icons
    │   │   │                     # (engraved-icon + nav/action/category/family-member-kind sets);
    │   │   │                     # ui/ = vendored shadcn components
    │   │   └── test/             # setup (+ global map stub location-map.mock.tsx), MSW server, renderRoute, fixtures
    │   ├── vite.config.ts
    │   ├── vitest.config.ts  # mergeConfig(vite.config.ts) + jsdom
    │   └── tsconfig*.json    # solution file + app (src/), test (specs) and node (configs) projects
    └── api/              # NestJS app
        ├── src/          # Application code + unit tests (*.spec.ts)
        │   ├── common/       # Shared Nest helpers (ZodValidationPipe, NotFoundError, FieldValidationError,
        │   │                 # ConflictError + filters)
        │   ├── config/       # zod-validated env schema
        │   ├── database/     # Drizzle schema + global DatabaseModule (DRIZZLE token, Database, Transaction)
        │   ├── family-members/ # Family members feature module (+ family-member-summary.ts)
        │   ├── locations/    # Locations feature module (+ location-summary.ts)
        │   ├── media/        # Media module: POST /media, confirm, DELETE, GET; owners' PUT …/media go through MediaService
        │   ├── milestones/   # Milestones feature module (+ milestone-summary.ts)
        │   ├── places/       # Places feature module (+ place-summary.ts)
        │   └── storage/      # StorageService (the only S3 access) + s3-client.ts (two S3Clients)
        ├── drizzle/      # Generated SQL migrations (committed)
        ├── drizzle.config.ts
        ├── .env.example  # Copy to .env (gitignored)
        ├── test/         # e2e tests (*.e2e-spec.ts); support/fake-storage.ts (in-memory StorageService)
        ├── vitest.config.ts
        └── vitest.config.e2e.ts
```

## Commands

Services (from the repo root). The external Docker network `net-time-capsule` must exist (`docker network create net-time-capsule`, on the host). Both `compose.yml` and the dev container join it, so the dev container reaches MySQL at `database:3306` and RustFS at `storage:9000`. Docker commands are run by the user on the host, never by Claude.

```bash
docker compose up -d                    # run on the host: database, storage, storage-init (bucket + CORS)
cp apps/api/.env.example apps/api/.env  # first time only (or copy the S3_* lines into an existing .env)
pnpm --filter api db:migrate            # apply migrations
```

`test/storage.e2e-spec.ts` runs against the real RustFS; when storage is unreachable it skips with a warning (a config error, such as wrong keys or a missing bucket, fails it). Every other e2e needs only MySQL (`test/media.e2e-spec.ts` overrides `StorageService` with `FakeStorageService`). Media survive `docker compose down`/`up`; `down -v` wipes them together with MySQL.

CI (`.github/workflows/ci.yml`, on pushes to `main` and on pull requests) runs `pnpm lint`, `pnpm build` and `pnpm test` in one job, and `pnpm test:e2e` in another against MySQL and RustFS service containers (bucket created with the aws CLI, `apps/api/.env` written from `.env.example` with the hosts set to `127.0.0.1`), so the storage e2e runs there instead of skipping. The services mirror `compose.yml`: change images or credentials in both (and the storage keys in `.devcontainer/aws-config` too).

Inspect the local storage from the dev container with the AWS CLI's `rustfs` profile: `aws --profile rustfs s3 ls s3://time-capsule-media` (there is no default profile, so the api's SDK never falls back to it).

Workspace (from the repo root):

```bash
pnpm install       # installs every workspace package; always run it from the root
pnpm api:start:dev # builds packages/shared once, then runs its tsc --watch next to `nest start --watch`
pnpm front:start:dev # = pnpm --filter web dev (reads packages/shared source directly, no build needed)
pnpm build         # pnpm -r build (shared first, then api and web)
pnpm lint          # pnpm -r lint
pnpm test          # vitest run: unit tests of every package (projects api, shared, web)
pnpm test --project web   # one package; pnpm test:watch for watch mode
pnpm test:e2e      # = pnpm --filter api test:e2e (needs MySQL; the storage e2e also RustFS, else it skips)
pnpm api:test:unit # = vitest run --project api
pnpm api:test:e2e  # = pnpm test:e2e
pnpm api:test      # api:test:unit, then api:test:e2e (needs MySQL)
pnpm front:test    # = vitest run --project web
pnpm format        # pnpm -r format
pnpm --filter api <script>   # run any api script from the root
pnpm --filter web <script>   # run any web script from the root
```

Web (from `apps/web`):

```bash
pnpm dev           # Vite dev server with HMR on http://localhost:5173
pnpm build         # vite build -> dist/, then tsc -b (vite first: it regenerates routeTree.gen.ts)
pnpm preview       # serve dist/ locally
pnpm test          # vitest (jsdom, Testing Library, MSW)
pnpm exec shadcn add <component>   # vendor a shadcn/ui component into src/components/ui
```

API (from `apps/api`):

```bash
pnpm start:dev     # watch mode, listens on $PORT (default 3000); needs packages/shared/dist, so prefer `pnpm api:start:dev` from the root
pnpm build         # nest build -> dist/
pnpm lint          # oxlint --type-aware
pnpm format        # prettier
pnpm test          # vitest unit tests
pnpm test:e2e      # vitest e2e tests
pnpm test:cov      # coverage
pnpm db:generate --name <description>  # drizzle-kit generate: SQL migration from src/database/schema.ts (reads shared from source)
pnpm db:migrate    # drizzle-kit migrate: apply migrations to $DATABASE_URL
pnpm db:studio     # drizzle-kit studio
```

## Conventions (api)

- **ESM**: the package is `"type": "module"` with `nodenext` module resolution, so relative imports must use the `.js` extension (`import { AppService } from './app.service.js'`).
- **TypeScript** is strict (`strictPropertyInitialization` is off for DI and DTOs).
- **Lint**: oxlint, where `typescript/no-floating-promises` is an error. Await or explicitly handle every promise.
- **Formatting**: Prettier with single quotes and trailing commas.
- **Tests**: Vitest with globals. Unit specs sit next to the source as `*.spec.ts`; e2e specs go in `test/`.
- **Expected values**: in specs, name the variables that results are compared against with an `expected` prefix (`expectedResponse`, `expectedMilestones`), so they're easy to tell apart from inputs and mock return values (`row`, `request`). This applies to the specs of every package (api, web, shared).
- **Test doubles**: build mocks of providers, Nest interfaces (`ArgumentsHost`, `HttpAdapterHost`, `ExecutionContext`, …) and other typed dependencies with `createMock<T>()` from `@golevelup/ts-vitest` (typed `DeepMocked<T>`; pass a partial to stub values, e.g. `createMock<ArgumentsHost>({ switchToHttp: () => ({ getResponse: () => res }) })`). Don't hand-write object literals of `vi.fn()` or cast with `as unknown as`. Create mocks in `beforeEach` so each test gets fresh ones (no `vi.resetAllMocks()`). Use the real class when it's trivial (e.g. `AppService`) and plain `vi.fn()` for standalone callbacks. `typescript/unbound-method` is off for specs so `expect(mock.method)` lints clean. Web doesn't use this: it mocks the api at the network level with MSW.
- **Unit specs build the class under test directly**: `new MilestonesController(serviceMock)`, not `Test.createTestingModule(...)`. A `TestingModule` adds nothing when the spec only injects mocks into one class; use it only when the test needs Nest itself (DI wiring, module metadata, guards/pipes/interceptors applied by the framework), as the e2e tests do.
- **Package manager**: pnpm (workspaces, pinned via `packageManager` in the root `package.json`).
- **Config**: `@nestjs/config`, global. Env vars are validated at startup by the zod schema in `src/config/env.ts` (`DATABASE_URL`, `PORT`, `CORS_ORIGIN`, and storage: `S3_ENDPOINT` (what the api reaches, `http://storage:9000`), `S3_PUBLIC_ENDPOINT` (what the browser reaches, `http://127.0.0.1:9000`), `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` (both or neither), `S3_FORCE_PATH_STYLE`). Inject `ConfigService<Env, true>` and read values with `{ infer: true }`. A new variable goes into `env.ts`, `.env.example` and your local `apps/api/.env`, or every e2e run fails at boot.
- **DB access**: Drizzle. Tables live in `src/database/schema.ts`. It imports runtime values from `@time-capsule/shared` (enum tuples such as `MILESTONE_CATEGORIES` feed `mysqlEnum`), so `db:generate` and `db:studio` run as `NODE_OPTIONS=--conditions=@time-capsule/source drizzle-kit …`: drizzle-kit loads the schema through tsx, which honours the condition and reads shared's source (verified with `packages/shared/dist` removed; without the condition drizzle-kit fails with MODULE_NOT_FOUND, or with a stale `dist` silently generates an outdated enum). `db:migrate` doesn't load the schema. Inject the client with `@Inject(DRIZZLE) db: Database` (from `database/database.types.ts`). After a schema change, run `db:generate --name <snake_case_description>` (e.g. `--name add_milestone_attachments`) and commit the migration. Always pass `--name`; otherwise drizzle-kit picks a random name like `0001_supreme_darkhawk`. To rename a migration later, rename the `.sql` file and update its `tag` in `drizzle/meta/_journal.json` to match.
- **Enums**: English snake_case slugs on the wire and in MySQL (`mysqlEnum` fed by the shared tuple, nullable unless required). The web shows them through i18n keys (`category.<slug>`, `familyMemberKind.<slug>`). Changing the list needs a migration (`MODIFY COLUMN`).
- **Contract**: request schemas, response types and the validation-error body come from `@time-capsule/shared`; the api has no `*.schemas.ts` of its own. Validate bodies with `@Body(new ZodValidationPipe(createXRequestSchema))`. Import shared types used in decorated signatures with `type` (`isolatedModules` + `emitDecoratorMetadata`). Don't use class-validator.
- **HTTP boundary**: services return Drizzle rows; controllers return the shared response type through an explicit field-by-field mapper (`milestones/milestone.mapper.ts`: `toMilestoneResponse(row)`, `Date` → ISO string). No `...row` spreads, so a new column doesn't leak and a new contract field is a compile error. Services throw the application-layer `NotFoundError` (`common/not-found.error.ts`), never Nest HTTP exceptions; `NotFoundErrorFilter`, registered as `APP_FILTER` in `AppModule`, answers it with Nest's usual 404 body. DELETE is idempotent: 204 even when the row is already gone.
- **Checks that need the database** (a referenced row exists, not one's own parent, a PATCHed date against the stored one) live in the service and throw `FieldValidationError({ field: messages.key })` (`common/field-validation.error.ts`, typed `Partial<Record<string, MessageKey>>`); `FieldValidationErrorFilter` (`APP_FILTER`) answers 400 with the same `ValidationErrorBody` as the pipe, so the web puts each key on its form field. A PATCH checks cross-field rules on the stored row merged with the request (undefined = keep, null = clear), reusing the shared refinement functions (`const [isDeathAfterBirth] = deathAfterBirth`).
- **Relations**:
  - Foreign-key columns use `fkId(name)` in `schema.ts` (`bigint unsigned`, the type of `serial`; anything else fails with MySQL error 3780). A self-reference needs `(): AnyMySqlColumn => table.id`. Join tables (`milestone_family_members`) have `primaryKey({ columns })`, an index on the reverse column and `onDelete: 'cascade'` on both sides; optional parents use `'set null'`. No Drizzle `relations()`: reads use the core query builder.
  - Many-to-many is a replace-set `xIds` array on the owner's requests: present replaces the whole set (`[]` clears), absent leaves it. The service destructures relation keys out (`const { familyMemberIds, ...columns } = request`), skips `update().set()` when only relation keys came (Drizzle throws "No values to set") and never calls `insert().values([])`. Multi-table writes run in `db.transaction` (type `Transaction` from `database.types.ts`); reference checks lock the owner row `FOR UPDATE` first, then the referenced rows `FOR SHARE`, and an unknown id throws `FieldValidationError`, which rolls back.
  - Embedded relations are attached with one batched `inArray` query per relation, never per row. The api row type grows in one place: `MilestoneRow = Milestone & { familyMembers; location; place }` in `milestones.service.ts`. Summary helpers (`milestones/milestone-summary.ts`, `family-members/family-member-summary.ts`, `locations/location-summary.ts`, `places/place-summary.ts`: `xSummaryColumns` to select, `toXSummary` to map) are shared by every feature that embeds the other.
  - A 1:1 relation is a left join in the same query: `select({ ...getTableColumns(x), location: locationSummaryColumns })` with `.$dynamic()` so `findAll`/`findOne` share it. Keep each embedded object a **top-level** selection key whose columns all come from one left-joined table: Drizzle then answers `null` when nothing joined (nested deeper it gives `{ id: null, … }`).
  - **Location model**: `places.location_id` is nullable + UNIQUE (a location has at most one place); `milestones.location_id` is the only "where" a milestone stores, and its place is joined through `places.location_id = milestones.location_id` (both FKs `ON DELETE SET NULL`, so deleting a location is a plain idempotent delete, never a 409). Place writes call `assertLocationAvailable` (locks the location `FOR UPDATE`, 400 `locationId` when missing or owned by another place); milestone writes call `assertLocationExists` (`FOR SHARE`). Keep the milestone list's `orderBy(desc(date), desc(id))` (covered by e2e).
  - A list answers `xResponseSchema[]`; a detail (and POST/PATCH when the page shows relations) answers `xDetailResponseSchema`, a superset, so the web can put it straight into the detail cache.
- **Media/storage** (`docs/adr/002-media-storage.md`):
  - `StorageService` (`storage/`) is the only code that talks to S3. It has two `S3Client`s from `createS3Client`: internal (`S3_ENDPOINT`: HeadObject, DeleteObject) and presign (`S3_PUBLIC_ENDPOINT`: signs URLs for the browser, never connects). Both use `forcePathStyle` from env and `requestChecksumCalculation`/`responseChecksumValidation: 'WHEN_REQUIRED'` (no CRC32 extras non-AWS servers may refuse); `StorageModule` destroys them on shutdown.
  - Upload = presigned POST (`content-length-range [1, 20 MB]`, `eq $Content-Type`, `Expires` 600). Keep `Expires` ≤ 900: RustFS rejects a POST more than 15 minutes from its `X-Amz-Date`. Every form field must be in the policy, so the browser sends exactly the SDK `fields` plus `file` (last), and the api never adds `success_action_status` or `x-amz-meta-*`.
  - Confirm = `HeadObject`: the exact declared size and the exact allowed type, else delete object and row and throw `FieldValidationError({ file: messages.mediaUploadInvalid })`. The policy is a first line only; confirm verifies the upload at confirm time, but doesn't make the object immutable: the presigned POST stays reusable for its 600 s, so the same fields could overwrite the object with another 1 B–20 MB file (an accepted residual risk, see the ADR). When the final UPDATE matches no row (the media or its owner was deleted during the upload), confirm deletes the object best-effort and throws `NotFoundError`.
  - `POST /media` locks the owner `FOR UPDATE` and counts its links **pending included**; at the cap it throws `ConflictError(messages.mediaCap…)` (409 via `ConflictErrorFilter`). Stale pending uploads (24 h) are purged best-effort first: row by row, each DELETE re-checking `status = 'pending'`, and objects deleted only for rows actually deleted; a failure is logged, never thrown into the upload.
  - `PUT /<owner>/:id/media` (`MediaService.replaceOwnerMedia`) replaces only **ready** links (order = position) and leaves pending links alone, so a PUT never cancels an upload in flight; unknown/pending ids answer 400 `mediaIds`. The body carries `baseMediaIds`, the ready ids the client last saw: after locking the owner, the current ready link ids in position order must equal it, else `ConflictError(messages.mediaStale)` (409) before anything changes, so a PUT built from a stale view never unlinks (and deletes) a photo the client didn't show. The statuses of linked and requested media are read `FOR UPDATE`, not `FOR SHARE`: `deleteOrphans` locks the same rows `FOR UPDATE` again, and a shared-to-exclusive upgrade deadlocks two PUTs unlinking the same photo.
  - `deleteOrphans(tx, ids)` (unlinked by a PUT, or an owner's links on owner `remove`) uses locking reads inside the transaction (`FOR UPDATE` on media, `FOR SHARE` on remaining links); it returns the orphans' keys and the S3 deletes run **after commit** (`mediaService.deleteObjects(keys)`, best-effort, logs failures). An owner's `remove` locks the owner row `FOR UPDATE` (absent: return 0, the delete stays idempotent), then its link rows `FOR UPDATE`, deletes the owner and calls `deleteOrphans` in the same transaction. Lock order on every media path (upload, PUT, owner delete): owner, then links, then media.
  - Read URLs are presigned GETs signed at the start of the hour (`signingDate` floored, `expiresIn` 7200, `ResponseCacheControl: 'private, max-age=3600'`), so the URL is stable within the hour and the browser cache works. The storage key never appears as a response field (it is only inside the presigned POST's `fields.key` and in URL paths; `toMediaResponse` maps `url`, never the key).
  - The bucket is private (no bucket policy); its CORS (set by `storage-init`) allows exactly `http://localhost:5173` and `http://127.0.0.1:5173`.
- **Validation errors**: `ZodValidationPipe` answers 400 with `ValidationErrorBody` (`{ message: 'validation.failed', errors: z.flattenError() }`), which the web maps onto form fields. It parses with `{ error: fallbackErrorMap }`, so every message is an i18n key: the check's own key, else `validation.invalid`. 404 texts (`Milestone 3 not found`) stay English developer text; the web shows its own translated not-found copy. e2e tests parse responses with the shared schemas and assert the key literals.
- **Body size**: `main.ts` raises the JSON body limit to 256 kB (`app.useBodyParser('json', …)`), so a description within the 65,535-byte TEXT limit never gets a 413 after JSON escaping. Not covered by e2e (they don't run `main.ts`).
- **CORS**: enabled in `main.ts` for the single origin `CORS_ORIGIN` (default `http://localhost:5173`, the web dev server).
- **e2e tests** need a running, migrated database and `apps/api/.env`. They build the app from `AppModule`, so `main.ts` setup (CORS, shutdown hooks) isn't covered by them.

## Conventions (web)

- **Stack**: TanStack Router (file-based, `@tanstack/router-plugin`), TanStack Query v5, React Hook Form + `@hookform/resolvers/zod`, Tailwind v4 (`@tailwindcss/vite`) + shadcn/ui (radix-nova). Zustand (ADR 001) only when there is client-only state.
- **ESM + bundler resolution**: `"type": "module"`, `moduleResolution: bundler`, so relative imports are extensionless.
- **Imports**: `~/` is the alias for `apps/web/src` (tsconfig `paths`, Vite `resolve.alias`, `components.json`). It's `~/`, not shadcn's default `@/`, so web-local imports stand out from `@time-capsule/*` packages. Order: external packages, `@time-capsule/*`, `~/`, relative. Use relative imports within a feature folder, `~/` across folders.
- **TypeScript** is strict. `tsconfig.app.json` covers `src/` without specs; `tsconfig.test.json` covers specs and `src/test` (with `vitest/globals`); `tsconfig.node.json` covers the Vite/Vitest configs. `pnpm build` type-checks all three with `tsc -b`.
- **Files and exports**: kebab-case file names, named exports (`export function MilestoneForm()`).
- **Routes** (`src/routes/`): thin files that parse params, run the loader and wire feature components. Loaders warm the cache with `context.queryClient.query(xQueries.detail(id))` (not the deprecated `ensureQueryData`); components read it with `useSuspenseQuery`. Nothing but routes goes in `src/routes` (the plugin turns every file into a route). `routeTree.gen.ts` is regenerated by `dev`/`build`/`test`; commit it.
- **Id routes** use a layout `routes/<feature>/$xId/route.tsx` (no component, so it renders `<Outlet />`) that owns `params.parse` via `toPositiveInt` (`~/lib/route-params`; anything else falls through to the not-found page without an api call), the detail loader (an api 404 becomes `throw notFound()`) and a `notFoundComponent` that renders `NotFound` with translated `message`/`to`/`label`. Leaves (`$xId/index.tsx` = the detail page, `$xId/edit.tsx`) only read the cache and add extra loaders if they need lists. After create or edit, go to the detail page; after a delete there, go to the list (`DeleteXButton onDeleted`).
- **Features** (`src/features/<feature>/`): `api.ts` (fetchers that parse every response with the shared schema), `queries.ts` (`xQueries` `queryOptions` factories with keys `['<feature>', ...]`, plus mutation hooks whose `onSuccess` returns the invalidation promise), components and their specs. Mutation hooks own the cache; components own navigation.
  - **Cross-feature invalidation**: when a feature's responses embed another's rows, writes invalidate whole key prefixes on both sides. Milestone mutations also invalidate `familyMembersKey` (`['family-members']`, a family member's page lists their milestones) and `placesKey` (a place's page lists the milestones there); family-member update and delete also invalidate `['milestones']` (participant names); every location and place write invalidates `['locations']`, `['places']` and `['milestones']`. Import keys one way only (milestones → family-members, places → locations, milestones → places; the other side spells the prefix as a literal).
  - Routes whose form picks other rows load those options in their own loader (`milestones/new` and `$milestoneId/edit` load family members, locations and places; the place form routes load locations), so the form gets them as a prop.
  - A "New x" dialog inside another form (`CreateLocationDialog`) creates through the mutation hook and calls `onCreated` after `mutateAsync` resolves, i.e. after the list refetch, so the caller's `setValue` finds the new `<option>`. The dialog's own form calls `event.stopPropagation()` on submit: the Dialog portals it out of the outer `<form>` in the DOM, but React still bubbles the submit to the outer `onSubmit`. Drop shadcn Dialog's built-in close button (`showCloseButton={false}`, its sr-only text is English) and close with a translated Cancel (`DialogClose`).
- **i18n**: i18next + react-i18next, EN and PL bundled in `src/i18n/locales/{en,pl}.ts`: one `translation` namespace, flat `<area>.<name>` keys, `keySeparator`/`nsSeparator` off, `escapeValue: false`, `fallbackLng: 'en'`. `en` is ``as const satisfies Record<MessageKey | `category.${MilestoneCategory}` | `familyMemberKind.${FamilyMemberKind}`, string> & Record<string, string>`` (so `t` requires each `{{param}}`, and a contract key without text fails `tsc`); `pl` satisfies `Translation<typeof en, 'one'|'few'|'many'|'other'>`, so a missing PL key or plural form is a compile error. Plurals: EN `_one/_other`, PL `_one/_few/_many/_other`, called with `{ count }`. Brand: EN "Time Capsule", PL "Kapsuła czasu".
  - **No user-visible literal in components**, aria-labels and the document title included; use `t`. The only exceptions are the language endonyms in `LanguageSwitcher`.
  - Language: `detectLanguage()` (localStorage `time-capsule.language`, else `navigator.language` starting with `pl`, else EN), `setLanguage()` (persists, then `i18n.changeLanguage`), `initI18n()` (called once in `main.tsx`; its `languageChanged` listener sets `<html lang>` and `document.title`). No locale in URLs. `index.html` keeps `lang="en"` and "Time Capsule" until JS runs.
  - RHF state and the Query cache hold keys or raw strings only; translate at render with `useTranslateMessage()` (`t(m, { defaultValue: m })`: keys translate, other text shows verbatim) or `FieldErrorMessage`, so a language switch re-translates errors already on screen.
  - Enum labels: ``c ? t(`category.${c}`) : null``, `` t(`familyMemberKind.${kind}`) ``. A slug must not end in a plural suffix (`_one`, `_few`, `_many`, `_other`, `_two`, `_zero`).
  - Dates: `formatDate(iso, language)` (`~/lib/dates`, Intl `en-GB`/`pl-PL` in UTC on the raw `YYYY-MM-DD`; it never shifts a day); keep `dateTime={iso}`. Call `const language = useLanguage()` once at the top of a component, never inside `.map` or callbacks. Native date inputs follow the browser's locale (accepted).
  - Editing a locale file in dev needs a page reload (the i18next singleton isn't hot-replaced).
- **Forms**: `useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>` with `zodResolver(schema, { error: fallbackErrorMap })` on the shared request schema (the fallback keeps zod's English defaults out of the UI), `.extend()`ed only where inputs differ from the wire. Build replaced fields from the shared pieces so their checks survive: `description: descriptionSchema.transform(blank → null)`, an enum select as `z.union([z.literal(''), xSchema]).transform('' → null)`, an optional date as `z.string().transform('' → null).pipe(isoDateSchema.nullable())`, an id `<select>` as `z.string().transform('' → null, else Number).pipe(idSchema.nullable())`. Cross-field rules come from the shared tuples: `xFieldsSchema.extend({...}).refine(...deathAfterBirth)`. Show field errors with `FieldErrorMessage` (wraps shadcn `FieldError`'s children; never edit `ui/`) and the root error through `useTranslateMessage`. Submit handlers throw; `applyApiErrors` (`lib/form-errors.ts`) puts 400 field errors (keys or raw text) on fields and everything else in `errors.root.server` as `toErrorMessage(error)`.
- **Media** (`features/media/`): `MediaSection({ target, media, max, label })` on the owner's detail page (`media` from the detail response, `max` = `MAX_MILESTONE_MEDIA`/`MAX_FAMILY_MEMBER_MEDIA`, `label` = title/name for the alt "Photo n: label"). `useMediaUploader` checks type, size and free slots (uploads in flight count) client-side, uploads one file at a time (POST /media, storage, confirm), and `DELETE /media/:id` after a failure. `useUpdateOwnerMedia(target)` sends the PUT (remove = ids minus one, library = plus one, move = reordered; `baseMediaIds` = the ids on screen) and puts the answer into the owner's detail cache; a 409 stale invalidates the owner (refetch) and shows the translated message. While uploads are in progress (`uploader.active > 0`) the gallery's move and remove buttons and the library button are disabled, since each finished upload changes the set on screen. Uploads, PUTs and owner deletes invalidate `['media']` (owner hooks spell it as a literal: media imports their keys). The library dialog loads `GET /media` only while open. API errors without a form field go through `toMediaErrorMessage` (first field error key) and `MediaError`.
- **Pickers**: native elements, not Radix Select/Checkbox/RadioGroup (those need ResizeObserver in jsdom and are worse on mobile). One value: shadcn `NativeSelect` + `NativeSelectOption` (`~/components/ui/native-select`, a styled `<select>`; its `className` lands on a `w-fit` wrapper, so pass `className="w-full"`); an enum of two or three: native radios in a `FieldSet`/`FieldLegend`; options of two kinds in one select: `NativeSelectOptGroup` (the milestone "Where" select: places, then other locations, all valued by location id); several rows: a checkbox list like `FamilyMemberPicker` (filter input whose Enter doesn't submit, rows at least 44 px, a "Selected: N" counter, hidden rows stay selected), inside a `FieldSet` whose legend names it.
- **Maps**: Leaflet 1.9 + react-leaflet 5 with OpenStreetMap tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`, no subdomains; the attribution `map.attribution` keeps the OSM copyright link). Only `features/locations/lazy-maps.tsx` (`LocationPicker`, `LocationPreview`) is imported by the app; it lazy-loads `location-map.tsx`, so Leaflet and its CSS stay out of the entry chunk (`grep -l leaflet apps/web/dist/assets/index-*.js` prints nothing). Its frame is `relative isolate z-0` (Leaflet's z-index 400/1000 panes would cover dialogs) and carries the translated `aria-label`. The marker icon is built with `L.icon` from imported images (Vite's asset names break `L.Icon.Default`). Leaflet text is translated: `zoomControl={false}` plus `<ZoomControl key={language} …Title>`, a Marker `alt` (re-keyed per language). Previews disable every gesture, so a finger scrolling the page never gets caught, and their marker is decoration (`interactive`/`keyboard` off, empty `alt`: Leaflet's default makes it a tab-stop `role="button"`); the picker has `scrollWheelZoom={false}`. Coordinates are typed in `inputMode="decimal"` text inputs (`parseCoordinate` accepts `,` or `.`), shown with `formatCoordinates(lat, lng, language)` (signed decimal degrees; `;` between them in PL) and linked with `osmLink`. Maps need internet access (OSM tiles).
- **Markdown**: show it only through `<Markdown className dropCap>{text}</Markdown>` (`dropCap` on detail pages; `~/components/markdown`: lazy react-markdown chunk with a raw-text fallback; `skipHtml`, no `img`, headings shifted down one level, the default `urlTransform` blocks `javascript:`, http(s) links open in a new tab with `rel="noopener noreferrer nofollow"`; no rehype-raw, remark-gfm or typography plugin). Edit it with `MarkdownEditor` (Write/Preview tabs; the textarea stays mounted so the label, RHF ref and focus-on-error work). Prose styles are `.chronicle-prose` in `index.css`. Where Markdown must stay plain text (the timeline's cards), use `toPlainExcerpt(text, max = 180)` (`~/lib/markdown-excerpt`: syntax and HTML stripped, cut at a word boundary with "…"), which doesn't load react-markdown.
- **Errors**: `apiRequest` throws `ApiError { status, body, apiMessage }` (`message` is the api's own message or a generic one, for logs) or `NetworkError(url)` (English developer message naming `CORS_ORIGIN`) when the api can't be reached. `api-client.ts` stays React- and i18n-free; `toErrorMessage(error)` maps to what the UI shows: `NetworkError` → `error.network`, 404 → `error.notFound`, ≥500 → `error.unexpected`, other 4xx → `apiMessage ?? error.unexpected`, a plain `Error` → its message. Loader errors render the router's `RouteError`; unknown URLs `PageNotFound`.
- **Theme & ornaments**: tokens live only in `src/index.css` (Tailwind v4 is CSS-first; no tailwind.config). Light parchment in `:root`, candlelight under `@media (prefers-color-scheme: dark)`; `@custom-variant dark` is that media query, so there is no `.dark` class and no theme toggle. Contrast is checked against `--background` (WCAG AA; the ratios are in the comments next to the tokens): `brass` (2.2:1) and `border` (1.6:1) are ornament-only, text in brass uses `text-brass-ink`, inputs use `--input` (3.2:1). Restyle shadcn through tokens or `className`, never by editing `ui/`; `--font-heading` (Cinzel) already restyles every shadcn title. Ornament classes (`@layer components`): `chronicle-prose` (the Markdown wrapper), `drop-cap` (via `<Markdown dropCap>`: only when the text is at least 120 characters), `chronicle-divider` (an `<hr>` with a fleuron), `chronicle-frame` (double brass border with corner flourishes, used by photo thumbnails and the lightbox), `seal` (wax seal; `CategorySeal`), `timeline`/`timeline-year` (rail and sticky year), `shadow-parchment`. Paper grain and vignette are dropped under `prefers-contrast: more` and reduced transparency; `forced-colors` and `prefers-reduced-motion` have fallbacks. The `:focus-visible` outline is unlayered on purpose (it beats `outline-none` in `ui/`; `ring/50` alone is 2.1:1). Pages start with `PageHeading({ title, actions, children })` (the `<h1>`; `children` are the lines under it). Top-level sections are the items of `components/app-nav.tsx` (keep three or four so the bottom bar fits 360 px; `alsoActiveOn` marks an item current on related paths); the header must never get `transform`/`filter`, which would break the nav's `position: fixed`. In-page jumps (the skip link, the timeline's year nav) focus their target from `onClick` and never change the hash: a hash change is a router navigation that re-runs the loader. `html` has `scroll-padding-block` so a focused element never hides under the sticky year heading or the fixed bottom nav (bottom padding only below `md`); `scroll-behavior: smooth` (when motion is allowed) is for those jumps, and the router's `scrollRestorationBehavior: 'instant'` keeps page changes from scrolling smoothly. Under `forced-colors` the current nav item (`nav [aria-current=page]`) is underlined, since its colour and bar are forced away. Lists styled `list-none` by preflight get `role="list"` (Safari/VoiceOver drops their semantics otherwise).
- **Icons**: `createEngravedIcon(displayName, (hatch) => paths)` in `components/icons/engraved-icon.tsx`: 24 × 24 viewBox, 1.5 `currentColor` stroke, 1em size through attributes (a `size-*` class or Button's svg rule wins), always `aria-hidden` (an icon sits next to visible text; there is no titled variant until one is needed). Every instance defines its own hatch `<pattern>` with a `useId` id, because `currentColor` inside a pattern resolves where the pattern is defined (a shared sprite would paint every hatch in one colour). Sets: `nav-icons` (chronicle, family, places), `action-icons` (add, edit, delete, back, prev/next, close, photo, hourglass, compass, fleuron), `category-icons` (mapped by `categoryIcons` in `features/milestones/categories.ts`) and `family-member-kind-icons` (`familyMemberKindIcons` in `features/family-members/kind-icons.ts`). `components/` never imports `features/`. Use engraved icons in app code; `lucide-react` stays for shadcn internals and where no engraved icon exists (`Languages`, `ExternalLink`). Icons are decorative next to visible text, so accessible names stay the text's.
- **UI components**: `src/components/ui/` is vendored shadcn code (double quotes, no semicolons). Add or upgrade with `pnpm --filter web exec shadcn add <name>`; don't hand-edit.
- **Talking to the api**: the SPA calls the api directly, cross-origin (no Vite proxy); the api allows the web origin through `CORS_ORIGIN`. The one exception to "all requests go through `apiRequest()`" is `lib/upload.ts`: an XHR multipart POST (for progress) of the presigned `fields` then `file` straight to storage at `S3_PUBLIC_ENDPOINT`, mapping S3 `<Code>`s to `media.upload.*` keys (`StorageUploadError`). Storage's bucket CORS allows `http://localhost:5173` and `http://127.0.0.1:5173` only, and the api allows the one `CORS_ORIGIN` (default `http://localhost:5173`), so open the app at `CORS_ORIGIN`, which must be one of those two (another origin: add it to `storage-init` too). The api base URL comes from `VITE_API_URL` (no trailing slash), set to `http://localhost:3000` in the committed `apps/web/.env`. Override it in `apps/web/.env.local` (gitignored). Vite inlines `VITE_*` values into the public bundle, so never put secrets there; that's also why, unlike the api, web has no `.env.example`. Read it only through `src/env.ts` (zod-validated). All requests go through `apiRequest()` in `src/lib/api-client.ts`.
- **Tests**: Vitest + jsdom + Testing Library + MSW, specs next to the code as `*.spec.ts(x)`. `renderRoute(path)` (`src/test/render-route.tsx`) renders the real router and providers with memory history and a fresh `QueryClient` (`retry: false`); query with `findBy*`. MSW has no default handlers and `onUnhandledRequest: 'error'`: each test declares its api responses with `server.use(http.get(apiUrl('/x'), ...))`. Pages that refetch after a save (the detail loader) need stateful handlers (`let current = …`; PATCH updates it). A route that loads picker options needs their handler in every test (`milestone-form.spec` installs `GET /family-members`, `GET /places` and `GET /locations` in a top-level `beforeEach`; a "no api call" test starts with `server.resetHandlers()`). Storage uploads: MSW can't intercept XHR with jsdom's `FormData` (TypeError `_buffer`), so specs stub `XMLHttpRequest` with a stand-in storage (`media-section.spec`, `upload.spec`); pick refused files with `renderRoute(path, { applyAccept: false })`. Leaflet never runs in jsdom: `setup.ts` mocks `~/features/locations/location-map` globally with `src/test/location-map.mock.tsx` (a "Pick a point (map stub)" button that sets 50.061698, 19.937206, and a preview `data-testid="location-preview-map"` with `data-point`); the maps load lazily, so wait with `findByTestId`. Build fixtures with the shared response schema (`src/test/fixtures.ts`). `VITE_API_URL` is pinned to `http://api.test` in `vitest.config.ts`. Type Markdown with `user.paste` (`user.type` reads `[` and `{` as key descriptors). Vitest never loads `index.css`, so responsive variants are never duplicated in the DOM (one nav for mobile and desktop), and nothing may depend on CSS (no `matchMedia`); `window.scrollTo` and `Element.prototype.scrollIntoView` are stubbed in `setup.ts`. Dialogs that aren't opened by a `DialogTrigger` (the lightbox) return focus themselves: `MediaLightbox` takes `returnFocusTo`, and the gallery passes the clicked thumbnail (`event.currentTarget`, since Safari doesn't focus a button on click; the thumbnail at the same position as a fallback). Specs check it with `toHaveFocus()`, and `fireEvent.click` (no focus) stands in for Safari. `toPlainExcerpt` has a timing spec on ~60 kB pathological input. Swipes are `fireEvent.touchStart`/`touchEnd` with both `touches` and `changedTouches` (the dialog's scroll lock reads `changedTouches`).
  - i18n: `setup.ts` calls `initI18n('en')` and resets to EN (and clears localStorage) in `beforeEach`, so specs read in English. A Polish case does `await setLanguage('pl')` *before* `renderRoute`; switch while mounted only through the UI (`user.selectOptions`). `afterEach(vi.restoreAllMocks)` wherever navigator or storage is spied on. `i18n/resources.spec.ts` guards the locales (no empty values, placeholder parity, plural forms per `Intl.PluralRules`, every contract key present in both).
- No lint or format tooling for web yet.

## Conventions (shared code, `packages/*`)

`packages/shared` (`@time-capsule/shared`) holds the api↔web contract, one module per feature (`src/milestones.ts`) re-exported from `src/index.ts`: request schemas (`createXRequestSchema`, `updateXRequestSchema`), the response schema (`xResponseSchema`, timestamps as ISO strings), and types via `z.infer` (`CreateXRequest`, `XResponse`). `validation-error.ts` describes the api's 400 body. `common.ts` holds the building blocks (`idSchema`, `isoDateSchema`, `TEXT_MAX_BYTES`, `utf8ByteLength`, and `descriptionSchema`, the byte limit of a Markdown `TEXT` column); `messages.ts` the message keys; `summaries.ts` the small shapes one feature embeds in another (`FAMILY_MEMBER_KINDS`, `familyMemberSummarySchema`, `locationSummarySchema`, `placeSummarySchema`). Create another package only when there's a different kind of shared code.

- **Messages are i18n keys, never prose**: `messages` (`as const`) in `messages.ts`, typed `MessageKey`. Every check passes one (`.min(1, messages.titleRequired)`, `{ error: messages.categoryInvalid }`, `z.iso.date(messages.dateInvalid)`); issues without their own key get `validation.invalid` from `fallbackErrorMap`. No interpolation parameters: limits are written into the translated text. A new key needs EN and PL text in `apps/web/src/i18n/locales`, which the web's `tsc` enforces. Enum tuples (`MILESTONE_CATEGORIES`) are exported as runtime values, because the api's `schema.ts` feeds them to `mysqlEnum`.
- **zod refine trap**: `.partial()`, `.pick()` and `.omit()` throw on a refined object, and so does `.extend()` when it overwrites a key. When a create schema needs a refinement, export an unrefined `xFieldsSchema` plus the refinement as a tuple (`deathAfterBirth`, `distinctParents`: `[check, { path, error }]`), and build `createX = fields.refine(...tuple)`, `updateX = fields.partial().refine(nonEmpty).refine(...tuple)` and the web form from the fields. The api reuses the tuple's check on merged PATCH values.
- **Import direction (no cycles)**: an ESM cycle between modules with top-level consts throws "Cannot access … before initialization". `summaries.ts` is a leaf (zod and `common.ts` only); feature modules import it. `milestoneSummarySchema` stays in `milestones.ts`, and other features import `milestones.ts` one way (`family-members.ts` and `places.ts` do; `milestones.ts` never imports them).
- **Relations on the wire**: a many-to-many is `xIds: z.array(idSchema).optional()` on the owner's create request, never `.default([])` (through `.partial()` it would clear the set on every PATCH that omits it); responses embed `xSummarySchema[]` (`familyMembers` on a milestone). A detail endpoint may answer `xDetailResponseSchema = xResponseSchema.extend({...relations})` (`familyMemberDetailResponseSchema`: mother, father, children, milestones).

- **Naming: request / response**: contract schemas and types are named after the HTTP direction: `createXRequestSchema` / `CreateXRequest`, `updateXRequestSchema` / `UpdateXRequest`, `xResponseSchema` / `XResponse`. Variables and parameters holding a request body are named `request` (in api, web and specs). Don't use `Input`, `Dto`, `Payload` or other synonyms for contract names.
- **Consumed from source ("live types")**: `exports` maps the custom condition `@time-capsule/source` (it must stay the first key) to `src/index.ts` and `default` to `dist/index.js`. TypeScript (`customConditions` in the api `tsconfig.json` and web `tsconfig.app.json`), Vite (`resolve.conditions`, with `defaultClientConditions` spread back in) and the api's Vitest (`ssr.resolve.conditions`) all read the source, so editors, tests, type-checks and the web never need a build. Only Node running `apps/api/dist` uses `dist` (built by `pnpm build` / `pnpm api:start:dev`). No `.d.ts` is emitted, so a tool missing the condition fails loudly instead of using stale types. Any new tool config that imports shared needs the condition. Never alias shared through tsconfig `paths` (it would be compiled into the api's `dist`).
- **Must compile everywhere**: the source is type-checked under the api's options (nodenext, decorators, `isolatedModules`) and the web's (bundler, `verbatimModuleSyntax`, DOM), so keep it plain.
- **ESM**: shared packages are `"type": "module"` and use `.js` extensions in relative imports, so both the api (`nodenext`) and Vite (`bundler` resolution) resolve them.
- **Framework-free only**: plain TypeScript types and zod-like schemas. No NestJS, class-validator or other decorator-based DTOs, because those would pull server libraries into the browser bundle. Nest DTOs stay in `apps/api` and can derive from the shared schemas.

## Open decisions / next steps

Already decided: Drizzle (ORM), zod (validation), `@nestjs/config` with a `.env` file (config), and the frontend stack from ADR 001 (`docs/adr/001-frontend_technology_stack.md`). ADR 001 also picks Turborepo for build orchestration, but it's deferred until it's actually needed (`pnpm -r` ordering covers it today).

## Dependencies

- **Catalog**: versions that several packages declare (`zod`, `typescript`, `vitest`) live once in the `catalog:` block of `pnpm-workspace.yaml`; reference them as `"zod": "catalog:"`.
- **Explicit ranges**: TypeScript stays on 6.x (Nest CLI 12 uses the TS 6 compiler API), Vitest on 4.x and msw on 2.x, although npm `latest` is newer. Always pass a range to `pnpm add`.
- **Install scripts**: pnpm only runs a dependency's build/postinstall script when `allowBuilds` in `pnpm-workspace.yaml` says so; add an explicit `true`/`false` entry for each new one (`esbuild: false`, `msw: false`).
- The shadcn CLI (a web dependency) brings zod 3 for itself; that's expected, don't override it. Runtime code uses one zod 4.
- Api storage is `@aws-sdk/client-s3`, `@aws-sdk/s3-presigned-post` and `@aws-sdk/s3-request-presigner`, all `^3.1146.0`: keep the three on the same version (`pnpm why @aws-sdk/client-s3 -r` shows one). No install scripts.
- Web maps are `leaflet@^1.9.4` + `react-leaflet@^5.0.0` (v5 for React 19; Leaflet 2 is alpha and outside react-leaflet's peer range), with `@types/leaflet@^1.9.22` as a dev dependency. No install scripts (leaflet's `prepare` doesn't run for registry tarballs), so no `allowBuilds` entry.
- Web fonts are `@fontsource-variable/eb-garamond`, `@fontsource-variable/cinzel` and `@fontsource/pirata-one` (^5.3.0, dev dependencies: CSS sources bundled by Vite, OFL-1.1, no install scripts), imported at the top of `index.css`. All three cover latin-ext, which Polish needs (UnifrakturMaguntia and IM Fell are latin-only); `unicode-range` loads only the subsets a page uses.
- Web i18n is i18next ^26 + react-i18next ^17 only: no language detector, ICU, backend plugin or `<Trans>`. Markdown is react-markdown ^10 only. None of them has install scripts.

Nothing has been chosen yet for the following. Don't assume a choice; ask first.

- Authentication and family/user model
