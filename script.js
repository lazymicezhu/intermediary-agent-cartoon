const chapterData = [
  {
    caption: "林影与潮湿的风在远处慢慢交叠，昏暗天色里浮起一线微光，像沉寂已久的道路终于显露出它真正通往的方向",
    panels: [
      {
        image:
          "https://picsum.photos/seed/chapter1-panel1/900/900",
      },
      {
        image:
          "https://picsum.photos/seed/chapter1-panel2/900/900",
      },
      {
        image:
          "https://picsum.photos/seed/chapter1-panel3/900/900",
      },
    ],
    options: [
      {
        image:
          "https://picsum.photos/seed/chapter1-option1/900/900",
      },
      {
        image:
          "https://picsum.photos/seed/chapter1-option2/900/900",
      },
      {
        image:
          "https://picsum.photos/seed/chapter1-option3/900/900",
      },
      {
        image:
          "https://picsum.photos/seed/chapter1-option4/900/900",
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

let currentChapterIndex = 0;
let isAnimating = false;
let activeDrag = null;
let dissolvingOptions = [];
let revealTimeouts = [];
let typewriterTimeouts = [];
const selectedOptions = new Map();

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function createPanel(panel, extraClasses = []) {
  const panelNode = panelTemplate.content.firstElementChild.cloneNode(true);
  panelNode.classList.add(...extraClasses);
  panelNode.dataset.image = panel.image;
  applyPanelImage(panelNode, panel.image);
  return panelNode;
}

function applyPanelImage(panelNode, image) {
  const art = panelNode.querySelector(".panel-art");
  art.style.backgroundImage = image.startsWith("linear-gradient")
    ? image
    : `url("${image}")`;
}

function createEmptySlot() {
  const slot = createPanel(
    {
      image:
        "linear-gradient(135deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.08))",
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

  const slot = createEmptySlot();
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
  slot.className = "comic-panel is-visible";
  slot.dataset.role = "filled-slot";
  slot.dataset.image = optionCard.dataset.image;
  applyPanelImage(slot, optionCard.dataset.image);
  selectedOptions.set(currentChapterIndex, optionCard.dataset.image);

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
  await playChapterCaption(chapterNode, chapterData[currentChapterIndex].caption);

  await wait(320);

  dissolvingOptions = [];
  goToNextChapter();
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
    chapterCard.querySelector(".overview-caption").textContent = chapter.caption;

    chapter.panels.forEach((panel) => {
      const panelNode = createPanel(panel);
      panelNode.classList.add("is-visible");
      grid.append(panelNode);
    });

    const finalImage = selectedOptions.get(chapterIndex) ?? chapter.options[0].image;
    const finalPanel = createPanel({ image: finalImage });
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

  revealPanels(track.children[0]);
}

render();
