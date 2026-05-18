/** Десктоп: 12 колонок, зазор 8px, крайние колонки пустые. Мобилка: 2 колонки, зазор 32px; при ширине ≥480px — боковой inset 32|48|64 по seed. */

const GAP = 8;
/** Зазор между двумя колонками на мобилке (один промежуток). */
const GAP_MOBILE = 32;
/** Сторона квадрата превью (внутри outline), десктоп и потолок на мобилке. */
export const FLOW_CARD_INNER_PX = 108;
const CARD = FLOW_CARD_INNER_PX;
/** Внешняя белая обводка 8px — в bbox для отступов между карточками. */
const STROKE = 8;
/** Полоса под заголовок в bbox десктопа; на мобилке добавляется к высоте контента, если подписи видны. */
/** Полоса под превью в bbox: 32px до текста + запас под строку заголовка. */
export const FLOW_MOSAIC_TITLE_BAND = 48;
const SEED_PRIME = 0x9e3779b9;

const COLS_DESKTOP = 12;
/** На десктопе колонки 0 и 11 пустые. */
const COL_FIRST_DESKTOP = 1;
const COL_LAST_EXCLUSIVE_DESKTOP = 11;

const COLS_MOBILE = 2;

export type FlowMosaicBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

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

/** Внешний bbox для проверки пересечений (квадрат + обводка + полоса под заголовок). */
export function flowItemOuterSize(): { w: number; h: number } {
  return {
    w: CARD + 2 * STROKE,
    h: CARD + 2 * STROKE + FLOW_MOSAIC_TITLE_BAND
  };
}

function colStarts(
  cols: number,
  containerWidth: number,
  gap: number
): { colW: number; starts: number[] } {
  const colW = (containerWidth - (cols - 1) * gap) / cols;
  const starts = Array.from({ length: cols }, (_, i) => i * (colW + gap));
  return { colW, starts };
}

function minDx(colW: number, gap: number): number {
  return colW + gap;
}

function minDy(colW: number): number {
  return Math.max(GAP * 3, Math.round(colW * 0.45));
}

function overlaps(
  a: { l: number; t: number; r: number; b: number },
  b: { l: number; t: number; r: number; b: number },
  padX: number,
  padY: number
): boolean {
  return !(a.r + padX <= b.l || b.r + padX <= a.l || a.b + padY <= b.t || b.b + padY <= a.t);
}

function countByHalf(
  rects: { l: number; r: number }[],
  midX: number
): { left: number; right: number } {
  let left = 0;
  let right = 0;
  for (const q of rects) {
    const cx = (q.l + q.r) / 2;
    if (cx < midX) left++;
    else right++;
  }
  return { left, right };
}

/** Индексы колонок, куда можно ставить следующую карточку, чтобы сохранить баланс левой/правой половины. */
function balancedColumnCandidates(
  firstCol: number,
  maxColIndex: number,
  starts: number[],
  colW: number,
  midX: number,
  n: number,
  rects: { l: number; r: number }[],
  minFrac: number
): number[] {
  if (n <= 1 || minFrac <= 0) {
    return Array.from({ length: maxColIndex - firstCol + 1 }, (_, i) => firstCol + i);
  }
  const minPer = Math.max(1, Math.ceil(n * minFrac));
  const rem = n - rects.length;
  const { left: L, right: R } = countByHalf(rects, midX);
  const needL = Math.max(0, minPer - L);
  const needR = Math.max(0, minPer - R);
  const mustOnlyLeft = needL >= rem;
  const mustOnlyRight = needR >= rem;
  const out: number[] = [];
  for (let c = firstCol; c <= maxColIndex; c++) {
    const colIsLeft = starts[c] + colW / 2 < midX;
    if (mustOnlyLeft && !colIsLeft) continue;
    if (mustOnlyRight && colIsLeft) continue;
    out.push(c);
  }
  if (out.length === 0) {
    return Array.from({ length: maxColIndex - firstCol + 1 }, (_, i) => firstCol + i);
  }
  return out;
}

type MosaicCoreConfig = {
  cols: number;
  firstCol: number;
  /** Правый край bbox карточки не должен заходить правее этого X */
  maxRightExclusive: number;
  itemOuter?: { w: number; h: number };
  /** Горизонтальный зазор между колонками сетки (и в minDx). По умолчанию GAP. */
  columnGap?: number;
  /** Шаг вертикальной сетки для случайного top (px). По умолчанию 6…12 от хэша seed. */
  stepY?: number;
  /** Доп. вертикальный зазор в проверке пересечений (px), сверх minDy. */
  verticalPadExtra?: number;
  /**
   * Доля проектов в каждой половине по X (центр bbox): в левой и в правой ≥ этого значения.
   * Для мобилки 2 колонки — чтобы не уезжали все превью в одну сторону.
   */
  balanceHalvesMinFraction?: number;
  /**
   * Мобилка: не ставить в колонку c, если последние столько размещений подряд были все в c
   * (например 3 — не более трёх карт подряд в одной колонке).
   */
  maxConsecutiveInSameColumn?: number;
};

