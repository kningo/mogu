/**
 * Cloudflare D1 Database REST API Client
 * Connects directly to Cloudflare D1 from Next.js server runtime using native fetch.
 */

interface D1QueryResult<T = Record<string, any>> {
  results: T[];
  success: boolean;
  meta?: {
    duration: number;
    rows_read: number;
    rows_written: number;
    changes: number;
  };
}

interface D1ApiResponse<T = Record<string, any>> {
  result: D1QueryResult<T>[];
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
}

export async function executeD1Query<T = Record<string, any>>(
  sql: string,
  params: (string | number | boolean | null)[] = []
): Promise<T[]> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !databaseId || !apiToken) {
    throw new Error(
      "Cloudflare D1 credentials missing. Please check CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, and CLOUDFLARE_API_TOKEN in .env.local"
    );
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("D1 Query HTTP Error:", response.status, errorText);
    throw new Error(`Cloudflare D1 request failed with status ${response.status}: ${errorText}`);
  }

  const json: D1ApiResponse<T> = await response.json();

  if (!json.success || !json.result || json.result.length === 0) {
    const errorMsg = json.errors?.map((e) => e.message).join(", ") || "Unknown D1 error";
    console.error("D1 Query API Error:", errorMsg);
    throw new Error(`D1 Query error: ${errorMsg}`);
  }

  return json.result[0].results || [];
}
