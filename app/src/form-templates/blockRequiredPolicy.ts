import { HttpError } from "wasp/server";

const displayOnlyBlockTypes = new Set(["heading", "paragraph"]);

export function isDisplayOnlyBaselineBlockType(blockType: string): boolean {
  return displayOnlyBlockTypes.has(blockType);
}

export function assertBlockRequiredPolicy(
  blockType: string,
  required: boolean,
): void {
  if (required && isDisplayOnlyBaselineBlockType(blockType)) {
    throw new HttpError(400, "Display blocks cannot be required.");
  }
}

// Phase 3A-4C1 keeps this explicit baseline policy local. If future block
// families outgrow this list, promote response-kind capability into the
// controlled block registry.
