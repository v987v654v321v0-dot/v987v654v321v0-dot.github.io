/*
  Replace these with your real endpoints.
*/
const CHAT_API = "https://messages-chat-acesss.v987v654v321v0.workers.dev/api/chat";
const ACCOUNT_API = "https://messages-chat-acesss.v987v654v321v0.workers.dev/api/account";
const PLAN_API = "https://planandtransaction.v987v654v321v0.workers.dev/api/plan-status";

const DEFAULT_PROFILE_PIC = "user.png";

const FREE_PROFILE_PICS = [
  "cat.jpg",
  "shrek.jpeg",
  "cat2.jpg",
  "nuke.jpeg",
  "sushi.jpeg",
  "burger.jpeg",
  "background.jpg",
  "enstein.jpeg",
  "warrior.jpeg"
];

const ULTRA_PROFILE_PICS = [
  "Slay.png",
  "sad.jpeg",
  "gun.jpeg",
  "explosion.jpeg",
  "roblox.jpeg",
  "cat3.jpeg",
  "hamster.jpeg"
];

const PROFILE_PICS = [...FREE_PROFILE_PICS, ...ULTRA_PROFILE_PICS];

const SPAM_STORAGE_KEY = "premiumChatSpamState";

const SPAM_RULES = {
  quickMessageWindowMs: 2800,
  longMessageLength: 350,
  longMessageWindowMs: 5000,
  hugeMessageLength: 900,
  duplicateHugeWindowMs: 7000,
  blockDurationMs: 5 * 60 * 1000,
  historyMaxAgeMs: 15000
};

let notifyEnabled = false;
let lastMessageCount = 0;
let username = localStorage.getItem("username");
let activeFilter = "";
let users = new Set();
let profileCache = {};
let selectedProfilePic = null;
let lastLoadedMessages = [];
let lastDataSignature = null;
let isFirstLoad = true;
let currentChatData = [];
let activeLoadToken = 0;
let hasUltraPlan = false;

let chatType = localStorage.getItem("chatType") || "1";
let customFilterMode = localStorage.getItem("customFilterMode") || "only";
let customUserList = localStorage.getItem("customUserList") || "";

if (!username) {
  window.location.href = "https://v987v654v321v0-dot.github.io/news/main";
}

function isUltraOnlyPic(pic) {
  return ULTRA_PROFILE_PICS.includes(pic);
}

function isPicAllowed(pic) {
  if (!pic) return true;
  if (!isUltraOnlyPic(pic)) return true;
  return hasUltraPlan;
}

function normalizeUserList(str) {
  return str
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}

function changeChatType() {
  const select = document.getElementById("chatTypeSelect");
  chatType = select.value;
  localStorage.setItem("chatType", chatType);
  updateChatTypeUI();
  renderChat();
}

function saveChatTypeSettings() {
  const modeEl = document.getElementById("customFilterMode");
  const listEl = document.getElementById("customUserList");

  customFilterMode = modeEl.value;
  customUserList = listEl.value;

  localStorage.setItem("customFilterMode", customFilterMode);
  localStorage.setItem("customUserList", customUserList);

  renderChat();
}

function updateChatTypeUI() {
  const select = document.getElementById("chatTypeSelect");
  const type2Options = document.getElementById("chatType2Options");
  const modeEl = document.getElementById("customFilterMode");
  const listEl = document.getElementById("customUserList");

  if (select) select.value = chatType;
  if (modeEl) modeEl.value = customFilterMode;
  if (listEl) listEl.value = customUserList;

  if (type2Options) {
    type2Options.style.display = chatType === "2" ? "flex" : "none";
  }
}

function passesChatTypeFilter(messageUser) {
  const specialUsers = ["67", "banana"];

  if (chatType === "1") {
    return !specialUsers.includes(messageUser);
  }

  if (chatType === "3") {
    return specialUsers.includes(messageUser);
  }

  if (chatType === "2") {
    const customUsers = normalizeUserList(customUserList);

    if (customUsers.length === 0) return true;

    if (customFilterMode === "only") {
      return customUsers.includes(messageUser);
    }

    if (customFilterMode === "hide") {
      return !customUsers.includes(messageUser);
    }
  }

  return true;
}

async function fetchPlanStatus() {
  try {
    const res = await fetch(PLAN_API + "?user=" + encodeURIComponent(username));
    if (!res.ok) throw new Error("Failed to fetch plan status");

    const data = await res.json();
    hasUltraPlan = !!data.hasUltraPlan;

    renderPlanBadge();
    renderProfileChoices();
    renderCurrentPicPreview();
  } catch (err) {
    console.error("Plan check failed:", err);
    hasUltraPlan = false;
    renderPlanBadge();
    renderProfileChoices();
    renderCurrentPicPreview();
  }
}

