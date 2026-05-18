import type { FlowMosaicBox } from "@/lib/flowMosaicLayout";

const STROKE = 8;

const SEED_PRIME = 0x9e3779b9;

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += SEED_PRIME);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type FlowPileBox = FlowMosaicBox & { z: number };

/** Одноэкранная «куча»: псевдослучайные позиции, при большом n сильнее перекрытия. */
export function computeFlowPileLayout(
  n: number,
  width: number,
  height: number,
  seed: string,
  titleBand: number
): FlowPileBox[] {
  if (n <= 0 || width < 120 || height < 120) return [];

  const rng = mulberry32(hashSeed(`${seed}|pileLayout`));
  const marginX = Math.max(12, Math.min(28, width * 0.04));
  const marginY = Math.max(16, Math.min(40, height * 0.05));
  const usableW = width - 2 * marginX;
  const usableH = height - 2 * marginY - titleBand;

  const area = usableW * usableH;
  const per = area / Math.max(1, n);
  const sideGuess = Math.sqrt(per * 1.15);
  let inner = Math.floor(Math.max(48, Math.min(88, sideGuess)));
  if (n > 24) inner = Math.max(44, inner - 6);
  if (n > 40) inner = Math.max(40, inner - 8);
  const outer = inner + 2 * STROKE;

  const spreadX = Math.max(usableW - outer, 1);
  const spreadY = Math.max(usableH - outer, 1);
  const cluster = n <= 8 ? 0.78 : n <= 18 ? 0.62 : 0.48;
  const cx = marginX + spreadX * 0.5;
  const cy = marginY + spreadY * 0.42;
  const rx = spreadX * 0.5 * cluster;
  const ry = spreadY * 0.5 * cluster;

  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const out: FlowPileBox[] = new Array(n);
  for (let k = 0; k < n; k++) {
    const idx = order[k];
    const u = rng();
    const v = rng();
    const gx = (rng() - 0.5) * 2;
    const gy = (rng() - 0.5) * 2;
    const left = Math.round(
      Math.min(marginX + spreadX - outer, Math.max(marginX, cx - rx * gx + (u - 0.5) * spreadX * (1 - cluster)))
    );
    const top = Math.round(
      Math.min(marginY + spreadY - outer, Math.max(marginY, cy - ry * gy + (v - 0.5) * spreadY * (1 - cluster)))
    );
    const z = 1 + k;
    out[idx] = { left, top, width: outer, height: outer, z };
  }
  return out;
}
