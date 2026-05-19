const form = document.querySelector("#comment-form");
const textInput = document.querySelector("#comment-text");
const nicknameInput = document.querySelector("#comment-nickname");
const countNode = document.querySelector("#comment-count");
const statusNode = document.querySelector("#comment-status");
const submitButton = document.querySelector("#comment-submit");
const bubbleLayer = document.querySelector("#comment-page-bubble-layer");
const showBubblesButton = document.querySelector("#comment-show-bubbles");
const mobileBubblesPanel = document.querySelector("#comment-mobile-bubbles");
const mobileBubblesStage = document.querySelector("#comment-mobile-bubbles-stage");
const mobileBubblesClose = document.querySelector("#comment-mobile-bubbles-close");
const localCommentKey = "cartoon-comments";
let mobileBubbleItems = [];
let mobileBubbleFrame = 0;
let mobileBubbleSpawnTimers = [];
let expandedMobileBubble = null;

function updateCount() {
  countNode.textContent = `${textInput.value.length} / ${textInput.maxLength}`;
}

function setStatus(message) {
  statusNode.textContent = message;
}

async function submitComment(comment) {
  try {
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(comment),
    });

    if (!response.ok) {
      throw new Error("Comment API is unavailable");
    }

    return response.json();
  } catch {
    return saveLocalComment(comment);
  }
}

function saveLocalComment(commentInput) {
  const comments = readLocalComments();
  if (commentInput.parent_id) {
    const target = comments.find((comment) => String(comment.id) === String(commentInput.parent_id));
    const reply = {
      id: Date.now(),
      parent_id: commentInput.parent_id,
      text: commentInput.text,
      nickname: commentInput.nickname,
      created_at: Date.now(),
    };
    if (target) {
      target.replies = Array.isArray(target.replies) ? target.replies : [];
      target.replies.push(reply);
      target.reply_count = target.replies.length;
      window.localStorage.setItem(localCommentKey, JSON.stringify(comments.slice(-80)));
    }
    return { reply, local: true };
  }

  const lastId = comments.reduce((maxId, comment) => Math.max(maxId, Number(comment.id) || 0), 0);
  const comment = {
    id: lastId + 1,
    text: commentInput.text,
    nickname: commentInput.nickname,
    color: commentInput.color,
    created_at: Date.now(),
  };
  comments.push(comment);
  if (!window.localStorage) {
    throw new Error("Local storage is unavailable");
  }
  window.localStorage.setItem(localCommentKey, JSON.stringify(comments.slice(-80)));
  return { comment, local: true };
}

async function fetchComments() {
  try {
    const response = await fetch("/api/comments?after=0&limit=80", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Comment API is unavailable");
    }
    const payload = await response.json();
    return Array.isArray(payload.comments) ? payload.comments : [];
  } catch {
    return readLocalComments();
  }
}

function readLocalComments() {
  try {
    if (!window.localStorage) {
      return [];
    }
    return JSON.parse(window.localStorage.getItem(localCommentKey) || "[]");
  } catch {
    return [];
  }
}

function showSentBubble(text, color) {
  const bubble = document.createElement("div");
  const size = clamp(86 + text.length * 2.8, 98, 172);
  bubble.className = "comment-bubble comment-page-bubble";
  bubble.dataset.color = color;
  bubble.style.setProperty("--bubble-size", `${size}px`);
  bubble.innerHTML = `
    <span class="comment-bubble__text"></span>
    <span class="comment-bubble__meta">
      <span class="comment-bubble__time"></span>
    </span>
  `;
  bubble.querySelector(".comment-bubble__text").textContent = createBubblePreviewText(text, { radius: size / 2 });
  bubble.querySelector(".comment-bubble__time").textContent = "刚刚";
  bubbleLayer.append(bubble);
  window.setTimeout(() => {
    bubble.remove();
  }, 5400);
}

