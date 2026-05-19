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
  const screenId = normalizeScreenId(url.searchParams.get("screenId"));
  if (screenId) {
    await recordActiveScreen(db, screenId);
  }
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
  const parentId = Math.max(0, Number(payload.parent_id || payload.parentId || 0));
  if (parentId) {
    const reply = await writeReply(db, { parentId, text, nickname, createdAt });
    return json({ reply }, 201);
  }

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
    return hydrateCommentsWithReplies(db, comments.results || []);
  } catch {
    const comments = await db
      .prepare(
        "SELECT id, text, created_at FROM comments WHERE id > ? ORDER BY id ASC LIMIT ?",
      )
      .bind(after, limit)
      .all();
    const rows = (comments.results || []).map((comment) => ({
      ...comment,
      nickname: "",
      color: "blue",
    }));
    return hydrateCommentsWithReplies(db, rows);
  }
}

async function hydrateCommentsWithReplies(db, comments) {
  if (!comments.length) {
    return [];
  }

  try {
    const ids = comments.map((comment) => comment.id);
    const placeholders = ids.map(() => "?").join(",");
    const replies = await db
      .prepare(
        `SELECT id, parent_id, text, nickname, created_at FROM comment_replies WHERE parent_id IN (${placeholders}) ORDER BY id ASC LIMIT 400`,
      )
      .bind(...ids)
      .all();
    const repliesByParent = new Map();
    (replies.results || []).forEach((reply) => {
      const key = String(reply.parent_id);
      if (!repliesByParent.has(key)) {
        repliesByParent.set(key, []);
      }
      repliesByParent.get(key).push(reply);
    });
    return comments.map((comment) => {
      const commentReplies = repliesByParent.get(String(comment.id)) || [];
      return {
        ...comment,
        replies: commentReplies,
        reply_count: commentReplies.length,
      };
    });
  } catch {
    return comments.map((comment) => ({
      ...comment,
      replies: [],
      reply_count: 0,
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

async function writeReply(db, reply) {
  return db
    .prepare(
      "INSERT INTO comment_replies (parent_id, text, nickname, created_at) VALUES (?, ?, ?, ?) RETURNING id, parent_id, text, nickname, created_at",
    )
    .bind(reply.parentId, reply.text, reply.nickname, reply.createdAt)
    .first();
}

function normalizeColor(color) {
  const allowedColors = new Set(["blue", "yellow", "green", "pink", "violet"]);
  return allowedColors.has(color) ? color : "blue";
}

async function recordActiveScreen(db, screenId) {
  try {
    await db
      .prepare(
        "INSERT INTO active_screens (screen_id, last_seen) VALUES (?, ?) ON CONFLICT(screen_id) DO UPDATE SET last_seen = excluded.last_seen",
      )
      .bind(screenId, Date.now())
      .run();
  } catch {
    // The stats migration may not have run yet; comments should keep working.
  }
}

function normalizeScreenId(screenId) {
  const id = String(screenId || "").trim();
  return /^[a-zA-Z0-9_-]{8,80}$/.test(id) ? id : "";
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
