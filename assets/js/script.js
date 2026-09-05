import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.15.0/index.js";
import { Flip } from "https://cdn.jsdelivr.net/npm/gsap@3.15.0/Flip.js";
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.15.0/ScrollTrigger.js";
import { SplitText } from "https://cdn.jsdelivr.net/npm/gsap@3.15.0/SplitText.js";
import Lenis from "https://cdn.jsdelivr.net/npm/lenis@1.3.8/+esm";
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { InteractiveCursorEffect } from "./cursor-effect.js";

gsap.registerPlugin(Flip, ScrollTrigger, SplitText);

// Force scroll to top immediately so the page always starts at the hero
window.scrollTo(0, 0);
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// ===================================================================
// LIVE TIMEZONE CLOCK
// ===================================================================
const timeElement = document.getElementById('live-time');
if (timeElement) {
  // Initialize once immediately so it's ready for SplitText
  const updateTime = () => {
    const now = new Date();
    const options = {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    const timeString = now.toLocaleString('en-US', options).toUpperCase() + ' IST';
    
    // If SplitText has wrapped it in a .line div, update that div to preserve the y-translate animation
    if (timeElement.children.length > 0) {
       timeElement.children[0].innerText = timeString;
    } else {
       timeElement.innerText = timeString;
    }
  };
  
  updateTime(); // initial call
  setInterval(updateTime, 1000);
}

// ===================================================================
// LENIS SMOOTH SCROLL (from Mouse folder)
// ===================================================================
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
});
lenis.stop();

lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// ===================================================================
// PRELOADER (from Loading folder — 100% faithful, B&W adapted)
// ===================================================================
const preloader = document.querySelector(".preloader");
const preloaderBg = document.querySelector(".preloader-bg");
const preloaderGrid = document.querySelector(".preloader-grid");
const progressMarker = document.querySelector(".progress-marker");

const isDesktop = window.innerWidth >= 1000;
const maxTileSize = isDesktop ? 85 : 50;

const snapToOdd = (value) => (value % 2 === 0 ? value - 1 : value);
const columnCount = snapToOdd(Math.floor(window.innerWidth / maxTileSize));
const rowCount = snapToOdd(Math.floor(window.innerHeight / maxTileSize));

const tileSize = Math.min(
  window.innerWidth / columnCount,
  window.innerHeight / rowCount
);

const totalColumns = columnCount + 2;
const totalRows = rowCount + 2;

preloaderGrid.style.width = `${totalColumns * tileSize}px`;
preloaderGrid.style.height = `${totalRows * tileSize}px`;

const tiles = [];
for (let i = 0; i < totalColumns * totalRows; i++) {
  const tile = document.createElement("div");
  tile.classList.add("grid-tile");
  tile.style.width = `${tileSize}px`;
  tile.style.height = `${tileSize}px`;
  preloaderGrid.appendChild(tile);
  tiles.push(tile);
}

const middleRow = Math.floor(totalRows / 2);
const centerColumn = Math.floor(totalColumns / 2);

const tileAtColumn = (column) => tiles[middleRow * totalColumns + column];
const firstStop = tileAtColumn(centerColumn - (isDesktop ? 5 : 2));
const secondStop = tileAtColumn(centerColumn - (isDesktop ? 3 : 1));
const thirdStop = tileAtColumn(centerColumn - (isDesktop ? 5 : 2));
const finalStop = tileAtColumn(centerColumn);

const markerStops = [firstStop, secondStop, thirdStop, finalStop];
markerStops.forEach((tile) => {
  tile.style.backgroundColor = "#fff";
  tile.style.outline = "0.05px solid #fff";
});

const fadeInTiles = tiles.filter((tile) => !markerStops.includes(tile));
gsap.set(fadeInTiles, { opacity: 0 });

gsap.set(progressMarker, { width: tileSize, height: tileSize });

const preloaderRect = preloader.getBoundingClientRect();

const getTileOffset = (tile) => {
  const tileRect = tile.getBoundingClientRect();
  return {
    left: tileRect.left - preloaderRect.left,
    top: tileRect.top - preloaderRect.top,
  };
};

gsap.set(progressMarker, { ...getTileOffset(firstStop), opacity: 1 });

function moveMarkerTo(tile, showIcon = false) {
  const startState = Flip.getState(progressMarker);
  gsap.set(progressMarker, getTileOffset(tile));
  if (showIcon) {
    progressMarker.innerHTML = `<img src="assets/images/icon.webp" alt="" />`;
  }
  Flip.from(startState, { duration: 1, ease: "power1.out" });
}



// SplitText for hero & nav (set hidden, revealed at end of preloader)
const splitCopy = (selector, type, className) =>
  new SplitText(selector, {
    type,
    [`${type}Class`]: className,
    mask: type,
  });

const titleLines = Array.from(document.querySelectorAll(".hero-title .huge-symbol-ascii"));
const subtitleLines = splitCopy(".hero-subtitle h3", "lines", "line").lines;
const navWords = splitCopy("#main-nav a", "words", "word").words;
gsap.set([].concat(titleLines, subtitleLines, navWords).filter(Boolean), { y: "100%" });

