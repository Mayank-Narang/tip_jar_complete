import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import idl from "../idl/tipjar.json";

const NETWORK = clusterApiUrl("devnet");

export const getProvider = () => {
  const connection = new Connection(NETWORK, "confirmed");
  const provider = new anchor.AnchorProvider(connection, window.solana, anchor.AnchorProvider.defaultOptions());
  anchor.setProvider(provider);
  return provider;
};

export const getProgram = () => {
  const provider = getProvider();
  return new anchor.Program(idl, provider,undefined);
};
