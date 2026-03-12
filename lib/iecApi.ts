/**
 * Server-only IEC + Okta API helpers.
 * Never import this file from client components.
 */

const OKTA_BASE = "https://iec-ext.okta.com";
const OKTA_CLIENT_ID = "0oaqf6zr7yEcQZqqt2p7";
const OKTA_REDIRECT_URI = "com.iecrn:/";
const IEC_API_BASE = "https://iecapi.iec.co.il/api";

// --------------------------------------------------------------------------
// PKCE helpers (Node webcrypto — available in Next.js API routes)
// --------------------------------------------------------------------------

function base64url(buf: ArrayBuffer): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function generatePkce(): Promise<{ verifier: string; challenge: string }> {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(96));
  const verifier = base64url(verifierBytes.buffer);
  const challengeBytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  const challenge = base64url(challengeBytes);
  return { verifier, challenge };
}

// --------------------------------------------------------------------------
// Cookie encryption helpers (AES-256-GCM)
// --------------------------------------------------------------------------

async function getCookieKey(): Promise<CryptoKey> {
  const secret = process.env.IEC_COOKIE_SECRET;
  if (!secret) throw new Error("IEC_COOKIE_SECRET env var is not set");
  const keyBytes = Buffer.from(secret, "hex");
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptCookiePayload(payload: object): Promise<string> {
  const key = await getCookieKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  // iv:ciphertext — both base64url encoded
  return `${base64url(iv.buffer)}.${base64url(encrypted)}`;
}

export async function decryptCookiePayload<T>(token: string): Promise<T> {
  const [ivB64, dataB64] = token.split(".");
  if (!ivB64 || !dataB64) throw new Error("Invalid session cookie format");
  const key = await getCookieKey();
  const iv = Buffer.from(ivB64.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const data = Buffer.from(
    dataB64.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}

// --------------------------------------------------------------------------
// Okta auth
// --------------------------------------------------------------------------

export async function oktaInitLogin(
  israeliId: string
): Promise<{ factorId: string; stateToken: string }> {
  const res = await fetch(`${OKTA_BASE}/api/v1/authn`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      username: israeliId,
      options: { multiOptionalFactorEnroll: false, warnBeforePasswordExpired: false },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new IecApiError(`Okta login failed (${res.status}): ${body}`, res.status);
  }

  const json = await res.json();

  console.log("[IEC login] Okta status:", json.status);
  console.log("[IEC login] Okta stateToken present:", !!json.stateToken);

  // Find the first SMS or email factor
  const factors: Array<{ id: string; factorType: string; provider?: string }> = json?.["_embedded"]?.["factors"] ?? [];
  console.log("[IEC login] factors:", JSON.stringify(factors.map(f => ({ id: f.id, factorType: f.factorType, provider: f.provider }))));

  const factor = factors.find(
    (f) => f.factorType === "sms" || f.factorType === "email" || f.factorType === "token:software:totp"
  ) ?? factors[0];

  if (!factor) throw new IecApiError("No MFA factor found on this account", 400);

  console.log("[IEC login] selected factor:", factor.id, factor.factorType);

  // Trigger OTP delivery by issuing a challenge (verify with no passCode)
  const challengeRes = await fetch(
    `${OKTA_BASE}/api/v1/authn/factors/${factor.id}/verify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ stateToken: json.stateToken }),
    }
  );
  const challengeJson = await challengeRes.json();
  console.log("[IEC login] challenge status:", challengeJson.status);

  return { factorId: factor.id, stateToken: challengeJson.stateToken ?? json.stateToken };
}

export async function oktaVerifyOtp(
  factorId: string,
  stateToken: string,
  otpCode: string
): Promise<string> {
  const res = await fetch(
    `${OKTA_BASE}/api/v1/authn/factors/${factorId}/verify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ stateToken, passCode: otpCode }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new IecApiError(`OTP verification failed (${res.status}): ${body}`, res.status);
  }

  const json = await res.json();
  const sessionToken: string | undefined = json.sessionToken;
  if (!sessionToken) throw new IecApiError("No sessionToken in Okta response", 500);
  return sessionToken;
}

export async function oktaPkceExchange(sessionToken: string): Promise<{ idToken: string; accessToken: string }> {
  const { verifier, challenge } = await generatePkce();
  const state = base64url(crypto.getRandomValues(new Uint8Array(16)).buffer);

  // Step 1: authorize → Okta returns an HTML form_post page with a hidden <input name="code">
  const authorizeUrl = new URL(`${OKTA_BASE}/oauth2/default/v1/authorize`);
  authorizeUrl.searchParams.set("client_id", OKTA_CLIENT_ID);
  authorizeUrl.searchParams.set("response_type", "id_token code");
  authorizeUrl.searchParams.set("response_mode", "form_post");
  authorizeUrl.searchParams.set("scope", "openid email profile offline_access");
  authorizeUrl.searchParams.set("redirect_uri", OKTA_REDIRECT_URI);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("nonce", "abc123");
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("sessionToken", sessionToken);

  const authorizeRes = await fetch(authorizeUrl.toString(), {
    method: "GET",
    headers: { Accept: "text/html" },
  });

  const html = await authorizeRes.text();
  // Okta posts back an HTML page with a hidden form containing the auth code
  const codeMatch = html.match(/<input[^>]+name="code"[^>]+value="([^"]+)"/);
  const code = codeMatch?.[1];
  if (!code) {
    console.error("[IEC pkce] authorize HTML snippet:", html.slice(0, 800));
    throw new IecApiError(`No auth code in Okta form_post response (status ${authorizeRes.status})`, 500);
  }

  // Step 2: exchange code for tokens
  const tokenRes = await fetch(`${OKTA_BASE}/oauth2/default/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: OKTA_CLIENT_ID,
      redirect_uri: OKTA_REDIRECT_URI,
      code,
      code_verifier: verifier,
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new IecApiError(`Token exchange failed (${tokenRes.status}): ${body}`, tokenRes.status);
  }

  const tokens = await tokenRes.json();
  console.log("[IEC pkce] token keys:", Object.keys(tokens));
  const idToken: string | undefined = tokens.id_token;
  const accessToken: string | undefined = tokens.access_token;
  if (!idToken) throw new IecApiError("No id_token in token response", 500);
  if (!accessToken) throw new IecApiError("No access_token in token response", 500);

  // Decode JWT payload (base64url → JSON) to inspect claims
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString());
    console.log("[IEC pkce] id_token claims: iss=%s aud=%s sub=%s", payload.iss, JSON.stringify(payload.aud), payload.sub);
    const payloadAt = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString());
    console.log("[IEC pkce] access_token claims: iss=%s aud=%s", payloadAt.iss, JSON.stringify(payloadAt.aud));
  } catch { /* ignore decode errors */ }

  return { idToken, accessToken };
}

// --------------------------------------------------------------------------
// IEC data API
// --------------------------------------------------------------------------

function iecHeaders(idToken: string, _israeliId: string, _accessToken?: string): Record<string, string> {
  return {
    Authorization: `Bearer ${idToken}`,
    Accept: "application/json, text/plain, */*",
    "accept-language": "en,he;q=0.9",
    "Content-Type": "application/json",
    "dnt": "1",
    "origin": "https://www.iec.co.il",
    "referer": "https://www.iec.co.il/",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "x-iec-idt": "1",
    "x-iec-webview": "1",
  };
}

export async function iecGetCustomer(
  idToken: string,
  accessToken: string,
  israeliId: string
): Promise<{ bpNumber: string; firstName: string; lastName: string }> {
  const headers = iecHeaders(idToken, israeliId, accessToken);
  console.log("[IEC customer] sending to", `${IEC_API_BASE}/customer`, "Authorization starts with Bearer", idToken.slice(0, 20));
  const res = await fetch(`${IEC_API_BASE}/customer`, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const hdrs: Record<string, string> = {};
    res.headers.forEach((v, k) => { hdrs[k] = v; });
    console.error("[IEC customer] status:", res.status, "headers:", JSON.stringify(hdrs), "body:", body.slice(0, 500));
    throw new IecApiError(`IEC customer fetch failed (${res.status})`, res.status);
  }
  const json = await res.json();
  const data = json.data ?? json;
  const result = {
    bpNumber: String(data.bpNumber ?? data.BpNumber ?? ""),
    firstName: String(data.firstName ?? data.FirstName ?? ""),
    lastName: String(data.lastName ?? data.LastName ?? ""),
  };
  console.log("[IEC customer] success:", JSON.stringify(result));
  return result;
}

export async function iecGetContract(
  idToken: string,
  accessToken: string,
  israeliId: string,
  bpNumber: string
): Promise<{ contractId: string }> {
  const res = await fetch(
    `${IEC_API_BASE}/customer/contract/${bpNumber}?count=1`,
    { headers: iecHeaders(idToken, israeliId, accessToken) }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[IEC contract] status:", res.status, "body:", body.slice(0, 300));
    throw new IecApiError(`IEC contract fetch failed (${res.status})`, res.status);
  }
  const json = await res.json();
  console.log("[IEC contract] raw response:", JSON.stringify(json).slice(0, 500));
  const contractsData = json.data ?? json;
  const contracts: Array<Record<string, unknown>> = contractsData.contracts ?? contractsData.Contracts ?? [];
  const contract = contracts[0];
  if (!contract) throw new IecApiError("No contracts found for this account", 404);

  const contractId = String(contract.contractId ?? contract.ContractId ?? "");
  return { contractId };
}

export async function iecGetDevices(
  idToken: string,
  accessToken: string,
  israeliId: string,
  contractId: string
): Promise<{ meterSerial: string; meterCode: string }> {
  const res = await fetch(
    `${IEC_API_BASE}/Device/${contractId}`,
    { headers: iecHeaders(idToken, israeliId, accessToken) }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[IEC devices] status:", res.status, "body:", body.slice(0, 300));
    throw new IecApiError(`IEC devices fetch failed (${res.status})`, res.status);
  }
  const json = await res.json();
  console.log("[IEC devices] raw response:", JSON.stringify(json).slice(0, 500));
  const devicesData = json.data ?? json;
  const devices: Array<Record<string, unknown>> = Array.isArray(devicesData)
    ? devicesData
    : devicesData.devices ?? devicesData.Devices ?? [];
  const device = devices[0];
  if (!device) throw new IecApiError("No devices found for this contract", 404);

  const meterSerial = String(device.deviceNumber ?? device.DeviceNumber ?? device.serialNumber ?? "");
  const meterCode = String(device.deviceCode ?? device.DeviceCode ?? "");
  console.log("[IEC devices] meterSerial:", meterSerial, "meterCode:", meterCode);
  return { meterSerial, meterCode };
}

export interface BillingPeriod {
  fromDate: string;    // "YYYY-MM-DD" — start of billing period
  toDate: string;      // "YYYY-MM-DD" — end of billing period
  consumption: number; // total kWh for this billing period
}

export async function iecGetInvoices(
  idToken: string,
  accessToken: string,
  israeliId: string,
  contractId: string,
  bpNumber: string
): Promise<BillingPeriod[]> {
  const res = await fetch(
    `${IEC_API_BASE}/BillingCollection/invoices/${contractId}/${bpNumber}`,
    { headers: iecHeaders(idToken, israeliId, accessToken) }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[IEC invoices] status:", res.status, "body:", body.slice(0, 300));
    throw new IecApiError(`IEC invoices fetch failed (${res.status})`, res.status);
  }
  const json = await res.json();
  console.log("[IEC invoices] raw response (first 500):", JSON.stringify(json).slice(0, 500));
  const invoicesData = json.data ?? json;
  const invoices: Array<Record<string, unknown>> = Array.isArray(invoicesData)
    ? invoicesData
    : invoicesData.invoices ?? invoicesData.Invoices ?? [];

  return invoices
    .map((inv) => ({
      fromDate: String(inv.fromDate ?? inv.FromDate ?? "").slice(0, 10),
      toDate: String(inv.toDate ?? inv.ToDate ?? inv.fullDate ?? inv.FullDate ?? "").slice(0, 10),
      consumption: Number(inv.consumption ?? inv.Consumption ?? 0),
    }))
    .filter((inv) => inv.fromDate && inv.toDate);
}

export interface PeriodConsumption {
  interval: string; // ISO 8601 timestamp
  consumption: number; // kWh
}

export async function iecGetConsumption(
  idToken: string,
  accessToken: string,
  israeliId: string,
  contractId: string,
  meterSerial: string,
  meterCode: string,
  fromDate: string,        // "YYYY-MM-DD" — the specific day to fetch
  lastInvoiceDate: string, // "YYYY-MM-DD" — MUST be the most recent invoice's toDate
  resolution: number = 1,  // 1 = 15-min intervals for one day; 3 = daily intervals for one month
  debug = false            // if true, logs the first raw response (use for first call only)
): Promise<PeriodConsumption[]> {
  const body: Record<string, unknown> = {
    contractNumber: contractId,
    fromDate,
    lastInvoiceDate,
    resolution,
    smartMetersList: [
      {
        meterKind: "Consumption",
        meterCode: meterCode || "1",
        meterSerial: meterSerial || "",
      },
    ],
  };

  const res = await fetch(
    `${IEC_API_BASE}/Consumption/RemoteReadingRange/${contractId}`,
    {
      method: "POST",
      headers: iecHeaders(idToken, israeliId, accessToken),
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error(`[IEC consumption] ${fromDate} → ${res.status}: ${errBody.slice(0, 200)}`);
    throw new IecApiError(`IEC consumption fetch failed (${res.status})`, res.status);
  }

  const json = await res.json();

  if (debug) {
    console.log("[IEC consumption DEBUG] first raw response:", JSON.stringify(json).slice(0, 600));
  }

  const responseData = json.data ?? json;
  const meterList: Array<Record<string, unknown>> =
    responseData.meterList ?? responseData.MeterList ?? [];
  const meter = meterList[0];
  if (!meter) return [];

  const periodConsumptions: Array<Record<string, unknown>> =
    (meter.periodConsumptions as Array<Record<string, unknown>>) ??
    (meter.PeriodConsumptions as Array<Record<string, unknown>>) ?? [];

  return periodConsumptions.map((p) => ({
    interval: String(p.interval ?? p.Interval ?? p.intervalTime ?? ""),
    consumption: Number(p.consumption ?? p.Consumption ?? 0),
  }));
}

// --------------------------------------------------------------------------
// Typed error
// --------------------------------------------------------------------------

export class IecApiError extends Error {
  constructor(message: string, public readonly statusCode: number = 500) {
    super(message);
    this.name = "IecApiError";
  }
}
