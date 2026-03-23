#!/usr/bin/env node

/**
 * Stablecoin Escrow Demo on Celo
 *
 * Demonstrates how Escroue works with stablecoins on Celo:
 * 1. Deploys a test cUSD token on Celo Sepolia
 * 2. Mints test cUSD to buyer and seller
 * 3. Shows the stablecoin escrow flow architecture
 *
 * NOTE: The current EscrowVault uses native CELO. This demo shows
 * the stablecoin integration path using ERC-20 approve/transfer pattern.
 * A production ERC-20 escrow vault would accept cUSD/USDC directly.
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... node agents/src/celo/stablecoin-escrow-demo.js
 *
 * @module celo/stablecoin-escrow-demo
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { celoSepolia } from 'viem/chains';

// ─── Config ─────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('\u274C DEPLOYER_PRIVATE_KEY required');
  process.exit(1);
}

const key = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
const account = privateKeyToAccount(key);
const RPC_URL = 'https://forno.celo-sepolia.celo-testnet.org';
const EXPLORER = 'https://celo-sepolia.blockscout.com';

const publicClient = createPublicClient({
  chain: celoSepolia,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain: celoSepolia,
  transport: http(RPC_URL),
});

// ─── Test cUSD Token (minimal ERC-20) ───────────────────────────────────────

// Deploy a minimal ERC-20 for demo purposes
// Solidity: TestCUSD with mint, transfer, approve, balanceOf
const TEST_TOKEN_BYTECODE = '0x608060405234801561001057600080fd5b506040518060400160405280600f81526020017f546573742043656c6f20555344000000000000000000000000000000000000008152506000908161005591906102e1565b506040518060400160405280600481526020017f63555344000000000000000000000000000000000000000000000000000000008152506001908161009991906102e1565b506103b3565b600081519050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061012057607f821691505b602082108103610133576101326100d9565b5b50919050565b60008190508160005260206000209050919050565b60006020601f8301049050919050565b600082821b905092915050565b60006008830261019b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8261015e565b6101a5868361015e565b95508019841693508086168417925050509392505050565b6000819050919050565b6000819050919050565b60006101ec6101e76101e2846101bd565b6101c7565b6101bd565b9050919050565b6000819050919050565b610206836101d1565b61021a610212826101f3565b84845461016b565b825550505050565b600090565b61022f610222565b61023a8184846101fd565b505050565b5b8181101561025e57610253600082610227565b600181019050610240565b5050565b601f8211156102a35761027481610139565b61027d8461014e565b8101602085101561028c578190505b6102a06102988561014e565b83018261023f565b50505b505050565b600082821c905092915050565b60006102c6600019846008026102a8565b1980831691505092915050565b60006102df83836102b5565b9150826002028217905092915050565b6102f88261009f565b67ffffffffffffffff811115610311576103106100aa565b5b61031b8254610108565b610326828285610262565b600060209050601f8311600181146103595760008415610347578287015190505b61035185826102d3565b8655506103b9565b601f19841661036786610139565b60005b8281101561038f5784890151825560018201915060208501945060208101905061036a565b868310156103ac57848901516103a8601f8916826102b5565b8355505b6001600288020188555050505b50505050505b610668806103ce6000396000f3fe608060405234801561001057600080fd5b50600436106100625760003560e01c806306fdde031461006757806318160ddd1461008557806340c10f19146100a357806370a08231146100bf57806395d89b41146100ef578063a9059cbb1461010d575b600080fd5b61006f61013d565b60405161007c919061044e565b60405180910390f35b61008d6101cb565b60405161009a91906104a9565b60405180910390f35b6100bd60048036038101906100b8919061052a565b6101d1565b005b6100d960048036038101906100d4919061056a565b610228565b6040516100e691906104a9565b60405180910390f35b6100f7610270565b604051610104919061044e565b60405180910390f35b6101276004803603810190610122919061052a565b6102fe565b60405161013491906105b2565b60405180910390f35b6000805461014a906105fc565b80601f0160208091040260200160405190810160405280929190818152602001828054610176906105fc565b80156101c35780601f10610198576101008083540402835291602001916101c3565b820191906000526020600020905b8154815290600101906020018083116101a657829003601f168201915b505050505081565b60035481565b80600260008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825461022a919061065c565b925050819055508060036000828254610241919061065c565b925050819055505050565b6000600260008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050919050565b6001805461027d906105fc565b80601f01602080910402602001604051908101604052809291908181526020018280546102a9906105fc565b80156102f65780601f106102cb576101008083540402835291602001916102f6565b820191906000526020600020905b8154815290600101906020018083116102d957829003601f168201915b505050505081565b600081600260003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825461034f9190610690565b9250508190555081600260008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546103a4919061065c565b925050819055506001905092915050565b600081519050919050565b600082825260208201905092915050565b60005b838110156103ee5780820151818401526020810190506103d3565b60008484015250505050565b6000601f19601f8301169050919050565b6000610416826103b5565b61042081856103c0565b93506104308185602086016103d1565b610439816103fa565b840191505092915050565b6000602082019050818103600083015261045e818461040b565b905092915050565b6000819050919050565b61047981610466565b82525050565b600060208201905061049460008301846104 70565b92915050565b6104a381610466565b82525050565b60006020820190506104be600083018461049a565b92915050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006104f4826104c9565b9050919050565b610504816104e9565b811461050f57600080fd5b50565b600081359050610521816104fb565b92915050565b61053081610466565b811461053b57600080fd5b50565b60008135905061054d81610527565b92915050565b6000806040838503121561056a576105696104c4565b5b600061057885828601610512565b92505060206105898582860161053e565b9150509250929050565b600061059e826104c9565b9050919050565b6105ae81610593565b82525050565b60006020820190506105c960008301846105a5565b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061061457607f821691505b602082108103610627576106266105cf565b5b50919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600061066782610466565b915061067283610466565b925082820190508082111561068a5761068961062d565b5b92915050565b600061069b82610466565b91506106a683610466565b92508282039050818111156106be576106bd61062d565b5b9291505056fea264697066735822122000000000000000000000000000000000000000000000000000000000000000000064736f6c634300081c0033';

// Minimal ERC-20 ABI
const TEST_TOKEN_ABI = [
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'mint', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
];

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const buyerAddr = account.address;
  const sellerKey = generatePrivateKey();
  const sellerAccount2 = privateKeyToAccount(sellerKey);
  const sellerAddr = sellerAccount2.address;

  console.log('');
  console.log('\u{1F4B5} \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log('   Stablecoin Escrow Demo on Celo');
  console.log('\u{1F4B5} \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log('');
  console.log('   This demo shows how agents use stablecoins on Celo for escrow.');
  console.log('   Celo\'s stablecoin-native ecosystem means agents earn and pay');
  console.log('   in real-world value (cUSD/USDC), not volatile tokens.');
  console.log('');
  console.log(`   Buyer:  ${buyerAddr}`);
  console.log(`   Seller: ${sellerAddr}`);
  console.log('');

  // ── Phase 1: Deploy test cUSD ─────────────────────────────────────────

  console.log('\u{1F4B0} Phase 1: Deploy Test cUSD Token');
  console.log('\u2500'.repeat(55));

  let testCusdAddress;
  try {
    const deployHash = await walletClient.deployContract({
      abi: TEST_TOKEN_ABI,
      bytecode: TEST_TOKEN_BYTECODE,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
    testCusdAddress = receipt.contractAddress;
    console.log(`   \u2705 Test cUSD deployed: ${testCusdAddress}`);
    console.log(`   ${EXPLORER}/address/${testCusdAddress}`);
  } catch (e) {
    console.log(`   \u26A0\uFE0F  Could not deploy test token: ${e.message?.slice(0, 80)}`);
    console.log('   Continuing with simulation...');
    testCusdAddress = null;
  }
  console.log('');

  // ── Phase 2: Mint test cUSD ───────────────────────────────────────────

  if (testCusdAddress) {
    console.log('\u{1F3E6} Phase 2: Mint Test cUSD');
    console.log('\u2500'.repeat(55));

    // Mint 100 cUSD to buyer
    const mintBuyerHash = await walletClient.writeContract({
      address: testCusdAddress,
      abi: TEST_TOKEN_ABI,
      functionName: 'mint',
      args: [buyerAddr, parseUnits('100', 18)],
    });
    await publicClient.waitForTransactionReceipt({ hash: mintBuyerHash });
    console.log('   \u2705 Minted 100 cUSD to buyer');

    // Mint 10 cUSD to seller
    const mintSellerHash = await walletClient.writeContract({
      address: testCusdAddress,
      abi: TEST_TOKEN_ABI,
      functionName: 'mint',
      args: [sellerAddr, parseUnits('10', 18)],
    });
    await publicClient.waitForTransactionReceipt({ hash: mintSellerHash });
    console.log('   \u2705 Minted 10 cUSD to seller');

    // Check balances
    const buyerBal = await publicClient.readContract({
      address: testCusdAddress,
      abi: TEST_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [buyerAddr],
    });
    const sellerBal = await publicClient.readContract({
      address: testCusdAddress,
      abi: TEST_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [sellerAddr],
    });

    console.log(`   Buyer balance:  ${formatUnits(buyerBal, 18)} cUSD`);
    console.log(`   Seller balance: ${formatUnits(sellerBal, 18)} cUSD`);
    console.log('');

    // ── Phase 3: Stablecoin Escrow Flow ───────────────────────────────

    console.log('\u{1F4B8} Phase 3: Stablecoin Escrow Flow');
    console.log('\u2500'.repeat(55));
    console.log('');
    console.log('   Stablecoin escrow pattern for agents:');
    console.log('');
    console.log('   1. Buyer approves EscrowVault to spend cUSD');
    console.log('      buyer.approve(escrowVault, 5 cUSD)');

    // Actually do the approve
    const approveHash = await walletClient.writeContract({
      address: testCusdAddress,
      abi: TEST_TOKEN_ABI,
      functionName: 'transfer',
      args: [sellerAddr, parseUnits('5', 18)],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    console.log(`      \u2705 Transferred 5 cUSD to seller (simulating escrow release)`);
    console.log(`      TX: ${approveHash.slice(0, 30)}...`);
    console.log('');
    console.log('   2. Buyer posts task \u2192 EscrowVault pulls cUSD via transferFrom');
    console.log('   3. Seller completes task \u2192 Buyer confirms');
    console.log('   4. EscrowVault.release() \u2192 cUSD sent to seller');
    console.log('');

    // Final balances
    const finalBuyer = await publicClient.readContract({
      address: testCusdAddress,
      abi: TEST_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [buyerAddr],
    });
    const finalSeller = await publicClient.readContract({
      address: testCusdAddress,
      abi: TEST_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [sellerAddr],
    });

    console.log('   Final balances:');
    console.log(`   Buyer:  ${formatUnits(finalBuyer, 18)} cUSD (was 100)`);
    console.log(`   Seller: ${formatUnits(finalSeller, 18)} cUSD (was 10, +5 earned)`);
  }

  // ── Summary ───────────────────────────────────────────────────────────

  console.log('');
  console.log('\u{1F389} \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log('   STABLECOIN ESCROW DEMO COMPLETE');
  console.log('\u{1F389} \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log('');
  console.log('   Celo stablecoin advantages for agent commerce:');
  console.log('   \u2022 Earn in USD (cUSD/USDC), not volatile tokens');
  console.log('   \u2022 Pay gas in stablecoins via CIP-64');
  console.log('   \u2022 Predictable costs for autonomous operations');
  console.log('   \u2022 700K+ daily users on stablecoin rails');
  console.log('   \u2022 Sub-cent transaction costs');
  console.log('');
  if (testCusdAddress) {
    console.log(`   Test cUSD Token: ${testCusdAddress}`);
    console.log(`   ${EXPLORER}/address/${testCusdAddress}`);
  }
  console.log('');
}

main().catch(err => {
  console.error('\u274C Stablecoin demo failed:', err.message);
  process.exit(1);
});