// ===== Preloader Timeline =====
const timeline = gsap.timeline({ delay: 1 });

// Tiles fade in randomly
timeline.to(fadeInTiles, {
  opacity: 1,
  duration: 0.125,
  stagger: {
    each: 2.5 / fadeInTiles.length,
    from: "random",
  },
});

// Stop tiles blend into grid (white → gray)
timeline.to(
  [firstStop, secondStop, thirdStop],
  {
    backgroundColor: "#333",
    outlineColor: "#333",
    duration: 0.125,
    stagger: 0.25,
  },
  2.75
);

// Animate the number from 0 to 100
const counter = { val: 0 };
timeline.to(counter, {
  val: 100,
  duration: 2.75,
  ease: "power2.inOut",
  onUpdate: () => {
    const p = progressMarker.querySelector("p");
    if (p) {
      p.textContent = Math.round(counter.val) + "%";
    }
  }
}, 0);

// Marker Flip movements: 25% -> 50% -> 75% -> terminal icon
timeline.add(() => moveMarkerTo(secondStop), 0.25);
timeline.add(() => moveMarkerTo(thirdStop), 1.5);
timeline.add(() => moveMarkerTo(finalStop, true), 2.75);

// Remove preloader background
timeline.add(() => preloaderBg.remove());

// Collapse all tiles
const collapsingTiles = tiles.filter((tile) => tile !== finalStop);

timeline.to(
  collapsingTiles,
  {
    scaleY: 0,
    transformOrigin: "top",
    duration: 0.75,
    stagger: { each: 0.0035, from: "random" },
    ease: "power3.out",
  },
  "+=0.5"
);

// Collapse final stop + progress marker
timeline.to(
  [finalStop, progressMarker],
  {
    scaleY: 0,
    transformOrigin: "top",
    duration: 0.75,
    ease: "power3.out",
  },
  "<"
);

// Hero title chars reveal (random stagger)
timeline.to(
  titleLines,
  {
    y: "0%",
    duration: 1,
    ease: "power3.out",
    stagger: { each: 0.05, from: "random" },
  },
  "<1"
);

// Hero subtitle lines reveal
timeline.to(
  subtitleLines,
  { y: "0%", duration: 1, ease: "power3.out", stagger: 0.1 },
  "<0.5"
);

// Nav words reveal
timeline.to(
  navWords,
  { y: "0%", duration: 1, ease: "power3.out", stagger: 0.075 },
  "<0.25"
);

// Cleanup: remove preloader, enable scrolling, init scroll anims
timeline.add(() => {
  preloader.remove();
  document.body.classList.remove("loading");
  lenis.start();
  window.scrollTo(0, 0);

  requestAnimationFrame(() => {
    ScrollTrigger.refresh();
    initScrollAnimations();
  });
});

// ===================================================================
// SCROLL ANIMATIONS (new, using techniques from both folders)
// ===================================================================
function initScrollAnimations() {
  // Nav smooth scroll links (integrated with Lenis)
  document.querySelectorAll('#main-nav a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const href = link.getAttribute("href");
      if (href === "#contact") {
        // Scroll to the very bottom so the footer fully reveals
        lenis.scrollTo("bottom");
      } else {
        const target = document.querySelector(href);
        if (target) lenis.scrollTo(target, { offset: -50 });
      }
    });
  });

  // ----- About: SplitText line reveal -----
  const aboutText = document.querySelector(".about-text");
  if (aboutText) {
    const aboutLines = new SplitText(aboutText, {
      type: "lines",
      mask: "lines",
      linesClass: "line",
    }).lines;

    gsap.set(aboutLines, { yPercent: 100 });

    ScrollTrigger.create({
      trigger: ".about",
      start: "top 65%",
      once: true,
      onEnter: () => {
        gsap.to(aboutLines, {
          yPercent: 0,
          duration: 1,
          ease: "power3.out",
          stagger: 0.1,
        });
      },
    });
  }

  // ----- Projects: per-row scroll reveal (cards loaded from JSON) -----
  projectsLoaded.then(() => {
    const projectRows = document.querySelectorAll(".project-row");
    if (!projectRows.length) return;

    gsap.set(projectRows, { opacity: 0, x: -80 });

    projectRows.forEach((row) => {
      ScrollTrigger.create({
        trigger: row,
        start: "top 80%",
        once: true,
        onEnter: () => {
          gsap.to(row, {
            opacity: 1,
            x: 0,
            duration: 1,
            ease: "power3.out",
          });
        },
      });
    });
  });

  // ----- Skills: terminal lines + skill bars -----
  const terminalLines = document.querySelectorAll(".terminal-line");
  const skillBars = document.querySelectorAll(".skill-bar");

  if (terminalLines.length) {
    gsap.set(terminalLines, { opacity: 0, x: -20 });

    ScrollTrigger.create({
      trigger: ".skills",
      start: "top 65%",
      once: true,
      onEnter: () => {
        gsap.to(terminalLines, {
          opacity: 1,
          x: 0,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.08,
        });

        gsap.delayedCall(0.5, () => {
          skillBars.forEach((bar) => {
            gsap.to(bar, {
              width: `${bar.dataset.width}%`,
              duration: 1.2,
              ease: "power3.out",
            });
          });
        });
      },
    });
  }
}

