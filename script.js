const chapterData = [
  {
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

const revealDelay = 2000;
const track = document.querySelector("#chapter-track");
const chapterTemplate = document.querySelector("#chapter-template");
const panelTemplate = document.querySelector("#panel-template");

let currentChapterIndex = 0;
let isAnimating = false;
let activeDrag = null;
let dissolvingOptions = [];

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function createPanel(panel, extraClasses = []) {
  const panelNode = panelTemplate.content.firstElementChild.cloneNode(true);
  panelNode.classList.add(...extraClasses);
  const art = panelNode.querySelector(".panel-art");
  art.style.backgroundImage = panel.image.startsWith("linear-gradient")
    ? panel.image
    : `url("${panel.image}")`;
  return panelNode;
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

  return chapterNode;
}

function revealPanels(chapterNode) {
  const gridPanels = [...chapterNode.querySelectorAll(".chapter-grid .comic-panel")];
  const optionStrip = chapterNode.querySelector(".option-strip");
  gridPanels.forEach((panel) => panel.classList.remove("is-visible"));
  optionStrip.classList.remove("is-visible");

  gridPanels.slice(0, 3).forEach((panel, index) => {
    window.setTimeout(() => {
      panel.classList.add("is-visible");
    }, index * revealDelay);
  });

  window.setTimeout(() => {
    const slot = gridPanels[3];
    slot.classList.add("is-visible");
    optionStrip.classList.add("is-visible");
  }, 3 * revealDelay);
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
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  };

  updateDragPosition(event.clientX, event.clientY);
  updateDropTarget(event.clientX, event.clientY);

  optionCard.addEventListener("pointermove", handlePointerMove);
  optionCard.addEventListener("pointerup", handlePointerUp);
  optionCard.addEventListener("pointercancel", handlePointerUp);
}

function handlePointerMove(event) {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
    return;
  }

  updateDragPosition(event.clientX, event.clientY);
  updateDropTarget(event.clientX, event.clientY);
}

function handlePointerUp(event) {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
    return;
  }

  const { source } = activeDrag;
  clearDropTargets();

  const dropSlot = getActiveDropSlot(event.clientX, event.clientY);
  if (dropSlot) {
    fillSlot(dropSlot, source);
  } else {
    source.classList.remove("is-dragging");
  }

  cleanupActiveDrag();
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
  source.removeEventListener("pointermove", handlePointerMove);
  source.removeEventListener("pointerup", handlePointerUp);
  source.removeEventListener("pointercancel", handlePointerUp);
  if (source.hasPointerCapture(pointerId)) {
    source.releasePointerCapture(pointerId);
  }
  visual.remove();
  activeDrag = null;
}

function fillSlot(slot, optionCard) {
  slot.className = optionCard.className.replace("is-option", "").trim();
  slot.dataset.role = "filled-slot";
  slot.querySelector(".panel-art").style.backgroundImage =
    optionCard.querySelector(".panel-art").style.backgroundImage;
  slot.classList.add("is-visible");

  const chapterNode = slot.closest(".chapter");
  dissolvingOptions = freezeOptionsLayout(chapterNode, optionCard);
  isAnimating = true;

  runChapterTransition(chapterNode);
}

async function runChapterTransition(chapterNode) {
  await wait(520);

  burstRemainingOptions(chapterNode);
  chapterNode.classList.add("is-transitioning");

  await wait(1360);

  chapterNode.classList.add("is-complete");
  chapterNode.querySelector(".option-strip").classList.remove("is-visible");

  await wait(1200);

  dissolvingOptions = [];
  goToNextChapter();
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
    isAnimating = false;
    return;
  }

  const currentChapter = track.children[currentChapterIndex];
  const nextChapter = track.children[nextIndex];
  nextChapter.classList.add("is-entering");

  await wait(40);

  currentChapter.classList.add("is-leaving");
  track.style.transform = `translateX(-${nextIndex * 100}%)`;
  currentChapterIndex = nextIndex;

  await wait(1400);

  nextChapter.classList.remove("is-entering");
  currentChapter.classList.remove("is-leaving");

  revealPanels(nextChapter);
  isAnimating = false;
}

function render() {
  chapterData.forEach((chapter, index) => {
    const chapterNode = buildChapter(chapter, index);
    track.append(chapterNode);
  });

  revealPanels(track.children[0]);
}

render();
