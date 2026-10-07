import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { experiment, transition, UNIFORM, SCALE } from "../src/model";

test("browser baseline matches all 32 existing Solidity reference vectors", () => {
  const vectors = readFileSync("../test/QuantumVectors.t.sol", "utf8");
  const cases = [
    ...vectors.matchAll(
      /memory p = \[([^\]]+)\];\s*uint16\[8\] memory counts = \[([^\]]+)\];\s*uint32\[8\] memory expected = \[([^\]]+)\]/g,
    ),
  ];
  const parse = (s: string) =>
    s
      .replace(/uint(?:16|32)\((\d+)\)/g, "$1")
      .split(",")
      .map(Number);
  assert.equal(cases.length, 32);
  for (const [i, c] of cases.entries())
    assert.deepEqual(
      transition(parse(c[1]), parse(c[2])),
      parse(c[3]),
      `vector ${i}`,
    );
});
test("experimental parameter extremes conserve mass through repeated transitions", () => {
  for (const noise of [0, 1, 25, 50, 99, 100])
    for (const feedback of [0, 25, 100]) {
      for (const counts of [
        Array<number>(8).fill(0),
        [0, 0, 0, 0, 0, 0, 0, 1024],
        Array<number>(8).fill(128),
      ]) {
        const { baseline, candidate, distance } = experiment(
          UNIFORM,
          counts,
          noise,
          feedback,
          12,
        );
        for (const result of [baseline, candidate]) {
          assert.equal(
            result.reduce((a, b) => a + b, 0),
            SCALE,
          );
          assert(
            result.every(
              (x) => Number.isSafeInteger(x) && x >= 0 && x <= SCALE,
            ),
          );
        }
        assert(distance >= 0 && distance <= 1);
      }
    }
  assert.deepEqual(
    transition(UNIFORM, [0, 0, 0, 0, 0, 0, 0, 0], 100, 0),
    UNIFORM,
  );
  assert.deepEqual(transition(UNIFORM, [0, 0, 0, 0, 0, 0, 0, 1], 25, 100), [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    SCALE,
  ]);
  assert.equal(
    experiment(UNIFORM, [0, 0, 0, 0, 0, 0, 0, 1], 25, 25, 12).distance,
    0,
  );
});
test("invalid experiments reject malformed mass, counts and parameters", () => {
  for (const n of [-1, 101, 1.5, NaN])
    assert.throws(() => transition(UNIFORM, Array(8).fill(0), n));
  assert.throws(() => transition([1], []));
  assert.throws(() => transition(UNIFORM, Array(8).fill(1024)));
  assert.throws(() => experiment(UNIFORM, Array(8).fill(0), 25, 25, 0));
});
test("initial snapshot preserves all documented primary sources and exact document provenance", () => {
  const snapshot = JSON.parse(
    readFileSync("public/research/initial.json", "utf8"),
  );
  const doc = readFileSync("../docs/model.md");
  assert.equal(
    snapshot.provenance.documentSha256,
    createHash("sha256").update(doc).digest("hex"),
  );
  const links = [
    ...doc.toString().matchAll(/\[Full text\]\((https:\/\/[^)]+)\)/g),
  ].map((m) => m[1]);
  assert.equal(snapshot.sources.length, 10);
  assert.deepEqual(
    snapshot.sources.map((s: { url: string }) => s.url),
    links,
  );
  assert.equal(
    new Set(snapshot.sources.map((s: { id: string }) => s.id)).size,
    10,
  );
  assert.equal(
    JSON.parse(readFileSync("public/research/index.json", "utf8")).liveEndpoint,
    null,
  );
});
