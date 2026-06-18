import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import type { MemoryMeasurement } from './types.js';

const execFileAsync = promisify(execFile);

interface ProcessRow {
  pid: number;
  ppid: number;
  rssBytes: number;
  command: string;
}

export function nowMs(): number {
  return Number(process.hrtime.bigint() / 1_000_000n);
}

export async function getDirectorySizeBytes(dir: string): Promise<number | null> {
  try {
    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) return stat.size;
    let total = 0;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        total += (await getDirectorySizeBytes(child)) ?? 0;
      } else if (entry.isFile()) {
        total += (await fs.stat(child)).size;
      }
    }
    return total;
  } catch {
    return null;
  }
}

export async function getFileSizeBytes(filePath: string | null): Promise<number | null> {
  if (!filePath) return null;
  try {
    return (await fs.stat(filePath)).size;
  } catch {
    return null;
  }
}

export class MemorySampler {
  private readonly samples: number[] = [];
  private timer: NodeJS.Timeout | null = null;
  private diagnostic: string | null = null;

  constructor(
    private readonly rootPid: number | null,
    private readonly samplingIntervalMs = 100
  ) {}

  start(): void {
    if (!this.rootPid) {
      this.diagnostic = 'Chromium process PID was unavailable; process-tree RSS was not measured.';
      return;
    }

    this.timer = setInterval(() => {
      void this.sample();
    }, this.samplingIntervalMs);
  }

  async stop(): Promise<MemoryMeasurement> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.sample();

    return {
      peakProcessTreeRssBytes: this.samples.length > 0 ? Math.max(...this.samples) : null,
      measurementMethod: 'Linux/WSL best-effort ps -eo pid,ppid,rss,comm,args; descend from Playwright browser process PID and sum RSS.',
      samplingIntervalMs: this.rootPid ? this.samplingIntervalMs : null,
      diagnostic: this.diagnostic
    };
  }

  private async sample(): Promise<void> {
    if (!this.rootPid) return;
    try {
      const rows = await listProcesses();
      const tree = collectProcessTree(rows, this.rootPid);
      if (tree.length === 0) {
        this.diagnostic = `No process rows found for Chromium root PID ${this.rootPid}.`;
        return;
      }
      this.samples.push(tree.reduce((total, row) => total + row.rssBytes, 0));
    } catch (error) {
      this.diagnostic = `RSS sampling failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

async function listProcesses(): Promise<ProcessRow[]> {
  const { stdout } = await execFileAsync('ps', ['-eo', 'pid=,ppid=,rss=,comm=,args='], { maxBuffer: 1024 * 1024 * 5 });
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s*(.*)$/);
      if (!match) return null;
      return {
        pid: Number(match[1]),
        ppid: Number(match[2]),
        rssBytes: Number(match[3]) * 1024,
        command: `${match[4]} ${match[5] ?? ''}`.trim()
      };
    })
    .filter((row): row is ProcessRow => row !== null);
}

function collectProcessTree(rows: ProcessRow[], rootPid: number): ProcessRow[] {
  const byParent = new Map<number, ProcessRow[]>();
  for (const row of rows) {
    const siblings = byParent.get(row.ppid) ?? [];
    siblings.push(row);
    byParent.set(row.ppid, siblings);
  }

  const collected: ProcessRow[] = [];
  const queue = [rootPid];
  const seen = new Set<number>();

  while (queue.length > 0) {
    const pid = queue.shift();
    if (pid === undefined || seen.has(pid)) continue;
    seen.add(pid);

    const row = rows.find((candidate) => candidate.pid === pid);
    if (row) collected.push(row);

    for (const child of byParent.get(pid) ?? []) {
      queue.push(child.pid);
    }
  }

  return collected;
}