async function toggleMobileBubbles() {
  const willShow = mobileBubblesPanel.hidden;
  mobileBubblesPanel.hidden = !willShow;
  showBubblesButton.setAttribute("aria-expanded", String(willShow));
  if (willShow) {
    await renderMobileBubbles();
    startMobileBubblePhysics();
  } else {
    clearMobileBubbles();
  }
}

async function renderMobileBubbles() {
  clearMobileBubbles();
  const comments = await fetchComments();
  if (!comments.length) {
    const empty = document.createElement("p");
    empty.className = "comment-mobile-bubbles__empty";
    empty.textContent = "还没有评论气泡。";
    mobileBubblesStage.append(empty);
    return;
  }

  comments
    .slice()
    .reverse()
    .forEach((comment, index) => {
      const timer = window.setTimeout(() => {
        spawnMobileBubble(comment);
      }, index * 150);
      mobileBubbleSpawnTimers.push(timer);
    });
}

function spawnMobileBubble(comment) {
  const text = String(comment.text || "").trim();
  if (!text || mobileBubblesPanel.hidden) {
    return;
  }

  const size = clamp(62 + text.length * 1.25, 76, 112);
  const radius = size / 2;
  const rect = mobileBubblesStage.getBoundingClientRect();
  const bubble = document.createElement("div");
  const replyCount = Math.max(Number(comment.reply_count) || 0, Array.isArray(comment.replies) ? comment.replies.length : 0);
  bubble.className = "comment-bubble comment-mobile-bubble";
  bubble.dataset.color = normalizeColor(comment.color);
  bubble.tabIndex = 0;
  bubble.setAttribute("role", "button");
  bubble.style.setProperty("--bubble-size", `${size}px`);
  bubble.innerHTML = `
    <span class="comment-bubble__text"></span>
    <span class="comment-bubble__meta">
      <span class="comment-bubble__time"></span>
      <span class="comment-bubble__reply-count"></span>
    </span>
    <form class="comment-mobile-bubble__reply-form">
      <textarea class="comment-mobile-bubble__reply-input" maxlength="120" placeholder="回复这个气泡"></textarea>
      <button class="comment-mobile-bubble__reply-submit" type="submit">发送</button>
    </form>
  `;
  bubble.querySelector(".comment-bubble__time").textContent = formatCommentTime(comment.created_at);
  const item = {
    node: bubble,
    comment,
    text,
    baseRadius: radius,
    radius,
    replyCount,
    x: clamp(rect.width * (0.28 + Math.random() * 0.44), radius + 8, rect.width - radius - 8),
    y: rect.height + radius + Math.random() * 22,
    vx: (Math.random() - 0.5) * 1.1,
    vy: -1.8 - Math.random() * 0.7,
    isExpanded: false,
  };
  updateMobileBubbleText(item);
  updateMobileBubbleReplyCount(item);
  bubble.addEventListener("click", (event) => {
    if (event.target.closest(".comment-mobile-bubble__reply-form")) {
      return;
    }
    expandMobileBubble(item);
  });
  bubble.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      expandMobileBubble(item);
    }
  });
  bubble.querySelector(".comment-mobile-bubble__reply-form").addEventListener("submit", (event) => {
    event.preventDefault();
    submitMobileBubbleReply(item);
  });
  mobileBubblesStage.append(bubble);
  mobileBubbleItems.push(item);
}

function startMobileBubblePhysics() {
  if (mobileBubbleFrame) {
    return;
  }
  const tick = () => {
    moveMobileBubbles();
    mobileBubbleFrame = window.requestAnimationFrame(tick);
  };
  mobileBubbleFrame = window.requestAnimationFrame(tick);
}

function stopMobileBubblePhysics() {
  if (!mobileBubbleFrame) {
    return;
  }
  window.cancelAnimationFrame(mobileBubbleFrame);
  mobileBubbleFrame = 0;
}

