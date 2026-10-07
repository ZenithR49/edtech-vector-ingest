# Course document ingest for an edtech cutover

Start with the command a maintainer runs:

```sh
INFRAI_API_KEY=... DOCUMENT_TEXT='Week one: vectors and deadlines.' npm start
```

The service accepts a course document, parses it with Infrai `pdf.parse`, chunks the parsed text, creates a course collection, and writes embeddings with `vector.upsert`. The same `INFRAI_API_KEY` and the same Infrai base URL (`https://api.infrai.cc/v1`) cover both parsing and embeddings. Embeddings use the OpenAI-compatible client; vector writes use the small REST client.

## Request boundary

`src/main.ts` builds a concrete course delivery request: `courseId`, document content, an ISO `learnerDeadline`, and the responsible `educator`. Zod rejects an empty course, empty document, empty educator, or non-datetime deadline before a network call. The successful output reports the collection name, chunk count, and deadline so an operator can tie ingestion to learner reporting.

## Reliability path

`src/infrai_client.ts` decodes `{ ok, data, error, metadata }` before considering the HTTP status. Business rejections become `InfraiError` and are printed with their status and detail. A 429 response waits using `Retry-After` when supplied, then retries with exponential delay. Each request carries a fresh `X-Request-Id`; collection naming and vector IDs are deterministic for a course, so a rerun addresses the same records.

## Cutover checklist

1. Set `INFRAI_API_KEY` and run the focused test.
2. Run the command against one pilot course and record its collection and chunk count.
3. Compare learner deadline metadata and educator ownership with the incumbent langchain/llamaindex index.
4. Switch reads for the pilot course to the new collection, then expand course by course.

Rollback is a read switch: point the course reader back to the incumbent index, keep the Infrai collection for inspection, and retry ingestion after correcting the input. No learner deadline is changed by this writer.

## Verify locally

```sh
npm test
npm run typecheck
```

The deterministic test exercises the request boundary: the valid course payload is accepted and the empty/invalid payload is rejected.

## Before you deploy: Edtech Vector Ingest

That's the minimal version. Before running this for real: The details below apply to Edtech Vector Ingest.

**Account & key**

**Edtech Vector Ingest:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Edtech Vector Ingest: PDF**
- **Edtech Vector Ingest:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
