# ADR 002: Media storage (S3 API, RustFS in development)

**Status:** Accepted

**Date:** 2026-10-05

## Context and Problem Statement

Milestones and family members show photos. Each photo is stored once in a shared library and
linked to any number of owners: at most 10 per milestone and 100 per family member. We need:

- a place to keep the files, the same API in development and in production;
- an upload path that doesn't stream 20 MB files through the NestJS api;
- photos that stay private (family data), yet load in a plain `<img>` and stay in the browser
  cache;
- a local emulator every developer can run with `docker compose up -d`, with no account or
  licence key.

## Decision

**Storage: the S3 API.** Production targets AWS S3; development runs RustFS. The api talks to S3
only through `StorageService` (`apps/api/src/storage/`), so all code stays plain S3 and the server
can be swapped by changing `compose.yml` and the `S3_*` values in `apps/api/.env`.

**Upload: presigned POST, then a HeadObject confirm.**

1. `POST /media` reserves a slot on the owner (the cap counts uploads in flight) and answers a
   presigned POST: `content-length-range [1, 20 MB]`, `eq $Content-Type`, `Expires` 600 s.
2. The browser sends exactly the presigned `fields`, then `file`, as `multipart/form-data`
   straight to storage (`apps/web/src/lib/upload.ts`, an XHR for upload progress).
3. `POST /media/:id/confirm` runs `HeadObject` and requires the exact declared size and the exact
   allowed type. On a mismatch the api deletes the object and the row. The storage policy is a
   first line of defence; **the confirm verifies the upload at confirm time**, so behaviour
   doesn't depend on how strictly an emulator enforces the policy. It doesn't make the object
   immutable (see Consequences).

**Reading: a private bucket and presigned GETs.** There is no bucket policy and no public read.
Responses carry a presigned GET URL, never the storage key as a field (it appears only inside
the presigned POST's `fields.key` and in URL paths). The signing time is floored to the
hour and the URL is valid for two hours (`ResponseCacheControl: private, max-age=3600`), so every
response within the hour carries the same URL and the browser cache keeps working.

**Scope: images only, originals.** JPEG, PNG, WebP and GIF up to 20 MB. No resizing, thumbnails
or format conversion (the file input's exact `accept` list makes iOS convert HEIC to JPEG).
Videos and other files are out of scope until a feature needs them.

**Development emulator: RustFS 1.0.1** (`rustfs/rustfs:1.0.1`, Apache-2.0), a `storage` service in
`compose.yml` that persists to the named volume `vol-storage-data`. A one-shot `storage-init`
service (`amazon/aws-cli`) creates the bucket and sets its CORS rule; it is idempotent.

## Considered alternatives

- **MinIO** (community edition): rejected. The repository was archived in April 2026 and the
  `minio/minio` and `minio/mc` images are gone from Docker Hub, so there is no maintained image to
  pin.
- **LocalStack**: rejected. Since 2026.03 it needs an auth token on every plan, the free Hobby plan
  is for non-commercial use only, it has no persistence on that plan, and it accepts invalid or
  expired presigned URLs unless told otherwise.
- **Garage** (AGPLv3, small) and **SeaweedFS** (Apache-2.0, `weed mini`): both enforce presigned
  POST conditions and support bucket CORS. They are the fallbacks if RustFS misbehaves: only the
  compose block and `.env` values would change.
- **Uploading through the api** (multipart to NestJS, then to S3): rejected. It doubles the
  traffic, holds 20 MB requests in the api, and needs its own size limits; presigned POST lets
  storage enforce them.

## Non-AWS quirks (RustFS)

- **±15 minutes around `X-Amz-Date`.** RustFS rejects a POST whose signing time is more than
  900 s from its clock, whatever the policy's expiration says. Keep `Expires` at or under 900
  (it is 600). Files upload one at a time, so each POST starts seconds after it was signed.
- **Every form field must be in the policy.** Extra fields (`success_action_status`,
  `x-amz-meta-*`) get 403. The browser sends the SDK fields plus `file` and nothing else.
- **Checksums only when required.** Both S3 clients use
  `requestChecksumCalculation`/`responseChecksumValidation: 'WHEN_REQUIRED'`, so no CRC32
  headers or query parameters reach a server that might refuse them.
- **Host-bound signatures.** A presigned URL only works on the host it was signed for: the api
  signs with a second client on `S3_PUBLIC_ENDPOINT` (what the browser reaches) and talks to
  storage on `S3_ENDPOINT`.

## Security posture

- The storage port is bound to the host's loopback only (`127.0.0.1:9000:9000`), and the RustFS
  console is disabled (`RUSTFS_CONSOLE_ENABLE=false`, port 9001 not published).
- The bucket CORS rule lists exact origins (`http://localhost:5173`, `http://127.0.0.1:5173`)
  with `GET`, `HEAD` and `POST` only; there is no global `RUSTFS_CORS_ALLOWED_ORIGINS`.
- No bucket policy: anonymous reads and writes get 403; every read and upload is presigned.
- The image tags are pinned (`rustfs/rustfs:1.0.1`, `amazon/aws-cli:2.37.9`). The credentials in
  `compose.yml` are dev-only, like the MySQL password.

## Consequences

- RustFS is young (GA September 2026). It is used for development only; the confirm check and
  plain S3 code keep the app independent of its quirks.
- There is no auth yet: anyone who can reach the api can request an upload or read a photo URL.
- Galleries load originals of up to 20 MB; thumbnails would be a later decision.
- An abandoned upload holds a cap slot until the api purges pending uploads older than 24 hours.
- Accepted residual risk: a presigned POST stays reusable until it expires (600 s), and its policy
  allows any size in [1 B, 20 MB]. Whoever holds the fields can upload again after the confirm and
  overwrite the object with a different file of another size or content (the type stays pinned
  by `eq $Content-Type`). The confirm checked the object at confirm time only; the stored
  `size_bytes` may then disagree with the object. Without auth anyone can already add photos, so
  this adds no new capability; it would matter once uploads are tied to users.
- Opening the web app on an origin missing from the bucket CORS rule breaks uploads (images
  still load: a plain `<img>` needs no CORS): add the origin to `storage-init` and run
  `docker compose up storage-init` again.