function computeFlowMosaicCore(
  n: number,
  containerWidth: number,
  seed: string,
  cfg: MosaicCoreConfig
): FlowMosaicBox[] {
  if (n <= 0 || containerWidth < 200) return [];

  const gap = cfg.columnGap ?? GAP;
  const { colW, starts } = colStarts(cfg.cols, containerWidth, gap);
  const itemOuter = cfg.itemOuter ?? flowItemOuterSize();
  const bw = itemOuter.w;
  const bh = itemOuter.h;
  const padX = minDx(colW, gap);
  const padY = minDy(colW) + (cfg.verticalPadExtra ?? 0);
  const stepY =
    cfg.stepY ?? 6 + (hashSeed(`${seed}|mosaicStepY`) % 7); /* псевдослучайно 6…12 при смене seed */

  const rng = mulberry32(hashSeed(seed));

  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const placed: FlowMosaicBox[] = new Array(n);
  const rects: { l: number; t: number; r: number; b: number }[] = [];

  const minLeft = starts[cfg.firstCol];
  const maxRightExclusive = cfg.maxRightExclusive;

  let maxColIndex = cfg.firstCol;
  for (let c = cfg.firstCol; c < cfg.cols; c++) {
    if (starts[c] + bw <= maxRightExclusive + 0.5) maxColIndex = c;
  }

  const midX = containerWidth / 2;
  const balanceFrac = cfg.balanceHalvesMinFraction ?? 0;
  const maxColStreak = cfg.maxConsecutiveInSameColumn;
  const recentCols: number[] = [];

  function nearestColIndex(left: number): number {
    let bi = cfg.firstCol;
    let bd = Infinity;
    for (let c = cfg.firstCol; c <= maxColIndex; c++) {
      const d = Math.abs(starts[c] - left);
      if (d < bd) {
        bd = d;
        bi = c;
      }
    }
    return bi;
  }

  function filterColsByStreak(cols: number[]): number[] {
    if (!maxColStreak || cols.length === 0) return cols;
    const filtered = cols.filter(
      (c) => !(recentCols.length === maxColStreak && recentCols.every((x) => x === c))
    );
    return filtered.length ? filtered : cols;
  }

  for (const idx of order) {
    let best: FlowMosaicBox | null = null;
    let tries = 0;
    const maxTries = Math.min(420, 80 + n * 35);

    while (tries < maxTries && !best) {
      tries++;
      const allowedCols = filterColsByStreak(
        balancedColumnCandidates(cfg.firstCol, maxColIndex, starts, colW, midX, n, rects, balanceFrac)
      );
      const ci = allowedCols[Math.floor(rng() * allowedCols.length)];
      const left = Math.min(starts[ci], Math.max(minLeft, maxRightExclusive - bw));
      const yMax = 40 + n * Math.round(bh * 0.85);
      const top = Math.floor(rng() * Math.max(1, (yMax - bh) / stepY)) * stepY;

      const cand = { left, top, width: bw, height: bh };
      const r = { l: left, t: top, r: left + bw, b: top + bh };
      let hit = false;
      for (const q of rects) {
        if (overlaps(r, q, padX, padY)) {
          hit = true;
          break;
        }
      }
      if (!hit) best = cand;
    }

    if (!best) {
      let y = 0;
      const sweepCols = filterColsByStreak(
        balancedColumnCandidates(cfg.firstCol, maxColIndex, starts, colW, midX, n, rects, balanceFrac)
      );
      outer: for (let sweep = 0; sweep < 600 && !best; sweep++) {
        for (const ci of sweepCols) {
          const left = Math.min(starts[ci], Math.max(minLeft, maxRightExclusive - bw));
          const cand = { left, top: y, width: bw, height: bh };
          const r = { l: left, t: y, r: left + bw, b: y + bh };
          let hit = false;
          for (const q of rects) {
            if (overlaps(r, q, padX, padY)) {
              hit = true;
              break;
            }
          }
          if (!hit) {
            best = cand;
            break outer;
          }
        }
        y += stepY;
      }
    }

    if (!best) {
      const fbCols = filterColsByStreak(
        balancedColumnCandidates(cfg.firstCol, maxColIndex, starts, colW, midX, n, rects, balanceFrac)
      );
      const ncol = Math.max(1, fbCols.length);
      const row = Math.floor(idx / ncol);
      const ci = fbCols[idx % ncol];
      best = {
        left: Math.min(starts[ci], Math.max(minLeft, maxRightExclusive - bw)),
        top: row * (bh + padY),
        width: bw,
        height: bh
      };
    }

    placed[idx] = best;
    rects.push({
      l: best.left,
      t: best.top,
      r: best.left + best.width,
      b: best.top + best.height
    });
    if (maxColStreak) {
      recentCols.push(nearestColIndex(best.left));
      while (recentCols.length > maxColStreak) recentCols.shift();
    }
  }

  return placed;
}

