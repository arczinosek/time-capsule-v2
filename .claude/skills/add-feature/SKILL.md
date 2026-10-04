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
  (`createXRequestSchema.partial()` refined to need at least one key, `messages.atLeastOneField`).
- **Messages are i18n keys, never prose.** Add the feature's keys to `messages` in
  `src/messages.ts` (`titleRequired: 'validation.title.required'`) and pass one to every check:
  `.min(1, messages.titleRequired)`, `{ error: messages.categoryInvalid }`. No interpolation
  parameters: write limits into the text ("at most 255 characters"). The api's 400 and the web
  form both carry the key; the web translates it (step 3).
- Reuse `common.ts`: `idSchema`, `isoDateSchema` for `YYYY-MM-DD`, and `descriptionSchema` for any
  Markdown/`TEXT` column (it enforces the 65,535-byte limit).
- Enums: export the slug tuple as a runtime value (`X_KINDS = [...] as const`), a
  `z.enum(X_KINDS, { error: key })` schema and its type. English snake_case slugs; the api's
  `mysqlEnum` uses the same tuple.
- Response schema `xResponseSchema`: the wire shape. Timestamps are `z.iso.datetime()`
  strings and dates are `z.iso.date()` (`YYYY-MM-DD`), never `Date`.
- Types via `z.infer`: `CreateXRequest`, `UpdateXRequest`, `XResponse`. Don't name a type bare
  `X`, because it would clash with the api's Drizzle row type.
- Re-export from `src/index.ts` with a `.js` extension (`export * from './<feature>.js';`).
  Shared is nodenext ESM.
- Keep it framework-free and plain. It is type-checked under the api's options (decorators,
  `isolatedModules`) and the web's (`verbatimModuleSyntax`, DOM).
- Spec: valid input, trimming, each rejection **asserting the key literal**
  (`.toBe('validation.title.required')`), and a response parse that rejects `Date` timestamps.

Check: `pnpm test --project shared`.

## 2. Api: `apps/api/src/<feature>/`

Reference: `apps/api/src/milestones/*`, `test/milestones.e2e-spec.ts`.

1. **Table** in `src/database/schema.ts` (Drizzle), with `date(..., { mode: 'string' })` for
   calendar dates and `mysqlEnum('col', X_KINDS)` (tuple imported from shared) for enums. Then run
   `pnpm --filter api db:generate --name <snake_case_description>`, review the SQL, apply it with
   `pnpm --filter api db:migrate`, and commit the SQL together with `drizzle/meta`. Always pass
   `--name`.
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
     That turns the e2e suite into the contract test. Assert the 400's `fieldErrors` as key
     literals (`{ title: ['validation.title.required'] }`).

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
3. **Text** (`src/i18n/locales/en.ts` and `pl.ts`): add a `// --- <feature> ---` section to
   **both**, with flat `<feature>.<name>` keys, plus text for every new `messages` key and
   `<enum>.<slug>` key (add the enum to `RequiredKeys` in `en.ts`). Components render no
   literal, aria-labels included: `t('<feature>.editLabel', { title })`. `tsc -b` fails until
   both locales agree.
4. **Form** (`<x>-form.tsx`):
   - `useForm<z.input<typeof s>, unknown, z.output<typeof s>>` with
     `zodResolver(s, { error: fallbackErrorMap })`, where `s` is the shared `createXRequestSchema`.
     `.extend()` it only where an input can't hold the wire value, building the replacement from the
     shared piece so its checks survive: `description: descriptionSchema.transform(blank → null)`,
     an enum `<select>` as `z.union([z.literal(''), xKindSchema]).transform('' → null)`.
   - Wrap submits in `try/catch` → `applyApiErrors(error, form.setError)`, which puts 400
     `fieldErrors` on fields and anything else in `errors.root.server` (keys or raw text).
   - Use shadcn `Field`/`FieldLabel` and `FieldErrorMessage` (`~/components/field-error-message`,
     translates the key) inside `Controller`; render the root error through
     `useTranslateMessage()`. Dates use a native `<input type="date">`, which already gives
     `YYYY-MM-DD`. Pickers are native `<select>`s. Markdown fields use `MarkdownEditor`.
5. **List, detail and other components**:
   - Give repeated buttons distinct accessible names
     (`aria-label={t('<feature>.deleteLabel', { title: x.title })}`). Screen readers and tests
     rely on them.
   - Delete confirmation is a controlled `AlertDialog` that `preventDefault()`s the action and
     closes in the mutation's per-call `onSuccess`, then calls an optional `onDeleted` (the detail
     page navigates to the list there). Show its error as `translate(toErrorMessage(error))`.
   - Dates: `formatDate(x.date, language)` (`~/lib/dates`, UTC, never shifts a day) inside
     `<time dateTime={x.date}>`, with `const language = useLanguage()` once at the top of the
     component, never inside `.map`. Enum labels: ``x.kind ? t(`<enum>.${x.kind}`) : null``.
   - Markdown text only through `<Markdown>{x.description}</Markdown>`.
   - The detail component is `<x>-detail.tsx` / `XDetail`.
