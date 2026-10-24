import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider } from "ethers";
import { ADMIN_ROLE, UPLOADER_ROLE, getFileStorage, getReadProvider } from "../lib/contract";
import { describeError } from "../lib/errors";

const NO_ROLES = { isAdmin: false, isUploader: false };

export function useWallet() {
  const hasWallet = typeof window !== "undefined" && Boolean(window.ethereum);

  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [roles, setRoles] = useState(NO_ROLES);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const readContract = useMemo(() => getFileStorage(getReadProvider()), []);
  const writeContract = useMemo(() => (signer ? getFileStorage(signer) : null), [signer]);

  const loadRoles = useCallback(
    async (address) => {
      if (!address || !readContract) {
        setRoles(NO_ROLES);
        return;
      }
      try {
        const [isAdmin, isUploader] = await Promise.all([
          readContract.hasRole(ADMIN_ROLE, address),
          readContract.hasRole(UPLOADER_ROLE, address),
        ]);
        setRoles({ isAdmin, isUploader });
        setError("");
      } catch (err) {
        setRoles(NO_ROLES);
        setError(describeError(err));
      }
    },
    [readContract],
  );

  const refreshRoles = useCallback(() => loadRoles(account), [account, loadRoles]);

  const syncAccount = useCallback(
    async (address) => {
      if (!address) {
        setAccount(null);
        setSigner(null);
        setRoles(NO_ROLES);
        return;
      }
      const provider = new BrowserProvider(window.ethereum);
      setSigner(await provider.getSigner(address));
      setAccount(address);
      await loadRoles(address);
    },
    [loadRoles],
  );

  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;

    ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => syncAccount(accounts[0]))
      .catch((err) => setError(describeError(err)));

    const handleAccountsChanged = (accounts) => syncAccount(accounts[0]);
    const handleChainChanged = () => window.location.reload();

    ethereum.on?.("accountsChanged", handleAccountsChanged);
    ethereum.on?.("chainChanged", handleChainChanged);
    return () => {
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [syncAccount]);

  const connect = useCallback(async () => {
    if (!window.ethereum) return;
    setConnecting(true);
    setError("");
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      await syncAccount(accounts[0]);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setConnecting(false);
    }
  }, [syncAccount]);

  return {
    hasWallet,
    account,
    roles,
    connecting,
    error,
    connect,
    refreshRoles,
    readContract,
    writeContract,
  };
}
