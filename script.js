const chapterData = [
  {
    caption: "中介把小心思藏进合同字缝里：原本承诺“不成功全额退款”，却多塞进一个极小的“不”，让保障悄悄变成“不成功不全额退款”。",
    panels: [
      {
        image: "./assets/optimized/1A.jpg",
        aspect: "1186 / 868",
      },
      {
        image: "./assets/optimized/1B.jpg",
        aspect: "1194 / 872",
      },
      {
        image: "./assets/optimized/1C.jpg",
        aspect: "1182 / 860",
      },
    ],
    options: [
      {
        image: "./assets/optimized/1D-1.jpg",
        aspect: "580 / 424",
        ending:
          "他只看见“名校捷报”的光鲜话术，爽快落笔签约。等申请失败时，才发现合同角落那枚小小的“不”，已经把“全额退款”偷换成“不全额退款”。",
      },
      {
        image: "./assets/optimized/1D-2.jpg",
        aspect: "580 / 426",
        ending:
          "他停下来逐字检查合同，放大镜扫到那枚不起眼的“不”。中介的文字游戏当场露馅，所谓退款承诺也终于露出真正的边界。",
      },
      {
        image: "./assets/optimized/1D-3.jpg",
        aspect: "578 / 414",
        ending:
          "他把合同拿回去问身边同学，前辈一眼指出那句“不会全额退款”的陷阱。多问一句，正好挡住了中介藏在小字里的算盘。",
      },
      {
        image: "./assets/optimized/1D-4.jpg",
        aspect: "574 / 410",
        ending:
          "他没有被催促带走节奏，直接拒绝当场签约。只要不让那枚小小的“不”落进自己的合同，退款承诺就不会被悄悄改写。",
      },
    ],
  },
  {
    caption: "水面轻轻荡开一圈又一圈薄雾，暮色在天边缓缓沉落，未尽的话语与更远的回声一起，沿着看不见的岸线继续向前延展",
    panels: [
      {
        image:
          "https://picsum.photos/seed/chapter2-panel1/900/900",
      },
      {
        image:
          "https://picsum.photos/seed/chapter2-panel2/900/900",
      },
      {
        image:
          "https://picsum.photos/seed/chapter2-panel3/900/900",
      },
    ],
    options: [
      {
        image:
          "https://picsum.photos/seed/chapter2-option1/900/900",
      },
      {
        image:
          "https://picsum.photos/seed/chapter2-option2/900/900",
      },
      {
        image:
          "https://picsum.photos/seed/chapter2-option3/900/900",
      },
      {
        image:
          "https://picsum.photos/seed/chapter2-option4/900/900",
      },
    ],
  },
];

const revealDelay = 1500;
const dissolveDuration = 1200;
const chapterSlideDuration = 1200;
const track = document.querySelector("#chapter-track");
const chapterTemplate = document.querySelector("#chapter-template");
const panelTemplate = document.querySelector("#panel-template");
const overviewChapterTemplate = document.querySelector("#overview-chapter-template");
const storyStage = document.querySelector(".story-stage");
const chapterOverview = document.querySelector("#chapter-overview");
const overviewGrid = document.querySelector("#overview-grid");
const commentBubbleLayer = document.querySelector("#comment-bubble-layer");
const commentQr = document.querySelector("#comment-qr");
const commentQrLink = document.querySelector("#comment-qr-link");
const commentQrImage = document.querySelector("#comment-qr-image");
const commentToggle = document.querySelector("#comment-toggle");
const commentSettingsToggle = document.querySelector("#comment-settings-toggle");
const commentSettings = document.querySelector("#comment-settings");
const bubbleSizeInput = document.querySelector("#comment-bubble-size");
const coverPage = document.querySelector("#cover-page");
const coverEnter = document.querySelector("#cover-enter");

let currentChapterIndex = 0;
let isAnimating = false;
let activeDrag = null;
let dissolvingOptions = [];
let revealTimeouts = [];
let typewriterTimeouts = [];
const selectedOptions = new Map();
const commentApiPath = "/api/comments";
const localCommentKey = "cartoon-comments";
const screenIdKey = "cartoon-screen-id";
const commentBubblesEnabledKey = "comment-bubbles-enabled";
const commentBubbleSizeKey = "comment-bubble-size";
const bubbleSafeTop = 24;
const bubbleSizeScales = [0.68, 0.84, 1];
const seenCommentIds = new Set();
const commentBubbles = [];
const pointerState = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  activeUntil: 0,
};
let lastCommentId = 0;
let commentPollingStarted = false;
let commentPollingTimer = null;
let commentBubblesEnabled = true;
let commentBubbleSizeIndex = 1;
let qrDrag = null;
let draggedBubble = null;
let lastBubbleFrame = 0;
let lastReplySyncAt = 0;
let storyStarted = false;
const preloadedAssets = new Set();
const screenId = getScreenId();
let lastScreenHeartbeatAt = 0;

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function createPanel(panel, extraClasses = []) {
  const panelNode = panelTemplate.content.firstElementChild.cloneNode(true);
  panelNode.classList.add(...extraClasses);
  panelNode.dataset.image = panel.image;
  if (panel.aspect) {
    panelNode.style.setProperty("--panel-aspect", panel.aspect);
  }
  applyPanelImage(panelNode, panel.image);
  return panelNode;
}

function applyPanelImage(panelNode, image) {
  const art = panelNode.querySelector(".panel-art");
  art.style.backgroundImage = image.startsWith("linear-gradient")
    ? image
    : `url("${image}")`;
}

function createEmptySlot(aspect) {
  const slot = createPanel(
    {
      image:
        "linear-gradient(135deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.08))",
      aspect,
    },
    ["is-empty", "is-drop-target"],
  );
  slot.dataset.role = "drop-slot";
  return slot;
}

