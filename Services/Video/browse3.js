const WORKER_BASE_URL = "https://connectionvideo.v987v654v321v0.workers.dev";

const usernameInput = document.getElementById("usernameInput");
const loadBtn = document.getElementById("loadBtn");

const manualPlayBtn = document.getElementById("manualPlayBtn");
const manualPauseBtn = document.getElementById("manualPauseBtn");
const manualResetBtn = document.getElementById("manualResetBtn");

const infoUser = document.getElementById("infoUser");
const infoVideo = document.getElementById("infoVideo");
const infoLength = document.getElementById("infoLength");
const infoOverlays = document.getElementById("infoOverlays");

const overlayList = document.getElementById("overlayList");
const statusText = document.getElementById("statusText");
const timeText = document.getElementById("timeText");

const videoPlayer = document.getElementById("videoPlayer");
const overlayLayer = document.getElementById("overlayLayer");

let currentProject = null;
let overlayNodes = [];
let manualPlaying = false;
let manualTime = 0;
let manualAnimationId = null;
let lastManualTimestamp = null;
let usingRealVideo = false;
let currentVideoObjectUrl = null;

function setStatus(text) {
  statusText.textContent = text;
}

function clearOverlayDom() {
  overlayNodes.forEach((node) => node.remove());
  overlayNodes = [];
  overlayLayer.innerHTML = "";
}

function clearInfo() {
  infoUser.textContent = "—";
  infoVideo.textContent = "—";
  infoLength.textContent = "—";
  infoOverlays.textContent = "0";
  overlayList.innerHTML = "";
  clearOverlayDom();
  currentProject = null;
  stopManualPlayback();
  usingRealVideo = false;
  manualTime = 0;
  timeText.textContent = "0.00";
}