/**
 * Десктоп: 12 колонок, зазор 8px; превью только в колонках 1…10 (0 и 11 пустые).
 */
export function computeFlowMosaicLayout(n: number, containerWidth: number, seed: string): FlowMosaicBox[] {
  const { starts } = colStarts(COLS_DESKTOP, containerWidth, GAP);
  const verticalPadExtra = 2 + (hashSeed(`${seed}|vpad`) % 5); /* 2…6 px к padY */
  return computeFlowMosaicCore(n, containerWidth, seed, {
    cols: COLS_DESKTOP,
    firstCol: COL_FIRST_DESKTOP,
    maxRightExclusive: starts[COL_LAST_EXCLUSIVE_DESKTOP],
    columnGap: GAP,
    verticalPadExtra
  });
}

export function flowMobileColWidth(layoutWidth: number): number {
  return (layoutWidth - (COLS_MOBILE - 1) * GAP_MOBILE) / COLS_MOBILE;
}

/** С ≥480px: симметричный inset слева/справа из {32, 48, 64} по seed. */
export function flowMobileContentInset(containerWidth: number, seed: string): number {
  if (containerWidth < 480) return 0;
  const opts = [32, 48, 64] as const;
  return opts[hashSeed(`${seed}|flowInset`) % 3];
}

export function flowMobileLayoutInnerWidth(containerWidth: number, seed: string): number {
  const inset = flowMobileContentInset(containerWidth, seed);
  return Math.max(200, containerWidth - 2 * inset);
}

/**
 * Сторона квадрата превью (внутри outline) на мобилке: 2 колонки, зазор 32px (до FLOW_CARD_INNER_PX).
 * `layoutWidth` — ширина полотна сетки (без боковых inset).
 */
export function flowMobileCardInnerSize(layoutWidth: number): number {
  const cw = flowMobileColWidth(layoutWidth);
  return Math.max(40, Math.min(CARD, Math.floor(cw - 2 * STROKE - 2)));
}

export function flowMobileItemOuterSize(layoutWidth: number): { w: number; h: number } {
  const inner = flowMobileCardInnerSize(layoutWidth);
  return {
    w: inner + 2 * STROKE,
    h: inner + 2 * STROKE + FLOW_MOSAIC_TITLE_BAND
  };
}

/**
 * Bbox для раскладки мозаики на мобилке: только квадрат превью + outline (без полосы подписи),
 * чтобы вертикальный шаг строк совпадал с высотой картинки.
 */
export function flowMobileMosaicItemOuter(layoutWidth: number): { w: number; h: number } {
  const inner = flowMobileCardInnerSize(layoutWidth);
  return {
    w: inner + 2 * STROKE,
    h: inner + 2 * STROKE
  };
}

/**
 * Мобилка: 2 колонки, зазор 32px; крайние колонки можно занимать; до 2 превью в ряд — через padX (не соприкасаются).
 */
export function computeFlowMobileMosaicLayout(n: number, containerWidth: number, seed: string): FlowMosaicBox[] {
  const innerW = flowMobileLayoutInnerWidth(containerWidth, seed);
  const inset = flowMobileContentInset(containerWidth, seed);
  const verticalPadExtra = 2 + (hashSeed(`${seed}\nmobile|vpad`) % 5); /* 2…6 px к padY */
  const boxes = computeFlowMosaicCore(n, innerW, `${seed}\nmobile`, {
    cols: COLS_MOBILE,
    firstCol: 0,
    maxRightExclusive: innerW,
    itemOuter: flowMobileMosaicItemOuter(innerW),
    columnGap: GAP_MOBILE,
    verticalPadExtra,
    balanceHalvesMinFraction: 0.3,
    maxConsecutiveInSameColumn: 3
  });
  if (inset === 0) return boxes;
  return boxes.map((b) => ({ ...b, left: b.left + inset }));
}

/** `extraFooter` — например FLOW_MOSAIC_TITLE_BAND на мобилке при видимых подписях (подпись ниже bbox превью). */
export function flowMosaicContentHeight(boxes: FlowMosaicBox[], extraFooter = 0): number {
  if (boxes.length === 0) return 200;
  let m = 0;
  for (const b of boxes) m = Math.max(m, b.top + b.height + extraFooter);
  return Math.ceil(m + 48);
}
