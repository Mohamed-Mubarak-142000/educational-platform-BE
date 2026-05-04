import crypto from "crypto";

/**
 * Paymob HMAC verification — field order is mandated by Paymob spec.
 * Concatenate the string values in this exact order, then HMAC-SHA512.
 */
const HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

/**
 * Resolve a dotted path like "order.id" from a nested object.
 */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && !Array.isArray(acc)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Verify the HMAC signature sent by Paymob in the `hmac` query param.
 * Returns true if the signature is valid, false otherwise.
 */
export function verifyPaymobHmac(
  transactionObj: Record<string, unknown>,
  receivedHmac: string,
): boolean {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret) {
    throw new Error("PAYMOB_HMAC_SECRET env variable is not set");
  }

  const concatenated = HMAC_FIELDS.map((field) => {
    const val = resolvePath(transactionObj, field);
    if (val === undefined || val === null) return "";
    return String(val);
  }).join("");

  const expected = crypto
    .createHmac("sha512", secret)
    .update(concatenated)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(receivedHmac, "hex"),
    );
  } catch {
    return false;
  }
}
