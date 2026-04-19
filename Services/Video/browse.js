const WORKER_BASE_URL = "REDACTED";

const usernameInput = document.getElementById("usernameInput");
const loadBtn = document.getElementById("loadBtn");

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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

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
      div.innerHTML = `
        <strong>#${index + 1} ${escapeHtml(item.type || "Unknown")}</strong>
      `;
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
    if (el) {
      item._dom = el;
    }
  });
}

function updateOverlayVisibility() {
  if (!currentProject || !Array.isArray(currentProject.timeline)) return;

  const t = videoPlayer.currentTime || 0;
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
      videoLength: savedProject.videoLength || "—",
      timeline
    };

    infoUser.textContent = currentProject.username;
    infoVideo.textContent = currentProject.videoName;
    infoLength.textContent = String(currentProject.videoLength);
    infoOverlays.textContent = String(timeline.length);

    buildOverlayList(timeline);
    buildOverlayDom(timeline);

    const videoUrl = `${WORKER_BASE_URL}/video?username=${encodeURIComponent(username)}`;
    videoPlayer.src = videoUrl;
    videoPlayer.load();

    setStatus("Loaded");
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

videoPlayer.addEventListener("timeupdate", updateOverlayVisibility);
videoPlayer.addEventListener("seeked", updateOverlayVisibility);
videoPlayer.addEventListener("loadedmetadata", updateOverlayVisibility);
videoPlayer.addEventListener("play", () => setStatus("Playing"));
videoPlayer.addEventListener("pause", () => setStatus("Paused"));
videoPlayer.addEventListener("ended", () => setStatus("Ended"));

clearInfo();
setStatus("Idle");
