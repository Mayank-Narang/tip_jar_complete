import React, { useState, useEffect } from "react";
import Wallet from "./wallet";
import { getProgram } from "./utils/anchorClient";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";

function u64Array(num) {
  return new anchor.BN(num).toArray("le", 8);
}

export default function App() {
  const [wallet, setWallet] = useState(null);
  const [myJarAddress, setMyJarAddress] = useState(""); // ✅ User's own jar
  const [tipJarAddress, setTipJarAddress] = useState(""); // ✅ Jar address to tip
  const [status, setStatus] = useState("");
  const [tipAmount, setTipAmount] = useState("0.1");
  const [myJarExists, setMyJarExists] = useState(false);

  // Check if user's own jar exists
  const checkMyJarStatus = async (walletPubkey) => {
    if (!walletPubkey) return;
    
    try {
      const program = getProgram();
      const [jarPda] = deriveJarPda(walletPubkey);
      
      const jarAccount = await program.account.jar.fetch(jarPda);
      setMyJarAddress(jarPda.toBase58()); // ✅ Set user's own jar address
      setMyJarExists(true);
      
    } catch (err) {
      setMyJarExists(false);
      setMyJarAddress("");
    }
  };

  useEffect(() => {
    if (wallet) {
      checkMyJarStatus(wallet);
    } else {
      setMyJarAddress("");
      setMyJarExists(false);
    }
  }, [wallet]);

  const deriveJarPda = (creator) =>
    PublicKey.findProgramAddressSync(
      [new TextEncoder().encode("jar"), creator.toBuffer()],
      getProgram().programId
    );

  const deriveTipPda = (jar, sessionId, tipCount) =>
    PublicKey.findProgramAddressSync(
      [
        new TextEncoder().encode("tip"),
        jar.toBuffer(),
        Uint8Array.from(u64Array(sessionId)),
        Uint8Array.from(u64Array(tipCount)),
      ],
      getProgram().programId
    );

  const initializeJar = async () => {
    if (!wallet) {
      setStatus("Please connect wallet first");
      return;
    }

    try {
      const program = getProgram();
      const [jarPda] = deriveJarPda(wallet);

      setStatus("Initializing jar...");
      
      const provider = program.provider;
      const providerWallet = provider.wallet;
      
      await program.methods
        .initializeJar()
        .accounts({
          jar: jarPda,
          creator: providerWallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setMyJarAddress(jarPda.toBase58()); // ✅ Set user's jar address
      setMyJarExists(true);
      setStatus("✅ Jar initialized successfully!");
    } catch (err) {
      console.error(err);
      setStatus("❌ Init failed: " + err.message);
    }
  };

  const sendTip = async () => {
    if (!wallet || !tipJarAddress) { // ✅ Check tip jar address
      setStatus("Please connect wallet and enter jar address to tip");
      return;
    }

    try {
      const program = getProgram();
      const jarPubkey = new PublicKey(tipJarAddress); // ✅ Use tip jar address
      
      setStatus("Fetching jar account...");
      const jarAccount = await program.account.jar.fetch(jarPubkey);
      
      const [tipPda] = deriveTipPda(
        jarPubkey,
        jarAccount.sessionId.toNumber(),
        jarAccount.tipCount.toNumber()
      );

      const lamports = Math.floor(parseFloat(tipAmount) * anchor.web3.LAMPORTS_PER_SOL);

      setStatus("Sending tip...");
      
      const provider = program.provider;
      const providerWallet = provider.wallet;
      
      await program.methods
        .sendTip(new anchor.BN(lamports))
        .accounts({
          tipper: providerWallet.publicKey,
          jar: jarPubkey, // ✅ Tip to the specified jar
          tip: tipPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setStatus(`✅ Successfully sent ${tipAmount} SOL tip to ${tipJarAddress.slice(0, 8)}...`);
    } catch (err) {
      console.error(err);
      setStatus("❌ Tip failed: " + err.message);
    }
  };

  const withdraw = async () => {
    if (!wallet) {
      setStatus("Please connect wallet first");
      return;
    }

    try {
      const program = getProgram();
      const [jarPda] = deriveJarPda(wallet); // ✅ Always use user's own jar for withdrawal

      setStatus("Withdrawing funds...");
      
      const provider = program.provider;
      const providerWallet = provider.wallet;
      
      await program.methods
        .withdraw()
        .accounts({
          creator: providerWallet.publicKey,
          jar: jarPda, // ✅ Withdraw from user's own jar
        })
        .rpc();

      setStatus("✅ Withdraw successful!");
      setTimeout(() => checkMyJarStatus(wallet), 2000);
    } catch (err) {
      console.error(err);
      setStatus("❌ Withdraw failed: " + err.message);
    }
  };

  const refreshMyJarInfo = async () => {
    if (!wallet || !myJarExists) return;
    
    try {
      const program = getProgram();
      const [jarPda] = deriveJarPda(wallet);
      
      const jarAccount = await program.account.jar.fetch(jarPda);
      const balance = await program.provider.connection.getBalance(jarPda);
      
      setStatus(`📊 My Jar - Tips: ${jarAccount.totalTips.toString()} lamports, Count: ${jarAccount.tipCount.toString()}, Balance: ${balance / 1e9} SOL`);
    } catch (err) {
      setStatus("❌ Failed to fetch jar info: " + err.message);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>🫙 TipJar DApp</h1>
      
      <Wallet setWallet={setWallet} />
      
      <div style={{ margin: "20px 0", padding: "15px", backgroundColor: "#f0f8ff", borderRadius: "8px", border: "1px solid #ddd" }}>
        <strong>Status:</strong> {status}
      </div>

      {wallet && (
        <div>
          <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
            <h3>💳 Your Wallet: {wallet.toBase58().slice(0, 8)}...</h3>
            {myJarExists ? (
              <p style={{ color: "green" }}>
                ✅ Your Jar: <code>{myJarAddress}</code>
                <br />
                <small>Share this address with others so they can tip you!</small>
              </p>
            ) : (
              <p style={{ color: "orange" }}>⚠️ No jar found - initialize one below</p>
            )}
          </div>

          {/* Initialize Jar Section */}
          {!myJarExists && (
            <div style={{ marginBottom: "20px", border: "1px solid #4caf50", padding: "15px", borderRadius: "8px" }}>
              <h3>🆕 Initialize Your Jar</h3>
              <p>Create your tip jar so others can send you tips!</p>
              <button 
                onClick={initializeJar}
                style={{ padding: "12px 24px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "16px" }}
              >
                Initialize New Jar
              </button>
            </div>
          )}

          {/* Send Tip Section */}
          <div style={{ marginBottom: "20px", border: "1px solid #2196f3", padding: "15px", borderRadius: "8px" }}>
            <h3>💰 Send Tip to Someone</h3>
            <div style={{ marginBottom: "10px" }}>
              <label>Recipient's Jar Address:</label>
              <input
                type="text"
                placeholder="Enter someone's jar address to tip them"
                value={tipJarAddress} // ✅ Separate state for tip target
                onChange={(e) => setTipJarAddress(e.target.value)} // ✅ Update tip jar address
                style={{ width: "100%", padding: "8px", margin: "5px 0", borderRadius: "4px", border: "1px solid #ccc" }}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label>Tip Amount (SOL):</label>
              <input
                type="number"
                step="0.01"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                style={{ width: "100%", padding: "8px", margin: "5px 0", borderRadius: "4px", border: "1px solid #ccc" }}
              />
            </div>
            <button 
              onClick={sendTip}
              style={{ 
                padding: "12px 24px", 
                backgroundColor: "#2196F3", 
                color: "white", 
                border: "none", 
                borderRadius: "4px", 
                cursor: "pointer",
                fontSize: "16px"
              }}
            >
              Send Tip
            </button>
          </div>

          {/* Manage Your Jar Section */}
          {myJarExists && (
            <div style={{ marginBottom: "20px", border: "1px solid #9c27b0", padding: "15px", borderRadius: "8px" }}>
              <h3>🏦 Manage Your Jar</h3>
              <button 
                onClick={withdraw}
                style={{ padding: "12px 24px", backgroundColor: "#FF9800", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "10px", fontSize: "16px" }}
              >
                💸 Withdraw My Tips
              </button>
              <button 
                onClick={refreshMyJarInfo}
                style={{ padding: "12px 24px", backgroundColor: "#9C27B0", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "16px" }}
              >
                📊 Refresh My Jar Info
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