function buildOverlayList(timeline) {
  overlayList.innerHTML = "";

  if (!timeline.length) {
    overlayList.innerHTML = `<div class="overlay-item">No overlays</div>`;
    return;
  }

  timeline.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "overlay-item";

    if (item.type === "text") {
      div.innerHTML = `
        <strong>#${index + 1} Text</strong><br>
        ${escapeHtml(item.content || "")}<br>
        ${item.start ?? 0}s → ${item.end ?? 0}s
      `;
    } else if (item.type === "image") {
      div.innerHTML = `
        <strong>#${index + 1} Image</strong><br>
        ${escapeHtml(item.src || "")}<br>
        ${item.start ?? 0}s → ${item.end ?? 0}s
      `;
    } else {
      div.innerHTML = `<strong>#${index + 1} ${escapeHtml(item.type || "Unknown")}</strong>`;
    }

    overlayList.appendChild(div);
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createOverlayNode(item) {
  let el;

  if (item.type === "text") {
    el = document.createElement("div");
    el.className = "overlay-el overlay-text";
    el.textContent = item.content || "";
  } else if (item.type === "image") {
    el = document.createElement("div");
    el.className = "overlay-el overlay-image";
    el.style.width = `${item.width || 180}px`;

    const img = document.createElement("img");
    img.src = "../../../" + (item.src || "");
    el.appendChild(img);
  } else {
    return null;
  }

  overlayLayer.appendChild(el);
  overlayNodes.push(el);
  return el;
}

function buildOverlayDom(timeline) {
  clearOverlayDom();

  timeline.forEach((item) => {
    const el = createOverlayNode(item);
    if (el) item._dom = el;
  });
}

function updateOverlayVisibilityAtTime(t) {
  if (!currentProject || !Array.isArray(currentProject.timeline)) return;

  timeText.textContent = t.toFixed(2);

  currentProject.timeline.forEach((item) => {
    const el = item._dom;
    if (!el) return;

    const start = Number(item.start ?? 0);
    const end = Number(item.end ?? 0);
    const visible = t >= start && t <= end;

    el.style.display = visible ? "" : "none";
    if (!visible) return;

    const x = Number(item.x ?? 0);
    const y = Number(item.y ?? 0);
    const rotation = Number(item.rotation ?? 0);

    if (item.type === "image") {
      el.style.width = `${item.width || 180}px`;
    }

    el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`;
  });
}

function updateOverlayVisibility() {
  const t = usingRealVideo ? (videoPlayer.currentTime || 0) : manualTime;
  updateOverlayVisibilityAtTime(t);
}

function stopManualPlayback() {
  manualPlaying = false;
  lastManualTimestamp = null;

  if (manualAnimationId) {
    cancelAnimationFrame(manualAnimationId);
    manualAnimationId = null;
  }
}

function startManualPlayback() {
  if (!currentProject || usingRealVideo) return;
  if (manualPlaying) return;

  manualPlaying = true;
  lastManualTimestamp = null;
  setStatus("Playing (manual)");
  manualAnimationId = requestAnimationFrame(manualLoop);
}

function pauseManualPlayback() {
  if (usingRealVideo) return;
  stopManualPlayback();
  setStatus("Paused (manual)");
}

function resetManualPlayback() {
  if (usingRealVideo) return;
  stopManualPlayback();
  manualTime = 0;
  updateOverlayVisibilityAtTime(0);
  setStatus("Reset (manual)");
}

function manualLoop(timestamp) {
  if (!manualPlaying || !currentProject) return;

  if (lastManualTimestamp == null) {
    lastManualTimestamp = timestamp;
  }

  const dt = (timestamp - lastManualTimestamp) / 1000;
  lastManualTimestamp = timestamp;

  manualTime += dt;

  const maxLen = Number(currentProject.videoLength) || 10;
  if (manualTime >= maxLen) {
    manualTime = maxLen;
    updateOverlayVisibilityAtTime(manualTime);
    stopManualPlayback();
    setStatus("Ended (manual)");
    return;
  }

  updateOverlayVisibilityAtTime(manualTime);
  manualAnimationId = requestAnimationFrame(manualLoop);
}

async function tryLoadRealVideo(username) {
  const videoUrl = `${WORKER_BASE_URL}/video?username=${encodeURIComponent(username)}`;

  try {
    const res = await fetch(videoUrl);
    if (!res.ok) return false;

    const blob = await res.blob();
    if (!blob || blob.size === 0) return false;

    if (currentVideoObjectUrl) {
      URL.revokeObjectURL(currentVideoObjectUrl);
    }

    currentVideoObjectUrl = URL.createObjectURL(blob);
    videoPlayer.src = currentVideoObjectUrl;
    videoPlayer.style.display = "";
    usingRealVideo = true;
    return true;
  } catch {
    return false;
  }
}

async function loadPublishedVideoByUsername(username) {
  if (!username) {
    alert("Enter a username.");
    return;
  }

  setStatus("Loading...");
  clearInfo();

  try {
    const projectRes = await fetch(
      `${WORKER_BASE_URL}/project?username=${encodeURIComponent(username)}`
    );

    const projectText = await projectRes.text();
    let projectData = null;

    try {
      projectData = JSON.parse(projectText);
    } catch {
      throw new Error("Project response was not valid JSON.");
    }

    if (!projectRes.ok) {
      throw new Error(projectData?.error || `Project load failed: ${projectRes.status}`);
    }

    const savedProject = projectData.project || {};
    const timeline = Array.isArray(savedProject.timeline) ? savedProject.timeline : [];

    currentProject = {
      username: projectData.username || username,
      videoName: projectData.videoName || savedProject.importedVideoName || "video",
      videoLength: Number(savedProject.videoLength || 10),
      timeline
    };

    infoUser.textContent = currentProject.username;
    infoVideo.textContent = currentProject.videoName;
    infoLength.textContent = String(currentProject.videoLength);
    infoOverlays.textContent = String(timeline.length);

    buildOverlayList(timeline);
    buildOverlayDom(timeline);

    const hasRealVideo = await tryLoadRealVideo(username);

    if (hasRealVideo) {
      setStatus("Loaded real video");
    } else {
      usingRealVideo = false;
      videoPlayer.pause();
      videoPlayer.removeAttribute("src");
      videoPlayer.load();
      videoPlayer.style.display = "none";
      manualTime = 0;
      updateOverlayVisibilityAtTime(0);
      setStatus("Loaded JSON-only playback");
    }
  } catch (error) {
    console.error(error);
    setStatus("Error");
    alert(error.message || "Failed to load video.");
  }
}

loadBtn.addEventListener("click", () => {
  loadPublishedVideoByUsername(usernameInput.value.trim());
});

usernameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    loadPublishedVideoByUsername(usernameInput.value.trim());
  }
});

manualPlayBtn.addEventListener("click", () => {
  if (usingRealVideo) {
    videoPlayer.play().catch(() => {});
  } else {
    startManualPlayback();
  }
});

manualPauseBtn.addEventListener("click", () => {
  if (usingRealVideo) {
    videoPlayer.pause();
  } else {
    pauseManualPlayback();
  }
});

manualResetBtn.addEventListener("click", () => {
  if (usingRealVideo) {
    videoPlayer.pause();
    videoPlayer.currentTime = 0;
    updateOverlayVisibility();
    setStatus("Reset");
  } else {
    resetManualPlayback();
  }
});

videoPlayer.addEventListener("timeupdate", () => {
  if (usingRealVideo) updateOverlayVisibility();
});
videoPlayer.addEventListener("seeked", () => {
  if (usingRealVideo) updateOverlayVisibility();
});
videoPlayer.addEventListener("loadedmetadata", () => {
  if (usingRealVideo) updateOverlayVisibility();
});
videoPlayer.addEventListener("play", () => {
  if (usingRealVideo) setStatus("Playing");
});
videoPlayer.addEventListener("pause", () => {
  if (usingRealVideo) setStatus("Paused");
});
videoPlayer.addEventListener("ended", () => {
  if (usingRealVideo) setStatus("Ended");
});
videoPlayer.addEventListener("error", () => {
  if (usingRealVideo) setStatus("Video error");
});

clearInfo();
setStatus("Idle");
