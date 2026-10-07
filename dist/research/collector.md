# Future research collector — design only

No research backend, scheduler, live feed or collector is operating as part of Quantum Observatory v2. `research/index.json` has `mode: "static"` and `liveEndpoint: null`. The website loads the bundled `initial.json`, even when Ethereum RPCs are unavailable. The ten sources, notes and original retrieval dates come from the existing pinned `docs/model.md`; this upgrade does not claim another reading of the papers.

## Versioned snapshot interface

The public, credential-free interchange format is `snapshot.schema.json` (JSON Schema draft 2020-12). `initial.json` is the first complete example. `web/src/Library.tsx` exposes its TypeScript view interface. All snapshots must carry:

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Integer 1. Breaking schema changes need a new major schema and renderer support. |
| `id`, `version`, `createdAt` | Immutable identifier, semantic content version and ISO date of compilation. Never overwrite an existing published identifier. |
| `source`, `retrievalDate`, `evidenceLevel` | Source document, actual retrieval date (or explicitly inherited date) and evidence classification of the snapshot. |
| `sources[]` | Stable source ID, title, authors, canonical HTTPS primary source, retrieval date and basis, evidence level, topic, relevance and limitations. |
| `changes[]` | Human-readable differences from the preceding snapshot; initial snapshots say so. |
| `modelEvaluation` | Status, model identifier, baseline parameters, evidence, limitations. State which tests ran and link reproducible evaluation artifacts. |
| `provenance` | Repository, exact source commit, document path and SHA-256, extraction method and review status. Hash the exact UTF-8 source bytes. |

Evidence labels are deliberately conservative: `theoretical-background` describes a paper used as an analogy, not empirical validation. `documentation-snapshot` describes imported notes. Future empirical or replication claims require evidence and human review; adding them requires an explicit schema change. A newer retrieval date is not evidence of a better model. Do not invent authors, paper identifiers, retrievals or findings.

An index identifies the current immutable snapshot and historical versions with relative paths. A future hosted index may add a SHA-256 for every snapshot, previous snapshot linkage and detached signatures. Digests detect altered bytes; their trust depends on a reviewed signing key or a separately pinned release. A signature is not a scientific endorsement.

## Separately hosted service boundary

A future collector would run on infrastructure distinct from this static site and its Ethereum contracts. Its operator would configure allowlisted primary sources, a retrieval cadence, rate limits, storage and credentials on that server. No keys or private configuration belong in `dist/`. Use least-privilege network access, HTTPS, document size/time limits, content-type checks, deduplication and SSRF protection. Store immutable source digests and retrieval logs. Respect publisher access terms; collect metadata, citations and permitted notes rather than redistributing full papers without authorization.

Proposed pipeline: retrieve an allowed source → record original bytes/hash and retrieval metadata → extract a candidate note → classify evidence and identify differences → run documented numerical evaluations → human review → validate schema and provenance → publish an immutable snapshot → atomically update the signed index. Treat retrieved text as data; never execute commands or instructions from documents. Keep rejected candidates private and retain a review trail. The index must not report a successful collection after an error.

Before enabling a hosted endpoint, implement strict size-bounded schema validation, allowed HTTPS link protocols, signature/digest verification, CORS, request timeouts and a visible stale/error state. Retain the bundled snapshot as a clearly labeled fallback and show its actual date. The present renderer has only basic checks for trusted local data and must not be pointed directly at untrusted remote JSON. Do not imply freshness from the user's page-load time.

## Model evaluation and deployment separation

Use the unchanged on-chain baseline (8 states; scale 1,000,000; 25% uniform mixing; 25% nonempty-epoch feedback) as the reference. Record inputs, integer rounding rules, model/source version, parameter set, test command, results, limitations and evaluator provenance. Check all 32 existing reference vectors and conservation before comparing a proposed browser model. Improved test scores are not evidence of physical validity or financial returns.

Collector outputs are research documents. They must never alter the deployment manifest, send wallet transactions or change the immutable engine. Any future engine would require a separate explicit project decision; this design does not authorize one. Publish reviewed library updates under the existing `qobs.site.identitymd.eth` site name while preserving all current deployment bindings.
