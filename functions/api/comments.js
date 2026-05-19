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
  const comments = await readComments(db, after, limit);

  return json({ comments });
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

  const text = String(payload.text || "").trim().replace(/\s+/g, " ").slice(0, 180);
  if (!text) {
    return json({ error: "Comment text is required" }, 400);
  }

  const nickname = String(payload.nickname || "").trim().replace(/\s+/g, " ").slice(0, 16);
  const color = normalizeColor(payload.color);
  const createdAt = Date.now();
  const comment = await writeComment(db, { text, nickname, color, createdAt });

  return json({ comment }, 201);
}

async function readComments(db, after, limit) {
  try {
    const comments = await db
      .prepare(
        "SELECT id, text, nickname, color, created_at FROM comments WHERE id > ? ORDER BY id ASC LIMIT ?",
      )
      .bind(after, limit)
      .all();
    return comments.results || [];
  } catch {
    const comments = await db
      .prepare(
        "SELECT id, text, created_at FROM comments WHERE id > ? ORDER BY id ASC LIMIT ?",
      )
      .bind(after, limit)
      .all();
    return (comments.results || []).map((comment) => ({
      ...comment,
      nickname: "",
      color: "blue",
    }));
  }
}

async function writeComment(db, comment) {
  try {
    return await db
      .prepare(
        "INSERT INTO comments (text, nickname, color, created_at) VALUES (?, ?, ?, ?) RETURNING id, text, nickname, color, created_at",
      )
      .bind(comment.text, comment.nickname, comment.color, comment.createdAt)
      .first();
  } catch {
    const saved = await db
      .prepare(
        "INSERT INTO comments (text, created_at) VALUES (?, ?) RETURNING id, text, created_at",
      )
      .bind(comment.text, comment.createdAt)
      .first();
    return {
      ...saved,
      nickname: comment.nickname,
      color: comment.color,
    };
  }
}

function normalizeColor(color) {
  const allowedColors = new Set(["blue", "yellow", "green", "pink", "violet"]);
  return allowedColors.has(color) ? color : "blue";
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
