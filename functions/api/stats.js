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
    return hydrateCommentsWithReplies(db, comments.results || []);
  } catch {
    const comments = await db
      .prepare("SELECT id, text, created_at FROM comments ORDER BY id DESC LIMIT 500")
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
        `SELECT id, parent_id, text, nickname, created_at FROM comment_replies WHERE parent_id IN (${placeholders}) ORDER BY id ASC LIMIT 1000`,
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

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}