function buildChapter(chapter, index) {
  const chapterNode = chapterTemplate.content.firstElementChild.cloneNode(true);
  const grid = chapterNode.querySelector(".chapter-grid");
  const options = chapterNode.querySelector(".options");

  chapter.panels.forEach((panel) => {
    const panelNode = createPanel(panel);
    grid.append(panelNode);
  });

  const slot = createEmptySlot(chapter.panels[0]?.aspect);
  grid.append(slot);

  chapter.options.forEach((option, optionIndex) => {
    const optionNode = createPanel(option, ["is-option"]);
    optionNode.dataset.chapterIndex = String(index);
    optionNode.dataset.optionIndex = String(optionIndex);
    options.append(optionNode);
  });

  options.addEventListener("pointerdown", handlePointerDown);
  options.addEventListener("pointermove", handleOptionHoverMove);
  options.addEventListener("pointerleave", handleOptionHoverLeave);

  return chapterNode;
}

function revealPanels(chapterNode) {
  clearRevealTimers();

  const gridPanels = [...chapterNode.querySelectorAll(".chapter-grid .comic-panel")];
  const optionStrip = chapterNode.querySelector(".option-strip");
  gridPanels.forEach((panel) => panel.classList.remove("is-visible"));
  optionStrip.classList.remove("is-visible");

  gridPanels.slice(0, 3).forEach((panel, index) => {
    const timeoutId = window.setTimeout(() => {
      panel.classList.add("is-visible");
    }, index * revealDelay);
    revealTimeouts.push(timeoutId);
  });

  const slotTimeoutId = window.setTimeout(() => {
    const slot = gridPanels[3];
    slot.classList.add("is-visible");
    optionStrip.classList.add("is-visible");
  }, 3 * revealDelay);
  revealTimeouts.push(slotTimeoutId);
}

function clearRevealTimers() {
  revealTimeouts.forEach((timeoutId) => {
    window.clearTimeout(timeoutId);
  });
  revealTimeouts = [];
}

function clearTypewriterTimers() {
  typewriterTimeouts.forEach((timeoutId) => {
    window.clearTimeout(timeoutId);
  });
  typewriterTimeouts = [];
}

function handlePointerDown(event) {
  const optionCard = event.target.closest(".is-option");
  if (!optionCard || isAnimating) {
    return;
  }

  event.preventDefault();

  const chapterIndex = Number(optionCard.dataset.chapterIndex);
  if (chapterIndex !== currentChapterIndex) {
    return;
  }

  const rect = optionCard.getBoundingClientRect();
  const dragVisual = optionCard.cloneNode(true);
  dragVisual.classList.remove("is-dragging", "is-used", "is-bursting");
  dragVisual.style.position = "fixed";
  dragVisual.style.left = `${rect.left}px`;
  dragVisual.style.top = `${rect.top}px`;
  dragVisual.style.width = `${rect.width}px`;
  dragVisual.style.height = `${rect.height}px`;
  dragVisual.style.margin = "0";
  dragVisual.style.zIndex = "20";
  dragVisual.style.pointerEvents = "none";
  dragVisual.style.opacity = "1";
  dragVisual.style.transform = "scale(1.02)";
  document.body.append(dragVisual);

  optionCard.classList.add("is-dragging");
  optionCard.setPointerCapture(event.pointerId);

  activeDrag = {
    pointerId: event.pointerId,
    source: optionCard,
    visual: dragVisual,
    sourceRect: rect,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  };

  updateDragPosition(event.clientX, event.clientY);
  updateDropTarget(event.clientX, event.clientY);

  window.addEventListener("pointermove", handlePointerMove, true);
  window.addEventListener("pointerup", handlePointerUp, true);
  window.addEventListener("pointercancel", handlePointerCancel, true);
  window.addEventListener("blur", handleWindowBlur, true);
}

function handlePointerMove(event) {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
    return;
  }

  updateDragPosition(event.clientX, event.clientY);
  updateDropTarget(event.clientX, event.clientY);
}

function handleOptionHoverMove(event) {
  if (isAnimating || activeDrag) {
    return;
  }

  const optionCard = event.target.closest(".is-option");
  const options = event.currentTarget.querySelectorAll(".is-option");
  options.forEach((option) => {
    option.classList.remove("is-hover-left", "is-hover-right", "is-hover-center");
  });

  if (!optionCard) {
    return;
  }

  const rect = optionCard.getBoundingClientRect();
  const relativeX = event.clientX - rect.left;
  const ratio = relativeX / rect.width;

  if (ratio < 0.38) {
    optionCard.classList.add("is-hover-left");
  } else if (ratio > 0.62) {
    optionCard.classList.add("is-hover-right");
  } else {
    optionCard.classList.add("is-hover-center");
  }
}

function handleOptionHoverLeave(event) {
  event.currentTarget.querySelectorAll(".is-option").forEach((option) => {
    option.classList.remove("is-hover-left", "is-hover-right", "is-hover-center");
  });
}

function handlePointerUp(event) {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
    return;
  }

  const { source } = activeDrag;
  clearDropTargets();

  const dropSlot = getActiveDropSlot(event.clientX, event.clientY);
  if (dropSlot) {
    cleanupActiveDrag();
    fillSlot(dropSlot, source);
    return;
  }

  animateDragBack();
}

function handlePointerCancel(event) {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
    return;
  }

  clearDropTargets();
  animateDragBack();
}

function handleWindowBlur() {
  if (!activeDrag) {
    return;
  }

  clearDropTargets();
  animateDragBack();
}

function updateDragPosition(clientX, clientY) {
  if (!activeDrag) {
    return;
  }

  activeDrag.visual.style.left = `${clientX - activeDrag.offsetX}px`;
  activeDrag.visual.style.top = `${clientY - activeDrag.offsetY}px`;
}

function getActiveDropSlot(clientX, clientY) {
  const element = document.elementFromPoint(clientX, clientY);
  const slot = element?.closest(".is-drop-target");
  if (!slot) {
    return null;
  }

  return slot.closest(".chapter") === track.children[currentChapterIndex] ? slot : null;
}

function updateDropTarget(clientX, clientY) {
  clearDropTargets();
  const slot = getActiveDropSlot(clientX, clientY);
  if (slot && !isAnimating) {
    slot.classList.add("is-over");
  }
}

