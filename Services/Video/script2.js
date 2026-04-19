const canvas = document.getElementById("canvas");
const overlayLayer = document.getElementById("overlayLayer");
const backgroundVideo = document.getElementById("backgroundVideo");
const timelineDiv = document.getElementById("timeline");
const playhead = document.getElementById("playhead");
const timeDisplay = document.getElementById("timeDisplay");
const videoLengthInput = document.getElementById("videoLength");
const timelineRuler = document.getElementById("timelineRuler");
const publishBtn = document.getElementById("publishBtn");

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
let selectedId = null;
let playing = false;
let animationId = null;
let time = 0;
let importedVideo = { name: "", url: "" };

const SCALE = 80;
const BASE_PATH = "../../../";
const overlayNodes = new Map();

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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getVideoLength() {
  const value = Number(videoLengthInput.value);
  return Number.isFinite(value) && value > 0 ? value : 10;
}

function getSelectedObject() {
  return timeline.find((item) => item.id === selectedId) || null;
}

function setSelected(id) {
  selectedId = id;
  syncSelectedPanel();
  updateOverlayVisibility();
  drawTimeline();
}

function clearSelected() {
  selectedId = null;
  syncSelectedPanel();
  updateOverlayVisibility();
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
  selectedRotation.value = String(Math.round(obj.rotation ?? 0));
  selectedWidth.value = obj.type === "image" ? String(Math.round(obj.width ?? 180)) : "";
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

  const width = length * SCALE + 40;
  timelineRuler.style.width = `${width}px`;
  timelineDiv.style.width = `${width}px`;
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
  createOverlayNode(obj);
  setSelected(obj.id);
  updateOverlayVisibility();
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
  createOverlayNode(obj);
  setSelected(obj.id);
  updateOverlayVisibility();
}

function importVideoFile(file) {
  if (!file) return;

  if (importedVideo.url) {
    URL.revokeObjectURL(importedVideo.url);
  }

  const url = URL.createObjectURL(file);
  importedVideo = { name: file.name, url };

  backgroundVideo.src = url;
  backgroundVideo.load();

  backgroundVideo.onloadedmetadata = () => {
    if (backgroundVideo.duration && Number.isFinite(backgroundVideo.duration)) {
      videoLengthInput.value = Math.ceil(backgroundVideo.duration);
      refreshRuler();
      drawTimeline();
      syncTimeFromVideo();
      updateOverlayVisibility();
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
    if (obj.id === selectedId) clip.classList.add("selected-clip");

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

    clip.addEventListener("click", (e) => {
      e.stopPropagation();
      setSelected(obj.id);
    });

    clip.addEventListener("pointerdown", (e) => {
      if (e.target === handle) return;

      e.stopPropagation();
      setSelected(obj.id);

      const startMouseX = e.clientX;
      const originalStart = obj.start;
      const duration = obj.end - obj.start;

      const onMove = (moveEvent) => {
        const dx = moveEvent.clientX - startMouseX;
        const newStart = clamp(originalStart + dx / SCALE, 0, videoLength - duration);

        obj.start = newStart;
        obj.end = newStart + duration;
        updateClipVisual();
        updateOverlayVisibility();
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    });

    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setSelected(obj.id);

      const startMouseX = e.clientX;
      const originalEnd = obj.end;

      const onMove = (moveEvent) => {
        const dx = moveEvent.clientX - startMouseX;
        obj.end = clamp(originalEnd + dx / SCALE, obj.start + 0.2, videoLength);
        updateClipVisual();
        updateOverlayVisibility();
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    });

    clip.appendChild(label);
    clip.appendChild(handle);
    row.appendChild(clip);
    timelineDiv.appendChild(row);
  });

  updateUI();
}

function createRotateUI(parent) {
  const line = document.createElement("div");
  line.className = "rotate-line";

  const handle = document.createElement("div");
  handle.className = "rotate-handle";

  parent.appendChild(line);
  parent.appendChild(handle);
}

function setElementTransform(el, obj) {
  el.style.transform = `translate3d(${obj.x}px, ${obj.y}px, 0) rotate(${obj.rotation || 0}deg)`;
}

function setSelectedVisual(el, isSelected) {
  el.classList.toggle("selected-outline", isSelected);
}

function makeSelectable(el, obj) {
  el.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    setSelected(obj.id);
  });
}

