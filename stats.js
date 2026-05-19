const activeScreensNode = document.querySelector("#active-screens");
const commentTotalNode = document.querySelector("#comment-total");
const listNode = document.querySelector("#stats-list");
const statusNode = document.querySelector("#stats-status");
const refreshButton = document.querySelector("#stats-refresh");

async function loadStats() {
  statusNode.textContent = "读取中...";
  try {
    const response = await fetch("/api/stats", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Stats API is unavailable");
    }
    renderStats(await response.json());
  } catch {
    activeScreensNode.textContent = "-";
    commentTotalNode.textContent = "-";
    listNode.innerHTML = "";
    statusNode.textContent = "无法读取统计。请确认已部署 Pages Functions 并执行 0003 迁移。";
  }
}

function renderStats(stats) {
  activeScreensNode.textContent = String(stats.activeScreens ?? 0);
  commentTotalNode.textContent = String(stats.commentCount ?? 0);
  listNode.replaceChildren(...(stats.comments || []).map(createCommentRow));
  statusNode.textContent = `最近更新：${formatTime(stats.generatedAt || Date.now())}`;
}

function createCommentRow(comment) {
  const row = document.createElement("article");
  row.className = "stats-comment";
  row.innerHTML = `
    <div class="stats-comment__meta">
      <span class="stats-comment__id"></span>
      <span class="stats-comment__name"></span>
      <time></time>
    </div>
    <p></p>
  `;
  row.querySelector(".stats-comment__id").textContent = `#${comment.id}`;
  row.querySelector(".stats-comment__name").textContent = comment.nickname || "匿名";
  row.querySelector("time").textContent = formatTime(comment.created_at);
  row.querySelector("p").textContent = comment.text || "";
  return row;
}

function formatTime(timestamp) {
  const date = new Date(Number(timestamp) || Date.now());
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

refreshButton.addEventListener("click", loadStats);
loadStats();
window.setInterval(loadStats, 5000);