function clearDropTargets() {
  track.querySelectorAll(".is-drop-target.is-over").forEach((slot) => {
    slot.classList.remove("is-over");
  });
}

function cleanupActiveDrag() {
  if (!activeDrag) {
    return;
  }

  const { source, visual, pointerId } = activeDrag;
  source.classList.remove("is-dragging");
  source.classList.remove("is-hover-left", "is-hover-right", "is-hover-center");
  if (source.hasPointerCapture(pointerId)) {
    source.releasePointerCapture(pointerId);
  }
  window.removeEventListener("pointermove", handlePointerMove, true);
  window.removeEventListener("pointerup", handlePointerUp, true);
  window.removeEventListener("pointercancel", handlePointerCancel, true);
  window.removeEventListener("blur", handleWindowBlur, true);
  visual.remove();
  activeDrag = null;
}

function animateDragBack() {
  if (!activeDrag) {
    return;
  }

  const { visual, sourceRect } = activeDrag;
  visual.style.transition = "left 180ms ease, top 180ms ease, transform 180ms ease";
  visual.style.left = `${sourceRect.left}px`;
  visual.style.top = `${sourceRect.top}px`;
  visual.style.transform = "scale(1)";

  window.setTimeout(() => {
    cleanupActiveDrag();
  }, 190);
}

function fillSlot(slot, optionCard) {
  const selectedOption = getOptionData(optionCard);
  slot.className = "comic-panel is-visible";
  slot.dataset.role = "filled-slot";
  slot.dataset.image = optionCard.dataset.image;
  slot.style.setProperty(
    "--panel-aspect",
    optionCard.style.getPropertyValue("--panel-aspect") || "1 / 1",
  );
  applyPanelImage(slot, optionCard.dataset.image);
  selectedOptions.set(currentChapterIndex, {
    image: optionCard.dataset.image,
    aspect: selectedOption?.aspect,
    ending: selectedOption?.ending,
  });

  const chapterNode = slot.closest(".chapter");
  dissolvingOptions = freezeOptionsLayout(chapterNode, optionCard);
  isAnimating = true;

  runChapterTransition(chapterNode);
}

async function runChapterTransition(chapterNode) {
  clearRevealTimers();
  clearTypewriterTimers();

  await wait(520);

  burstRemainingOptions(chapterNode);
  chapterNode.classList.add("is-transitioning");

  await wait(dissolveDuration);

  chapterNode.querySelector(".option-strip").classList.remove("is-visible");
  await playChapterCaption(chapterNode, getSelectedCaption(currentChapterIndex));

  await wait(320);

  dissolvingOptions = [];
  goToNextChapter();
}

function getOptionData(optionCard) {
  const chapterIndex = Number(optionCard.dataset.chapterIndex);
  const optionIndex = Number(optionCard.dataset.optionIndex);
  return chapterData[chapterIndex]?.options?.[optionIndex];
}

function getSelectedCaption(chapterIndex) {
  return selectedOptions.get(chapterIndex)?.ending || chapterData[chapterIndex].caption;
}

function playChapterCaption(chapterNode, text) {
  return new Promise((resolve) => {
    const captionNode = chapterNode.querySelector(".chapter-caption");
    captionNode.textContent = "";
    captionNode.classList.add("is-visible");

    const chars = [...`${text}......`];
    chars.forEach((char, index) => {
    const timeoutId = window.setTimeout(() => {
        captionNode.textContent += char;
        if (index === chars.length - 1) {
          const resolveTimeoutId = window.setTimeout(resolve, 420);
          typewriterTimeouts.push(resolveTimeoutId);
        }
      }, index * 85);
      typewriterTimeouts.push(timeoutId);
    });
  });
}

function burstRemainingOptions(chapterNode) {
  const optionsContainer = chapterNode.querySelector(".options");
  const containerRect = optionsContainer.getBoundingClientRect();

  dissolvingOptions.forEach((option) => {
    const rect = option.getBoundingClientRect();
    createParticles(optionsContainer, rect, containerRect);
    option.classList.add("is-bursting");
  });
}

function freezeOptionsLayout(chapterNode, usedOptionCard) {
  const optionsContainer = chapterNode.querySelector(".options");
  const options = [...optionsContainer.querySelectorAll(".is-option")];
  const containerRect = optionsContainer.getBoundingClientRect();
  const optionLayouts = options.map((option) => {
    const rect = option.getBoundingClientRect();
    return {
      option,
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
    };
  });

  optionsContainer.style.width = `${containerRect.width}px`;
  optionsContainer.style.height = `${containerRect.height}px`;
  optionsContainer.classList.add("is-frozen");

  optionLayouts.forEach(({ option, left, top, width, height }) => {
    option.style.left = `${left}px`;
    option.style.top = `${top}px`;
    option.style.width = `${width}px`;
    option.style.height = `${height}px`;
  });

  usedOptionCard.remove();

  return options.filter((option) => option !== usedOptionCard);
}

function createParticles(container, rect, containerRect) {
  const count = 12;
  const baseLeft = rect.left - containerRect.left;
  const baseTop = rect.top - containerRect.top;

  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement("span");
    particle.className = "particle";
    const duration = 1200 + Math.random() * 520;
    const delay = Math.random() * 140;
    particle.style.left = `${baseLeft + Math.random() * rect.width}px`;
    particle.style.top = `${baseTop + Math.random() * rect.height}px`;
    particle.style.setProperty("--w", `${18 + Math.random() * 34}px`);
    particle.style.setProperty("--h", `${10 + Math.random() * 18}px`);
    particle.style.setProperty("--dx", `${(Math.random() - 0.5) * 70}px`);
    particle.style.setProperty("--dy", `${-18 - Math.random() * 66}px`);
    particle.style.setProperty("--duration", `${duration}ms`);
    particle.style.animationDelay = `${delay}ms`;
    container.append(particle);

    window.setTimeout(() => {
      particle.remove();
    }, duration + delay + 120);
  }
}

