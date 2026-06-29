/**
 * Pure block required-policy predicate.
 *
 * This module intentionally does NOT import "wasp/server" so it can be
 * used from both server-side operations and pure validation modules.
 */

const displayOnlyBlockTypes = new Set(["heading", "paragraph"]);

/**
 * Returns true when the block type is a display/content type that
 * should never be marked as required.
 */
export function isDisplayOnlyBaselineBlockType(blockType: string): boolean {
  return displayOnlyBlockTypes.has(blockType);
}
