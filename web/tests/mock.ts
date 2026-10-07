import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  decodeFunctionData,
  encodeFunctionResult,
  encodeErrorResult,
  toHex,
  type Abi,
} from "viem";
import { quoterAbi, permitAbi, routerAbi, stateViewAbi } from "../src/protocol";
const manifest = JSON.parse(
  readFileSync("../dist/imd-deployment.json", "utf8"),
);
const abi = (name: string): Abi =>
  JSON.parse(readFileSync(`../dist/abi/${name}.json`, "utf8"));
export const tokenAbi = abi("LaunchToken"),
  engineAbi = abi("QuantumEngine");
export const account = "0x1111111111111111111111111111111111111111";
export const secondAccount = "0x2222222222222222222222222222222222222222";
const blockHash = "0x" + "aa".repeat(32),
  txHash = "0x" + "bb".repeat(32);
export async function setup(
  page: Page,
  options: { wallet?: boolean; wrongChain?: boolean; noCode?: boolean } = {},
) {
  const now = Math.floor(Date.now() / 1000);
  const model = {
    epoch: 1n,
    start: BigInt(now - 100),
    end: BigInt(now + 3500),
    now: BigInt(now),
    count: 0,
    observed: false,
    balance: 10n ** 21n,
    allowance: 0n,
    permit: 0n,
    expiration: 0,
    failRead: false,
    revertObserve: false,
    rejectReceipt: false,
    swapRevert: false,
    emptyPool: false,
    noCode: !!options.noCode,
    txs: [] as any[],
    calls: [] as any[],
    sendCount: 0,
  };
  const token = manifest.contracts
      .find((x: any) => x.name === "LaunchToken")
      .address.toLowerCase(),
    engine = manifest.contracts
      .find((x: any) => x.name === "QuantumEngine")
      .address.toLowerCase();
  const u = manifest.network.uniswapV4;
  const block = () => ({
    number: "0x100",
    hash: blockHash,
    parentHash: blockHash,
    timestamp: toHex(model.now),
    nonce: "0x0000000000000000",
    difficulty: "0x0",
    totalDifficulty: "0x0",
    gasLimit: "0x1c9c380",
    gasUsed: "0x10000",
    baseFeePerGas: "0x3b9aca00",
    extraData: "0x",
    size: "0x100",
    miner: account,
    transactions: [],
    uncles: [],
    logsBloom: "0x" + "00".repeat(256),
    sha3Uncles: blockHash,
    stateRoot: blockHash,
    transactionsRoot: blockHash,
    receiptsRoot: blockHash,
    mixHash: blockHash,
  });
  const rpc = async (req: any): Promise<any> => {
    model.calls.push(req);
    const { method, params = [] } = req;
    if (model.failRead)
      return {
        jsonrpc: "2.0",
        id: req.id,
        error: { code: -32000, message: "Mock RPC unavailable" },
      };
    let result: any;
    switch (method) {
      case "eth_chainId":
        result = "0x1";
        break;
      case "eth_blockNumber":
        result = "0x100";
        break;
      case "eth_getCode":
        result = model.noCode ? "0x" : "0x60016000";
        break;
      case "eth_getBlockByNumber":
        result = block();
        break;
      case "eth_getBalance":
        result = toHex(10n ** 20n);
        break;
      case "eth_estimateGas":
        result = "0x186a0";
        break;
      case "eth_gasPrice":
        result = "0x3b9aca00";
        break;
      case "eth_getTransactionReceipt":
        result = model.rejectReceipt
          ? null
          : {
              transactionHash: txHash,
              transactionIndex: "0x0",
              blockHash,
              blockNumber: "0x100",
              from: account,
              to: engine,
              cumulativeGasUsed: "0x186a0",
              gasUsed: "0x186a0",
              effectiveGasPrice: "0x3b9aca00",
              contractAddress: null,
              logs: [],
              logsBloom: "0x" + "00".repeat(256),
              status: "0x1",
              type: "0x2",
            };
        break;
      case "eth_sendTransaction": {
        model.txs.push(params[0]);
        model.sendCount++;
        const to = params[0].to.toLowerCase();
        if (to === engine) {
          const fn = decodeFunctionData({
            abi: engineAbi,
            data: params[0].data,
          });
          if (fn.functionName === "observe") {
            model.observed = true;
            model.count++;
          } else {
            model.epoch++;
            model.observed = false;
            model.count = 0;
            model.start = model.now;
            model.end = model.now + 3600n;
          }
        }
        if (to === token) {
          const fn = decodeFunctionData({
            abi: tokenAbi,
            data: params[0].data,
          });
          if (fn.functionName === "approve")
            model.allowance = fn.args![1] as bigint;
        }
        if (to === u.permit2.toLowerCase()) {
          const fn = decodeFunctionData({
            abi: permitAbi,
            data: params[0].data,
          });
          model.permit = fn.args![2] as bigint;
          model.expiration = fn.args![3] as number;
        }
        result = txHash;
        break;
      }
      case "eth_call": {
        const to = params[0].to.toLowerCase();
        const interfaceAbi =
          to === engine
            ? engineAbi
            : to === token
              ? tokenAbi
              : to === u.quoter.toLowerCase()
                ? quoterAbi
                : to === u.permit2.toLowerCase()
                  ? permitAbi
                  : to === u.stateView.toLowerCase()
                    ? stateViewAbi
                    : routerAbi;
        const fn = decodeFunctionData({
          abi: interfaceAbi,
          data: params[0].data,
        });
        const name = fn.functionName;
        if (
          (name === "observe" && model.revertObserve) ||
          (name === "execute" && model.swapRevert)
        )
          return {
            jsonrpc: "2.0",
            id: req.id,
            error: {
              code: 3,
              message: "execution reverted",
              data:
                name === "observe"
                  ? encodeErrorResult({
                      abi: engineAbi,
                      errorName: "AlreadyObserved",
                    })
                  : encodeErrorResult({
                      abi: routerAbi,
                      errorName: "TransactionDeadlinePassed",
                    }),
            },
          };
        const values: Record<string, unknown> = {
          token,
          epoch: model.epoch,
          epochStartedAt: model.start,
          epochEndsAt: model.end,
          observationCount: model.count,
          MAX_OBSERVATIONS: 1024,
          SCALE: 1000000n,
          MIN_BALANCE: 10n ** 18n,
          getProbabilities: Array(8).fill(125000),
          getObservationCounts: [model.count, 0, 0, 0, 0, 0, 0, 0],
          hasObserved: model.observed,
          balanceOf: model.balance,
          symbol: "QOBS",
          decimals: 18,
          totalSupply: 10n ** 27n,
          allowance:
            to === token
              ? model.allowance
              : [model.permit, model.expiration, 0],
          quoteExactInputSingle: [20n * 10n ** 18n, 150000n],
          getSlot0: [2n ** 96n, 0, 0, 12500],
          getLiquidity: model.emptyPool ? 0n : 1000n,
          approve: to === token ? true : undefined,
          transfer: true,
          transferFrom: true,
          observe: undefined,
          advanceEpoch: undefined,
          execute: undefined,
        };
        if (!(name in values)) throw Error(`Missing mock: ${name}`);
        result = encodeFunctionResult({
          abi: interfaceAbi,
          functionName: name,
          result: values[name],
        });
        break;
      }
      default:
        throw Error(`Unexpected RPC ${method}`);
    }
    return { jsonrpc: "2.0", id: req.id, result };
  };
  const handler = async (route: any) => {
    try {
      const req = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          Array.isArray(req) ? await Promise.all(req.map(rpc)) : await rpc(req),
        ),
      });
    } catch (e) {
      await route.fulfill({ status: 500, body: String(e) });
    }
  };
  for (const url of manifest.network.rpcUrls) await page.route(url, handler);
  await page.route("**/__mock-wallet", handler);
  if (options.wallet !== false)
    await page.addInitScript(
      ({ account, wrongChain }) => {
        const handlers: Record<string, ((arg: any) => void)[]> = {};
        const state = {
          chain: wrongChain ? "0x2" : "0x1",
          account,
          reject: false,
          unknownChain: false,
          added: false,
          switches: 0,
          methods: [] as string[],
        };
        (window as any).mockWallet = state;
        (window as any).emitWallet = (event: string, value: any) => {
          if (event === "accountsChanged") state.account = value[0];
          if (event === "chainChanged") state.chain = value;
          for (const fn of handlers[event] ?? []) fn(value);
        };
        (window as any).ethereum = {
          on: (event: string, fn: any) => {
            (handlers[event] ??= []).push(fn);
          },
          removeListener: (event: string, fn: any) => {
            handlers[event] = handlers[event]?.filter((x) => x !== fn);
          },
          request: async ({ method, params }: any) => {
            state.methods.push(method);
            if (
              (method === "eth_requestAccounts" ||
                method === "eth_sendTransaction") &&
              state.reject
            )
              throw Object.assign(Error("User rejected the request."), {
                code: 4001,
              });
            if (method === "eth_requestAccounts" || method === "eth_accounts")
              return state.account ? [state.account] : [];
            if (method === "eth_chainId") return state.chain;
            if (method === "wallet_switchEthereumChain") {
              state.switches++;
              if (state.unknownChain && !state.added)
                throw Object.assign(Error("Unknown chain"), { code: 4902 });
              state.chain = params[0].chainId;
              (window as any).emitWallet("chainChanged", state.chain);
              return null;
            }
            if (method === "wallet_addEthereumChain") {
              state.added = true;
              (window as any).addedChain = params[0];
              return null;
            }
            const r = await fetch("/__mock-wallet", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jsonrpc: "2.0", id: 10, method, params }),
            });
            const data = await r.json();
            if (data.error) throw data.error;
            return data.result;
          },
        };
      },
      { account, wrongChain: options.wrongChain },
    );
  return model;
}
export async function open(page: Page) {
  await page.goto("./");
  await page.getByText("Live on Ethereum", { exact: true }).waitFor();
}
export async function connect(page: Page, waitForSnapshot = true) {
  await page.getByRole("button", { name: "Connect wallet" }).first().click();
  await page.getByRole("button", { name: "Disconnect", exact: true }).waitFor();
  if (waitForSnapshot) await page.locator(".wallet-balances").waitFor();
}