function getCommentPageUrl() {
  if (window.location.hostname === "cartoon.lazymicezhu.com") {
    return "https://cartoon.lazymicezhu.com/comment.html";
  }

  return new URL("./comment.html", window.location.href).href;
}

function setupCommentQr() {
  if (!commentQr || !commentQrLink || !commentQrImage) {
    return;
  }

  const commentUrl = getCommentPageUrl();
  commentQrLink.href = commentUrl;
  commentQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(commentUrl)}`;

  const savedPosition = readJson("comment-qr-position", null);
  if (savedPosition) {
    setQrPosition(savedPosition.x, savedPosition.y);
  }

  commentBubblesEnabled = readJson(commentBubblesEnabledKey, true) !== false;
  commentBubbleSizeIndex = clamp(Math.round(Number(readJson(commentBubbleSizeKey, 1))), 0, 2);
  if (bubbleSizeInput) {
    bubbleSizeInput.value = String(commentBubbleSizeIndex);
    bubbleSizeInput.addEventListener("input", handleBubbleSizeChange);
  }
  updateCommentToggle();
  commentToggle?.addEventListener("click", () => {
    setCommentBubblesEnabled(!commentBubblesEnabled);
  });
  commentSettingsToggle?.addEventListener("click", () => {
    const isOpen = commentSettings?.hasAttribute("hidden");
    if (commentSettings) {
      commentSettings.hidden = !isOpen;
      if (isOpen) {
        updateSettingsPlacement();
      }
    }
    commentSettingsToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  });
  commentQr.addEventListener("pointerdown", handleQrPointerDown);
}

function handleQrPointerDown(event) {
  const interactive = event.target.closest(".comment-qr__link, .comment-toggle, .comment-settings, .comment-settings-toggle");
  if (interactive) {
    return;
  }

  event.preventDefault();

  const rect = commentQr.getBoundingClientRect();
  qrDrag = {
    pointerId: event.pointerId,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  };
  commentQr.setPointerCapture(event.pointerId);
  window.addEventListener("pointermove", handleQrPointerMove, true);
  window.addEventListener("pointerup", handleQrPointerUp, true);
  window.addEventListener("pointercancel", handleQrPointerUp, true);
}

function handleQrPointerMove(event) {
  if (!qrDrag || event.pointerId !== qrDrag.pointerId) {
    return;
  }

  setQrPosition(event.clientX - qrDrag.offsetX, event.clientY - qrDrag.offsetY);
}

function handleQrPointerUp(event) {
  if (!qrDrag || event.pointerId !== qrDrag.pointerId) {
    return;
  }

  if (commentQr.hasPointerCapture(qrDrag.pointerId)) {
    commentQr.releasePointerCapture(qrDrag.pointerId);
  }
  window.removeEventListener("pointermove", handleQrPointerMove, true);
  window.removeEventListener("pointerup", handleQrPointerUp, true);
  window.removeEventListener("pointercancel", handleQrPointerUp, true);

  const rect = commentQr.getBoundingClientRect();
  writeJson("comment-qr-position", { x: rect.left, y: rect.top });
  qrDrag = null;
}

function setQrPosition(x, y) {
  const rect = commentQr.getBoundingClientRect();
  const maxX = Math.max(10, window.innerWidth - rect.width - 10);
  const maxY = Math.max(10, window.innerHeight - rect.height - 10);
  commentQr.style.left = `${clamp(x, 10, maxX)}px`;
  commentQr.style.top = `${clamp(y, 10, maxY)}px`;
  commentQr.style.bottom = "auto";
  updateSettingsPlacement();
}

function handleBubbleSizeChange() {
  commentBubbleSizeIndex = clamp(Math.round(Number(bubbleSizeInput.value)), 0, 2);
  writeJson(commentBubbleSizeKey, commentBubbleSizeIndex);
  commentBubbles.forEach((bubble) => {
    applyBubbleSize(bubble, bubble.baseSize);
    updateBubbleText(bubble);
    keepBubbleInsideViewport(bubble);
  });
}

function setupCommentBubbles() {
  if (!commentBubbleLayer || commentPollingStarted) {
    return;
  }

  commentPollingStarted = true;
  window.addEventListener("pointermove", handleBubblePointerMove);
  window.addEventListener("pointerdown", handleBubblePointerPress);
  window.addEventListener("pointermove", handleDraggedBubbleMove, true);
  window.addEventListener("pointerup", handleDraggedBubbleEnd, true);
  window.addEventListener("pointercancel", handleDraggedBubbleEnd, true);
  window.addEventListener("resize", keepQrInView);
  window.addEventListener("cartoon-comment", (event) => {
    spawnCommentBubble({
      id: `preview-${Date.now()}`,
      text: event.detail?.text || "新的评论",
      nickname: event.detail?.nickname || "",
      color: event.detail?.color || "blue",
      created_at: Date.now(),
    });
  });

  if (commentBubblesEnabled) {
    startCommentPolling();
  }
  window.requestAnimationFrame(tickBubbles);
}

function setCommentBubblesEnabled(isEnabled) {
  commentBubblesEnabled = isEnabled;
  writeJson(commentBubblesEnabledKey, commentBubblesEnabled);
  updateCommentToggle();

  if (commentBubblesEnabled) {
    startCommentPolling();
    return;
  }

  stopCommentPolling();
  clearCommentBubbles();
}

function updateCommentToggle() {
  if (!commentToggle) {
    return;
  }

  commentToggle.classList.toggle("is-on", commentBubblesEnabled);
  commentToggle.setAttribute("aria-checked", String(commentBubblesEnabled));
}

function startCommentPolling() {
  if (commentPollingTimer) {
    return;
  }

  pollComments();
  commentPollingTimer = window.setInterval(pollComments, 1000);
}

function stopCommentPolling() {
  if (!commentPollingTimer) {
    return;
  }

  window.clearInterval(commentPollingTimer);
  commentPollingTimer = null;
}

function clearCommentBubbles() {
  if (draggedBubble) {
    draggedBubble.node.classList.remove("is-dragging");
    draggedBubble.isDragging = false;
    draggedBubble = null;
  }

  commentBubbles.forEach((bubble) => {
    bubble.node.remove();
  });
  commentBubbles.length = 0;
  seenCommentIds.clear();
  lastCommentId = 0;
}

function handleBubblePointerMove(event) {
  pointerState.x = event.clientX;
  pointerState.y = event.clientY;
  pointerState.activeUntil = performance.now() + 240;
}

function handleBubblePointerPress(event) {
  const bubbleNode = event.target.closest(".comment-bubble");
  if (bubbleNode) {
    if (event.target.closest(".comment-bubble__reply-form, .comment-bubble__reply-input, .comment-bubble__reply-submit")) {
      return;
    }
    startBubbleDrag(event, bubbleNode);
    return;
  }

  pointerState.x = event.clientX;
  pointerState.y = event.clientY;
  pointerState.activeUntil = performance.now() + 620;
  commentBubbles.forEach((bubble) => {
    const dx = bubble.x - event.clientX;
    const dy = bubble.y - event.clientY;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance < 260) {
      const strength = (260 - distance) * 0.045;
      bubble.vx += (dx / distance) * strength;
      bubble.vy += (dy / distance) * strength - 0.8;
    }
  });
}

function keepQrInView() {
  if (!commentQr) {
    return;
  }
  const rect = commentQr.getBoundingClientRect();
  setQrPosition(rect.left, rect.top);
  updateSettingsPlacement();
}

function updateSettingsPlacement() {
  if (!commentQr || !commentSettings || commentSettings.hidden) {
    return;
  }
  const rect = commentQr.getBoundingClientRect();
  const opensRight = rect.right + 204 < window.innerWidth;
  commentQr.classList.toggle("settings-open-left", !opensRight);
}

async function pollComments() {
  const comments = await fetchRemoteComments();
  comments.forEach((comment) => {
    const id = String(comment.id);
    if (seenCommentIds.has(id)) {
      return;
    }
    seenCommentIds.add(id);
    lastCommentId = Math.max(lastCommentId, Number(comment.id) || lastCommentId);
    spawnCommentBubble(comment);
  });

  if (Date.now() - lastReplySyncAt > 3000) {
    lastReplySyncAt = Date.now();
    syncBubbleReplies();
  }
}

async function fetchRemoteComments() {
  try {
    const params = new URLSearchParams({
      after: String(lastCommentId),
    });
    if (shouldSendScreenHeartbeat()) {
      params.set("screenId", screenId);
      lastScreenHeartbeatAt = Date.now();
    }
    const response = await fetch(`${commentApiPath}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Comment API is unavailable");
    }
    const payload = await response.json();
    return Array.isArray(payload.comments) ? payload.comments : [];
  } catch {
    return readLocalCommentsAfter(lastCommentId);
  }
}

