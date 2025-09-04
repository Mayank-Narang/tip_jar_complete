# Project Description

**Deployed Frontend URL:** [deployed frontend](https://tip-jar-fe.vercel.app/)]
**Solana Program ID:** (B2uUS9ypnv1Z3XGvxTF4iaLAazWye3ynVA5KA9KHP32w)  

## Project Overview

### Description
TipJar is a decentralized tipping platform built on the Solana blockchain that enables users to create personalized tip jars and seamlessly send/receive SOL tips. The dApp leverages Anchor Framework for secure smart contract development and integrates with Phantom Wallet for user authentication. Users can initialize their own tip jar (PDA), share their jar address with others to receive tips, and withdraw accumulated funds directly to their wallet. The platform features session-based tip organization, real-time balance updates, and a mobile-responsive React interface that makes Web3 tipping accessible to everyone.

### Key Features
- **Tip Jar Creation**: Users can initialize their own Program Derived Address (PDA) to serve as a personalized tip jar
- **Cross-User Tipping**: Send SOL tips to any valid jar address with customizable amounts
- **Secure Withdrawals**: Jar owners can withdraw all accumulated tips (minus rent exemption) to their connected wallet  
- **Session Management**: Automatic session tracking creates unique tip accounts and prevents PDA collisions
- **Real-time Updates**: Live balance monitoring and tip count tracking with refresh functionality
- **Wallet Integration**: Seamless Phantom Wallet connection with proper signature handling
- **Rent Optimization**: Smart rent-exempt balance management to keep accounts active
- **Responsive UI**: Mobile-friendly React interface with clear status messaging

### How to Use the dApp

1. **Connect Wallet**
   - Install Phantom Wallet browser extension
   - Connect your wallet to the dApp
   - Ensure you're on the correct Solana network (devnet)

2. **Initialize Your Tip Jar**
   - Click "Initialize New Jar" button
   - Confirm the transaction in Phantom Wallet
   - Your unique jar address will be displayed - share this with others!

3. **Send Tips to Others**
   - Enter the recipient's jar address in the "Send Tip" section
   - Specify the tip amount in SOL (e.g., 0.1 SOL)
   - Click "Send Tip" and confirm the transaction

4. **Withdraw Your Tips**
   - Navigate to "Manage Your Jar" section
   - Click "Withdraw My Tips" to transfer all accumulated tips to your wallet
   - Click "Refresh My Jar Info" to view current balance and tip statistics

## Program Architecture

The TipJar program implements a secure, session-based architecture using Anchor Framework on Solana. The core design centers around Program Derived Addresses (PDAs) for deterministic account generation and proper ownership validation. The program maintains two primary account types: Jar accounts for storing tip jar metadata and Tip accounts for recording individual tip transactions. The architecture ensures secure fund management through owner-only withdrawals, rent-exempt balance preservation, and session isolation to prevent account conflicts. All lamport transfers are handled through direct manipulation for data-carrying accounts, with proper CPI integration for tip sending operations.

### PDA Usage

**PDAs Used:**
- **Jar PDA**: Deterministically generated using seeds `["jar", owner_pubkey]` to create a unique tip jar for each user. This ensures one jar per wallet while maintaining program control over the account.
- **Tip PDA**: Generated using seeds `["tip", jar_pubkey, session_id, tip_count]` to create unique tip records. The session_id prevents conflicts after withdrawals, while tip_count ensures sequential tip tracking within each session.

### Program Instructions

**Instructions Implemented:**
- **initialize_jar**: Creates a new tip jar PDA for the user with initial state (zero tips, count, and fresh session_id). Requires user signature and system program for account creation.
- **send_tip**: Transfers SOL from tipper to specified jar address while creating a tip account record. Validates tip amount > 0, updates jar statistics (total_tips, tip_count), and stores tip metadata (tipper, amount, timestamp).
- **withdraw**: Allows jar owners to withdraw all accumulated tips to their wallet while preserving rent-exempt balance. Resets jar state with new session_id for future tip isolation and uses direct lamport manipulation for secure transfers.

### Account Structure

#[account]
pub struct Jar {
pub owner: Pubkey, // Wallet address of jar owner (32 bytes)
pub total_tips: u64, // Cumulative tips received in lamports (8 bytes)
pub tip_count: u64, // Number of tips received in current session (8 bytes)
pub session_id: u64, // Unique session identifier for tip isolation (8 bytes)
}

#[account]
pub struct Tip {
pub tipper: Pubkey, // Wallet address of person who sent tip (32 bytes)
pub amount: u64, // Tip amount in lamports (8 bytes)
pub timestamp: i64, // Unix timestamp when tip was sent (8 bytes)
}

text

## Testing

### Test Coverage

**Happy Path Tests:**
- **Jar Initialization**: Verifies successful jar creation with correct owner, zero initial balances, and valid session_id generation
- **Tip Sending**: Tests successful SOL transfer from tipper to jar with proper balance updates and tip account creation
- **Fund Withdrawal**: Validates owner-only withdrawal functionality with correct balance transfers and state reset
- **Post-Withdrawal Tipping**: Ensures tip functionality works correctly after withdrawal with new session isolation
- **Balance Tracking**: Confirms accurate tip counting and total amount tracking across multiple transactions

**Unhappy Path Tests:**
- **Invalid Tip Amount**: Tests rejection of zero or negative tip amounts with proper error messaging
- **Unauthorized Withdrawal**: Verifies that non-owners cannot withdraw from jars they don't own
- **Insufficient Balance**: Tests behavior when attempting operations without sufficient SOL for transaction fees
- **Account Conflicts**: Ensures session management prevents PDA collisions after withdrawal operations
- **Signature Verification**: Tests proper rejection of unsigned or improperly signed transactions

### Running Tests

Important: Configure Anchor.toml for local testing
Change cluster from "devnet" to "localnet" in Anchor.toml
Start local validator in separate terminal

solana-test-validator
Run complete test suite

anchor test
Run tests with detailed output

anchor test --skip-local-validator -- --nocapture

text

### Additional Notes for Evaluators

**Technical Implementation Highlights:**
- **Session-Based Architecture**: The session_id mechanism prevents PDA collisions when users withdraw and create new tips, solving a common Web3 UX issue.
- **Direct Lamport Manipulation**: Used for withdrawals from data-carrying PDAs since System Program transfers fail on accounts with data.
- **Proper Error Handling**: Comprehensive error codes with descriptive messages for better debugging and user experience.
- **Rent Optimization**: Smart balance management ensures accounts remain rent-exempt while maximizing withdrawable amounts.

**Frontend Integration:**
- **Wallet Adapter**: Proper Phantom Wallet integration with AnchorProvider for seamless transaction signing.
- **Real-time Updates**: Automatic balance refreshing and status updates provide smooth user experience.
- **Responsive Design**: Mobile-first approach ensures accessibility across all devices.

**Security Considerations:**
- **Owner Validation**: All withdrawal operations include proper ownership checks using `require_keys_eq!` macro.
- **Input Validation**: Tip amounts validated to prevent zero-value transactions and potential exploits.
- **PDA Security**: Deterministic address generation prevents unauthorized account access while maintaining program control.

The project demonstrates production-ready Solana development practices with proper testing coverage, security implementations, and user experience considerations.
