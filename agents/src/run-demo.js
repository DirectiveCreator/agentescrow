#!/usr/bin/env node
// Runs the full Escroue demo: deploys contracts, then runs buyer + seller concurrently
import { spawn, execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentsDir = join(__dirname, '..');

function runProcess(name, script) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [script], {
      cwd: agentsDir,
      env: { ...process.env, FORCE_COLOR: '1' },
      stdio: 'inherit',
    });
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(`${name} exited with code ${code}`));
      else resolve();
    });
    proc.on('error', reject);
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  🏗️  Escroue - Trustless Agent Marketplace');
  console.log('═══════════════════════════════════════════════════\n');

  // Step 1: Deploy contracts
  console.log('Phase 1: Deploying contracts...\n');
  await runProcess('deploy', 'src/deploy-local.js');

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Phase 2: Running Agent Marketplace Demo');
  console.log('═══════════════════════════════════════════════════\n');

  // Step 2: Run buyer and seller concurrently
  // Seller starts first to poll, then buyer posts tasks
  const sellerPromise = runProcess('seller', 'src/seller.js');
  // Give seller a moment to start polling
  await new Promise(r => setTimeout(r, 2000));
  const buyerPromise = runProcess('buyer', 'src/buyer.js');

  await Promise.all([buyerPromise, sellerPromise]);

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  ✅ Demo Complete!');
  console.log('═══════════════════════════════════════════════════');
}

main().catch(console.error);
