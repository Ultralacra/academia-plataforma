import { NextResponse } from "next/server";
import { listMetadata, createMetadata, updateMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

const PILOTO_ENTITY = "piloto_ia_v1";
const PILOTO_ENTITY_ID = "datos";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: Request) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Body inválido" }, 400);
  }

  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  const nombre = String(body?.nombre ?? "").trim();

  if (!email || !isEmail(email)) {
    return json({ ok: false, error: "Email inválido" }, 400);
  }

  try {
    const metaRes = await listMetadata<any>();
    const allItems = metaRes.items || [];
    const record = allItems.find(
      (item: any) =>
        String(item?.entity ?? "") === PILOTO_ENTITY &&
        String(item?.entity_id ?? "") === PILOTO_ENTITY_ID,
    );

    const now = new Date().toISOString();

    if (record) {
      const current = record.payload ?? {
        version: 1,
        invitados: [],
        aceptados: [],
      };
      const aceptados: Array<{ email: string; nombre: string; aceptado_en: string }> =
        current.aceptados ?? [];

      const alreadyAccepted = aceptados.some(
        (a) => String(a.email ?? "").toLowerCase() === email,
      );

      if (alreadyAccepted) {
        return json({ ok: true, already: true });
      }

      const newAceptado = { email, nombre, aceptado_en: now };

      await updateMetadata(record.id, {
        id: record.id,
        entity: PILOTO_ENTITY,
        entity_id: PILOTO_ENTITY_ID,
        payload: {
          ...current,
          aceptados: [...aceptados, newAceptado],
        },
      } as any);
    } else {
      // Si no existe el registro aún, lo creamos con la aceptación
      await createMetadata({
        entity: PILOTO_ENTITY,
        entity_id: PILOTO_ENTITY_ID,
        payload: {
          version: 1,
          invitados: [],
          aceptados: [{ email, nombre, aceptado_en: now }],
        },
      });
    }

    return json({ ok: true, already: false });
  } catch (err: any) {
    console.error("[piloto-ia/consent] Error:", err);
    return json({ ok: false, error: "Error interno al guardar" }, 500);
  }
}
