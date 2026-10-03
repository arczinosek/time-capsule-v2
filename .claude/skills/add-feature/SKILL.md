---
name: add-feature
description: Recipe for adding a feature end to end in the Time Capsule monorepo, following the milestones reference implementation. It covers the shared zod contract in packages/shared, then the NestJS module (Drizzle table, ZodValidationPipe, response mapper), then the React feature folder (TanStack Router routes, TanStack Query hooks, React Hook Form + shadcn/ui), then the tests. Use it whenever the user wants a new entity, resource, CRUD screen, endpoint + page, or a new field that crosses api and web (e.g. "add family members", "let users tag milestones", "add a places page", "add a location field to milestones"), even if they only mention one side. Changes on one side can still break the contract on the other.
---

# Add a feature end to end

Milestones is the reference implementation. Before writing anything, open the matching
milestones file for each step below and copy its shape; the conventions behind it are in
CLAUDE.md. This skill covers **order**, **wiring** and the **traps** that actually bit
while the reference was built.

The order matters because each layer compiles against the one before it. The contract comes
first, so the api and web both fail to compile until they agree with it. That compile error
is the point.

Use `<feature>` for the plural kebab name (`milestones`), `X` for the singular PascalCase name
(`Milestone`) and `x` for its camelCase form (`milestone`).

## 1. Contract: `packages/shared/src/<feature>.ts`

Reference: `packages/shared/src/milestones.ts`, `milestones.spec.ts`.

- Naming is always **request / response** (never `Input`, `Dto`, `Payload`): schemas,
  types, and the `request` variables and parameters that hold a request body.
- Request schemas: `createXRequestSchema` and `updateXRequestSchema`
  (`createXRequestSchema.partial()` refined to need at least one key). Write user-facing
  messages here (`'Title is required'`), because both the api's 400 and the web form show them.
- Response schema `xResponseSchema`: the wire shape. Timestamps are `z.iso.datetime()`
  strings and dates are `z.iso.date()` (`YYYY-MM-DD`), never `Date`.
- Types via `z.infer`: `CreateXRequest`, `UpdateXRequest`, `XResponse`. Don't name a type bare
  `X`, because it would clash with the api's Drizzle row type.
- Re-export from `src/index.ts` with a `.js` extension (`export * from './<feature>.js';`).
  Shared is nodenext ESM.
- Keep it framework-free and plain. It is type-checked under the api's options (decorators,
  `isolatedModules`) and the web's (`verbatimModuleSyntax`, DOM).
- Spec: valid input, trimming, each rejection, and a response parse that rejects `Date`
  timestamps.

Check: `pnpm test --project shared`.

## 2. Api: `apps/api/src/<feature>/`

Reference: `apps/api/src/milestones/*`, `test/milestones.e2e-spec.ts`.

1. **Table** in `src/database/schema.ts` (Drizzle), with `date(..., { mode: 'string' })` for
   calendar dates. Then run `pnpm --filter api db:generate --name <snake_case_description>`
   and commit the SQL together with `drizzle/meta`. Always pass `--name`.
2. **Service** (`<feature>.service.ts`): `@Inject(DRIZZLE) db: Database`. It takes the shared
   request types and returns **Drizzle rows**. Missing rows throw `NotFoundError`
   (`common/not-found.error.ts`), never a Nest HTTP exception; the global
   `NotFoundErrorFilter` turns it into a 404 whose `message` the web displays. `remove`
   returns the affected-row count and never throws: delete is idempotent (always 204).
3. **Mapper** (`<x>.mapper.ts`): `toXResponse(row): XResponse`, listing every field
   explicitly and converting `Date` with `.toISOString()`. Don't use `...row`: explicit fields
   are what make a new column opt-in and a new contract field a compile error.
4. **Controller**: `@Body(new ZodValidationPipe(createXRequestSchema))`. Every handler is typed
   `Promise<XResponse>` (or `XResponse[]`) and goes through the mapper. Use `ParseIntPipe` for
   ids and `@HttpCode(HttpStatus.NO_CONTENT)` on delete. Import shared **types** in decorated
   signatures with `type` (`type CreateXRequest`), otherwise `isolatedModules` +
   `emitDecoratorMetadata` fail with TS1272.
5. **Module**: add it to `imports` in `src/app.module.ts`.
6. **Tests**:
   - Controller spec: keep a `row` fixture (Date timestamps) separate from a `response`
     fixture (ISO strings), and assert with `toEqual`. The mapper creates new objects, so
     `toBe` fails.
   - e2e: parse every body with `xResponseSchema` and a 400 with `validationErrorBodySchema`.
     That turns the e2e suite into the contract test.

Check: `pnpm --filter api exec tsc -p tsconfig.json`, `pnpm test --project api` and
`pnpm --filter api lint`. Then `pnpm test:e2e`, which needs MySQL (`docker compose up -d
database` on the host) and a migrated DB.

## 3. Web: `apps/web/src/features/<feature>/` + `src/routes/<feature>/`

Reference: `apps/web/src/features/milestones/*`, `apps/web/src/routes/milestones/**`.

1. **`api.ts`**: one fetcher per endpoint over `apiRequest` (`~/lib/api-client`), each
   **parsing the response with the shared schema**. Contract drift then fails at the boundary
   with a zod error, not as `undefined` somewhere in the UI.
2. **`queries.ts`**:
   - `xQueries = { list: () => queryOptions(...), detail: (id) => queryOptions(...) }`, with
     keys that start with `'<feature>'`.
   - Mutation hooks (`useCreateX`, `useUpdateX`, `useDeleteX`) whose `onSuccess` **returns**
     the `invalidateQueries` promise, so the mutation stays pending until the cache is fresh.
   - Update: `setQueryData` on the detail key. Delete: `removeQueries` on the detail key.
   - Hooks own the cache, and pages own navigation (`await mutateAsync(...)`, then
     `navigate`).