// ===================================================================
// DYNAMIC PROJECTS (loaded from projects.json)
// ===================================================================

const PLAY_ICON = `<svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>`;
const GITHUB_ICON = `<svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>`;

function buildProjectCards(projects) {
  const container = document.querySelector(".projects-scroll");
  if (!container) return;

  projects.forEach((project) => {
    const row = document.createElement("div");
    row.classList.add("project-row");

    const screenshotSrc = project.screenshot || "";

    row.innerHTML = `
      <div class="project-card">
        <div class="project-header">
          <div class="project-number">${project.id}</div>
          <h2 class="project-title">${project.title}</h2>
        </div>
        <div class="project-tags">
          ${project.techStack.map((t) => `<span class="project-tag">${t}</span>`).join("")}
        </div>
        <div class="project-actions">
          <a href="${project.liveUrl}" target="_blank" rel="noopener" class="project-btn">
            ${PLAY_ICON} Live
          </a>
          <a href="${project.githubUrl}" target="_blank" rel="noopener" class="project-btn">
            ${GITHUB_ICON} GitHub
          </a>
        </div>
        ${screenshotSrc ? `<span class="spot"><span class="spot-card"><img src="${screenshotSrc}" alt="${project.title} screenshot" /></span></span>` : ""}
      </div>
      <div class="project-detail">
        <div class="project-detail-inner">
          <p>${project.description}</p>
        </div>
      </div>
    `;

    container.appendChild(row);
  });
}

async function loadProjects() {
  try {
    const res = await fetch("assets/data/projects.json");
    const projects = await res.json();
    buildProjectCards(projects);
    initSpotHoverEffect();
  } catch (err) {
    console.error("Failed to load projects:", err);
  }
}