function makeDraggable(el, obj) {
  let startPointerX = 0;
  let startPointerY = 0;
  let startObjX = 0;
  let startObjY = 0;
  let dragging = false;
  let rafId = null;
  let pendingX = 0;
  let pendingY = 0;
  let activePointerId = null;

  function applyPosition() {
    rafId = null;

    const rect = canvas.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const elWidth = box.width;
    const elHeight = box.height;

    obj.x = clamp(pendingX, 0, rect.width - elWidth);
    obj.y = clamp(pendingY, 0, rect.height - elHeight);

    setElementTransform(el, obj);
  }

  function onPointerMove(e) {
    if (!dragging) return;

    const dx = e.clientX - startPointerX;
    const dy = e.clientY - startPointerY;

    pendingX = startObjX + dx;
    pendingY = startObjY + dy;

    if (!rafId) {
      rafId = requestAnimationFrame(applyPosition);
    }
  }

  function stopDragging() {
    dragging = false;

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (activePointerId !== null) {
      try {
        el.releasePointerCapture(activePointerId);
      } catch (_) {}
    }

    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", stopDragging);
    activePointerId = null;
  }

  el.addEventListener("pointerdown", (e) => {
    if (e.target.classList.contains("resize-corner")) return;
    if (e.target.classList.contains("rotate-handle")) return;

    e.preventDefault();
    e.stopPropagation();

    setSelected(obj.id);

    dragging = true;
    activePointerId = e.pointerId;

    startPointerX = e.clientX;
    startPointerY = e.clientY;
    startObjX = obj.x;
    startObjY = obj.y;

    try {
      el.setPointerCapture(e.pointerId);
    } catch (_) {}

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", stopDragging);
  });
}

function makeRotatable(el, obj) {
  const handle = el.querySelector(".rotate-handle");
  if (!handle) return;

  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(obj.id);

    const onMove = (moveEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const angleRadians = Math.atan2(moveEvent.clientY - cy, moveEvent.clientX - cx);
      const angleDegrees = angleRadians * (180 / Math.PI);

      obj.rotation = angleDegrees + 90;
      setElementTransform(el, obj);
      syncSelectedPanel();
    };

    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  });
}

function makeImageResizable(wrapper, obj) {
  const handle = wrapper.querySelector(".resize-corner");
  let resizing = false;
  let startX = 0;
  let startWidth = 0;
  let rafId = null;
  let pendingWidth = 0;

  function applyResize() {
    rafId = null;
    obj.width = clamp(pendingWidth, 40, 900);
    wrapper.style.width = `${obj.width}px`;
    syncSelectedPanel();
  }

  function onPointerMove(e) {
    if (!resizing) return;

    const dx = e.clientX - startX;
    pendingWidth = startWidth + dx;

    if (!rafId) {
      rafId = requestAnimationFrame(applyResize);
    }
  }

  function stopResize() {
    resizing = false;

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    document.removeEventListener("pointermove", onPointerMove); 
    document.removeEventListener("pointerup", stopResize);
  }

  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();

    setSelected(obj.id);

    resizing = true;
    startX = e.clientX;
    startWidth = obj.width || wrapper.offsetWidth;

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", stopResize);
  });
}

function createOverlayNode(obj) {
  if (overlayNodes.has(obj.id)) return overlayNodes.get(obj.id);

  let el;

  if (obj.type === "text") {
    el = document.createElement("div");
    el.className = "element text-element";
    el.textContent = obj.content;
    createRotateUI(el);
    makeSelectable(el, obj);
    makeDraggable(el, obj);
    makeRotatable(el, obj);
  } else if (obj.type === "image") {
    el = document.createElement("div");
    el.className = "image-wrapper element";
    el.style.width = `${obj.width || 180}px`;

    const img = document.createElement("img");
    img.src = BASE_PATH + obj.src;
    img.draggable = false;

    const resizeCorner = document.createElement("div");
    resizeCorner.className = "resize-corner";

    el.appendChild(img);
    el.appendChild(resizeCorner);
    createRotateUI(el);
    makeSelectable(el, obj);
    makeDraggable(el, obj);
    makeImageResizable(el, obj);
    makeRotatable(el, obj);
  }

  overlayLayer.appendChild(el);
  overlayNodes.set(obj.id, el);
  updateOverlayNode(obj);

  return el;
}

function updateOverlayNode(obj) {
  const el = overlayNodes.get(obj.id);
  if (!el) return;

  setSelectedVisual(el, obj.id === selectedId);

  if (obj.type === "text") {
    el.textContent = obj.content;
    createRotateUI(el);
  }

  if (obj.type === "image") {
    const img = el.querySelector("img");
    if (img) img.src = BASE_PATH + obj.src;
    el.style.width = `${obj.width || 180}px`;
  }

  setElementTransform(el, obj);
}

function rebuildOverlayNode(obj) {
  const old = overlayNodes.get(obj.id);
  if (old) {
    old.remove();
    overlayNodes.delete(obj.id);
  }
  createOverlayNode(obj);
}

function syncOverlayNodes() {
  const currentIds = new Set(timeline.map((obj) => obj.id));

  overlayNodes.forEach((node, id) => {
    if (!currentIds.has(id)) {
      node.remove();
      overlayNodes.delete(id);
    }
  });

  timeline.forEach((obj) => {
    if (!overlayNodes.has(obj.id)) {
      createOverlayNode(obj);
    } else {
      updateOverlayNode(obj);
    }
  });
}