function renderPlanBadge() {
  const badge = document.getElementById("planStatusBadge");
  if (!badge) return;

  if (hasUltraPlan) {
    badge.className = "plan-badge ultra";
    badge.textContent = "✅ Ultra Plan active — Ultra profile pictures unlocked";
  } else {
    badge.className = "plan-badge free";
    badge.textContent = "🔒 No Ultra Plan — Ultra profile pictures are locked";
  }
}

function toggleNotify(e) {
  notifyEnabled = !notifyEnabled;
  e.target.innerText = "🔔 Notify: " + (notifyEnabled ? "ON" : "OFF");
}

function go(url) {
  window.location.href = url;
}

function applyFilter() {
  activeFilter = document.getElementById("filterInput").value.trim();
  renderChat();
}

function formatText(text) {
  return text
    .replace(/##(.*?)##/g, "<b>$1</b>")
    .replace(/#(.*?)#/g, "<i>$1</i>");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shortenMessage(text, max = 15) {
  const clean = String(text)
    .replace(/^%(.*?)% /, "")
    .replace(/{{reply:(.*?)}}/g, "$1")
    .replace(/{{forward:(.*?)}}/g, "$1")
    .replace(/{{{.*?}}}/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (clean.length <= max) return clean;
  return clean.slice(0, max) + "...";
}

function prepareReply(messageText) {
  const input = document.getElementById("msg");
  const shortText = shortenMessage(messageText);
  input.value = `{{reply:${shortText}}} `;
  input.focus();
}

function prepareForward(messageText) {
  const input = document.getElementById("msg");
  const shortText = shortenMessage(messageText);
  input.value = `{{forward:${shortText}}} `;
  input.focus();
}

async function fetchProfile(user) {
  if (profileCache[user]) return profileCache[user];

  try {
    const res = await fetch(ACCOUNT_API + "?user=" + encodeURIComponent(user));
    const data = await res.json();

    if (data && data.profilePic && isUltraOnlyPic(data.profilePic) && !hasUltraPlan && user === username) {
      data.profilePic = "";
    }

    profileCache[user] = data || {};
    return data || {};
  } catch {
    profileCache[user] = {};
    return {};
  }
}

async function fetchMyProfile() {
  await fetchPlanStatus();

  const mine = await fetchProfile(username);
  selectedProfilePic = mine.profilePic || "";
  document.getElementById("descInput").value = mine.description || "";

  if (selectedProfilePic && !isPicAllowed(selectedProfilePic)) {
    selectedProfilePic = "";
  }

  renderProfileChoices();
  renderCurrentPicPreview();
}

function renderCurrentPicPreview() {
  const preview = document.getElementById("currentPicPreview");
  const text = document.getElementById("currentPicText");

  let pic = selectedProfilePic || DEFAULT_PROFILE_PIC;
  if (!isPicAllowed(pic)) {
    pic = DEFAULT_PROFILE_PIC;
    selectedProfilePic = "";
  }

  preview.src = pic;
  text.textContent = selectedProfilePic || "No picture selected (using user.png)";
}

function renderProfileChoices() {
  const grid = document.getElementById("profilePicGrid");
  if (!grid) return;

  grid.innerHTML = "";

  PROFILE_PICS.forEach(pic => {
    const card = document.createElement("div");
    const locked = isUltraOnlyPic(pic) && !hasUltraPlan;

    card.className = "profile-pic-card";
    if (selectedProfilePic === pic) {
      card.classList.add("selected");
    }
    if (locked) {
      card.classList.add("locked");
    }

    const img = document.createElement("img");
    img.src = pic;
    img.className = "profile-choice";
    img.onerror = () => { img.src = DEFAULT_PROFILE_PIC; };

    card.appendChild(img);

    if (locked) {
      const label = document.createElement("div");
      label.className = "locked-label";
      label.textContent = "You need ultra plan to get this profile picture";
      card.appendChild(label);
    }

    card.addEventListener("click", (e) => {
      e.stopPropagation();

      if (locked) {
        alert("You need ultra plan to get this profile picture");
        return;
      }

      selectedProfilePic = pic;
      renderProfileChoices();
      renderCurrentPicPreview();
    });

    grid.appendChild(card);
  });
}

function toggleProfileMenu(e) {
  if (e) e.stopPropagation();

  const menu = document.getElementById("profileMenu");
  const isOpen = menu.style.display === "flex";

  if (isOpen) {
    closeProfileMenu();
  } else {
    menu.style.display = "flex";
    fetchMyProfile();
  }
}

function closeProfileMenu() {
  document.getElementById("profileMenu").style.display = "none";
}

async function saveProfile() {
  const description = document.getElementById("descInput").value;

  if (selectedProfilePic && isUltraOnlyPic(selectedProfilePic) && !hasUltraPlan) {
    alert("You need ultra plan to get this profile picture");
    selectedProfilePic = "";
    renderProfileChoices();
    renderCurrentPicPreview();
    return;
  }

  await fetch(ACCOUNT_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user: username,
      profilePic: selectedProfilePic || "",
      description: description
    })
  });

  profileCache[username] = {
    profilePic: selectedProfilePic || "",
    description: description
  };

  closeProfileMenu();
  renderChat();
}

