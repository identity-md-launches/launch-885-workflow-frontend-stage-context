import {
  encodeAbiParameters,
  parseAbi,
  parseAbiParameters,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import type { PoolKey, Runtime } from "./config";
// Standard protocol interfaces. Application ABIs are fetched only from the attested export.
export const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
]);
export const permitAbi = parseAbi([
  "function allowance(address owner,address token,address spender) view returns (uint160 amount,uint48 expiration,uint48 nonce)",
  "function approve(address token,address spender,uint160 amount,uint48 expiration)",
]);
export const quoterAbi = parseAbi([
  "function quoteExactInputSingle(((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData) params) returns (uint256 amountOut,uint256 gasEstimate)",
]);
export const routerAbi = parseAbi([
  "function execute(bytes commands,bytes[] inputs,uint256 deadline) payable",
  "error ExecutionFailed(uint256 commandIndex,bytes message)",
  "error TransactionDeadlinePassed()",
]);
export const stateViewAbi = parseAbi([
  "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96,int24 tick,uint24 protocolFee,uint24 lpFee)",
  "function getLiquidity(bytes32 poolId) view returns (uint128 liquidity)",
]);
export const poolTuple =
  "(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks)";
export function swapPayload(
  poolKey: PoolKey,
  input: Address,
  amountIn: bigint,
  minOut: bigint,
  deadline: bigint,
  extended = false,
) {
  if (
    amountIn <= 0n ||
    amountIn > 2n ** 128n - 1n ||
    minOut <= 0n ||
    minOut > 2n ** 128n - 1n
  )
    throw Error("Swap amount is outside the supported range.");
  const zeroForOne = input.toLowerCase() === poolKey.currency0.toLowerCase();
  if (!zeroForOne && input.toLowerCase() !== poolKey.currency1.toLowerCase())
    throw Error("Input is not in the attested pool.");
  const output = zeroForOne ? poolKey.currency1 : poolKey.currency0;
  const single = extended
    ? encodeAbiParameters(
        parseAbiParameters(
          `(${poolTuple} poolKey,bool zeroForOne,uint128 amountIn,uint128 amountOutMinimum,uint256 minHopPriceX36,bytes hookData)`,
        ),
        [
          {
            poolKey,
            zeroForOne,
            amountIn,
            amountOutMinimum: minOut,
            minHopPriceX36: 0n,
            hookData: "0x",
          },
        ],
      )
    : encodeAbiParameters(
        parseAbiParameters(
          `(${poolTuple} poolKey,bool zeroForOne,uint128 amountIn,uint128 amountOutMinimum,bytes hookData)`,
        ),
        [
          {
            poolKey,
            zeroForOne,
            amountIn,
            amountOutMinimum: minOut,
            hookData: "0x",
          },
        ],
      );
  const params = [
    single,
    encodeAbiParameters(parseAbiParameters("address,uint256"), [
      input,
      amountIn,
    ]),
    encodeAbiParameters(parseAbiParameters("address,uint256"), [
      output,
      minOut,
    ]),
  ];
  return {
    args: [
      "0x10" as Hex,
      [
        encodeAbiParameters(parseAbiParameters("bytes,bytes[]"), [
          "0x060c0f",
          params,
        ]),
      ],
      deadline,
    ] as const,
    value: input === zeroAddress ? amountIn : 0n,
  };
}
export function minimumOutput(quoted: bigint, bps: number) {
  if (!Number.isInteger(bps) || bps < 10 || bps > 500)
    throw Error("Use slippage between 0.1% and 5%.");
  return (quoted * BigInt(10000 - bps)) / 10000n;
}
export function pairedCurrency(r: Runtime) {
  const token = r.deployment.contracts
    .find((c) => c.name === "LaunchToken")!
    .address.toLowerCase();
  const p = r.deployment.poolKey;
  return p.currency0.toLowerCase() === token ? p.currency1 : p.currency0;
}
export function approvalStep(
  input: Address,
  amount: bigint,
  tokenAllowance: bigint,
  permitAmount: bigint,
  expiration: number,
  now: number,
) {
  if (input === zeroAddress) return "swap";
  if (tokenAllowance < amount) return "token";
  if (permitAmount < amount || expiration < now + 120) return "permit";
  return "swap";
}
