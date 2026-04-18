const canvas = document.getElementById("canvas");
const timelineDiv = document.getElementById("timeline");
const playhead = document.getElementById("playhead");
const timeDisplay = document.getElementById("timeDisplay");
const videoLengthInput = document.getElementById("videoLength");
const timelineRuler = document.getElementById("timelineRuler");

const addTextBtn = document.getElementById("addTextBtn");
const addImageBtn = document.getElementById("addImageBtn");
const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");
const rewindBtn = document.getElementById("rewindBtn");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const imageSelect = document.getElementById("imageSelect");

let timeline = [];
let time = 0;
let playing = false;
let animationId = null;
let lastFrameTime = null;

const SCALE = 80;
const BASE_PATH = "../../../";

const images = [
  "cat.jpg",
  "shrek.jpeg",
  "cat2.jpg",
  "nuke.jpeg",
  "sushi.jpeg",
  "burger.jpeg",
  "background.jpg",
  "user.png",
  "enstein.jpeg",
  "warrior.jpeg",
  "sad.jpeg",
  "Slay.png",
  "gun.jpeg",
  "explosion.jpeg",
  "roblox.jpeg",
  "cat3.jpeg",
  "hamster.jpeg"
];

images.forEach((img) => {
  const opt = document.createElement("option");
  opt.value = img;
  opt.textContent = img;
  imageSelect.appendChild(opt);
});

function getVideoLength() {
  const value = Number(videoLengthInput.value);
  return Number.isFinite(value) && value > 0 ? value : 10;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function refreshRuler() {
  timelineRuler.innerHTML = "";
  const length = getVideoLength();

  for (let i = 0; i <= length; i++) {
    const tick = document.createElement("div");
    tick.className = "tick";
    tick.style.left = `${i * SCALE}px`;

    const label = document.createElement("span");
    label.textContent = `${i}s`;

    tick.appendChild(label);
    timelineRuler.appendChild(tick);
  }

  timelineRuler.style.width = `${length * SCALE + 40}px`;
  timelineDiv.style.width = `${length * SCALE + 40}px`;
}

function ensureTimeInBounds() {
  time = clamp(time, 0, getVideoLength());
}

function addText() {
  const content = document.getElementById("textContent").value.trim() || "New Text";

  timeline.push({
    type: "text",
    content,
    start: 0,
    end: 3,
    x: 120,
    y: 100
  });

  drawTimeline();
  render();
}

function addImage() {
  timeline.push({
    type: "image",
    src: imageSelect.value,
    start: 0,
    end: 3,
    x: 160,
    y: 140,
    width: 180
  });

  drawTimeline();
  render();
}

function drawTimeline() {
  timelineDiv.querySelectorAll(".track-row").forEach((row) => row.remove());

  const videoLength = getVideoLength();

  timeline.forEach((obj) => {
    const row = document.createElement("div");
    row.className = "track-row";
    row.style.width = `${videoLength * SCALE + 40}px`;

    const clip = document.createElement("div");
    clip.className = `clip ${obj.type}-clip`;

    const label = document.createElement("div");
    label.className = "clip-label";
    label.textContent = obj.type === "text" ? `Text: ${obj.content}` : `Image: ${obj.src}`;

    const handle = document.createElement("div");
    handle.className = "resize-handle";

    function updateClipVisual() {
      clip.style.left = `${obj.start * SCALE}px`;
      clip.style.width = `${Math.max((obj.end - obj.start) * SCALE, 30)}px`;
    }

    updateClipVisual();

    let draggingClip = false;
    let resizingClip = false;

    clip.onmousedown = (e) => {
      if (e.target === handle) return;

      draggingClip = true;
      const startMouseX = e.clientX;
      const originalStart = obj.start;
      const duration = obj.end - obj.start;

      document.onmousemove = (moveEvent) => {
        if (!draggingClip) return;

        const dx = moveEvent.clientX - startMouseX;
        const newStart = clamp(originalStart + dx / SCALE, 0, videoLength - duration);

        obj.start = newStart;
        obj.end = newStart + duration;
        updateClipVisual();
      };

      document.onmouseup = () => {
        draggingClip = false;
        document.onmousemove = null;
        document.onmouseup = null;
      };
    };

    handle.onmousedown = (e) => {
      e.stopPropagation();
      resizingClip = true;

      const startMouseX = e.clientX;
      const originalEnd = obj.end;

      document.onmousemove = (moveEvent) => {
        if (!resizingClip) return;

        const dx = moveEvent.clientX - startMouseX;
        const newEnd = clamp(originalEnd + dx / SCALE, obj.start + 0.2, videoLength);

        obj.end = newEnd;
        updateClipVisual();
      };

      document.onmouseup = () => {
        resizingClip = false;
        document.onmousemove = null;
        document.onmouseup = null;
      };
    };

    clip.appendChild(label);
    clip.appendChild(handle);
    row.appendChild(clip);
    timelineDiv.appendChild(row);
  });

  updateUI();
}

function makeDraggable(el, obj) {
  let offsetX = 0;
  let offsetY = 0;

  el.onmousedown = (e) => {
    if (e.target.classList.contains("resize-corner")) return;

    e.preventDefault();
    offsetX = e.offsetX;
    offsetY = e.offsetY;

    document.onmousemove = (moveEvent) => {
      const rect = canvas.getBoundingClientRect();
      const elWidth = el.offsetWidth;
      const elHeight = el.offsetHeight;

      obj.x = clamp(moveEvent.clientX - rect.left - offsetX, 0, rect.width - elWidth);
      obj.y = clamp(moveEvent.clientY - rect.top - offsetY, 0, rect.height - elHeight);

      el.style.left = `${obj.x}px`;
      el.style.top = `${obj.y}px`;
    };

    document.onmouseup = () => {
      document.onmousemove = null;
      document.onmouseup = null;
    };
  };
}

function makeImageResizable(wrapper, obj) {
  const handle = wrapper.querySelector(".resize-corner");

  handle.onmousedown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = obj.width || wrapper.offsetWidth;

    document.onmousemove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      obj.width = clamp(startWidth + dx, 40, 900);
      wrapper.style.width = `${obj.width}px`;
    };

    document.onmouseup = () => {
      document.onmousemove = null;
      document.onmouseup = null;
    };
  };
}