function getVisibleRecentMessagesForUser(user) {
  const result = [];

  for (let i = lastLoadedMessages.length - 1; i >= 0; i--) {
    const m = lastLoadedMessages[i];
    if (m.user !== user) continue;
    if (m.privateTo) continue;
    if (m.text.includes("{{{")) continue;

    result.push(m);
    if (result.length >= 5) break;
  }

  return result;
}

async function openUserProfilePopup(user, anchorEl) {
  const popup = document.getElementById("userProfilePopup");
  const profile = await fetchProfile(user);

  let pic = profile.profilePic || DEFAULT_PROFILE_PIC;
  if (user === username && !isPicAllowed(pic)) {
    pic = DEFAULT_PROFILE_PIC;
  }

  const desc = profile.description || "No description set.";
  const recent = getVisibleRecentMessagesForUser(user);

  popup.innerHTML = `
    <div class="popup-header">
      <img class="popup-avatar" src="${pic}" onerror="this.src='${DEFAULT_PROFILE_PIC}'">
      <div>
        <div class="popup-name">${escapeHtml(user)}</div>
      </div>
    </div>
    <div class="profile-label">Description</div>
    <div class="popup-desc">${escapeHtml(desc)}</div>
    <div class="profile-label">Recent messages</div>
    <div class="recent-messages">
      ${
        recent.length
          ? recent.map(m => `<div class="recent-message">${formatText(escapeHtml(m.text))}</div>`).join("")
          : `<div class="recent-empty">No recent public messages.</div>`
      }
    </div>
  `;

  popup.style.display = "flex";

  const rect = anchorEl.getBoundingClientRect();
  const mainRect = document.getElementById("main").getBoundingClientRect();

  let left = rect.right - mainRect.left + 10;
  let top = rect.top - mainRect.top;

  popup.style.left = left + "px";
  popup.style.top = top + "px";

  requestAnimationFrame(() => {
    const popupRect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (popupRect.right > viewportWidth - 10) {
      left = rect.left - mainRect.left - popupRect.width - 10;
      popup.style.left = Math.max(10, left) + "px";
    }

    if (popupRect.bottom > viewportHeight - 10) {
      top = Math.max(10, viewportHeight - popupRect.height - 10 - mainRect.top);
      popup.style.top = top + "px";
    }
  });
}

function hideUserProfilePopup() {
  document.getElementById("userProfilePopup").style.display = "none";
}

function processVisibleMessages(data) {
  const visibleMessages = [];
  const nextUsers = new Set();

  for (const m of data) {
    nextUsers.add(m.user);
    if (m.privateTo) nextUsers.add(m.privateTo);

    if (!passesChatTypeFilter(m.user)) continue;

    let text = m.text;
    let isPrivate = !!m.privateTo;
    let visible = true;
    let replyMeta = "";
    let forwardMeta = "";

    if (text.includes("{{{") && m.user === username) {
      visible = false;
    }

    if (!visible) continue;

    if (m.privateTo) {
      const targetUser = String(m.privateTo).trim();

      if (username === targetUser) {
        text = `<i style="color:#43b581;">(private to you)</i>${escapeHtml(text)}`;
      } else if (username === m.user) {
        text = `<i style="color:#faa61a;">(private to ${escapeHtml(targetUser)})</i>${escapeHtml(text)}`;
      } else {
        text = `<i style="color:#f04747;">(private)</i>${escapeHtml(text)}`;
      }
    } else {
      text = escapeHtml(text);
    }

    const replyMatch = text.match(/{{reply:(.*?)}}/);
    if (replyMatch) {
      replyMeta = replyMatch[1];
      text = text.replace(/{{reply:(.*?)}}/, "").trim();
    }

    const forwardMatch = text.match(/{{forward:(.*?)}}/);
    if (forwardMatch) {
      forwardMeta = forwardMatch[1];
      text = text.replace(/{{forward:(.*?)}}/, "").trim();
    }

    if (replyMeta) {
      text = `<span class="reply-label">(replying to "${escapeHtml(replyMeta)}")</span>` + text;
    }

    if (forwardMeta) {
      text = `<span class="forward-label">(forwarded "${escapeHtml(forwardMeta)}")</span>` + text;
    }

    if (activeFilter && m.user !== activeFilter) continue;

    visibleMessages.push({
      original: m,
      displayText: text,
      isPrivate
    });
  }

  users = nextUsers;
  lastLoadedMessages = visibleMessages.map(item => ({
    user: item.original.user,
    text: item.original.text,
    privateTo: item.original.privateTo || null,
    time: item.original.time
  }));

  return visibleMessages;
}

