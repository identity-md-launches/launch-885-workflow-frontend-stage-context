import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAmount, observationReason } from "../src/domain";
import {
  approvalStep,
  minimumOutput,
  swapPayload,
  poolTuple,
} from "../src/protocol";
import { decodeAbiParameters, parseAbiParameters, zeroAddress } from "viem";
import { canonical, localPath, type PoolKey } from "../src/config";
const pool: PoolKey = {
  currency0: zeroAddress,
  currency1: "0x2222222222222222222222222222222222222222",
  fee: 12500,
  tickSpacing: 60,
  hooks: "0x3333333333333333333333333333333333333333",
};
test("amount parsing rejects precision loss, exponents, negatives, NaN and uint overflow", () => {
  assert.equal(parseAmount("0.000001", 6), 1n);
  for (const text of ["0.0000001", "1e2", "-1", "NaN", "1.2.3", "0", ""])
    assert.throws(() => parseAmount(text, 6));
  assert.throws(() => parseAmount((2n ** 256n).toString(), 0));
  assert.equal(parseAmount("0", 18, true), 0n);
});
test("slippage is bounded and rounds down exactly", () => {
  assert.equal(minimumOutput(1001n, 50), 995n);
  assert.equal(minimumOutput(10000n, Number(parseAmount("0.29", 2))), 9971n);
  for (const bps of [-1, 0, 501, 1.5, NaN])
    assert.throws(() => minimumOutput(1000n, bps));
});
test("all eligibility boundaries are explicit", () => {
  const s = {
    balance: 10n ** 18n,
    minBalance: 10n ** 18n,
    observed: false,
    count: 0,
    max: 1024,
    timestamp: 1n,
    end: 2n,
  };
  assert.equal(observationReason(s), "");
  assert.match(observationReason({ ...s, balance: 0n }), /Hold/);
  assert.match(observationReason({ ...s, count: 1024 }), /full/);
  assert.match(observationReason({ ...s, observed: true }), /recorded/);
  assert.match(observationReason({ ...s, timestamp: 2n }), /ended/);
});
test("approval steps use allowances and expiration, native ETH skips both", () => {
  assert.equal(approvalStep(zeroAddress, 100n, 0n, 0n, 0, 100), "swap");
  assert.equal(approvalStep(pool.currency1, 100n, 99n, 0n, 0, 100), "token");
  assert.equal(
    approvalStep(pool.currency1, 100n, 100n, 100n, 219, 100),
    "permit",
  );
  assert.equal(
    approvalStep(pool.currency1, 100n, 100n, 100n, 220, 100),
    "swap",
  );
});
test("five and six field router variants preserve exact pool and settlement", () => {
  for (const extended of [false, true]) {
    const p = swapPayload(pool, pool.currency1, 100n, 90n, 2000n, extended);
    assert.equal(p.value, 0n);
    assert.equal(p.args[0], "0x10");
    const [actions, params] = decodeAbiParameters(
      parseAbiParameters("bytes,bytes[]"),
      p.args[1][0],
    );
    assert.equal(actions, "0x060c0f");
    const types = `(${poolTuple} poolKey,bool zeroForOne,uint128 amountIn,uint128 amountOutMinimum,${extended ? "uint256 minHopPriceX36," : ""}bytes hookData)`;
    const [decoded] = decodeAbiParameters(parseAbiParameters(types), params[0]);
    assert.deepEqual((decoded as any).poolKey, pool);
    assert.equal((decoded as any).zeroForOne, false);
    assert.deepEqual(
      decodeAbiParameters(parseAbiParameters("address,uint256"), params[1]),
      [pool.currency1, 100n],
    );
    assert.deepEqual(
      decodeAbiParameters(parseAbiParameters("address,uint256"), params[2]),
      [zeroAddress, 90n],
    );
  }
  assert.equal(swapPayload(pool, zeroAddress, 100n, 90n, 2000n).value, 100n);
});
test("canonical hashing is stable and relative asset paths reject escapes", () => {
  assert.equal(
    canonical({ b: 1, a: [{ d: 2, c: 3 }] }),
    '{"a":[{"c":3,"d":2}],"b":1}',
  );
  assert.equal(localPath("abi/Contract.json"), true);
  for (const p of ["../x", "/x", "https://example.org", "x\\y"])
    assert.equal(localPath(p), false);
});