3. **Form** (`<x>-form.tsx`):
   - `useForm<z.input<typeof s>, unknown, z.output<typeof s>>` with `zodResolver(s)`, where
     `s` is the shared `createXRequestSchema`. `.extend()` it only where an input can't hold the wire
     value (textarea `''` → `null`).
   - Wrap submits in `try/catch` → `applyApiErrors(error, form.setError)`, which puts 400
     `fieldErrors` on fields and anything else in `errors.root.server`.
   - Use shadcn `Field`/`FieldLabel`/`FieldError` inside `Controller`. Dates use a native
     `<input type="date">`, which already gives `YYYY-MM-DD`.
4. **List/other components**:
   - Give repeated buttons distinct accessible names (`aria-label={`Delete ${x.title}`}`).
     Screen readers and tests rely on them.
   - Delete confirmation is a controlled `AlertDialog` that `preventDefault()`s the action and
     closes in the mutation's `onSuccess`.
   - Show dates as the raw string: `new Date('2024-05-01')` shifts by timezone.
5. **Routes** (`src/routes/<feature>/index.tsx`, `new.tsx`, `$xId/edit.tsx`):
   - Keep route files thin. Loader: `await context.queryClient.query(xQueries.detail(id))`,
     not the deprecated `ensureQueryData`. Component: `useSuspenseQuery`.
   - `params.parse` turns the id into a positive int, or `false` so the route falls through to
     not-found. An `ApiError` with status 404 in the loader becomes `throw notFound()`, with a
     route `notFoundComponent`.
   - Give the form `key={x.id}`: the router reuses the component across ids, and RHF reads
     `defaultValues` only once.
   - Only route files belong in `src/routes`. The plugin turns every file there into a route,
     specs included.
   - The router plugin regenerates `src/routeTree.gen.ts` on `dev`, `build` or `test`.
     **Commit it.** `<Link to>` and `createFileRoute` paths are typed from it, so a new route
     shows type errors until one of those has run.
6. **New shadcn component?** `pnpm --filter web exec shadcn add <name>`. It writes `~/`
   imports (the alias comes from tsconfig `paths`). Don't hand-edit `src/components/ui/`.
7. **Imports**: externals, then `@time-capsule/*`, then `~/...`, then relative. Use relative
   imports within the feature folder.

## 4. Web tests: `*.spec.tsx` next to the code

Reference: `features/milestones/milestone-list.spec.tsx`, `milestone-form.spec.tsx`,
`src/test/*`.

- `const { user, router } = renderRoute('/<feature>/new')` renders the real router and
  providers. Routes load lazily, so start with `findBy*`.
- MSW has **no default handlers** and `onUnhandledRequest: 'error'`: declare every response
  the test relies on with `server.use(http.get(apiUrl('/<feature>'), () =>
  HttpResponse.json([...])))`. Capture request bodies in the handler to assert what was sent.
- Build fixtures by parsing with `xResponseSchema` (like `buildMilestone` in
  `src/test/fixtures.ts`). Add a `buildX` there.
- Representative cases:
  - list renders
  - delete after confirming
  - client validation blocks the request (`vi.fn()` handler not called)
  - create sends the trimmed/normalised body
  - a server 400 lands on the field
  - edit loads and saves
  - a 404 shows not-found
- These already work in jsdom, so don't add workarounds: `user.type` on date inputs, Radix
  AlertDialog, jest-dom matchers. `window.scrollTo` is stubbed in `src/test/setup.ts`.

Check: `pnpm test --project web` and `pnpm --filter web build` (vite build, then `tsc -b`,
which also type-checks specs through `tsconfig.test.json`).

## 5. Finish

- `pnpm test`, `pnpm build` and `pnpm lint` from the root. Run `pnpm test:e2e` if MySQL is up.
- Run it live: `pnpm api:start:dev` (builds shared, then watches shared + api) and
  `pnpm front:start:dev`, then click through at http://localhost:5173.
  `pnpm --filter api start:dev` alone runs a stale or missing `packages/shared/dist`
  (`ERR_MODULE_NOT_FOUND .../shared/dist/index.js`).
- Update CLAUDE.md: "Implemented so far", plus the layout if new top-level folders appeared.

## Traps worth knowing

- **Any new tool config that imports `@time-capsule/shared` needs the `@time-capsule/source`
  condition**: tsconfig `customConditions`, Vite `resolve.conditions` (spread
  `defaultClientConditions`, since setting it replaces the defaults), and Vitest node env
  `ssr.resolve.conditions`. Without it the tool looks for `dist` and fails with TS7016 or
  module-not-found. Never "fix" that with tsconfig `paths`: it compiles shared into the api's
  `dist`.
- **Dependencies**:
  - Versions used by several packages go in the `catalog:` of `pnpm-workspace.yaml`.
  - Pass explicit ranges to `pnpm add`: npm `latest` is TS 7, Vitest 5 and msw 3, none of
    which are adopted.
  - A package with install scripts needs an `allowBuilds` entry.
  - Build-time-only packages (CLIs, CSS sources) go in `devDependencies`. `shadcn init` puts
    `shadcn` in `dependencies`, which drags the CLI's zod 3 into prod deps.
    `pnpm why zod -r --prod` should show only 4.x.
- **TanStack Router 1.170**: `ErrorComponentProps.error` is `unknown`. Narrow it with
  `instanceof Error`.
- **Web build order** is `vite build && tsc -b`, because the router plugin must write
  `routeTree.gen.ts` before the type-check.
- **Git**: stage nothing unless the user asks. `git mv` / `git rm --cached` touch the index, so
  use plain `mv` / `rm`.