function clearMobileBubbles() {
  mobileBubbleSpawnTimers.forEach((timer) => window.clearTimeout(timer));
  mobileBubbleSpawnTimers = [];
  mobileBubbleItems.forEach((bubble) => bubble.node.remove());
  mobileBubbleItems = [];
  expandedMobileBubble = null;
  mobileBubblesStage.textContent = "";
  stopMobileBubblePhysics();
}

function moveMobileBubbles() {
  const rect = mobileBubblesStage.getBoundingClientRect();
  mobileBubbleItems.forEach((bubble) => {
    if (!bubble.isExpanded) {
      bubble.vy -= 0.012;
      bubble.vx *= 0.992;
      bubble.vy *= 0.996;
      bubble.x += bubble.vx;
      bubble.y += bubble.vy;
    }
    resolveMobileWalls(bubble, rect);
  });
  resolveMobileBubbleCollisions();
  mobileBubbleItems.forEach((bubble) => {
    const { halfWidth, halfHeight } = getMobileBubbleHalfSize(bubble);
    bubble.node.style.transform = `translate3d(${bubble.x - halfWidth}px, ${bubble.y - halfHeight}px, 0)`;
  });
}

function resolveMobileWalls(bubble, rect) {
  const { halfWidth, halfHeight } = getMobileBubbleHalfSize(bubble);
  const minX = halfWidth + 8;
  const maxX = rect.width - halfWidth - 8;
  const minY = halfHeight + 8;
  const maxY = rect.height - halfHeight - 8;
  if (bubble.x < minX) {
    bubble.x = minX;
    bubble.vx = Math.abs(bubble.vx) * 0.72;
  } else if (bubble.x > maxX) {
    bubble.x = maxX;
    bubble.vx = -Math.abs(bubble.vx) * 0.72;
  }
  if (bubble.y < minY) {
    bubble.y = minY;
    bubble.vy = Math.abs(bubble.vy) * 0.5;
  } else if (bubble.y > maxY) {
    bubble.y = maxY;
    bubble.vy = -Math.abs(bubble.vy) * 0.62;
  }
}

function resolveMobileBubbleCollisions() {
  for (let i = 0; i < mobileBubbleItems.length; i += 1) {
    for (let j = i + 1; j < mobileBubbleItems.length; j += 1) {
      const a = mobileBubbleItems[i];
      const b = mobileBubbleItems[j];
      if (a.isExpanded || b.isExpanded) {
        continue;
      }
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 1;
      const minDistance = a.radius + b.radius + 4;
      if (distance >= minDistance) {
        continue;
      }
      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = (minDistance - distance) / 2;
      a.x -= nx * overlap;
      a.y -= ny * overlap;
      b.x += nx * overlap;
      b.y += ny * overlap;
      const push = overlap * 0.018;
      a.vx -= nx * push;
      a.vy -= ny * push;
      b.vx += nx * push;
      b.vy += ny * push;
    }
  }
}

function getMobileBubbleHalfSize(bubble) {
  return {
    halfWidth: Math.max(bubble.node.offsetWidth / 2, bubble.radius),
    halfHeight: Math.max(bubble.node.offsetHeight / 2, bubble.radius),
  };
}

function expandMobileBubble(bubble) {
  if (expandedMobileBubble && expandedMobileBubble !== bubble) {
    collapseMobileBubble(expandedMobileBubble);
  }
  expandedMobileBubble = bubble;
  bubble.isExpanded = true;
  bubble.vx = 0;
  bubble.vy = 0;
  bubble.node.classList.add("is-expanded");
  bubble.node.setAttribute("role", "group");
  updateMobileBubbleText(bubble);
  const rect = mobileBubblesStage.getBoundingClientRect();
  bubble.x = rect.width / 2;
  bubble.y = clamp(bubble.y, 116, rect.height - 116);
  window.requestAnimationFrame(() => {
    resolveMobileWalls(bubble, mobileBubblesStage.getBoundingClientRect());
    bubble.node.querySelector(".comment-mobile-bubble__reply-input").focus();
  });
}