function readLocalCommentsAfter(afterId) {
  const comments = readJson(localCommentKey, []);
  return comments
    .filter((comment) => Number(comment.id) > afterId)
    .sort((a, b) => Number(a.id) - Number(b.id));
}

async function syncBubbleReplies() {
  if (!commentBubbles.length) {
    return;
  }
  let comments;
  try {
    const response = await fetch(`${commentApiPath}?after=0&limit=80`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Comment API is unavailable");
    }
    const payload = await response.json();
    comments = Array.isArray(payload.comments) ? payload.comments : [];
  } catch {
    comments = readLocalCommentsAfter(0);
  }

  const byId = new Map(comments.map((comment) => [String(comment.id), comment]));
  commentBubbles.forEach((bubble) => {
    const fresh = byId.get(String(bubble.id));
    if (!fresh) {
      return;
    }
    const replies = normalizeReplies(fresh.replies);
    const replyCount = Math.max(Number(fresh.reply_count) || 0, replies.length);
    if (replyCount !== bubble.replyCount || replies.length !== bubble.replies.length) {
      bubble.replies = replies;
      bubble.replyCount = replyCount;
      renderBubbleReplies(bubble);
      keepBubbleInsideViewport(bubble);
    }
  });
}

function spawnCommentBubble(comment) {
  const text = String(comment.text || "").trim();
  if (!text) {
    return;
  }

  const node = document.createElement("div");
  const nickname = String(comment.nickname || "").trim();
  const createdAt = Number(comment.created_at) || Date.now();
  const color = normalizeBubbleColor(comment.color);
  const baseSize = clamp(86 + text.length * 2.8, 98, 172);
  const replies = normalizeReplies(comment.replies);
  node.className = "comment-bubble";
  node.dataset.color = color;
  node.classList.toggle("has-author", Boolean(nickname));
  node.innerHTML = `
    <span class="comment-bubble__reply-count"></span>
    <span class="comment-bubble__author"></span>
    <span class="comment-bubble__text"></span>
    <span class="comment-bubble__time"></span>
    <div class="comment-bubble__replies"></div>
    <form class="comment-bubble__reply-form">
      <textarea class="comment-bubble__reply-input" maxlength="120" placeholder="评论这个气泡"></textarea>
      <button class="comment-bubble__reply-submit" type="submit">发送</button>
    </form>
  `;
  node.querySelector(".comment-bubble__author").textContent = nickname;
  node.querySelector(".comment-bubble__time").textContent = formatCommentTime(createdAt);
  node.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".comment-bubble__reply-form")) {
      event.preventDefault();
    }
  });
  commentBubbleLayer.append(node);

  const size = getScaledBubbleSize(baseSize);
  const spawnPoint = getBubbleSpawnPoint(size);
  const bubble = {
    id: comment.id,
    node,
    baseSize,
    radius: size / 2,
    x: spawnPoint.x,
    y: spawnPoint.y,
    vx: (Math.random() - 0.5) * 1.4,
    vy: -2.2 - Math.random() * 1.1,
    bornAt: performance.now(),
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    movedDuringDrag: false,
    text,
    replies,
    replyCount: Math.max(Number(comment.reply_count) || 0, replies.length),
  };

  applyBubbleSize(bubble, baseSize);
  updateBubbleText(bubble);
  renderBubbleReplies(bubble);
  node.querySelector(".comment-bubble__reply-form").addEventListener("submit", (event) => {
    event.preventDefault();
    submitBubbleReply(bubble);
  });
  commentBubbles.push(bubble);

  if (commentBubbles.length > 42) {
    const oldBubble = commentBubbles.shift();
    oldBubble.node.remove();
  }
}

