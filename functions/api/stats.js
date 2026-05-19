const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: jsonHeaders });
  }

  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const db = env.DB || env.COMMENTS_DB;
  if (!db) {
    return json({ error: "D1 binding DB is not configured" }, 500);
  }

  const now = Date.now();
  const activeSince = now - 30_000;
  const [screenCount, commentCount, comments] = await Promise.all([
    readActiveScreenCount(db, activeSince),
    readCommentCount(db),
    readAllComments(db),
  ]);

  return json({
    activeScreens: screenCount,
    commentCount,
    comments,
    activeWindowSeconds: 30,
    generatedAt: now,
  });
}

async function readActiveScreenCount(db, activeSince) {
  try {
    const row = await db
      .prepare("SELECT COUNT(*) AS count FROM active_screens WHERE last_seen >= ?")
      .bind(activeSince)
      .first();
    return Number(row?.count || 0);
  } catch {
    return 0;
  }
}

async function readCommentCount(db) {
  const row = await db.prepare("SELECT COUNT(*) AS count FROM comments").first();
  return Number(row?.count || 0);
}

async function readAllComments(db) {
  try {
    const comments = await db
      .prepare(
        "SELECT id, text, nickname, color, created_at FROM comments ORDER BY id DESC LIMIT 500",
      )
      .all();
    return comments.results || [];
  } catch {
    const comments = await db
      .prepare("SELECT id, text, created_at FROM comments ORDER BY id DESC LIMIT 500")
      .all();
    return (comments.results || []).map((comment) => ({
      ...comment,
      nickname: "",
      color: "blue",
    }));
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}
