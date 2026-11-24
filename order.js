import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const FRAMES_DIR = process.argv[2] || process.env.FRAMES_DIR || '/frames';
const THUMB = 32;
const EPS = 1e-12;
const TWO_OPT_BUDGET_MS = 10000;

function greedyFrom(dist, n, start) {
  const visited = new Uint8Array(n);
  const order = new Int32Array(n);
  order[0] = start;
  visited[start] = 1;
  for (let s = 1; s < n; s++) {
    const cur = order[s - 1];
    const base = cur * n;
    let best = -1;
    let bestD = Infinity;
    for (let k = 0; k < n; k++) {
      if (visited[k] === 0) {
        const d = dist[base + k];
        if (d < bestD) { bestD = d; best = k; }
      }
    }
    order[s] = best;
    visited[best] = 1;
  }
  return order;
}

function pathCost(dist, n, p) {
  let s = 0;
  for (let i = 0; i < n - 1; i++) s += dist[p[i] * n + p[i + 1]];
  return s;
}

function bestGreedy(dist, n) {
  let bestPath = null;
  let bestCost = Infinity;
  const trials = n <= 30 ? n : Math.min(n, 15);
  for (let t = 0; t < trials; t++) {
    const s = Math.floor(t * n / trials);
    const p = greedyFrom(dist, n, s);
    const c = pathCost(dist, n, p);
    if (c < bestCost) { bestCost = c; bestPath = p; }
  }
  return bestPath;
}

function twoOpt(dist, n, p) {
  const start = Date.now();
  let improved = true;
  let pass = 0;
  while (improved && pass++ < 500) {
    if (Date.now() - start > TWO_OPT_BUDGET_MS) break;
    improved = false;
    outer:
    for (let i = 0; i < n - 2; i++) {
      const a = p[i];
      const b = p[i + 1];
      const da = a * n;
      const db = b * n;
      const dab = dist[da + b];
      for (let k = i + 2; k < n; k++) {
        const c = p[k];
        let delta;
        if (k + 1 < n) {
          const d = p[k + 1];
          delta = dist[da + c] + dist[db + d] - dab - dist[c * n + d];
        } else {
          delta = dist[da + c] - dab;
        }
        if (delta < -EPS) {
          let lo = i + 1;
          let hi = k;
          while (lo < hi) {
            const t = p[lo];
            p[lo] = p[hi];
            p[hi] = t;
            lo++;
            hi--;
          }
          improved = true;
          break outer;
        }
      }
    }
  }
  return p;
}

async function main() {
  const entries = await fs.readdir(FRAMES_DIR);
  const files = entries.filter(f => /\.png$/i.test(f)).sort();
  const n = files.length;
  if (n === 0) return;
  if (n === 1) {
    process.stdout.write(files[0] + '\n');
    return;
  }

  const thumbs = await Promise.all(files.map(f =>
    sharp(path.join(FRAMES_DIR, f))
      .resize(THUMB, THUMB, { fit: 'fill' })
      .greyscale()
      .raw()
      .toBuffer()
  ));

  const dist = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    const ai = thumbs[i];
    const len = ai.length;
    for (let j = i + 1; j < n; j++) {
      const aj = thumbs[j];
      let s = 0;
      for (let k = 0; k < len; k++) {
        const d = ai[k] - aj[k];
        s += d * d;
      }
      const mse = s / len;
      dist[i * n + j] = mse;
      dist[j * n + i] = mse;
    }
  }

  let order = bestGreedy(dist, n);
  order = twoOpt(dist, n, order);

  const parts = [];
  for (let i = 0; i < n; i++) parts.push(files[order[i]]);
  process.stdout.write(parts.join('\n') + '\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});