function normalizeReplies(replies) {
  return Array.isArray(replies)
    ? replies
        .map((reply) => ({
          id: reply.id,
          text: String(reply.text || "").trim(),
          nickname: String(reply.nickname || "").trim(),
          created_at: Number(reply.created_at) || Date.now(),
        }))
        .filter((reply) => reply.text)
    : [];
}

function applyBubbleSize(bubble, baseSize) {
  const size = getScaledBubbleSize(baseSize);
  bubble.radius = size / 2;
  bubble.node.style.setProperty("--bubble-size", `${size}px`);
}

function getScaledBubbleSize(baseSize) {
  return Math.round(baseSize * (bubbleSizeScales[commentBubbleSizeIndex] || 1));
}

function updateBubbleText(bubble) {
  const textNode = bubble.node.querySelector(".comment-bubble__text");
  if (!textNode) {
    return;
  }
  const isExpanded = bubble.node.classList.contains("is-expanded");
  textNode.textContent = isExpanded ? bubble.text : createBubblePreviewText(bubble.text, bubble);
}

function createBubblePreviewText(text, bubble) {
  const normalized = String(text || "").trim();
  const diameter = Math.max((bubble?.radius || 54) * 2, 1);
  const charsPerLine = Math.max(4, Math.floor((diameter - 38) / 16));
  const lineCount = diameter < 100 ? 2 : 3;
  const reservedForBadge = bubble?.replyCount > 0 ? 3 : 0;
  const maxLength = clamp(charsPerLine * lineCount - reservedForBadge, 8, 18);
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(4, maxLength - 2))}...`;
}

function renderBubbleReplies(bubble) {
  const countNode = bubble.node.querySelector(".comment-bubble__reply-count");
  const repliesNode = bubble.node.querySelector(".comment-bubble__replies");
  const count = Math.max(bubble.replyCount || 0, bubble.replies.length);
  bubble.replyCount = count;
  bubble.node.classList.toggle("has-replies", count > 0);
  if (countNode) {
    countNode.textContent = String(count);
    countNode.setAttribute("aria-label", `${count} 条评论`);
  }
  if (!repliesNode) {
    return;
  }
  repliesNode.textContent = "";
  bubble.replies.forEach((reply) => {
    const item = document.createElement("div");
    item.className = "comment-bubble__reply";
    const author = reply.nickname ? `${reply.nickname}：` : "";
    item.textContent = `${author}${reply.text}`;
    repliesNode.append(item);
  });
}

async function submitBubbleReply(bubble) {
  const input = bubble.node.querySelector(".comment-bubble__reply-input");
  const button = bubble.node.querySelector(".comment-bubble__reply-submit");
  const text = input.value.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!text) {
    return;
  }

  button.disabled = true;
  try {
    const reply = await createReply(bubble.id, text);
    bubble.replies.push(reply);
    bubble.replyCount += 1;
    input.value = "";
    renderBubbleReplies(bubble);
    keepBubbleInsideViewport(bubble);
  } finally {
    button.disabled = false;
  }
}

async function createReply(parentId, text, nickname = "") {
  try {
    const response = await fetch(commentApiPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ parent_id: parentId, text, nickname }),
    });
    if (!response.ok) {
      throw new Error("Reply API is unavailable");
    }
    const payload = await response.json();
    return payload.reply || { id: Date.now(), parent_id: parentId, text, nickname, created_at: Date.now() };
  } catch {
    return saveLocalReply(parentId, text, nickname);
  }
}

function saveLocalReply(parentId, text, nickname) {
  const comments = readJson(localCommentKey, []);
  const target = comments.find((comment) => String(comment.id) === String(parentId));
  const reply = {
    id: Date.now(),
    parent_id: parentId,
    text,
    nickname,
    created_at: Date.now(),
  };
  if (target) {
    target.replies = Array.isArray(target.replies) ? target.replies : [];
    target.replies.push(reply);
    target.reply_count = target.replies.length;
    writeJson(localCommentKey, comments.slice(-80));
  }
  return reply;
}

function getBubbleSpawnPoint(size) {
  const radius = size / 2;
  const viewport = getViewportSize();
  const leftZone = {
    min: radius + 18,
    max: Math.max(radius + 18, viewport.width * 0.18),
  };
  const rightZone = {
    min: Math.min(viewport.width - radius - 18, viewport.width * 0.82),
    max: viewport.width - radius - 18,
  };
  const zone = Math.random() < 0.5 ? leftZone : rightZone;
  const x = clamp(zone.min + Math.random() * (zone.max - zone.min), radius, viewport.width - radius);
  const y = clamp(viewport.height * (0.58 + Math.random() * 0.2), radius + bubbleSafeTop, viewport.height - radius - 18);
  return { x, y };
}

function startBubbleDrag(event, bubbleNode) {
  const bubble = commentBubbles.find((item) => item.node === bubbleNode);
  if (!bubble) {
    return;
  }

  pointerState.x = event.clientX;
  pointerState.y = event.clientY;
  pointerState.activeUntil = performance.now() + 420;
  draggedBubble = bubble;
  bubble.pointerId = event.pointerId;
  bubble.isDragging = true;
  bubble.dragStartX = event.clientX;
  bubble.dragStartY = event.clientY;
  bubble.dragOffsetX = event.clientX - bubble.x;
  bubble.dragOffsetY = event.clientY - bubble.y;
  bubble.movedDuringDrag = false;
  bubble.vx = 0;
  bubble.vy = 0;
  bubble.node.classList.add("is-dragging");
  bubble.node.setPointerCapture(event.pointerId);
}

function handleDraggedBubbleMove(event) {
  if (!draggedBubble || event.pointerId !== draggedBubble.pointerId) {
    return;
  }

  const dx = event.clientX - draggedBubble.dragStartX;
  const dy = event.clientY - draggedBubble.dragStartY;
  draggedBubble.movedDuringDrag ||= Math.hypot(dx, dy) > 6;
  draggedBubble.x = event.clientX - draggedBubble.dragOffsetX;
  draggedBubble.y = event.clientY - draggedBubble.dragOffsetY;
  draggedBubble.vx = dx * 0.05;
  draggedBubble.vy = dy * 0.05;
  pointerState.x = event.clientX;
  pointerState.y = event.clientY;
  pointerState.activeUntil = performance.now() + 120;
}

function handleDraggedBubbleEnd(event) {
  if (!draggedBubble || event.pointerId !== draggedBubble.pointerId) {
    return;
  }

  if (draggedBubble.node.hasPointerCapture(event.pointerId)) {
    draggedBubble.node.releasePointerCapture(event.pointerId);
  }
  draggedBubble.node.classList.remove("is-dragging");
  draggedBubble.isDragging = false;
  draggedBubble.pointerId = null;

  if (!draggedBubble.movedDuringDrag) {
    draggedBubble.node.classList.toggle("is-expanded");
    updateBubbleText(draggedBubble);
    keepBubbleInsideViewport(draggedBubble);
  }

  draggedBubble = null;
}

function normalizeBubbleColor(color) {
  return ["blue", "yellow", "green", "pink", "violet"].includes(color) ? color : "blue";
}

function formatCommentTime(createdAt) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "刚刚";
  }
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tickBubbles(timestamp) {
  const delta = Math.min((timestamp - (lastBubbleFrame || timestamp)) / 16.67, 2);
  lastBubbleFrame = timestamp;
  const obstacles = getBubbleObstacles();

  commentBubbles.forEach((bubble) => {
    if (bubble.isDragging) {
      resolveWallCollision(bubble);
      return;
    }

    bubble.vy -= 0.018 * delta;
    bubble.vx *= 0.992;
    bubble.vy *= 0.996;

    if (timestamp < pointerState.activeUntil) {
      applyPointerForce(bubble, timestamp);
    }

    bubble.x += bubble.vx * delta;
    bubble.y += bubble.vy * delta;
    resolveWallCollision(bubble);
    obstacles.forEach((rect) => resolveRectCollision(bubble, rect));
  });

  resolveBubbleCollisions();
  commentBubbles.forEach((bubble) => {
    bubble.node.style.transform = `translate3d(${bubble.x - bubble.radius}px, ${bubble.y - bubble.radius}px, 0)`;
  });

  window.requestAnimationFrame(tickBubbles);
}

function keepBubbleInsideViewport(bubble) {
  const viewport = getViewportSize();
  const { halfWidth, halfHeight } = getBubbleHalfSize(bubble);
  bubble.x = clamp(bubble.x, halfWidth + 8, viewport.width - halfWidth - 8);
  bubble.y = clamp(bubble.y, halfHeight + bubbleSafeTop, viewport.height - halfHeight - 8);
  bubble.vx = 0;
  bubble.vy = 0;
}

function applyPointerForce(bubble, timestamp) {
  const dx = bubble.x - pointerState.x;
  const dy = bubble.y - pointerState.y;
  const distance = Math.hypot(dx, dy) || 1;
  const range = 180;
  if (distance > range) {
    return;
  }

  const force = ((range - distance) / range) * (timestamp < pointerState.activeUntil - 360 ? 0.38 : 0.18);
  bubble.vx += (dx / distance) * force;
  bubble.vy += (dy / distance) * force;
}

function resolveWallCollision(bubble) {
  const viewport = getViewportSize();
  const { halfWidth, halfHeight } = getBubbleHalfSize(bubble);
  const minX = halfWidth + 8;
  const maxX = viewport.width - halfWidth - 8;
  const minY = halfHeight + bubbleSafeTop;
  const maxY = viewport.height - halfHeight - 8;

  if (bubble.x < minX) {
    bubble.x = minX;
    bubble.vx = Math.abs(bubble.vx) * 0.74;
  } else if (bubble.x > maxX) {
    bubble.x = maxX;
    bubble.vx = -Math.abs(bubble.vx) * 0.74;
  }

  if (bubble.y < minY) {
    bubble.y = minY;
    bubble.vy = Math.abs(bubble.vy) * 0.46;
  } else if (bubble.y > maxY) {
    bubble.y = maxY;
    bubble.vy = -Math.abs(bubble.vy) * 0.58;
  }
}

function getBubbleHalfSize(bubble) {
  return {
    halfWidth: Math.max(bubble.node.offsetWidth / 2, bubble.radius),
    halfHeight: Math.max(bubble.node.offsetHeight / 2, bubble.radius),
  };
}

function getViewportSize() {
  return {
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
  };
}

function resolveRectCollision(bubble, rect) {
  const nearestX = clamp(bubble.x, rect.left, rect.right);
  const nearestY = clamp(bubble.y, rect.top, rect.bottom);
  const dx = bubble.x - nearestX;
  const dy = bubble.y - nearestY;
  const distance = Math.hypot(dx, dy);
  if (distance >= bubble.radius) {
    return;
  }

  const normalX = distance === 0 ? 0 : dx / distance;
  const normalY = distance === 0 ? -1 : dy / distance;
  const overlap = bubble.radius - distance + 2;
  bubble.x += normalX * overlap;
  bubble.y += normalY * overlap;
  const velocityAlongNormal = bubble.vx * normalX + bubble.vy * normalY;
  if (velocityAlongNormal < 0) {
    bubble.vx -= velocityAlongNormal * normalX * 1.35;
    bubble.vy -= velocityAlongNormal * normalY * 1.35;
  }
}

function resolveBubbleCollisions() {
  for (let i = 0; i < commentBubbles.length; i += 1) {
    for (let j = i + 1; j < commentBubbles.length; j += 1) {
      const a = commentBubbles[i];
      const b = commentBubbles[j];
      if (a.isDragging || b.isDragging) {
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
      const relativeVelocity = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (relativeVelocity < 0) {
        const impulse = relativeVelocity * -0.34;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        b.vx += impulse * nx;
        b.vy += impulse * ny;
      }
    }
  }
}

function getBubbleObstacles() {
  const selectors = [
    ".chapter-grid .comic-panel.is-visible",
    ".option-strip.is-visible",
    ".chapter-caption.is-visible",
    ".overview-chapter",
    ".comment-qr",
  ];

  return selectors.flatMap((selector) =>
    [...document.querySelectorAll(selector)]
      .filter((element) => element.offsetParent !== null)
      .map((element) => expandRect(element.getBoundingClientRect(), 8)),
  );
}

function expandRect(rect, padding) {
  return {
    left: rect.left - padding,
    top: rect.top - padding,
    right: rect.right + padding,
    bottom: rect.bottom + padding,
  };
}

function readJson(key, fallback) {
  try {
    if (!window.localStorage) {
      return fallback;
    }
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    if (window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // Storage can be disabled in embedded preview browsers.
  }
}

function getScreenId() {
  const existingId = readJson(screenIdKey, "");
  if (existingId) {
    return existingId;
  }

  const id = window.crypto?.randomUUID?.() ?? `screen-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  writeJson(screenIdKey, id);
  return id;
}