function render() {
  canvas.innerHTML = "";

  timeline.forEach((obj) => {
    if (time >= obj.start && time <= obj.end) {
      if (obj.type === "text") {
        const el = document.createElement("div");
        el.className = "element text-element";
        el.textContent = obj.content;
        el.style.left = `${obj.x}px`;
        el.style.top = `${obj.y}px`;

        makeDraggable(el, obj);
        canvas.appendChild(el);
      }

      if (obj.type === "image") {
        const wrapper = document.createElement("div");
        wrapper.className = "image-wrapper element";
        wrapper.style.left = `${obj.x}px`;
        wrapper.style.top = `${obj.y}px`;
        wrapper.style.width = `${obj.width || 180}px`;

        const img = document.createElement("img");
        img.src = BASE_PATH + obj.src;
        img.style.width = "100%";
        img.draggable = false;

        const resizeCorner = document.createElement("div");
        resizeCorner.className = "resize-corner";

        wrapper.appendChild(img);
        wrapper.appendChild(resizeCorner);

        makeDraggable(wrapper, obj);
        makeImageResizable(wrapper, obj);

        canvas.appendChild(wrapper);
      }
    }
  });
}

function updateUI() {
  ensureTimeInBounds();
  timeDisplay.textContent = time.toFixed(2);
  playhead.style.left = `${time * SCALE}px`;
}

function play() {
  if (playing) return;

  if (time >= getVideoLength()) {
    time = 0;
  }

  playing = true;
  lastFrameTime = null;
  animationId = requestAnimationFrame(loop);
}

function stop() {
  playing = false;

  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  lastFrameTime = null;
}

function rewindToStart() {
  stop();
  time = 0;
  updateUI();
  render();
}

function loop(timestamp) {
  if (!playing) return;

  if (lastFrameTime == null) {
    lastFrameTime = timestamp;
  }

  const deltaSeconds = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;

  time += deltaSeconds;

  const videoLength = getVideoLength();
  if (time >= videoLength) {
    time = videoLength;
    stop();
  }

  updateUI();
  render();

  if (playing) {
    animationId = requestAnimationFrame(loop);
  }
}

function exportJSON() {
  const project = {
    videoLength: getVideoLength(),
    timeline
  };

  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "video_project.json";
  a.click();

  URL.revokeObjectURL(url);
}

videoLengthInput.addEventListener("input", () => {
  refreshRuler();
  drawTimeline();
  updateUI();
});

addTextBtn.addEventListener("click", addText);
addImageBtn.addEventListener("click", addImage);
playBtn.addEventListener("click", play);
stopBtn.addEventListener("click", stop);
rewindBtn.addEventListener("click", rewindToStart);
exportJsonBtn.addEventListener("click", exportJSON);

refreshRuler();
drawTimeline();
render();
updateUI();