// ===================================================================
// SPOT HOVER EFFECT (from ImageHover folder — adapted for project cards)
// ===================================================================
function initSpotHoverEffect() {
  const DESKTOP_MIN = 1000;
  const TILT_MAX = 25;
  const DRIFT_MAX = 25;
  const SMOOTHING = 0.75;

  const CARD_OPEN = { width: "18rem", height: "14rem" };
  const CARD_DOT = { width: "0.04em", height: "0.04em" };

  const CARD_CENTERED = {
    x: 0,
    y: 0,
    rotateX: 0,
    rotateY: 0,
    xPercent: -50,
    yPercent: -50,
  };

  const isDesktopCheck = () => window.innerWidth >= DESKTOP_MIN;

  document.querySelectorAll(".project-card .spot").forEach((spot) => {
    const card = spot.querySelector(".spot-card");
    const image = spot.querySelector("img");
    if (!card || !image) return;

    const projectRow = spot.closest(".project-row");

    const live = { x: 0, y: 0, tiltX: 0, tiltY: 0 };
    const aim = { x: 0, y: 0, tiltX: 0, tiltY: 0 };

    let isHovering = false;
    let frame = null;

    const startTracking = () => {
      frame = () => {
        live.x += (aim.x - live.x) * SMOOTHING;
        live.y += (aim.y - live.y) * SMOOTHING;
        live.tiltX += (aim.tiltX - live.tiltX) * SMOOTHING;
        live.tiltY += (aim.tiltY - live.tiltY) * SMOOTHING;

        gsap.set(card, {
          x: live.x,
          y: live.y,
          rotateX: live.tiltX,
          rotateY: live.tiltY,
        });

        gsap.set(image, { x: -live.x, y: -live.y });
      };
      gsap.ticker.add(frame);
    };

    const stopTracking = () => {
      gsap.ticker.remove(frame);
      frame = null;
    };

    const expandCard = () => {
      if (!isDesktopCheck()) return;

      isHovering = true;
      if (projectRow) projectRow.style.zIndex = 10;

      Object.assign(live, { x: 0, y: 0, tiltX: 0, tiltY: 0 });
      Object.assign(aim, { x: 0, y: 0, tiltX: 0, tiltY: 0 });

      gsap.set(card, CARD_CENTERED);
      gsap.set(image, { x: 0, y: 0 });

      startTracking();

      gsap.to(card, {
        ...CARD_OPEN,
        duration: 0.75,
        ease: "power3.out",
        overwrite: "auto",
      });

      gsap.to(image, {
        opacity: 1,
        duration: 0.5,
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    spot.addEventListener("mouseenter", expandCard);

    const aimAtCursor = (event) => {
      if (!isHovering || !isDesktopCheck()) return;

      const bounds = spot.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;

      let offsetX = event.clientX - centerX;
      let offsetY = event.clientY - centerY;

      const distance = Math.hypot(offsetX, offsetY);

      if (distance > DRIFT_MAX) {
        const scale = DRIFT_MAX / distance;
        offsetX *= scale;
        offsetY *= scale;
      }

      aim.x = offsetX;
      aim.y = offsetY;

      const cardBounds = card.getBoundingClientRect();
      const ratioX = (event.clientX - centerX) / (cardBounds.width / 2);
      const ratioY = (event.clientY - centerY) / (cardBounds.height / 2);

      const clamp = (value) => Math.max(-1, Math.min(1, value));

      aim.tiltY = clamp(ratioX) * -TILT_MAX;
      aim.tiltX = clamp(ratioY) * TILT_MAX;
    };

    spot.addEventListener("mousemove", aimAtCursor);

    const shrinkCard = () => {
      if (!isDesktopCheck()) return;

      isHovering = false;
      aim.tiltX = aim.tiltY = 0;
      if (projectRow) projectRow.style.zIndex = "";

      stopTracking();

      gsap.to(card, {
        ...CARD_DOT,
        x: 0,
        y: 0,
        rotateX: 0,
        rotateY: 0,
        duration: 0.5,
        ease: "power3.out",
        overwrite: "auto",
        onComplete: () => {
          if (isHovering) return;

          gsap.set(card, {
            clearProps: "width,height",
            ...CARD_CENTERED,
          });

          gsap.set(image, { x: 0, y: 0 });
        },
      });

      gsap.to(image, {
        opacity: 0,
        duration: 0.25,
        ease: "power2.in",
        overwrite: "auto",
      });
    };

    spot.addEventListener("mouseleave", shrinkCard);
  });
}

// Start loading immediately — resolves well before the preloader finishes
const projectsLoaded = loadProjects();

// ===================================================================
// ASCII ART RENDERER (from Mouse folder — 100% faithful, B&W adapted)
// ===================================================================
const ASCII_CHARS = " ._......:::-=+xX#0369";
const FONT_SIZE = 18;
const CELL_SIZE = 20;
const ASCII_COLUMNS = 80;
const DPR = 2;

const CHAR_COLOR = "#555";
const HOVER_COLOR = "#fff";
const HOVER_CHAR_COLOR = "#000";

const HOVER_RADIUS = 8;
const CLUSTER_SIZE = 10;
const HIGHLIGHT_LIFETIME = 300;

let isFooterVisible = false;
const footerObserver = new IntersectionObserver((entries) => {
  isFooterVisible = entries[0].isIntersecting;
}, { threshold: 0 });
// Wait until DOM is ready to observe footer
setTimeout(() => {
  const f = document.querySelector("footer");
  if (f) footerObserver.observe(f);
}, 100);

const backgroundCharIndex = ASCII_CHARS.lastIndexOf(".");

const sampleImagePixels = (image, gridRows) => {
  const canvas = document.createElement("canvas");
  canvas.width = ASCII_COLUMNS;
  canvas.height = gridRows;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, ASCII_COLUMNS, gridRows);
  return ctx.getImageData(0, 0, ASCII_COLUMNS, gridRows).data;
};

const pixelToCharIndex = (pixels, pixelOffset) => {
  const brightness =
    (pixels[pixelOffset] * 0.299 +
      pixels[pixelOffset + 1] * 0.587 +
      pixels[pixelOffset + 2] * 0.114) /
    255;

  return Math.min(
    ASCII_CHARS.length - 1,
    Math.floor((1 - brightness) * ASCII_CHARS.length)
  );
};

const buildCells = (image) => {
  const rows = Math.round(
    ASCII_COLUMNS / (image.naturalWidth / image.naturalHeight)
  );

  const pixels = sampleImagePixels(image, rows);
  const cells = new Map();

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < ASCII_COLUMNS; col++) {
      const charIndex = pixelToCharIndex(
        pixels,
        (row * ASCII_COLUMNS + col) * 4
      );

      if (charIndex <= backgroundCharIndex) continue;

      const randomChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%^&*";
      cells.set(`${col},${row}`, {
        col,
        row,
        char: randomChars[Math.floor(Math.random() * randomChars.length)],
        highlightEndTime: 0,
      });
    }
  }

  return { rows, cells };
};

