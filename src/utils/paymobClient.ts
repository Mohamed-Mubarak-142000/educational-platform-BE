/**
 * Paymob Accept v1 API client.
 * Wraps the three-step payment key flow: auth → order → payment key.
 */

const PAYMOB_BASE = "https://accept.paymobsolutions.com/api";
const IFRAME_BASE = "https://accept.paymobsolutions.com/api/acceptance/iframes";

interface PaymobAuthResponse {
  token: string;
}

interface PaymobOrderResponse {
  id: string | number;
}

interface PaymobPaymentKeyResponse {
  token: string;
}

async function paymobPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${PAYMOB_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as T & { detail?: string; message?: string };
  if (!res.ok) {
    throw new Error(
      `Paymob API error [${res.status}] on ${path}: ${data.detail ?? data.message ?? JSON.stringify(data)}`,
    );
  }
  return data as T;
}

/**
 * Step 1 — Authenticate and get a short-lived auth token.
 */
export async function getPaymobAuthToken(): Promise<string> {
  const apiKey = process.env.PAYMOB_API_KEY;
  if (!apiKey) throw new Error("PAYMOB_API_KEY env variable is not set");

  const response = await paymobPost<PaymobAuthResponse>("/auth/tokens", {
    api_key: apiKey,
  });
  return response.token;
}

/**
 * Step 2 — Register an order in Paymob and return the order ID.
 */
export async function createPaymobOrder(
  authToken: string,
  amountCents: number,
  currency: string,
  merchantOrderId: string,
): Promise<string> {
  const response = await paymobPost<PaymobOrderResponse>("/ecommerce/orders", {
    auth_token: authToken,
    delivery_needed: false,
    amount_cents: amountCents,
    currency,
    merchant_order_id: merchantOrderId,
    items: [],
  });
  return String(response.id);
}

/**
 * Step 3 — Obtain a payment key (token) for the iframe.
 */
export async function getPaymobPaymentKey(
  authToken: string,
  amountCents: number,
  orderId: string,
  currency: string,
  billingData: Record<string, string>,
): Promise<string> {
  const integrationId = process.env.PAYMOB_INTEGRATION_ID;
  if (!integrationId)
    throw new Error("PAYMOB_INTEGRATION_ID env variable is not set");

  const response = await paymobPost<PaymobPaymentKeyResponse>(
    "/acceptance/payment_keys",
    {
      auth_token: authToken,
      amount_cents: amountCents,
      expiration: 3600,
      order_id: orderId,
      billing_data: billingData,
      currency,
      integration_id: Number(integrationId),
    },
  );
  return response.token;
}

/**
 * Build the hosted-checkout iframe URL.
 */
export function buildIframeUrl(paymentKey: string): string {
  const iframeId = process.env.PAYMOB_IFRAME_ID;
  if (!iframeId) throw new Error("PAYMOB_IFRAME_ID env variable is not set");
  return `${IFRAME_BASE}/${iframeId}?payment_token=${paymentKey}`;
}

/**
 * Full three-step flow: returns { paymobOrderId, iframeUrl }.
 */
export async function initiatePaymobCheckout(
  amountCents: number,
  currency: string,
  merchantOrderId: string,
  billingData: Record<string, string>,
): Promise<{ paymobOrderId: string; iframeUrl: string }> {
  const authToken = await getPaymobAuthToken();
  const paymobOrderId = await createPaymobOrder(
    authToken,
    amountCents,
    currency,
    merchantOrderId,
  );
  const paymentKey = await getPaymobPaymentKey(
    authToken,
    amountCents,
    paymobOrderId,
    currency,
    billingData,
  );
  const iframeUrl = buildIframeUrl(paymentKey);
  return { paymobOrderId, iframeUrl };
}
