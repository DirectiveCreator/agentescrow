/**
 * Escroue — Moltbook (Molthunt) Post Script
 *
 * STATUS: DRAFT — requires human approval before running
 *
 * Posts Escroue project to Molthunt using SIWA (Sign In With Agent)
 * authentication via ERC-8004 on-chain identity.
 *
 * Usage: DRY_RUN=true node scripts/post-to-moltbook.js   (preview only)
 *        node scripts/post-to-moltbook.js                  (live post)
 *
 * Requires: DEPLOYER_PRIVATE_KEY in .env or .env.deployer
 */

import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
function loadEnv() {
  for (const envFile of ['.env', '.env.deployer']) {
    try {
      const content = readFileSync(resolve(__dirname, '..', envFile), 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) process.env[match[1].trim()] = match[2].trim();
      }
    } catch {}
  }
}
loadEnv();

const MOLTHUNT_API = 'https://www.molthunt.com/api/v1';
const DRY_RUN = process.env.DRY_RUN === 'true';
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ DEPLOYER_PRIVATE_KEY not found in .env or .env.deployer');
  process.exit(1);
}

// GitHub raw URLs for screenshots
const SCREENSHOTS = {
  identity: 'https://raw.githubusercontent.com/DirectiveCreator/agentescrow/main/docs/images/Identity.png',
  multichain: 'https://raw.githubusercontent.com/DirectiveCreator/agentescrow/main/docs/images/Multi-chain.png',
  metamask: 'https://raw.githubusercontent.com/DirectiveCreator/agentescrow/main/docs/images/Metamask.png',
  integration: 'https://raw.githubusercontent.com/DirectiveCreator/agentescrow/main/docs/images/Integration.png',
  celo: 'https://raw.githubusercontent.com/DirectiveCreator/agentescrow/main/docs/images/CeloFeatures.png',
  stablecoins: 'https://raw.githubusercontent.com/DirectiveCreator/agentescrow/main/docs/images/SupportedStable.png',
};

// Project data
const PROJECT = {
  name: 'Escroue',
  tagline: 'A trustless on-chain marketplace where AI agents hire each other — escrow, reputation, and identity, fully autonomous',
  description: `Escroue lets AI agents post tasks with ETH locked in smart contract escrow, claim and deliver work, and settle payments automatically — no human intervention required.

Three Solidity contracts handle the full lifecycle:
• ServiceBoard — task posting, claiming, delivery, and confirmation
• EscrowVault — ETH custody with automatic release on completion
• ReputationRegistry — on-chain trust scores computed from task history

Deployed on Base Mainnet (UUPS upgradeable proxies) with testnet deployments on Base Sepolia and Celo Sepolia. 7 protocol integrations: x402 (Coinbase HTTP payments), OpenServ (agent discovery network), Venice AI (private evaluation via TEE enclaves), MetaMask Delegation (human-delegated spending authority), ENS (human-readable agent names), ERC-8004 (on-chain agent identity), and Filecoin (decentralized delivery storage).

66 Foundry tests. 9+ on-chain task completions verified. Seller trust score: 100/100.

Built in 5 days by a human-AI team at the Synthesis Hackathon (March 2026). All code open source.`,
  github_url: 'https://github.com/DirectiveCreator/agentescrow',
  website_url: 'https://escroue.com',
  demo_url: 'https://escroue.com',
  screenshot_url: 'https://raw.githubusercontent.com/DirectiveCreator/agentescrow/main/docs/images/Cover.png',
  logo_url: 'https://raw.githubusercontent.com/DirectiveCreator/agentescrow/main/docs/images/Escroue.jpeg',
  category_ids: [
    'rR8N6GQ0bC0DkFMdSVVGP',  // Web3 & Crypto
    'EX00lYS85yufxV6PWevhF',  // Developer Tools
    'wLuw2qhCk5-9qJlAcL0fa',  // AI & Machine Learning
  ],
};

async function postToMoltbook() {
  console.log('🦞 Escroue → Moltbook Post');
  console.log('================================\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN — showing what would be posted:\n');
    console.log(JSON.stringify(PROJECT, null, 2));
    console.log('\n📸 Screenshots available:');
    for (const [name, url] of Object.entries(SCREENSHOTS)) {
      console.log(`  ${name}: ${url}`);
    }
    console.log('\n✅ Dry run complete. Remove DRY_RUN=true to post for real.');
    return;
  }

  // Step 1: Set up wallet for SIWA
  const account = privateKeyToAccount(PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`);
  console.log(`👛 Wallet: ${account.address}`);

  // Step 2: Request SIWA nonce
  console.log('\n📝 Step 1/3: Requesting SIWA nonce...');
  const nonceRes = await fetch(`${MOLTHUNT_API}/siwa/nonce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wallet_address: account.address,
      agent_id: '33295',  // ERC-8004 on-chain agent ID
    }),
  });

  if (!nonceRes.ok) {
    const err = await nonceRes.text();
    console.error(`❌ Nonce request failed (${nonceRes.status}): ${err}`);
    process.exit(1);
  }

  const { nonce, message } = await nonceRes.json();
  console.log(`  ✅ Got nonce: ${nonce?.slice(0, 16)}...`);

  // Step 3: Sign the nonce message
  console.log('\n🔐 Step 2/3: Signing SIWA message...');
  const signature = await account.signMessage({ message: message || nonce });
  console.log(`  ✅ Signed: ${signature.slice(0, 20)}...`);

  // Step 4: Verify signature → get receipt token
  const verifyRes = await fetch(`${MOLTHUNT_API}/siwa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wallet_address: account.address,
      agent_id: '33295',
      signature,
    }),
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.text();
    console.error(`❌ Verification failed (${verifyRes.status}): ${err}`);
    process.exit(1);
  }

  const { receipt } = await verifyRes.json();
  console.log(`  ✅ SIWA authenticated! Receipt: ${receipt?.slice(0, 20)}...`);

  // Step 5: Create project
  console.log('\n🚀 Step 3/3: Creating Moltbook project...');
  const createRes = await fetch(`${MOLTHUNT_API}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${receipt}`,
    },
    body: JSON.stringify(PROJECT),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    console.error(`❌ Project creation failed (${createRes.status}): ${err}`);
    process.exit(1);
  }

  const project = await createRes.json();
  console.log(`\n🎉 Project created!`);
  console.log(`  ID: ${project.id}`);
  console.log(`  Slug: ${project.slug}`);
  console.log(`  URL: https://www.molthunt.com/projects/${project.slug || project.id}`);
  console.log(`\n📋 Use this URL in your Synthesis submission:`);
  console.log(`  moltbookPostURL: "https://www.molthunt.com/projects/${project.slug || project.id}"`);

  // Step 6: Review project
  console.log('\n📝 Reviewing created project...');
  const reviewRes = await fetch(`${MOLTHUNT_API}/projects/${project.id}`, {
    headers: { 'Authorization': `Bearer ${receipt}` },
  });
  const review = await reviewRes.json();
  console.log(`  Status: ${review.status}`);
  console.log(`  Name: ${review.name}`);
  console.log(`  Tagline: ${review.tagline}`);

  console.log('\n✅ Moltbook post complete! Project is live.');
}

postToMoltbook().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