function updateOverlayVisibility() {
  syncOverlayNodes();

  timeline.forEach((obj) => {
    const el = overlayNodes.get(obj.id);
    if (!el) return;

    const visible = time >= obj.start && time <= obj.end;
    el.style.display = visible ? "" : "none";

    if (visible) {
      updateOverlayNode(obj);
    }
  });

  drawTimeline();
  updateUI();
}

function syncTimeFromVideo() {
  if (importedVideo.url) {
    time = backgroundVideo.currentTime || 0;
  }
  updateUI();
}

function updateUI() {
  const maxLength = getVideoLength();
  time = clamp(time, 0, maxLength);
  timeDisplay.textContent = time.toFixed(2);
  playhead.style.left = `${time * SCALE}px`;
}

function play() {
  if (playing) return;

  if (importedVideo.url) {
    backgroundVideo.currentTime = clamp(time, 0, backgroundVideo.duration || getVideoLength());
    backgroundVideo.play().catch(() => {});
  }

  playing = true;
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
}

function rewindToStart() {
  stop();
  time = 0;
  if (importedVideo.url) {
    backgroundVideo.currentTime = 0;
  }
  updateOverlayVisibility();
}

function loop() {
  if (!playing) return;

  if (importedVideo.url) {
    time = backgroundVideo.currentTime || 0;
  } else {
    time += 1 / 60;
  }

  if (time >= getVideoLength()) {
    time = getVideoLength();
    stop();
  }

  updateOverlayVisibility();

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
    rebuildOverlayNode(obj);
  }

  if (obj.type === "image") {
    const widthValue = Number(selectedWidth.value);
    if (Number.isFinite(widthValue) && widthValue > 0) {
      obj.width = widthValue;
    }
    updateOverlayNode(obj);
  }

  syncSelectedPanel();
  updateOverlayVisibility();
}

function deleteSelectedObject() {
  const obj = getSelectedObject();
  if (!obj) return;

  timeline = timeline.filter((item) => item.id !== obj.id);

  const node = overlayNodes.get(obj.id);
  if (node) {
    node.remove();
    overlayNodes.delete(obj.id);
  }

  clearSelected();
  updateOverlayVisibility();
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

      timeline = Array.isArray(data.timeline)
        ? data.timeline.map((item) => ({
            id: item.id || uid(),
            rotation: 0,
            ...item
          }))
        : [];

      selectedId = null;
      syncSelectedPanel();
      refreshRuler();
      updateOverlayVisibility();
    } catch (err) {
      alert("Invalid JSON project file.");
    }
  };

  reader.readAsText(file);
}

canvas.addEventListener("pointerdown", (e) => {
  if (e.target === canvas || e.target === backgroundVideo || e.target === overlayLayer) {
    clearSelected();
  }
});

timelineDiv.addEventListener("click", (e) => {
  if (e.target === timelineDiv) {
    clearSelected();
  }
});

videoLengthInput.addEventListener("input", () => {
  refreshRuler();
  updateOverlayVisibility();
});

videoImport.addEventListener("change", (e) => {
  importVideoFile(e.target.files[0]);
});

importJson.addEventListener("change", (e) => {
  importJSONProject(e.target.files[0]);
});

backgroundVideo.addEventListener("timeupdate", () => {
  if (playing) {
    syncTimeFromVideo();
    updateOverlayVisibility();
  }
});

function getProjectData() {
  return {
    videoLength: getVideoLength(),
    importedVideoName: importedVideo.name,
    timeline
  };
}

async function publishProject() {
  const username = localStorage.getItem("username");

  if (!username) {
    alert("No username found in localStorage.");
    return;
  }

  const project = getProjectData();

  try {
    const response = await fetch("https://connectionvideo.v987v654v321v0.workers.dev/publish/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        project
      })
    });

    if (!response.ok) {
      throw new Error(`Publish failed: ${response.status}`);
    }

    const result = await response.json().catch(() => null);
    alert("Project published successfully.");
    console.log("Publish result:", result);
  } catch (error) {
    console.error(error);
    alert("Failed to publish project.");
  }
}

addTextBtn.addEventListener("click", addText);
addImageBtn.addEventListener("click", addImage);
playBtn.addEventListener("click", play);
stopBtn.addEventListener("click", stop);
rewindBtn.addEventListener("click", rewindToStart);
exportJsonBtn.addEventListener("click", exportJSON);
updateSelectedBtn.addEventListener("click", updateSelectedObject);
deleteSelectedBtn.addEventListener("click", deleteSelectedObject);

refreshRuler();
updateOverlayVisibility();
syncSelectedPanel();
updateUI();
