import { NextRequest, NextResponse } from "next/server";

type SupportedCurrency = "USD" | "COP" | "ARS" | "EUR" | "MXN" | "PEN";

const SUPPORTED: SupportedCurrency[] = ["USD", "COP", "ARS", "EUR", "MXN", "PEN"];

const FALLBACK_RATES: Record<Exclude<SupportedCurrency, "USD">, number> = {
  COP: 4000,
  ARS: 1100,
  EUR: 0.92,
  MXN: 17.2,
  PEN: 3.7,
};

function normalizeCurrency(input: string | null): SupportedCurrency {
  const code = String(input ?? "USD").trim().toUpperCase();
  return (SUPPORTED.includes(code as SupportedCurrency) ? code : "USD") as SupportedCurrency;
}

export async function GET(req: NextRequest) {
  const currency = normalizeCurrency(req.nextUrl.searchParams.get("currency"));

  if (currency === "USD") {
    return NextResponse.json(
      {
        base: "USD",
        currency,
        rate_to_usd: 1,
        source: "fixed",
        fetched_at: new Date().toISOString(),
      },
      { status: 200 },
    );
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = (await res.json().catch(() => null)) as any;
    const rateRaw = json?.rates?.[currency];
    const rate = Number(rateRaw);

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("Invalid exchange rate payload");
    }

    return NextResponse.json(
      {
        base: "USD",
        currency,
        rate_to_usd: rate,
        source: "open.er-api.com",
        fetched_at: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    const fallback = FALLBACK_RATES[currency as Exclude<SupportedCurrency, "USD">];

    return NextResponse.json(
      {
        base: "USD",
        currency,
        rate_to_usd: fallback,
        source: "fallback",
        warning: "No se pudo consultar tipo de cambio en tiempo real; se usa fallback.",
        fetched_at: new Date().toISOString(),
        error: String((error as Error)?.message ?? error),
      },
      { status: 200 },
    );
  }
}
