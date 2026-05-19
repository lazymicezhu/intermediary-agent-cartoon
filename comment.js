const form = document.querySelector("#comment-form");
const textInput = document.querySelector("#comment-text");
const nicknameInput = document.querySelector("#comment-nickname");
const countNode = document.querySelector("#comment-count");
const statusNode = document.querySelector("#comment-status");
const submitButton = document.querySelector("#comment-submit");
const localCommentKey = "cartoon-comments";

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

textInput.addEventListener("input", updateCount);

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
    textInput.value = "";
    nicknameInput.value = "";
    updateCount();
    setStatus("已发送，请看主屏幕。");
  } catch {
    setStatus("发送失败，请稍后重试。");
  } finally {
    submitButton.disabled = false;
    textInput.focus();
  }
});

updateCount();
