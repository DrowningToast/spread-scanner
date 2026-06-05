import { hlClient } from "../client.js";

const TAKER_FEE_PCT = 0.0086; // %
const MAKER_FEE_PCT = 0.0029; // %

const coin = process.argv[2];
if (!coin) {
  console.error("Usage: pnpm spread <COIN>  (e.g. pnpm spread xyz_NOW)");
  process.exit(1);
}

const book = await hlClient.l2Book({ coin });
if (!book) { console.error("No orderbook data"); process.exit(1); }

const [bids, asks] = book.levels;
if (!bids.length || !asks.length) { console.error("Empty orderbook"); process.exit(1); }

const bid = parseFloat(bids[0].px);
const ask = parseFloat(asks[0].px);
const mid = (bid + ask) / 2;
const spreadPct = ((ask - bid) / mid) * 100;
const spreadBps = spreadPct * 100;

const makerRoundTrip = MAKER_FEE_PCT * 2;   // both sides maker
const takerRoundTrip = TAKER_FEE_PCT * 2;   // both sides taker

const edgeMaker = spreadPct - makerRoundTrip;
const edgeTaker = spreadPct - takerRoundTrip;

const fmt = (n: number, d = 4) => n.toFixed(d);
const sign = (n: number) => (n >= 0 ? "+" : "") + fmt(n);
const bpsFmt = (pct: number) => (pct * 100).toFixed(2) + " bps";

console.log(`\n── ${coin} orderbook ──────────────────────`);
console.log(`  Bid   ${fmt(bid)}`);
console.log(`  Ask   ${fmt(ask)}`);
console.log(`  Mid   ${fmt(mid)}`);
console.log(`  Spread  ${fmt(spreadPct, 4)}%  (${fmt(spreadBps, 2)} bps)\n`);

console.log(`── Fee breakeven (your taker ${TAKER_FEE_PCT}% / maker ${MAKER_FEE_PCT}%) ──`);
console.log(`  Maker round-trip   ${bpsFmt(makerRoundTrip)}  →  edge ${sign(edgeMaker)}%`);
console.log(`  Taker round-trip   ${bpsFmt(takerRoundTrip)}  →  edge ${sign(edgeTaker)}%\n`);

if (edgeMaker > 0) {
  const minSafeBps = makerRoundTrip * 100 * 3; // 3x to buffer adverse selection
  console.log(`  ✓ Current spread covers maker fees by ${fmt(edgeMaker, 4)}%`);
  console.log(`  Suggested MM spread to set: ≥ ${fmt(minSafeBps, 1)} bps (3× round-trip for adverse selection buffer)`);
} else {
  console.log(`  ✗ Spread too tight to cover even maker fees — not profitable to MM here`);
}
console.log();
