import { useEffect, useState } from "react";
import { getAddress, type Address, type EIP1193Provider } from "viem";
import type { Runtime } from "./config";
import { errorText } from "./domain";
export type Provider = EIP1193Provider & {
  on?: (event: string, handler: (data: any) => void) => void;
  removeListener?: (event: string, handler: (data: any) => void) => void;
};
declare global {
  interface Window {
    ethereum?: Provider;
  }
}
type WalletOption = { id: string; name: string; provider: Provider };
export async function switchNetwork(provider: Provider, r: Runtime) {
  const chainId = `0x${r.deployment.chainId.toString(16)}`;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
  } catch (error) {
    const e = error as {
      code?: number;
      message?: string;
      data?: { originalError?: { code?: number } };
    };
    if (
      e.code !== 4902 &&
      e.data?.originalError?.code !== 4902 &&
      !/unknown chain|unrecognized chain|chain.*not.*added/i.test(
        e.message ?? "",
      )
    )
      throw error;
    if (!r.deployment.walletAddChain)
      throw Error(
        "This wallet does not know the network and no add-chain configuration is available.",
      );
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [r.deployment.walletAddChain],
    });
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
  }
}
export function useWallet(r: Runtime) {
  const [options, setOptions] = useState<WalletOption[]>([]);
  const [selected, setSelected] = useState("");
  const [provider, setProvider] = useState<Provider>();
  const [account, setAccount] = useState<Address>();
  const [chainId, setChainId] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const discover = (event: Event) => {
      const d = (
        event as CustomEvent<{
          info: { uuid: string; name: string };
          provider: Provider;
        }>
      ).detail;
      if (d?.provider && d.info)
        setOptions((prev) =>
          prev.some((x) => x.provider === d.provider)
            ? prev
            : [
                ...prev,
                { id: d.info.uuid, name: d.info.name, provider: d.provider },
              ],
        );
    };
    window.addEventListener("eip6963:announceProvider", discover);
    if (window.ethereum)
      setOptions([
        { id: "injected", name: "Browser wallet", provider: window.ethereum },
      ]);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () =>
      window.removeEventListener("eip6963:announceProvider", discover);
  }, []);
  useEffect(() => {
    if (!provider) return;
    const accounts = (value: string[]) => {
      setAccount(value[0] ? getAddress(value[0]) : undefined);
      setError("");
    };
    const chain = (value: string) => {
      setChainId(Number(value));
      setError("");
    };
    const disconnect = () => {
      setAccount(undefined);
      setChainId(undefined);
    };
    provider.on?.("accountsChanged", accounts);
    provider.on?.("chainChanged", chain);
    provider.on?.("disconnect", disconnect);
    return () => {
      provider.removeListener?.("accountsChanged", accounts);
      provider.removeListener?.("chainChanged", chain);
      provider.removeListener?.("disconnect", disconnect);
    };
  }, [provider]);
  const connect = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const choice = options.find((o) => o.id === selected) ?? options[0];
      if (!choice)
        throw Error(
          "No browser wallet found. Install an Ethereum browser wallet, then reload this page.",
        );
      setProvider(choice.provider);
      const accounts = await choice.provider.request({
        method: "eth_requestAccounts",
      });
      if (!accounts[0])
        throw Error(
          "No wallet account was shared. Open your wallet and try again.",
        );
      setAccount(getAddress(accounts[0]));
      setChainId(
        Number(await choice.provider.request({ method: "eth_chainId" })),
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const switchChain = async () => {
    if (!provider || busy) return;
    setBusy(true);
    setError("");
    try {
      await switchNetwork(provider, r);
      setChainId(Number(await provider.request({ method: "eth_chainId" })));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return {
    options,
    selected,
    setSelected,
    provider,
    account,
    chainId,
    busy,
    error,
    connect,
    switchChain,
    disconnect: () => {
      setAccount(undefined);
      setProvider(undefined);
      setChainId(undefined);
    },
    correctChain: chainId === r.deployment.chainId,
  };
}
export type Wallet = ReturnType<typeof useWallet>;
