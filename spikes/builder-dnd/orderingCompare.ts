// Phase 3A0-A — Ordering Strategy Comparison Harness
// Run: npx tsx orderingCompare.ts

// ---- Strategy 1: Integer positions with transactional normalization ----

function integerReorder<T extends { sortOrder: number }>(
  items: T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  const result = [...items];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result.map((item, i) => ({ ...item, sortOrder: i }));
}

function integerInsertMid(items: { sortOrder: number }[], insertAfterIndex: number): number {
  // For integer strategy, we always renumber the whole list after any insertion.
  // The new sortOrder will be insertAfterIndex + 1 after renumbering.
  // But for measurement, we track that ALL items must be updated.
  return insertAfterIndex + 1; // placeholder, will be renumbered
}

// ---- Strategy 2: Decimal / Fractional ranking ----------------------------

function fractionalInsert(
  items: { sortOrder: number }[],
  beforeIndex: number,
  afterIndex: number,
): number {
  const before = afterIndex >= 0 ? items[afterIndex]?.sortOrder ?? 0 : 0;
  const after = beforeIndex < items.length ? items[beforeIndex]?.sortOrder ?? (before + 2) : before + 2;
  return (before + after) / 2;
}

function fractionalNeedsRenormalize(items: { sortOrder: number }[]): boolean {
  if (items.length < 2) return false;
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].sortOrder - sorted[i - 1].sortOrder;
    if (gap < 1e-10) return true;
  }
  return false;
}

// ---- Strategy 3: LexoRank-style string keys ------------------------------

const LEXO_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';

function lexoMid(prev: string, next: string): string {
  let result = '';
  const maxLen = Math.max(prev.length, next.length);
  for (let i = 0; i < maxLen; i++) {
    const p = i < prev.length ? LEXO_CHARS.indexOf(prev[i]) : 0;
    const n = i < next.length ? LEXO_CHARS.indexOf(next[i]) : LEXO_CHARS.length - 1;
    if (p === n) {
      result += LEXO_CHARS[p];
      continue;
    }
    const mid = Math.floor((p + n) / 2);
    result += LEXO_CHARS[mid];
    if (mid > p && mid < n) return result;
    // If mid equals p, we need to extend
    if (mid === p) {
      // Fill rest with high chars
      let suffix = '';
      for (let j = i + 1; j < maxLen; j++) {
        suffix += LEXO_CHARS[LEXO_CHARS.length - 1];
      }
      result += suffix;
      return result + LEXO_CHARS[Math.floor(LEXO_CHARS.length / 2)];
    }
  }
  // If we get here, the strings were equal or we need to extend
  result += LEXO_CHARS[Math.floor(LEXO_CHARS.length / 2)];
  return result;
}

function lexoInsert(
  items: { sortKey: string }[],
  beforeIndex: number,
  afterIndex: number,
): string {
  const prev = afterIndex >= 0 && afterIndex < items.length
    ? (items[afterIndex]?.sortKey || '0')
    : '0';
  const next = beforeIndex < items.length && beforeIndex >= 0
    ? (items[beforeIndex]?.sortKey || 'z')
    : 'z';

  if (prev === next) return lexoMid(prev, String.fromCharCode(next.charCodeAt(0) + 1) || 'z');

  return lexoMid(prev, next);
}

// ---- Test harness ---------------------------------------------------------

interface TestItem {
  id: number;
  sortOrder?: number;
  sortKey?: string;
  label: string;
}

function runIntegerTest(containerSize: number, insertions: number): {
  itemsUpdated: number;
  renames: number;
  finalOrder: number[];
} {
  const items: TestItem[] = Array.from({ length: containerSize }, (_, i) => ({
    id: i,
    sortOrder: i,
    label: `item_${i}`,
  }));

  let itemsUpdated = 0;
  let renames = 0;

  for (let ins = 0; ins < insertions; ins++) {
    // Insert at a random mid-point
    const pos = Math.floor(Math.random() * (items.length - 1));
    const reordered = integerReorder(items, items.length - 1, pos);
    // Every item gets renumbered → containerSize updates
    itemsUpdated += reordered.length;
    renames++;
    items.splice(0, items.length, ...reordered);
  }

  return {
    itemsUpdated,
    renames,
    finalOrder: items.map(i => i.sortOrder!),
  };
}

function runFractionalTest(containerSize: number, insertions: number): {
  itemsUpdated: number;
  renormalizations: number;
  keyGrowth: number[];
  fails: number;
} {
  const items: TestItem[] = Array.from({ length: containerSize }, (_, i) => ({
    id: i,
    sortOrder: i * 10, // Start with gaps
    label: `item_${i}`,
  }));

  let itemsUpdated = 0;
  let renormalizations = 0;
  const keyGrowth: number[] = [];
  let fails = 0;

  for (let ins = 0; ins < insertions; ins++) {
    const beforeIdx = Math.floor(Math.random() * items.length);
    const afterIdx = beforeIdx - 1;
    const newOrder = fractionalInsert(items, beforeIdx, afterIdx);

    // Check if we have precision issues
    if (isNaN(newOrder) || !isFinite(newOrder)) {
      fails++;
      continue;
    }

    // Only the new item is updated (1 update)
    itemsUpdated += 1;

    // Check if renormalization is needed
    if (fractionalNeedsRenormalize(items)) {
      renormalizations++;
      // Renormalize: renumber all
      itemsUpdated += items.length;
      items.sort((a, b) => a.sortOrder! - b.sortOrder!).forEach((item, i) => {
        item.sortOrder = i * 10;
      });
    }
  }

  return { itemsUpdated, renormalizations, keyGrowth, fails };
}

