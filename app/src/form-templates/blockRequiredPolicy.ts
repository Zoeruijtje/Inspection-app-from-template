import { HttpError } from "wasp/server";
import { isDisplayOnlyBaselineBlockType } from "./blockRequiredPolicyRules";

export { isDisplayOnlyBaselineBlockType };

export function assertBlockRequiredPolicy(
  blockType: string,
  required: boolean,
): void {
  if (required && isDisplayOnlyBaselineBlockType(blockType)) {
    throw new HttpError(400, "Display blocks cannot be required.");
  }
}