6. **Routes** (`src/routes/<feature>/index.tsx`, `new.tsx`, `$xId/route.tsx`,
   `$xId/index.tsx`, `$xId/edit.tsx`; reference `routes/milestones/$milestoneId/*`):
   - Keep route files thin. Loader: `await context.queryClient.query(xQueries.detail(id))`,
     not the deprecated `ensureQueryData`. Component: `useSuspenseQuery`.
   - The **layout `$xId/route.tsx`** owns the id: `params.parse` via `toPositiveInt`
     (`~/lib/route-params`) returns `false` for anything else, so the route falls through to
     not-found without an api call; the detail loader turns an `ApiError` 404 into
     `throw notFound()`; its `notFoundComponent` calls `t` and renders `NotFound` with
     `message`/`to`/`label`. The leaves (`index.tsx` = detail page, `edit.tsx`) only read the
     cache, and add loaders only for extra lists.
   - After create (`mutateAsync` returns the new row) or edit, navigate to the detail page; the
     edit form's Cancel goes there too.
   - Give the form `key={x.id}`: the router reuses the component across ids, and RHF reads
     `defaultValues` only once.
   - Only route files belong in `src/routes`. The plugin turns every file there into a route,
     specs included.
   - The router plugin regenerates `src/routeTree.gen.ts` on `dev`, `build` or `test`.
     **Commit it.** `<Link to>` and `createFileRoute` paths are typed from it, so a new route
     shows type errors until one of those has run.
7. **New shadcn component?** `pnpm --filter web exec shadcn add <name>`. It writes `~/`
   imports (the alias comes from tsconfig `paths`). Don't hand-edit `src/components/ui/`.
8. **Imports**: externals, then `@time-capsule/*`, then `~/...`, then relative. Use relative
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
- Specs read in English (`setup.ts` resets to EN before each test). Where locale formatting,
  plurals or a translated label matter, add a Polish case: `await setLanguage('pl')` **before**
  `renderRoute`.
- A save that lands on the detail page refetches it (its loader runs again), so GET handlers must
  be stateful (`let current = x`; the PATCH handler updates it).
- Exact-body assertions (`toEqual`) need every new contract key (e.g. `category: null`).
- Type Markdown or anything with `[`/`{` with `user.click(field)` + `user.paste(text)`:
  `user.type` reads those as key descriptors.
- Representative cases:
  - list renders
  - delete after confirming
  - client validation blocks the request (`vi.fn()` handler not called)
  - create sends the trimmed/normalised body
  - a server 400 lands on the field
  - edit loads and saves
  - a 404 shows not-found
  - the detail page shows the fields, and deleting there returns to the list
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
- Commit the regenerated `apps/web/src/routeTree.gen.ts`.

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
  `instanceof Error` (or pass it to `toErrorMessage`).
- **`schema.ts` imports runtime values from shared** (enum tuples). drizzle-kit loads it through
  tsx, so `db:generate`/`db:studio` run with `NODE_OPTIONS=--conditions=@time-capsule/source`.
  Without it drizzle-kit reads `packages/shared/dist`: missing → MODULE_NOT_FOUND, stale → a
  migration with the old enum and no error.
- **zod refinements**: `.partial()`, `.pick()`, `.omit()` throw on a refined object, and
  `.extend()` throws when it overwrites a key of one. Export an unrefined `xFieldsSchema` plus the
  refinement and build create/update/form schemas from it. Re-`.extend()`ing a field with a bare
  `z.string()` drops its shared checks: build it from the shared piece.
- **i18n**:
  - Every `zodResolver` gets `{ error: fallbackErrorMap }`, or zod's English defaults reach the UI.
  - `t` on a string that may not be a key: `useTranslateMessage()` (`defaultValue` fallback),
    never a bare `t(message)` (it doesn't type-check, and wouldn't fall back).
  - Never store translated text in RHF state or the Query cache; translate at render.
  - No hook calls inside `.map` (`formatDate(d, useLanguage())` there crashes when the list
    length changes).
  - Locales stay `as const`, or `t` stops requiring `{{params}}` and renders the placeholder.
  - No `.d.ts` for the `CustomTypeOptions` augmentation: `tsconfig.test.json` wouldn't see it.
  - `escapeValue` stays `false` (React escapes); i18next would render `A &amp; B`.
  - An empty value renders blank (`returnEmptyString`); `resources.spec` rejects it.
  - An enum slug ending in `_one`, `_few`, `_many`, `_other`, `_two` or `_zero` would be read as
    a plural form.
  - Don't call `i18n.changeLanguage` while a tree is mounted outside `act`; in specs switch
    through the UI (`user.selectOptions`) or before rendering.
- **Web build order** is `vite build && tsc -b`, because the router plugin must write
  `routeTree.gen.ts` before the type-check.
- **Git**: stage nothing unless the user asks. `git mv` / `git rm --cached` touch the index, so
  use plain `mv` / `rm`.
