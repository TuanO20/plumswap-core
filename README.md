# Decentralized Exchange (DEX) based on UniswapV2

A minimal implementation of an automated market maker (AMM) with core decentralized exchange functionality.


## 🚀 Key Features

🔄 **AMM Core Functionality**

- Factory pattern for pair creation (`Factory.sol#L35-55`)
- Liquidity pool management:
  - Mint/burn LP tokens (`Pair.sol#L124-157`)
  - Swap functionality with price verification (`Pair.sol#L159-201`)
  - Flash swaps support (`Pair.sol#L203-212`)
- TWAP (Time-Weighted Average Price) oracles (`Pair.sol#L88-95`)

⚙️ **Advanced Mechanics**

- 0.3% protocol fee implementation (`Factory.sol#L10-33`)
- Reentrancy protection (`Pair.sol#L50-56`)
- UQ112x112 fixed-point arithmetic (`UQ112x112.sol`)
- Safe ERC20 transfers using low-level calls (`Pair.sol#L214-229`)

🔐 **Security Features**

- Input validation for:
  - Identical tokens (`Factory.sol#L40`)
  - Zero address (`Factory.sol#L39`)
  - Existing pairs (`Factory.sol#L41`)
- Access control for fee setters (`Factory.sol#L25-33`)

## 🛠️ Getting Started

### Prerequisites

- Node.js v18+
- Hardhat
- Ethereum wallet (MetaMask recommended)

### ⬇️ Installation

```bash
cd core
npm install
```

### 🔧 Configuration

1. Create `.env` file:
2. Add your own environment variables like this:

```env
PRIVATE_KEY=your_wallet_private_key
ARBSEPOLIA_RPC_URL=your_arbitrum_sepolia_url
```

## 🚀 Deployment

### Main Contracts

1. **Factory Contract**: Core infrastructure for pair deployment
   - **createPair()**: Deploys new Pair contracts using CREATE2 (`Factory.sol#L35-55`)
     - Parameters: `tokenA`, `tokenB` (sorted lexicographically)
     - Emits `PairCreated` event on successful deployment
   - **Access Control**: 
     - `feeToSetter` can update `feeTo` address (protocol fee recipient) (`Factory.sol#L25-33`)
     - Implements 2-stage ownership transfer pattern
   - **Fee Mechanism**:
     - 0.3% protocol fee (1/6th of 0.3% swap fee) when enabled
     - Fee collection triggered through `setFeeTo` (`Factory.sol#L10-18`)

2. **Pair Contract**: ERC20 liquidity pool implementation
   - **Initialization**:
     - Sets token0 and token1 in sorted order (`Pair.sol#L58-64`)
     - Initializes price oracle with first block timestamp
   - **Core Functions**:
     - `mint()`: Issues LP tokens proportional to deposited liquidity (`Pair.sol#L124-157`)
     - `burn()`: Redeems LP tokens for underlying assets (`Pair.sol#L140-157`)
     - `swap()`: Executes token exchanges with √(k) invariant check (`Pair.sol#L159-201`)
   - **Advanced Features**:
     - Flash swaps (arbitrary token borrow) with callback verification (`Pair.sol#L203-212`)
     - Time-weighted price oracles using 30-minute cumulative prices (`Pair.sol#L88-95`)
     - UQ112x112 fixed-point arithmetic for precision calculations (`UQ112x112.sol`)
   - **Security**:
     - Non-reentrant modifier on state-changing functions (`Pair.sol#L50-56`)
     - ERC20 permit support via EIP-712 signatures (`Pair.sol#L114-122`)

### 🌐 Network Configuration

Configured for:

- Arbitrum Sepolia (chainId: 421614)
- Local development node
- Solidity 0.8.28 with optimization

## 🧪 Testing

The test suite covers:

- Pair creation and validation
- Liquidity provision scenarios
- Swap functionality
- Fee calculations
- Reentrancy protection



