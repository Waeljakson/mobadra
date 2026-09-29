import { Hono } from "hono";
import { cors } from "hono/cors";
import { attachDatabasePool } from "@neon/functions";
import { Pool } from "pg";
import { timingSafeEqual } from "node:crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});
attachDatabasePool(pool);

const app = new Hono();

app.use("*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "X-Admin-Key"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  maxAge: 86400,
}));

const MAX_JSON_BYTES = 4_500_000;

function jsonError(c: any, status: number, message: string) {
  return c.json({ error: message }, status as any);
}

function adminAuthorized(request: Request) {
  const expected = process.env.MOBADRA_ADMIN_KEY || "";
  const supplied = request.headers.get("X-Admin-Key") || "";
  if (!expected || !supplied) return false;

  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

function validSlug(slug: string) {
  return /^event-[a-z0-9-]{8,80}$/i.test(slug);
}

function clean(value: unknown, max = 4000) {
  if (value === null || value === undefined) return null;
  return String(value).trim().slice(0, max);
}

function parseEvent(input: any) {
  const evidence = Array.isArray(input?.evidence)
    ? input.evidence.slice(0, 6).filter((x: unknown) => typeof x === "string")
    : Array.isArray(input?.evidence_images)
      ? input.evidence_images.slice(0, 6).filter((x: unknown) => typeof x === "string")
      : [];

  return {
    slug: clean(input?.slug, 90),
    eventName: clean(input?.eventName ?? input?.event_name, 120),
    organizationName: clean(input?.organizationName ?? input?.organization_name, 120),
    eventDate: clean(input?.eventDate ?? input?.event_date, 20),
    eventLocation: clean(input?.eventLocation ?? input?.event_location, 120),
    participantCount:
      input?.participantCount === "" || input?.participantCount === null || input?.participantCount === undefined
        ? null
        : Number(input?.participantCount ?? input?.participant_count),
    eventField: clean(input?.eventField ?? input?.event_field, 80),
    targetAudience: clean(input?.targetAudience ?? input?.target_audience, 160),
    eventGoal: clean(input?.eventGoal ?? input?.event_goal, 1000),
    summary: clean(input?.summary, 1800),
    logoDataUrl: clean(input?.logoDataUrl ?? input?.logo_data_url, 1_000_000),
    evidence,
    designer: clean(input?.designer, 120),
    followUp: clean(input?.followUp ?? input?.follow_up, 120),
    eventDirector: clean(input?.eventDirector ?? input?.event_director, 120),
    assistants: clean(input?.assistants, 220),
    schoolPrincipal: clean(input?.schoolPrincipal ?? input?.school_principal, 120),
  };
}

function validateEvent(data: ReturnType<typeof parseEvent>) {
  if (!data.slug || !validSlug(data.slug)) return "معرّف الفعالية غير صالح";
  if (!data.eventName) return "اسم الفعالية مطلوب";
  if (!data.organizationName) return "اسم المؤسسة مطلوب";
  if (
    data.participantCount !== null &&
    (!Number.isInteger(data.participantCount) || data.participantCount < 0 || data.participantCount > 99999)
  ) return "عدد المشاركين غير صالح";

  const totalEvidenceChars = data.evidence.reduce((sum, x) => sum + x.length, 0);
  if ((data.logoDataUrl?.length || 0) + totalEvidenceChars > 3_800_000) {
    return "حجم الصور كبير جدًا. استخدم صورًا أقل أو أصغر.";
  }

  return null;
}

app.get("/health", (c) => c.json({ ok: true, service: "mobadra" }));

app.get("/events/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (!validSlug(slug)) return jsonError(c, 400, "رابط الفعالية غير صالح");

  const { rows } = await pool.query(
    `SELECT *
       FROM mobadra_events
      WHERE slug = $1
        AND is_published = true
      LIMIT 1`,
    [slug],
  );

  if (!rows.length) return jsonError(c, 404, "لم يتم العثور على الفعالية");
  return c.json({ event: rows[0] });
});