async function renderChat(loadToken = activeLoadToken) {
  const visibleMessages = processVisibleMessages(currentChatData);
  const fragment = document.createDocumentFragment();

  for (const item of visibleMessages) {
    if (loadToken !== activeLoadToken) return;

    const m = item.original;
    const profile = await fetchProfile(m.user);

    if (loadToken !== activeLoadToken) return;

    let pic = profile.profilePic || DEFAULT_PROFILE_PIC;

    if (m.user === username && !isPicAllowed(pic)) {
      pic = DEFAULT_PROFILE_PIC;
    }

    const div = document.createElement("div");
    div.className = "msg";

    if (item.isPrivate) {
      div.classList.add("private");
    }

    const time = new Date(m.time).toLocaleTimeString();

    div.innerHTML = `
      <img class="avatar" src="${pic}" onerror="this.src='${DEFAULT_PROFILE_PIC}'">
      <div class="message-body">
        <span class="user">${escapeHtml(m.user)}</span>
        <span class="time">[${time}]</span>
        <div>${formatText(item.displayText)}</div>
      </div>
      <div class="message-actions">
        <button class="msg-action-btn reply-btn" title="Reply">↩</button>
        <button class="msg-action-btn forward-btn" title="Forward">↪</button>
      </div>
    `;

    const avatar = div.querySelector(".avatar");
    avatar.addEventListener("click", (e) => {
      e.stopPropagation();
      openUserProfilePopup(m.user, avatar);
    });

    const replyBtn = div.querySelector(".reply-btn");
    const forwardBtn = div.querySelector(".forward-btn");

    replyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      prepareReply(m.text);
    });

    forwardBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      prepareForward(m.text);
    });

    fragment.appendChild(div);
  }

  if (loadToken !== activeLoadToken) return;

  const chat = document.getElementById("chat");
  chat.innerHTML = "";
  chat.appendChild(fragment);

  renderUserMenu();

  if (isFirstLoad) {
    chat.scrollTop = chat.scrollHeight;
    isFirstLoad = false;
  }
}

async function load() {
  const loadToken = ++activeLoadToken;

  let res;

  try {
    res = await fetch(CHAT_API + "?user=" + encodeURIComponent(username));
  } catch (err) {
    console.error("Fetch failed:", err);
    return;
  }

  if (loadToken !== activeLoadToken) return;

  if (!res.ok) {
    console.error("Chat API error:", res.status);
    return;
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    console.error("Invalid JSON:", err);
    return;
  }

  if (loadToken !== activeLoadToken) return;

  if (
    notifyEnabled &&
    document.hidden &&
    data.length > lastMessageCount
  ) {
    new Audio("notify.mp3").play();
  }

  lastMessageCount = data.length;

  const newSignature = JSON.stringify(data);

  if (newSignature === lastDataSignature) {
    return;
  }

  lastDataSignature = newSignature;
  currentChatData = data;
  await renderChat(loadToken);
}

function togglePrivateMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById("privateMenu");
  menu.style.display = menu.style.display === "flex" ? "none" : "flex";
}

function renderUserMenu() {
  const menu = document.getElementById("privateMenu");
  menu.innerHTML = "";

  users.forEach(u => {
    if (u === username) return;
    if (!passesChatTypeFilter(u)) return;

    const div = document.createElement("div");
    div.className = "user-option";
    div.textContent = u;

    div.onclick = () => {
      sendPrivate(u);
      menu.style.display = "none";
    };

    menu.appendChild(div);
  });
}

