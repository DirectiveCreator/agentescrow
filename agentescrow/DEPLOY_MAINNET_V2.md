# Base Mainnet V2 Deployment — UUPS + Pause + Security Audit

## Status: READY TO DEPLOY ✅

All contracts compiled and 79/79 tests passing. ABIs regenerated with V2 functions.

## What's Included (V2 vs V1)

| Feature | V1 (Mainnet Current) | V2 (This Deploy) |
|---------|---------------------|-------------------|
| Proxy pattern | None (bare contracts) | UUPS (ERC1967Proxy) |
| Emergency pause | ❌ | ✅ ServiceBoard.pause()/unpause() |
| Ownership transfer | Single-step | Two-step (transferOwnership + acceptOwnership) |
| Reentrancy guard | ❌ | ✅ EscrowVault.release()/refund() |
| Delivered timeout | ❌ | ✅ 24h grace period after deadline |
| Seller failure tracking | ❌ | ✅ recordFailure() on timeout |
| Buyer validation in refund | ❌ | ✅ Defense-in-depth check |
| Paginated queries | ❌ | ✅ getOpenTasksPaginated(offset, limit) |
| Max deadline | ❌ | ✅ 365 days max |
| Empty taskType check | ❌ | ✅ Rejects empty strings |
| Struct packing | ❌ | ✅ Escrow: buyer+released+refunded in 1 slot |
| Direct ETH rejection | ❌ (has receive()) | ✅ No receive(), no unaccounted ETH |
| Cancel event reason | ❌ | ✅ TaskCancelled includes reason string |
| Test coverage | Basic | 79 tests (3 suites) |

## Deployer

- **Address**: `0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38`
- **Chain**: Base Mainnet (Chain ID 8453)
- **Estimated gas**: ~5M gas total (~0.001 ETH at 0.2 gwei base fee)

## Demo Wallets

- **Buyer**: `0xab85b3E08443afB41177B361b71f42068D1683fC`
  - PK: `REDACTED_BUYER_KEY`
- **Seller**: `0xaffDC52347B22D97561770f54619591a2c59f08b`
  - PK: `REDACTED_SELLER_KEY`

## Deployment Command

```bash
cd /Users/agents/Desktop/Agents/the-hacker/agentescrow/contracts

# Deploy V2 UUPS proxy contracts to Base Mainnet
PRIVATE_KEY=<DEPLOYER_PRIVATE_KEY> \
/Users/agents/.foundry/bin/forge script script/DeployMainnet.s.sol:DeployMainnet \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key <BASESCAN_API_KEY>
```

### Without verification (faster):
```bash
PRIVATE_KEY=<DEPLOYER_PRIVATE_KEY> \
/Users/agents/.foundry/bin/forge script script/DeployMainnet.s.sol:DeployMainnet \
  --rpc-url https://mainnet.base.org \
  --broadcast
```

## Post-Deploy: Demo Task

```bash
cd /Users/agents/Desktop/Agents/the-hacker/agentescrow

BUYER_KEY=REDACTED_BUYER_KEY \
SELLER_KEY=REDACTED_SELLER_KEY \
SERVICE_BOARD=<PROXY_ADDRESS_FROM_DEPLOY> \
CHAIN=base \
node agents/src/demo-mainnet.js
```

## Post-Deploy: Update Frontend

After deployment, update `frontend/lib/contracts.ts` with the new V2 proxy addresses.

## Compilation & Test Results

- **Compiler**: Solc 0.8.33
- **Tests**: 79 passed, 0 failed, 0 skipped
  - AgentEscrow.t.sol: 8 tests (core lifecycle)
  - AgentEscrowExtended.t.sol: 47 tests (security, edge cases, pagination)
  - PauseAndUpgrade.t.sol: 24 tests (pause, UUPS, ownership)