function collapseMobileBubble(bubble) {
  bubble.isExpanded = false;
  bubble.radius = bubble.baseRadius;
  bubble.node.classList.remove("is-expanded");
  bubble.node.setAttribute("role", "button");
  bubble.node.querySelector(".comment-mobile-bubble__reply-input").value = "";
  updateMobileBubbleText(bubble);
  expandedMobileBubble = expandedMobileBubble === bubble ? null : expandedMobileBubble;
}

async function submitMobileBubbleReply(bubble) {
  const input = bubble.node.querySelector(".comment-mobile-bubble__reply-input");
  const button = bubble.node.querySelector(".comment-mobile-bubble__reply-submit");
  const text = input.value.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!text) {
    return;
  }

  button.disabled = true;
  try {
    const nickname = nicknameInput.value.trim().replace(/\s+/g, " ").slice(0, 16);
    await submitComment({ text, nickname, color: normalizeColor(bubble.comment.color), parent_id: bubble.comment.id });
    bubble.replyCount += 1;
    bubble.comment.reply_count = bubble.replyCount;
    updateMobileBubbleReplyCount(bubble);
    setStatus("已发送回复。");
    collapseMobileBubble(bubble);
  } catch {
    setStatus("回复发送失败，请稍后重试。");
  } finally {
    button.disabled = false;
  }
}

function updateMobileBubbleReplyCount(bubble) {
  const countNode = bubble.node.querySelector(".comment-bubble__reply-count");
  countNode.textContent = String(bubble.replyCount);
  bubble.node.classList.toggle("has-replies", bubble.replyCount > 0);
}

function updateMobileBubbleText(bubble) {
  const textNode = bubble.node.querySelector(".comment-bubble__text");
  if (!textNode) {
    return;
  }
  textNode.textContent = bubble.isExpanded ? bubble.text : createBubblePreviewText(bubble.text, bubble);
}

function createBubblePreviewText(text, bubble) {
  const normalized = String(text || "").trim();
  const diameter = Math.max((bubble?.radius || 44) * 2, 1);
  const charsPerLine = Math.max(3, Math.floor((diameter - 38) / 15));
  const lineCapacity = diameter >= 110 ? 4 : diameter >= 96 ? 3 : diameter >= 82 ? 2 : 1;
  const desiredLines = Math.ceil(normalized.length / charsPerLine);
  const lineCount = clamp(desiredLines, 1, lineCapacity);
  const reservedForBadge = bubble?.replyCount > 0 ? 2 : 0;
  const maxLength = clamp(charsPerLine * lineCount - reservedForBadge, 4, 24);
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(2, maxLength - 1))}...`;
}

function normalizeColor(color) {
  return ["blue", "yellow", "green", "pink", "violet"].includes(color) ? color : "blue";
}

function formatCommentTime(createdAt) {
  const date = new Date(Number(createdAt) || Date.now());
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

textInput.addEventListener("input", updateCount);
showBubblesButton.addEventListener("click", toggleMobileBubbles);
mobileBubblesClose.addEventListener("click", () => {
  mobileBubblesPanel.hidden = true;
  showBubblesButton.setAttribute("aria-expanded", "false");
  clearMobileBubbles();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = textInput.value.trim().replace(/\s+/g, " ");
  const nickname = nicknameInput.value.trim().replace(/\s+/g, " ").slice(0, 16);
  const color = new FormData(form).get("color") || "blue";
  if (!text) {
    setStatus("先写一点内容再发送。");
    return;
  }

  submitButton.disabled = true;
  setStatus("发送中...");

  try {
    await submitComment({ text, nickname, color });
    showSentBubble(text, color);
    textInput.value = "";
    nicknameInput.value = "";
    updateCount();
    setStatus("已发送，请看主屏幕。");
    if (!mobileBubblesPanel.hidden) {
      await renderMobileBubbles();
    }
  } catch {
    setStatus("发送失败，请稍后重试。");
  } finally {
    submitButton.disabled = false;
    textInput.focus();
  }
});

updateCount();
