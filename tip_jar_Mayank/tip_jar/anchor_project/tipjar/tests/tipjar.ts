import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Tipjar } from "../target/types/tipjar";
import { assert } from "chai";

describe("tipjar", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const program = anchor.workspace.Tipjar as Program<Tipjar>;

  let creator = provider.wallet as anchor.Wallet;
  let tipper: anchor.web3.Keypair;
  let jarPda: PublicKey;

  before(async () => {
    [jarPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("jar"), creator.publicKey.toBuffer()],
      program.programId
    );

    tipper = anchor.web3.Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      tipper.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);
  });

  it("Initialize a new jar", async () => {
    await program.methods
      .initializeJar()
      .accounts({
        jar: jarPda,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    const jarAccount = await program.account.jar.fetch(jarPda);
    assert.ok(jarAccount.owner.equals(creator.publicKey));
    assert.equal(jarAccount.totalTips.toNumber(), 0);
    assert.equal(jarAccount.tipCount.toNumber(), 0);
    assert.ok(jarAccount.sessionId.toNumber() > 0);
  });

  it("Send a tip", async () => {
    const jarAccount = await program.account.jar.fetch(jarPda);

    const [tipPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("tip"),
        jarPda.toBuffer(),
        new anchor.BN(jarAccount.sessionId).toArrayLike(Buffer, "le", 8),
        new anchor.BN(jarAccount.tipCount).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const tipAmount = 0.1 * LAMPORTS_PER_SOL;

    await program.methods
      .sendTip(new anchor.BN(tipAmount))
      .accounts({
        tipper: tipper.publicKey,
        jar: jarPda,
        tip: tipPda,
        systemProgram: SystemProgram.programId,
      }as any)
      .signers([tipper])
      .rpc();

    const updatedJar = await program.account.jar.fetch(jarPda);
    assert.equal(updatedJar.totalTips.toNumber(), tipAmount);

    const tipAccount = await program.account.tip.fetch(tipPda);
    assert.ok(tipAccount.tipper.equals(tipper.publicKey));
    assert.equal(tipAccount.amount.toNumber(), tipAmount);
  });

  it("Withdraw funds", async () => {
    const beforeBal = await provider.connection.getBalance(creator.publicKey);

    await program.methods
      .withdraw()
      .accounts({
        creator: creator.publicKey,
        jar: jarPda,
        systemProgram: SystemProgram.programId,
      }as any)
      .rpc();

    const afterBal = await provider.connection.getBalance(creator.publicKey);
    assert.ok(afterBal > beforeBal, "Creator should receive withdrawn funds");

    const jarAccount = await program.account.jar.fetch(jarPda);
    assert.equal(jarAccount.totalTips.toNumber(), 0);
    assert.equal(jarAccount.tipCount.toNumber(), 0);
  });

  it("Can send tips after withdrawal", async () => {
    const jarAccount = await program.account.jar.fetch(jarPda);

    const [tipPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("tip"),
        jarPda.toBuffer(),
        new anchor.BN(jarAccount.sessionId).toArrayLike(Buffer, "le", 8),
        new anchor.BN(jarAccount.tipCount).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const tipAmount = 0.05 * LAMPORTS_PER_SOL;

    await program.methods
      .sendTip(new anchor.BN(tipAmount))
      .accounts({
        tipper: tipper.publicKey,
        jar: jarPda,
        tip: tipPda,
        systemProgram: SystemProgram.programId,
      }as any)
      .signers([tipper])
      .rpc();

    const updatedJar = await program.account.jar.fetch(jarPda);
    assert.equal(updatedJar.totalTips.toNumber(), tipAmount);
    assert.equal(updatedJar.tipCount.toNumber(), 1);
  });

  it("Rejects withdraw by non-owner", async () => {
    try {
      await program.methods
        .withdraw()
        .accounts({
          creator: tipper.publicKey,
          jar: jarPda,
          systemProgram: SystemProgram.programId,
        }as any)
        .signers([tipper])
        .rpc();
      assert.fail("Should have thrown an error");
    } catch (err) {
      const msg = (err as Error).message;
      assert.ok(
        msg.includes("You are not authorized") ||
          msg.includes("A seeds constraint was violated"),
        `Unexpected error: ${msg}`
      );
    }
  });
});
