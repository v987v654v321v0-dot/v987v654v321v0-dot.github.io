const canvas = document.getElementById("canvas");
const backgroundVideo = document.getElementById("backgroundVideo");
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

const videoImport = document.getElementById("videoImport");
const importJson = document.getElementById("importJson");

const selectedType = document.getElementById("selectedType");
const selectedText = document.getElementById("selectedText");
const selectedRotation = document.getElementById("selectedRotation");
const selectedWidth = document.getElementById("selectedWidth");
const updateSelectedBtn = document.getElementById("updateSelectedBtn");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");

let timeline = [];
let time = 0;
let playing = false;
let animationId = null;
let lastFrameTime = null;
let selectedId = null;

let importedVideo = {
  name: "",
  url: ""
};

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

function uid() {
  return "id_" + Math.random().toString(36).slice(2, 10);
}

function getVideoLength() {
  const value = Number(videoLengthInput.value);
  return Number.isFinite(value) && value > 0 ? value : 10;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getSelectedObject() {
  return timeline.find(item => item.id === selectedId) || null;
}

function setSelected(id) {
  selectedId = id;
  syncSelectedPanel();
  render();
  drawTimeline();
}

function clearSelected() {
  selectedId = null;
  syncSelectedPanel();
  render();
  drawTimeline();
}

function syncSelectedPanel() {
  const obj = getSelectedObject();

  if (!obj) {
    selectedType.value = "";
    selectedText.value = "";
    selectedRotation.value = "";
    selectedWidth.value = "";
    return;
  }

  selectedType.value = obj.type;
  selectedText.value = obj.type === "text" ? obj.content : "";
  selectedRotation.value = obj.rotation ?? 0;
  selectedWidth.value = obj.type === "image" ? (obj.width ?? 180) : "";
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

  const obj = {
    id: uid(),
    type: "text",
    content,
    start: 0,
    end: 3,
    x: 120,
    y: 100,
    rotation: 0
  };

  timeline.push(obj);
  setSelected(obj.id);
}

function addImage() {
  const obj = {
    id: uid(),
    type: "image",
    src: imageSelect.value,
    start: 0,
    end: 3,
    x: 160,
    y: 140,
    width: 180,
    rotation: 0
  };

  timeline.push(obj);
  setSelected(obj.id);
}

function importVideoFile(file) {
  if (!file) return;

  if (importedVideo.url) {
    URL.revokeObjectURL(importedVideo.url);
  }

  const url = URL.createObjectURL(file);
  importedVideo = {
    name: file.name,
    url
  };

  backgroundVideo.src = url;
  backgroundVideo.load();

  backgroundVideo.onloadedmetadata = () => {
    if (backgroundVideo.duration && Number.isFinite(backgroundVideo.duration)) {
      videoLengthInput.value = Math.ceil(backgroundVideo.duration);
      refreshRuler();
      drawTimeline();
      updateUI();
    }
  };
}

function drawTimeline() {
  timelineDiv.querySelectorAll(".track-row").forEach((row) => row.remove());

  const videoLength = getVideoLength();

  if (importedVideo.url) {
    const row = document.createElement("div");
    row.className = "track-row";
    row.style.width = `${videoLength * SCALE + 40}px`;

    const clip = document.createElement("div");
    clip.className = "clip video-clip";
    clip.style.left = "0px";
    clip.style.width = `${videoLength * SCALE}px`;

    const label = document.createElement("div");
    label.className = "clip-label";
    label.textContent = `Video: ${importedVideo.name || "Imported Video"}`;

    clip.appendChild(label);
    row.appendChild(clip);
    timelineDiv.appendChild(row);
  }

  timeline.forEach((obj) => {
    const row = document.createElement("div");
    row.className = "track-row";
    row.style.width = `${videoLength * SCALE + 40}px`;

    const clip = document.createElement("div");
    clip.className = `clip ${obj.type}-clip`;
    if (obj.id === selectedId) {
      clip.classList.add("selected-clip");
    }

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

    clip.onclick = (e) => {
      e.stopPropagation();
      setSelected(obj.id);
    };

    clip.onmousedown = (e) => {
      if (e.target === handle) return;

      const startMouseX = e.clientX;
      const originalStart = obj.start;
      const duration = obj.end - obj.start;

      document.onmousemove = (moveEvent) => {
        const dx = moveEvent.clientX - startMouseX;
        const newStart = clamp(originalStart + dx / SCALE, 0, videoLength - duration);

        obj.start = newStart;
        obj.end = newStart + duration;
        updateClipVisual();
        updateUI();
      };

      document.onmouseup = () => {
        document.onmousemove = null;
        document.onmouseup = null;
      };
    };

    handle.onmousedown = (e) => {
      e.stopPropagation();

      const startMouseX = e.clientX;
      const originalEnd = obj.end;

      document.onmousemove = (moveEvent) => {
        const dx = moveEvent.clientX - startMouseX;
        const newEnd = clamp(originalEnd + dx / SCALE, obj.start + 0.2, videoLength);

        obj.end = newEnd;
        updateClipVisual();
      };

      document.onmouseup = () => {
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

function applyRotation(el, obj) {
  el.style.transform = `rotate(${obj.rotation || 0}deg)`;
  el.style.transformOrigin = "center center";
}

function createRotateUI(parent) {
  const line = document.createElement("div");
  line.className = "rotate-line";

  const handle = document.createElement("div");
  handle.className = "rotate-handle";

  parent.appendChild(line);
  parent.appendChild(handle);
}

function makeSelectable(el, obj) {
  el.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    setSelected(obj.id);
  });
}

function makeDraggable(el, obj) {
  let offsetX = 0;
  let offsetY = 0;

  el.onmousedown = (e) => {
    if (e.target.classList.contains("resize-corner")) return;
    if (e.target.classList.contains("rotate-handle")) return;

    e.preventDefault();
    e.stopPropagation();

    setSelected(obj.id);

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

function makeRotatable(el, obj) {
  const handle = el.querySelector(".rotate-handle");
  if (!handle) return;

  handle.onmousedown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(obj.id);

    document.onmousemove = (moveEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const angleRadians = Math.atan2(moveEvent.clientY - cy, moveEvent.clientX - cx);
      const angleDegrees = angleRadians * (180 / Math.PI);

      obj.rotation = angleDegrees + 90;
      applyRotation(el, obj);
      syncSelectedPanel();
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
    setSelected(obj.id);

    const startX = e.clientX;
    const startWidth = obj.width || wrapper.offsetWidth;

    document.onmousemove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      obj.width = clamp(startWidth + dx, 40, 900);
      wrapper.style.width = `${obj.width}px`;
      syncSelectedPanel();
    };

    document.onmouseup = () => {
      document.onmousemove = null;
      document.onmouseup = null;
    };
  };
}

function render() {
  canvas.querySelectorAll(".element").forEach(el => el.remove());

  timeline.forEach((obj) => {
    if (time >= obj.start && time <= obj.end) {
      if (obj.type === "text") {
        const el = document.createElement("div");
        el.className = "element text-element";
        if (obj.id === selectedId) {
          el.classList.add("selected-outline");
        }

        el.textContent = obj.content;
        el.style.left = `${obj.x}px`;
        el.style.top = `${obj.y}px`;

        createRotateUI(el);
        applyRotation(el, obj);
        makeSelectable(el, obj);
        makeDraggable(el, obj);
        makeRotatable(el, obj);

        canvas.appendChild(el);
      }

      if (obj.type === "image") {
        const wrapper = document.createElement("div");
        wrapper.className = "image-wrapper element";
        if (obj.id === selectedId) {
          wrapper.classList.add("selected-outline");
        }

        wrapper.style.left = `${obj.x}px`;
        wrapper.style.top = `${obj.y}px`;
        wrapper.style.width = `${obj.width || 180}px`;

        const img = document.createElement("img");
        img.src = BASE_PATH + obj.src;
        img.draggable = false;

        const resizeCorner = document.createElement("div");
        resizeCorner.className = "resize-corner";

        wrapper.appendChild(img);
        wrapper.appendChild(resizeCorner);
        createRotateUI(wrapper);

        applyRotation(wrapper, obj);
        makeSelectable(wrapper, obj);
        makeDraggable(wrapper, obj);
        makeImageResizable(wrapper, obj);
        makeRotatable(wrapper, obj);

        canvas.appendChild(wrapper);
      }
    }
  });
}

function updateUI() {
  ensureTimeInBounds();
  timeDisplay.textContent = time.toFixed(2);
  playhead.style.left = `${time * SCALE}px`;

  if (importedVideo.url && backgroundVideo.readyState >= 1) {
    if (Math.abs(backgroundVideo.currentTime - time) > 0.08) {
      backgroundVideo.currentTime = Math.min(time, Math.max(0, backgroundVideo.duration || time));
    }
  }
}

function play() {
  if (playing) return;

  if (time >= getVideoLength()) {
    time = 0;
  }

  playing = true;
  lastFrameTime = null;

  if (importedVideo.url) {
    backgroundVideo.currentTime = time;
    backgroundVideo.play().catch(() => {});
  }

  animationId = requestAnimationFrame(loop);
}

function stop() {
  playing = false;

  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  if (importedVideo.url) {
    backgroundVideo.pause();
  }

  lastFrameTime = null;
}

function rewindToStart() {
  stop();
  time = 0;

  if (importedVideo.url) {
    backgroundVideo.currentTime = 0;
  }

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

function updateSelectedObject() {
  const obj = getSelectedObject();
  if (!obj) return;

  const rotationValue = Number(selectedRotation.value);
  if (Number.isFinite(rotationValue)) {
    obj.rotation = rotationValue;
  }

  if (obj.type === "text") {
    obj.content = selectedText.value || "New Text";
  }

  if (obj.type === "image") {
    const widthValue = Number(selectedWidth.value);
    if (Number.isFinite(widthValue) && widthValue > 0) {
      obj.width = widthValue;
    }
  }

  drawTimeline();
  render();
  syncSelectedPanel();
}

function deleteSelectedObject() {
  const obj = getSelectedObject();
  if (!obj) return;

  timeline = timeline.filter(item => item.id !== obj.id);
  clearSelected();
}

function exportJSON() {
  const project = {
    videoLength: getVideoLength(),
    importedVideoName: importedVideo.name,
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

function importJSONProject(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      if (data.videoLength) {
        videoLengthInput.value = data.videoLength;
      }

      if (Array.isArray(data.timeline)) {
        timeline = data.timeline.map(item => ({
          id: item.id || uid(),
          rotation: 0,
          ...item
        }));
      } else {
        timeline = [];
      }

      clearSelected();
      refreshRuler();
      drawTimeline();
      render();
    } catch (err) {
      alert("Invalid JSON project file.");
    }
  };
  reader.readAsText(file);
}

canvas.addEventListener("mousedown", (e) => {
  if (e.target === canvas || e.target === backgroundVideo) {
    clearSelected();
  }
});

videoLengthInput.addEventListener("input", () => {
  refreshRuler();
  drawTimeline();
  updateUI();
});

videoImport.addEventListener("change", (e) => {
  importVideoFile(e.target.files[0]);
});

importJson.addEventListener("change", (e) => {
  importJSONProject(e.target.files[0]);
});

addTextBtn.addEventListener("click", addText);
addImageBtn.addEventListener("click", addImage);
playBtn.addEventListener("click", play);
stopBtn.addEventListener("click", stop);
rewindBtn.addEventListener("click", rewindToStart);
exportJsonBtn.addEventListener("click", exportJSON);

updateSelectedBtn.addEventListener("click", updateSelectedObject);
deleteSelectedBtn.addEventListener("click", deleteSelectedObject);

refreshRuler();
drawTimeline();
render();
syncSelectedPanel();
updateUI();