const setupHand = (image) => {
  const { rows, cells } = buildCells(image);
  const cellList = [...cells.values()];

  const canvas = image.closest(".footer-hand-img").querySelector("canvas");
  canvas.width = ASCII_COLUMNS * CELL_SIZE * DPR;
  canvas.height = rows * CELL_SIZE * DPR;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.font = `${FONT_SIZE}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const metrics = ctx.measureText("X");
  const glyphHeight =
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  const baselineOffset =
    CELL_SIZE / 2 + glyphHeight / 2 - metrics.actualBoundingBoxDescent;

  const canvasWidth = ASCII_COLUMNS * CELL_SIZE;
  const canvasHeight = rows * CELL_SIZE;

  const render = () => {
    if (isFooterVisible) {
      const now = Date.now();
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      for (const cell of cellList) {
        const x = cell.col * CELL_SIZE;
        const y = cell.row * CELL_SIZE;
        const isHighlighted = cell.highlightEndTime > now;

        if (isHighlighted) {
          ctx.fillStyle = HOVER_COLOR;
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        }

        ctx.fillStyle = isHighlighted ? HOVER_CHAR_COLOR : CHAR_COLOR;
        ctx.fillText(cell.char, x + CELL_SIZE / 2, y + baselineOffset);
      }
    }

    requestAnimationFrame(render);
  };

  render();

  return { canvas, cells, cellList, rows };
};

const hands = [];
document.querySelectorAll("img.ascii-hand").forEach((image) => {
  const canvas = document.createElement("canvas");
  const wrapper = image.closest(".footer-hand-img");
  wrapper.appendChild(canvas);

  let initialized = false;
  const start = () => {
    if (initialized) return;
    initialized = true;
    const hand = setupHand(image);
    hands.push(hand);
    // Layer interactive RGB-split effect on top of the ASCII canvas
    new InteractiveCursorEffect(wrapper, hand.canvas, {
      fit: "fill",
      mouseTarget: document.querySelector("footer"),
      displacement: 0.012,
      aberration: 0.12,
    });
  };
  if (image.complete && image.naturalWidth) start();
  image.addEventListener("load", start);
});

const highlightCluster = (cells, startCell) => {
  const now = Date.now();
  startCell.highlightEndTime = now + HIGHLIGHT_LIFETIME;

  const steps = Math.floor(Math.random() * CLUSTER_SIZE) + 1;
  const litCells = [startCell];
  let current = startCell;

  for (let step = 0; step < steps; step++) {
    const neighbours = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const neighbour = cells.get(
          `${current.col + dx},${current.row + dy}`
        );
        if (neighbour && !litCells.includes(neighbour)) {
          neighbours.push(neighbour);
        }
      }
    }
    if (neighbours.length === 0) break;

    const next = neighbours[Math.floor(Math.random() * neighbours.length)];
    next.highlightEndTime = now + HIGHLIGHT_LIFETIME + step * 10;
    litCells.push(next);
    current = next;
  }
};

const hoverHand = (hand, clientX, clientY) => {
  const rect = hand.canvas.getBoundingClientRect();
  const mouseCol = ((clientX - rect.left) / rect.width) * ASCII_COLUMNS;
  const mouseRow = ((clientY - rect.top) / rect.height) * hand.rows;

  let closest = null;
  let closestDist = Infinity;
  for (const cell of hand.cellList) {
    const dx = mouseCol - cell.col;
    const dy = mouseRow - cell.row;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < closestDist) {
      closestDist = dist;
      closest = cell;
    }
  }

  if (closest && closestDist <= HOVER_RADIUS) {
    highlightCluster(hand.cells, closest);
  }
};

window.addEventListener("mousemove", (event) => {
  hands.forEach((hand) => hoverHand(hand, event.clientX, event.clientY));
}, { passive: true });

// ===================================================================
// FOOTER PARALLAX (from Mouse folder — 100% faithful)
// ===================================================================
const PARALLAX_STRENGTH = 20;
const PARALLAX_EASE = 0.05;

const footer = document.querySelector("footer");
const handWrappers = [...document.querySelectorAll(".footer-hand-img")];
const parallaxScale = 1 + (PARALLAX_STRENGTH * 2) / 200;

const pointer = { x: 0, y: 0 };
const drift = { x: 0, y: 0 };

const reveal = { left: -125, right: 125 };

const setPointerTarget = (clientX, clientY) => {
  const rect = footer.getBoundingClientRect();
  pointer.x =
    ((clientX - rect.left) / rect.width - 0.5) * PARALLAX_STRENGTH * 2;
  pointer.y =
    ((clientY - rect.top) / rect.height - 0.5) * PARALLAX_STRENGTH * 2;
};

const renderParallax = () => {
  if (isFooterVisible) {
    drift.x += (pointer.x - drift.x) * PARALLAX_EASE;
    drift.y += (pointer.y - drift.y) * PARALLAX_EASE;

    handWrappers.forEach((wrapper, i) => {
      const direction = 1;
      const revealX = 0;
      const x = drift.x * direction;
      const y = -drift.y;
      wrapper.style.transform = `translate(calc(${x}px + ${revealX}%), ${y}px) scale(${parallaxScale})`;
    });
  }

  requestAnimationFrame(renderParallax);
};

renderParallax();

window.addEventListener("mousemove", (event) => {
  setPointerTarget(event.clientX, event.clientY);
}, { passive: true });

// ===================================================================
// FOOTER SCROLL REVEAL (from Mouse folder — 100% faithful, B&W)
// ===================================================================
const splitHeadingChars = () => {
  const headings = document.querySelectorAll(".footer-header h1");
  const chars = [];

  headings.forEach((heading) => {
    const split = new SplitText(heading, {
      type: "chars",
      charsClass: "char",
    });
    chars.push(...split.chars);
  });

  gsap.set(chars, { position: "relative", yPercent: 125 });
  return chars;
};

const splitContentLines = () => {
  const elements = document.querySelectorAll(
    ".footer-links a, .footer-text p"
  );
  const lines = [];

  elements.forEach((element) => {
    const split = new SplitText(element, {
      type: "lines",
      mask: "lines",
      linesClass: "line",
    });
    lines.push(...split.lines);
  });

  gsap.set(lines, { yPercent: 100 });
  return lines;
};

const headingChars = splitHeadingChars();
const contentLines = splitContentLines();

const charStagger = { each: 0.02, from: "center" };

const animateIn = () => {
  gsap.to(reveal, {
    left: 0,
    right: 0,
    duration: 1,
    ease: "power3.out",
    overwrite: true,
  });
  gsap.to(headingChars, {
    yPercent: 0,
    duration: 1,
    ease: "power3.out",
    stagger: charStagger,
    overwrite: true,
  });
  gsap.to(contentLines, {
    yPercent: 0,
    duration: 1,
    ease: "power3.out",
    stagger: 0.08,
    overwrite: true,
  });
};

const animateOut = () => {
  gsap.to(reveal, {
    left: -125,
    right: 125,
    duration: 0.4,
    ease: "power2.in",
    overwrite: true,
  });
  gsap.to(headingChars, {
    yPercent: 125,
    duration: 0.4,
    ease: "power2.in",
    stagger: { each: 0.01, from: "center" },
    overwrite: true,
  });
  gsap.to(contentLines, {
    yPercent: 100,
    duration: 0.4,
    ease: "power2.in",
    stagger: 0.02,
    overwrite: true,
  });
};

ScrollTrigger.create({
  trigger: ".footer-revealer",
  start: "top 50%",
  onEnter: () => {
    animateIn();
    gsap.to("#main-nav", {
      yPercent: -100,
      opacity: 0,
      duration: 0.5,
      ease: "power2.in",
    });
  },
});

ScrollTrigger.create({
  trigger: ".footer-revealer",
  start: "top 85%",
  onLeaveBack: () => {
    animateOut();
    gsap.to("#main-nav", {
      yPercent: 0,
      opacity: 1,
      duration: 0.5,
      ease: "power3.out",
    });
  },
});

// ===================================================================
// HERO THREE.JS SHADER EFFECT (zoom + pixel displacement + RGB shift)
// ===================================================================
const heroCanvas = document.getElementById("hero-canvas");

if (heroCanvas && window.innerWidth > 768) {
  const textureLoader = new THREE.TextureLoader();
  const heroMouse = new THREE.Vector2();

  // Helper: calculate plane size to fill the camera frustum
  const getPlaneSize = (camera) => {
    const vFov = (camera.fov * Math.PI) / 180;
    const h = 2 * Math.tan(vFov / 2) * camera.position.z;
    const w = h * camera.aspect;
    return { w, h };
  };

  // --- PlaneSubject ---
  class PlaneSubject {
    raycaster = new THREE.Raycaster();
    scene = null;

    constructor(scene, camera) {
      const { w, h } = getPlaneSize(camera);
      const geometry = new THREE.PlaneGeometry(w, h);
      const material = new THREE.ShaderMaterial({
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          precision highp float;
          uniform sampler2D uTexture;
          uniform float imageAspectRatio;
          uniform float aspectRatio;
          uniform float opacity;
          uniform float hover;
          varying vec2 vUv;

          float exponentialInOut(float t) {
            return t == 0.0 || t == 1.0
              ? t
              : t < 0.5
                ? +0.5 * pow(2.0, (20.0 * t) - 10.0)
                : -0.5 * pow(2.0, 10.0 - (t * 20.0)) + 1.0;
          }

          void main() {
            vec2 uv = vUv;

            // fix aspectRatio
            float u = imageAspectRatio / aspectRatio;
            if (imageAspectRatio > aspectRatio) {
              u = 1.0 / u;
            }
            uv.y *= u;
            uv.y -= (u) / 2.0 - 0.5;

            // hover effect
            float zoomLevel = 0.2;
            float hoverLevel = exponentialInOut(min(1.0, (distance(vec2(0.5), uv) * hover) + hover));
            uv *= 1.0 - zoomLevel * hoverLevel;
            uv += zoomLevel / 2.0 * hoverLevel;
            uv = clamp(uv, 0.0, 1.0);
            vec4 color = texture2D(uTexture, uv);
            if (hoverLevel > 0.0) {
              hoverLevel = 1.0 - abs(hoverLevel - 0.5) * 2.0;
              // Pixel displace
              uv.y += color.r * hoverLevel * 0.05;
              color = texture2D(uTexture, uv);
              // RGB shift
              color.r = texture2D(uTexture, uv + (hoverLevel) * 0.01).r;
              color.g = texture2D(uTexture, uv - (hoverLevel) * 0.01).g;
            }
            gl_FragColor = mix(vec4(1.0, 1.0, 1.0, opacity), color, opacity);
          }
        `,
        uniforms: {
          uTexture: {
            type: "t",
            value: textureLoader.load("assets/images/bg.webp", (tex) => {
              material.uniforms.imageAspectRatio.value =
                tex.image.naturalWidth / tex.image.naturalHeight;
            }),
          },
          imageAspectRatio: { type: "f", value: 1.0 },
          aspectRatio: { type: "f", value: 1.0 },
          opacity: { type: "f", value: 1.0 },
          hover: { type: "f", value: 0.0 },
        },
      });
      material.transparent = true;
      const mesh = new THREE.Mesh(geometry, material);

      scene.add(mesh);

      this.scene = scene;
      this.mesh = mesh;
    }

    resize(camera) {
      const { w, h } = getPlaneSize(camera);
      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.PlaneGeometry(w, h);
    }

    update() {}

    mouseHandler(mouse, camera) {
      const { scene, mesh, raycaster } = this;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children);

      gsap.to(mesh.material.uniforms.hover, {
        value: intersects.length,
        duration: 2,
      });

      gsap.to(mesh.scale, {
        x: 1 + mouse.y * 0.02,
        y: 1 + mouse.y * 0.02,
        duration: 0.5,
      });

      gsap.to(mesh.position, {
        x: mouse.x * 0.15,
        duration: 0.5,
      });

      gsap.to(mesh.rotation, {
        x: -mouse.y * 0.03,
        y: mouse.x * 0.03,
        duration: 0.5,
      });
    }
  }

  // --- Scene setup ---
  const heroScene = new THREE.Scene();
  heroScene.background = new THREE.Color("#000");

  const DPR = window.devicePixelRatio || 1;
  const heroRenderer = new THREE.WebGLRenderer({
    canvas: heroCanvas,
    antialias: true,
    alpha: true,
  });
  heroRenderer.setPixelRatio(DPR);

  const heroCamera = new THREE.PerspectiveCamera(60, 1, 1, 100);
  heroCamera.position.z = 8;

  const planeSubject = new PlaneSubject(heroScene, heroCamera);

  // --- Resize ---
  const resizeHeroCanvas = () => {
    const parent = heroCanvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;

    heroCanvas.width = w;
    heroCanvas.height = h;

    heroCamera.aspect = w / h;
    heroCamera.updateProjectionMatrix();

    heroRenderer.setSize(w, h);

    planeSubject.mesh.material.uniforms.aspectRatio.value = w / h;
    planeSubject.resize(heroCamera);
  };

  resizeHeroCanvas();
  window.addEventListener("resize", resizeHeroCanvas, { passive: true });

  // --- Mouse ---
  window.addEventListener("mousemove", (e) => {
    heroMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    heroMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    planeSubject.mouseHandler(heroMouse, heroCamera);
  }, { passive: true });

  // --- Render loop ---
  const heroRender = () => {
    planeSubject.update();
    heroRenderer.render(heroScene, heroCamera);
    requestAnimationFrame(heroRender);
  };

  heroRender();
}
// ===================================================================
// INTERACTIVE TERMINAL
// ===================================================================
let currentDir = "~";
function playAsciiRickroll(outLine, isCurl) {
  if (!isCurl) {
    outLine.innerHTML = "nice try<br><br>";
  } else {
    outLine.innerHTML = "Downloading ASCII stream...<br><br>";
  }
  const asciiChars = " .:-=+*#%@"; 
  const video = document.createElement("video");
  video.src = "assets/short_rickroll.mp4";
  video.style.display = "none";
  outLine.appendChild(video);

  const pre = document.createElement("pre");
  pre.style.fontSize = "7px";
  pre.style.lineHeight = "7px";
  pre.style.color = "#ccc";
  pre.style.fontFamily = "monospace";
  pre.style.overflow = "hidden";
  pre.style.whiteSpace = "pre";
  outLine.appendChild(pre);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const width = 120;
  const height = 45; 

  video.addEventListener("play", () => {
    const drawFrame = () => {
      if (video.paused || video.ended) return;
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(video, 0, 0, width, height);
      const frame = ctx.getImageData(0, 0, width, height);
      let asciiStr = "";
      for (let i = 0; i < frame.data.length; i += 4) {
        const r = frame.data[i];
        const g = frame.data[i+1];
        const b = frame.data[i+2];
        const brightness = (r + g + b) / 3;
        const charIndex = Math.floor((brightness / 255) * (asciiChars.length - 1));
        asciiStr += asciiChars[charIndex];
        if ((i / 4 + 1) % width === 0) asciiStr += "\n";
      }
      pre.textContent = asciiStr;
      requestAnimationFrame(drawFrame);
    };
    drawFrame();
  });

  video.play().catch(e => {
    pre.textContent = "Autoplay blocked. Click here to play.";
    pre.style.cursor = "pointer";
    pre.addEventListener("click", () => video.play());
  });
}
const termInput = document.getElementById("terminal-input");
if (termInput) {
  termInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = this.value.trim();
      const parentLine = this.parentElement;
      const terminalBody = parentLine.parentElement;
      
      const args = val.split(" ").filter(Boolean);
      const cmd = args[0];
      
      const outLine = document.createElement("div");
      outLine.className = "terminal-output";
      
      if (!val) {
        // empty command
      } else if (cmd === "cd") {
        const target = args[1] || "~";
        if (target === "~" || target === "/") {
          currentDir = "~";
        } else if (target === "root") {
          if (currentDir === "~") currentDir = "~/root";
          else outLine.textContent = `bash: cd: ${target}: No such file or directory`;
        } else if (target === "desktop") {
          if (currentDir === "~/root") currentDir = "~/root/desktop";
          else outLine.textContent = `bash: cd: ${target}: No such file or directory`;
        } else if (target === "root/desktop") {
          if (currentDir === "~") currentDir = "~/root/desktop";
          else outLine.textContent = `bash: cd: ${target}: No such file or directory`;
        } else if (target === "..") {
          if (currentDir === "~/root/desktop") currentDir = "~/root";
          else if (currentDir === "~/root") currentDir = "~";
        } else {
          outLine.textContent = `bash: cd: ${target}: No such file or directory`;
        }
        
        const termTitle = document.querySelector(".terminal-title");
        if (termTitle) {
          termTitle.textContent = `jiss@kali:${currentDir}`;
        }
      } else if (cmd === "ls") {
        let dirToLs = currentDir;
        if (args[1] && !args[1].startsWith("-")) {
            if (currentDir === "~" && args[1] === "root") dirToLs = "~/root";
            else if (currentDir === "~" && args[1].replace(/\/$/, "") === "root/desktop") dirToLs = "~/root/desktop";
            else dirToLs = "unknown";
        }

        if (dirToLs === "~") {
          outLine.textContent = "assets  index.html  package.json  readme.txt  roll.sh  root";
        } else if (dirToLs === "~/root") {
          outLine.textContent = "desktop";
        } else if (dirToLs === "~/root/desktop") {
          outLine.textContent = "flag.txt";
        } else {
           outLine.textContent = `ls: cannot access '${args[1]}': No such file or directory`;
        }
      } else if (cmd === "echo") {
        outLine.textContent = args.slice(1).join(" ");
      } else if (cmd === "cat") {
        let filePath = args[1] || "";
        if (currentDir === "~/root" && filePath === "desktop/flag.txt") filePath = "root/desktop/flag.txt";
        if (currentDir === "~/root/desktop" && filePath === "flag.txt") filePath = "root/desktop/flag.txt";
        
        if (filePath === "readme.txt") {
          if (currentDir === "~") {
            outLine.textContent = "the flag is hidden in the root directory and you can view the flag by typing cat root/desktop/flag.txt";
          } else {
            outLine.textContent = `cat: readme.txt: No such file or directory`;
          }
        } else if (filePath === "flag.txt" || filePath === "root/desktop/flag.txt" || filePath === "/root/desktop/flag.txt") {
          playAsciiRickroll(outLine, false);
        } else {
          outLine.textContent = `cat: ${args[1] || ''}: No such file or directory`;
        }
      } else if (cmd === "curl") {
        if (args[1] === "ascii.live/rick" || args[1] === "https://ascii.live/rick") {
          playAsciiRickroll(outLine, true);
        } else {
          outLine.textContent = `curl: (6) Could not resolve host: ${args[1] || ''}`;
        }
      } else if (cmd === "./roll.sh" || cmd === "bash" && args[1] === "roll.sh" || cmd === "sh" && args[1] === "roll.sh") {
        if (currentDir === "~") {
          playAsciiRickroll(outLine, false);
        } else {
          outLine.textContent = `bash: ./roll.sh: No such file or directory`;
        }
      } else if (cmd === "whoami") {
        outLine.textContent = "jiss";
      } else if (cmd === "pwd") {
        outLine.textContent = currentDir === "~" ? "/home/jiss" : "/home/jiss" + currentDir.substring(1);
      } else if (cmd === "clear") {
        const lines = terminalBody.querySelectorAll(".terminal-line, .terminal-output");
        lines.forEach(line => {
          if (line.id !== "interactive-line") line.remove();
        });
        this.value = "";
        return; 
      } else {
        outLine.textContent = `bash: ${cmd}: command not found`;
      }
      
      const cmdLine = document.createElement("div");
      cmdLine.className = "terminal-line";
      cmdLine.innerHTML = `<span class="prompt">$ </span><span class="value">${val}</span>`;
      terminalBody.insertBefore(cmdLine, parentLine);
      
      if (val && cmd !== "clear" && outLine.innerHTML) {
        terminalBody.insertBefore(outLine, parentLine);
      }
      
      this.value = "";
      termInput.focus();
    }
  });
  
  const termBody = document.querySelector(".terminal-body");
  if (termBody) {
    termBody.addEventListener("click", () => {
      termInput.focus();
    });
  }
}
