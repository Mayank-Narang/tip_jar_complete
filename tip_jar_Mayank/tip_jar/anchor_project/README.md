# TipJar - Solana Program

A decentralized tipping platform built with Anchor Framework on Solana.

## Quick Start

Build program

anchor build
Deploy to devnet

anchor deploy
Run tests (change cluster to "localnet" in Anchor.toml first)

anchor test

text

## Instructions

- **initialize_jar**: Creates a tip jar PDA for the user
- **send_tip**: Sends SOL tip to a jar address with tip tracking
- **withdraw**: Withdraws all tips to jar owner's wallet

## Architecture

Uses Program Derived Addresses (PDAs) with seeds `["jar", owner]` for tip jars and `["tip", jar, session_id, count]` for individual tips. Session management prevents account conflicts after withdrawals.

Built with Rust + Anchor Framework for Solana blockchain.
