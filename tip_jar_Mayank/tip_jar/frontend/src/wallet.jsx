import React, { useState, useEffect } from "react";

export default function Wallet({ setWallet }) {
  const [connected, setConnected] = useState(false);
  const [pubkey, setPubkey] = useState(null);

  useEffect(() => {
    const sol = window.solana;
    if (sol && sol.isPhantom) {
      sol.on("connect", () => {
        setConnected(true);
        setPubkey(sol.publicKey.toBase58());
        setWallet(sol.publicKey);
      });
      sol.on("disconnect", () => {
        setConnected(false);
        setPubkey(null);
        setWallet(null);
      });
    }
  }, [setWallet]);

  const connect = async () => {
    try {
      const resp = await window.solana.connect();
      setConnected(true);
      setPubkey(resp.publicKey.toBase58());
      setWallet(resp.publicKey);
    } catch (err) {
      console.error(err);
    }
  };

  const disconnect = async () => {
    await window.solana.disconnect();
  };

  return (
    <div>
      {connected ? (
        <div>
          <p>Wallet: {pubkey}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <button onClick={connect}>Connect Phantom</button>
      )}
    </div>
  );
}