app.get("/events", async (c) => {
  if (!adminAuthorized(c.req.raw)) return jsonError(c, 401, "غير مصرح");

  const { rows } = await pool.query(
    `SELECT id, slug, event_name, organization_name, event_date,
            participant_count, event_field, created_at, updated_at, is_published
       FROM mobadra_events
      ORDER BY created_at DESC
      LIMIT 200`,
  );

  return c.json({ events: rows });
});

app.post("/events", async (c) => {
  if (!adminAuthorized(c.req.raw)) return jsonError(c, 401, "غير مصرح");

  const contentLength = Number(c.req.header("content-length") || 0);
  if (contentLength > MAX_JSON_BYTES) return jsonError(c, 413, "حجم الطلب أكبر من المسموح");

  const input = await c.req.json();
  const data = parseEvent(input);
  const validationError = validateEvent(data);
  if (validationError) return jsonError(c, 400, validationError);

  try {
    const { rows } = await pool.query(
      `INSERT INTO mobadra_events (
        slug, event_name, organization_name, event_date, event_location,
        participant_count, event_field, target_audience, event_goal, summary,
        logo_data_url, evidence_images, designer, follow_up, event_director,
        assistants, school_principal, is_published
      ) VALUES (
        $1,$2,$3,NULLIF($4,'')::date,$5,$6,$7,$8,$9,$10,
        $11,$12::jsonb,$13,$14,$15,$16,$17,true
      )
      RETURNING *`,
      [
        data.slug, data.eventName, data.organizationName, data.eventDate || "",
        data.eventLocation, data.participantCount, data.eventField, data.targetAudience,
        data.eventGoal, data.summary, data.logoDataUrl, JSON.stringify(data.evidence),
        data.designer, data.followUp, data.eventDirector, data.assistants, data.schoolPrincipal,
      ],
    );

    return c.json({ event: rows[0] }, 201);
  } catch (error: any) {
    if (error?.code === "23505") return jsonError(c, 409, "معرّف الفعالية مستخدم بالفعل");
    console.error(error);
    return jsonError(c, 500, "تعذر حفظ الفعالية");
  }
});

app.put("/events/:id", async (c) => {
  if (!adminAuthorized(c.req.raw)) return jsonError(c, 401, "غير مصرح");

  const id = c.req.param("id");
  const input = await c.req.json();
  const data = parseEvent(input);
  const validationError = validateEvent(data);
  if (validationError) return jsonError(c, 400, validationError);

  const { rows } = await pool.query(
    `UPDATE mobadra_events SET
      slug=$2,
      event_name=$3,
      organization_name=$4,
      event_date=NULLIF($5,'')::date,
      event_location=$6,
      participant_count=$7,
      event_field=$8,
      target_audience=$9,
      event_goal=$10,
      summary=$11,
      logo_data_url=$12,
      evidence_images=$13::jsonb,
      designer=$14,
      follow_up=$15,
      event_director=$16,
      assistants=$17,
      school_principal=$18
    WHERE id=$1::uuid
    RETURNING *`,
    [
      id, data.slug, data.eventName, data.organizationName, data.eventDate || "",
      data.eventLocation, data.participantCount, data.eventField, data.targetAudience,
      data.eventGoal, data.summary, data.logoDataUrl, JSON.stringify(data.evidence),
      data.designer, data.followUp, data.eventDirector, data.assistants, data.schoolPrincipal,
    ],
  );

  if (!rows.length) return jsonError(c, 404, "لم يتم العثور على الفعالية");
  return c.json({ event: rows[0] });
});

app.delete("/events/:id", async (c) => {
  if (!adminAuthorized(c.req.raw)) return jsonError(c, 401, "غير مصرح");

  const id = c.req.param("id");
  const { rows } = await pool.query(
    `UPDATE mobadra_events
        SET is_published = false
      WHERE id = $1::uuid
      RETURNING id, slug, is_published`,
    [id],
  );

  if (!rows.length) return jsonError(c, 404, "لم يتم العثور على الفعالية");
  return c.json({ event: rows[0] });
});

export default app;