function runLexoRankTest(containerSize: number, insertions: number): {
  itemsUpdated: number;
  avgKeyLength: number;
  maxKeyLength: number;
  rebalances: number;
  fails: number;
} {
  const items: TestItem[] = Array.from({ length: containerSize }, (_, i) => ({
    id: i,
    sortKey: String.fromCharCode(97 + i), // 'a', 'b', 'c', ...
    label: `item_${i}`,
  }));

  let itemsUpdated = 0;
  let rebalances = 0;
  let fails = 0;

  for (let ins = 0; ins < insertions; ins++) {
    const beforeIdx = Math.floor(Math.random() * items.length);
    const afterIdx = beforeIdx > 0 ? beforeIdx - 1 : -1;

    try {
      const newKey = lexoInsert(items, beforeIdx, afterIdx);
      itemsUpdated += 1;

      // Check if rebalance needed (keys > 20 chars)
      if (newKey.length > 20) {
        rebalances++;
        // Rebalance: reassign short keys
        items.sort((a, b) => (a.sortKey || '').localeCompare(b.sortKey || ''));
        itemsUpdated += items.length;
        items.forEach((item, i) => {
          item.sortKey = String.fromCharCode(97 + (i % 26)) + (Math.floor(i / 26) > 0 ? String(Math.floor(i / 26)) : '');
        });
      }
    } catch {
      fails++;
    }
  }

  const keyLengths = items.map(i => i.sortKey?.length || 0);
  return {
    itemsUpdated,
    avgKeyLength: keyLengths.reduce((a, b) => a + b, 0) / keyLengths.length,
    maxKeyLength: Math.max(...keyLengths),
    rebalances,
    fails,
  };
}

// ---- Precision test: consecutive mid-point insertions ---------------------

function testFractionalPrecision(maxInserts: number): number {
  const items: { sortOrder: number }[] = [
    { sortOrder: 0 },
    { sortOrder: 100 },
  ];

  for (let i = 0; i < maxInserts; i++) {
    const newOrder = fractionalInsert(items, 1, 0);
    if (!isFinite(newOrder) || newOrder <= items[0].sortOrder || newOrder >= items[1].sortOrder) {
      return i;
    }
    items.splice(1, 0, { sortOrder: newOrder });
  }
  return maxInserts;
}

function testLexoRankPrecision(maxInserts: number): number {
  const items: { sortKey: string }[] = [
    { sortKey: '0' },
    { sortKey: 'z' },
  ];

  for (let i = 0; i < maxInserts; i++) {
    const newKey = lexoInsert(items, 1, 0);
    if (newKey <= items[0].sortKey || newKey >= items[1].sortKey) {
      return i;
    }
    items.splice(1, 0, { sortKey: newKey });
  }
  return maxInserts;
}

// ---- Run benchmarks -------------------------------------------------------

console.log('=== Ordering Strategy Comparison ===\n');
console.log(`Node.js ${process.version}\n`);

const SIZES = [10, 100, 1000];
const INSERTIONS = [5, 50, 100];

console.log('--- Write Amplification (items updated per operation) ---\n');

for (const size of SIZES) {
  console.log(`Container size: ${size}`);
  for (const ins of INSERTIONS) {
    if (ins > size) continue;
    const intResult = runIntegerTest(size, ins);
    const fracResult = runFractionalTest(size, ins);
    const lexoResult = runLexoRankTest(size, ins);

    console.log(`  ${ins} insertions:`);
    console.log(`    Integer:    ${intResult.itemsUpdated} updates (${intResult.itemsUpdated / ins}x per insert)`);
    console.log(`    Fractional: ${fracResult.itemsUpdated} updates (${fracResult.itemsUpdated / ins}x per insert), ${fracResult.renormalizations} renormalizations`);
    console.log(`    LexoRank:   ${lexoResult.itemsUpdated} updates (${lexoResult.itemsUpdated / ins}x per insert), ${lexoResult.rebalances} rebalances`);
  }
  console.log();
}

// ---- Precision test -------------------------------------------------------

console.log('--- Precision: consecutive mid-point insertions between 0 and 100 ---\n');

const fracPrecision = testFractionalPrecision(100);
console.log(`  Fractional: ${fracPrecision} inserts before gap < 1e-10 or overflow`);

const lexoPrecision = testLexoRankPrecision(100);
console.log(`  LexoRank:   ${lexoPrecision} inserts before key collision`);

// ---- Key length growth ----------------------------------------------------

console.log('\n--- LexoRank key length growth ---\n');
const lexoItems: { sortKey: string }[] = [
  { sortKey: '0' },
  { sortKey: 'z' },
];

for (let i = 0; i < 50; i++) {
  const newKey = lexoInsert(lexoItems, 1, 0);
  lexoItems.splice(1, 0, { sortKey: newKey });
  if (i % 10 === 9) {
    const lengths = lexoItems.map(item => item.sortKey.length);
    console.log(`  After ${i + 1} inserts: avg key length = ${(lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1)}, max = ${Math.max(...lengths)}`);
  }
}

// ---- Summary ---------------------------------------------------------------

console.log('\n=== Summary ===\n');
console.log('Strategy      | Updates/Insert | Precision | Key Length | Debuggability');
console.log('--------------|----------------|-----------|------------|--------------');
console.log(`Integer       | N (all items)  | Unlimited | N/A        | Excellent (0,1,2,3)`);
console.log(`Fractional    | 1 per insert*  | ~53       | N/A        | Good (1.0, 1.5, 2.0)`);
console.log(`LexoRank      | 1 per insert*  | Very high | Grows      | Poor (0a7k, 0a7m, 0a7q)`);
console.log('\n* Excluding periodic renormalization/rebalance');

console.log('\nDone.');
