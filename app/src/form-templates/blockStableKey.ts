import { randomUUID } from "node:crypto";

export const blockStableKeyPattern = /^blk_[a-f0-9]{32}$/;

export type UuidGenerator = () => string;

export function generateBlockStableKey(
  uuidGenerator: UuidGenerator = randomUUID,
): string {
  return `blk_${uuidGenerator().replaceAll("-", "").toLowerCase()}`;
}

export function isValidBlockStableKey(stableKey: string): boolean {
  return (
    stableKey.length <= 60 &&
    /^[\x00-\x7F]+$/.test(stableKey) &&
    blockStableKeyPattern.test(stableKey)
  );
}