function sendPrivate(target) {
  const input = document.getElementById("msg");
  if (!input.value) return;
  send(`%${target}% ${input.value}`);
}

function sendEmoji(e) {
  send(e);
}

function getSpamState() {
  try {
    const raw = localStorage.getItem(SPAM_STORAGE_KEY);
    if (!raw) {
      return {
        blockedUntil: 0,
        history: []
      };
    }

    const parsed = JSON.parse(raw);
    return {
      blockedUntil: parsed.blockedUntil || 0,
      history: Array.isArray(parsed.history) ? parsed.history : []
    };
  } catch {
    return {
      blockedUntil: 0,
      history: []
    };
  }
}

function saveSpamState(state) {
  localStorage.setItem(SPAM_STORAGE_KEY, JSON.stringify(state));
}

function cleanMessageForSpamCheck(text) {
  return String(text)
    .replace(/^%([^%]+)%\s*/, "")
    .replace(/{{reply:(.*?)}}/g, "")
    .replace(/{{forward:(.*?)}}/g, "")
    .replace(/{{{.*?}}}/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function formatBlockTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function checkSpamAndApplyBlock(text) {
  const now = Date.now();
  const state = getSpamState();

  if (state.blockedUntil > now) {
    return {
      blocked: true,
      reason: `You are blocked for spam. Time left: ${formatBlockTime(state.blockedUntil - now)}`
    };
  }

  const cleaned = cleanMessageForSpamCheck(text);
  const length = cleaned.length;

  state.history = state.history.filter(entry => now - entry.time <= SPAM_RULES.historyMaxAgeMs);

  const recentQuickMessages = state.history.filter(
    entry => now - entry.time <= SPAM_RULES.quickMessageWindowMs
  );

  const recentLongMessages = state.history.filter(
    entry =>
      entry.length >= SPAM_RULES.longMessageLength &&
      now - entry.time <= SPAM_RULES.longMessageWindowMs
  );

  const duplicateHuge = state.history.find(
    entry =>
      entry.length >= SPAM_RULES.hugeMessageLength &&
      length >= SPAM_RULES.hugeMessageLength &&
      entry.cleaned === cleaned &&
      now - entry.time <= SPAM_RULES.duplicateHugeWindowMs
  );

  let shouldBlock = false;
  let reason = "";

  if (recentQuickMessages.length >= 1) {
    shouldBlock = true;
    reason = "Blocked for spam: you sent 2 messages too quickly.";
  } else if (length >= SPAM_RULES.longMessageLength && recentLongMessages.length >= 1) {
    shouldBlock = true;
    reason = "Blocked for spam: you sent 2 very long messages too quickly.";
  } else if (duplicateHuge) {
    shouldBlock = true;
    reason = "Blocked for spam: you sent the same huge message twice too quickly.";
  }

  if (shouldBlock) {
    state.blockedUntil = now + SPAM_RULES.blockDurationMs;
    saveSpamState(state);
    return { blocked: true, reason };
  }

  state.history.push({
    time: now,
    cleaned,
    length
  });

  saveSpamState(state);
  return { blocked: false };
}

async function send(textOverride = null) {
  const input = document.getElementById("msg");
  const text = textOverride || input.value;

  if (!text || !text.trim()) return;

  const spamCheck = checkSpamAndApplyBlock(text);

  if (spamCheck.blocked) {
    alert(spamCheck.reason);
    return;
  }

  await fetch(CHAT_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user: username,
      text: text
    })
  });

  input.value = "";
  load();
}

document.getElementById("msg").addEventListener("keypress", e => {
  if (e.key === "Enter") send();
});

document.addEventListener("click", (e) => {
  const popup = document.getElementById("userProfilePopup");
  const profileMenu = document.getElementById("profileMenu");
  const privateMenu = document.getElementById("privateMenu");
  const editProfileBtn = document.getElementById("editProfileBtn");
  const privateBtn = document.getElementById("privateBtn");

  if (popup.style.display === "flex" && !popup.contains(e.target)) {
    hideUserProfilePopup();
  }

  if (
    profileMenu.style.display === "flex" &&
    !profileMenu.contains(e.target) &&
    !editProfileBtn.contains(e.target)
  ) {
    closeProfileMenu();
  }

  if (
    privateMenu.style.display === "flex" &&
    !privateMenu.contains(e.target) &&
    !privateBtn.contains(e.target)
  ) {
    privateMenu.style.display = "none";
  }
});

updateChatTypeUI();
fetchPlanStatus();
setInterval(load, 2000);
load();
