const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

export async function onRequest(context) {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: jsonHeaders });
  }

  if (request.method === "GET") {
    return handleGet(context);
  }

  if (request.method === "POST") {
    return handlePost(context);
  }

  return json({ error: "Method not allowed" }, 405);
}

async function handleGet({ request, env }) {
  const db = getDatabase(env);
  if (!db) {
    return json({ error: "D1 binding DB is not configured" }, 500);
  }

  const url = new URL(request.url);
  const after = Math.max(0, Number(url.searchParams.get("after") || 0));
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 40), 1), 80);
  const comments = await db
    .prepare(
      "SELECT id, text, created_at FROM comments WHERE id > ? ORDER BY id ASC LIMIT ?",
    )
    .bind(after, limit)
    .all();

  return json({ comments: comments.results || [] });
}

async function handlePost({ request, env }) {
  const db = getDatabase(env);
  if (!db) {
    return json({ error: "D1 binding DB is not configured" }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const text = String(payload.text || "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!text) {
    return json({ error: "Comment text is required" }, 400);
  }

  const createdAt = Date.now();
  const comment = await db
    .prepare(
      "INSERT INTO comments (text, created_at) VALUES (?, ?) RETURNING id, text, created_at",
    )
    .bind(text, createdAt)
    .first();

  return json({ comment }, 201);
}

function getDatabase(env) {
  return env.DB || env.COMMENTS_DB;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}