function shouldSendScreenHeartbeat() {
  return Date.now() - lastScreenHeartbeatAt > 10_000;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

async function goToNextChapter() {
  const nextIndex = currentChapterIndex + 1;
  if (nextIndex >= chapterData.length) {
    await showAllChaptersOverview(track.children[currentChapterIndex]);
    isAnimating = false;
    return;
  }

  const nextChapter = track.children[nextIndex];
  revealPanels(nextChapter);

  track.style.transform = `translateX(-${nextIndex * 100}%)`;
  currentChapterIndex = nextIndex;

  await wait(chapterSlideDuration);

  isAnimating = false;
}

function clearFrozenOptionState(chapterNode) {
  const optionStrip = chapterNode.querySelector(".option-strip");
  const optionsContainer = chapterNode.querySelector(".options");
  const captionNode = chapterNode.querySelector(".chapter-caption");

  optionStrip.classList.remove("is-visible");
  optionStrip.style.display = "none";
  captionNode.classList.remove("is-visible");
  captionNode.textContent = "";
  optionsContainer.classList.remove("is-frozen");
  optionsContainer.style.width = "";
  optionsContainer.style.height = "";

  optionsContainer.querySelectorAll(".is-option").forEach((option) => {
    option.classList.remove("is-bursting", "is-dragging", "is-used");
    option.style.left = "";
    option.style.top = "";
    option.style.width = "";
    option.style.height = "";
  });
}

async function showAllChaptersOverview(currentChapterNode) {
  clearRevealTimers();
  clearTypewriterTimers();
  clearFrozenOptionState(currentChapterNode);
  overviewGrid.replaceChildren();

  chapterData.forEach((chapter, chapterIndex) => {
    const chapterCard = overviewChapterTemplate.content.firstElementChild.cloneNode(true);
    const grid = chapterCard.querySelector(".chapter-grid");
    chapterCard.querySelector(".overview-label").textContent = `第 ${chapterIndex + 1} 章`;
    chapterCard.querySelector(".overview-caption").textContent = getSelectedCaption(chapterIndex);

    chapter.panels.forEach((panel) => {
      const panelNode = createPanel(panel);
      panelNode.classList.add("is-visible");
      grid.append(panelNode);
    });

    const finalImage = selectedOptions.get(chapterIndex)?.image ?? chapter.options[0].image;
    const finalPanel = createPanel({
      image: finalImage,
      aspect: selectedOptions.get(chapterIndex)?.aspect ?? chapter.options[0].aspect,
    });
    finalPanel.classList.add("is-visible");
    grid.append(finalPanel);

    overviewGrid.append(chapterCard);
  });

  storyStage.style.transition = "opacity 500ms ease, transform 500ms ease";
  storyStage.style.opacity = "0";
  storyStage.style.transform = "translateY(-18px)";

  await wait(520);

  storyStage.hidden = true;
  chapterOverview.hidden = false;
  requestAnimationFrame(() => {
    chapterOverview.classList.add("is-visible");
  });

  await wait(720);
  storyStage.style.transition = "";
  storyStage.style.opacity = "";
  storyStage.style.transform = "";
}

function render() {
  chapterData.forEach((chapter, index) => {
    const chapterNode = buildChapter(chapter, index);
    track.append(chapterNode);
  });

  setupCoverPage();
}

function setupCoverPage() {
  preloadStoryAssets();
  setupCommentQr();
  setupCommentBubbles();
  coverEnter?.addEventListener("click", startStory);
  coverPage?.addEventListener("click", (event) => {
    if (event.target === coverPage) {
      startStory();
    }
  });
}

function preloadStoryAssets() {
  const assetUrls = [
    ...chapterData.flatMap((chapter) => [
      ...chapter.panels.map((panel) => panel.image),
      ...chapter.options.map((option) => option.image),
    ]),
    getCommentPageUrl(),
  ];

  assetUrls.forEach((url) => {
    if (!url || url.startsWith("linear-gradient") || preloadedAssets.has(url)) {
      return;
    }

    preloadedAssets.add(url);
    if (isImageUrl(url)) {
      const image = new Image();
      image.decoding = "async";
      image.loading = "eager";
      image.src = url;
      return;
    }

    fetch(url, { cache: "force-cache" }).catch(() => {});
  });
}

function isImageUrl(url) {
  return /\.(avif|gif|jpe?g|png|svg|webp)(\?|#|$)/i.test(url) || url.includes("picsum.photos");
}

function startStory() {
  if (storyStarted) {
    return;
  }

  storyStarted = true;
  coverPage?.classList.add("is-hidden");
  revealPanels(track.children[0]);
}

render();
