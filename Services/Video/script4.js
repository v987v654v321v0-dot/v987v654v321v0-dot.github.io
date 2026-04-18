const canvas = document.getElementById("canvas");
const timelineDiv = document.getElementById("timeline");
const playhead = document.getElementById("playhead");

let timeline = [];
let time = 0;
let playing = false;
let animationId = null;

let videoLength = 10;

const SCALE = 80;

// image list
const images = [
  "cat.jpg","shrek.jpeg","cat2.jpg","nuke.jpeg","sushi.jpeg",
  "burger.jpeg","background.jpg","user.png","enstein.jpeg",
  "warrior.jpeg","sad.jpeg","Slay.png","gun.jpeg",
  "explosion.jpeg","roblox.jpeg","cat3.jpeg","hamster.jpeg"
];

// fill dropdown
const imageSelect = document.getElementById("imageSelect");
images.forEach(img => {
  let opt = document.createElement("option");
  opt.value = img;
  opt.textContent = img;
  imageSelect.appendChild(opt);
});

// ---------- ADD ELEMENTS ----------

function addText() {
  timeline.push({
    type: "text",
    content: document.getElementById("textContent").value,
    start: +document.getElementById("textStart").value,
    end: +document.getElementById("textEnd").value,
    x: 100,
    y: 100
  });
  drawTimeline();
}

function addImage() {
  timeline.push({
    type: "image",
    src: document.getElementById("imageSelect").value,
    start: +document.getElementById("imgStart").value,
    end: +document.getElementById("imgEnd").value,
    x: 200,
    y: 150
  });
  drawTimeline();
}

// ---------- TIMELINE ----------

function drawTimeline() {
  document.querySelectorAll(".clip").forEach(e => e.remove());

  timeline.forEach(obj => {
    let div = document.createElement("div");
    div.className = "clip";

    div.style.left = (obj.start * SCALE) + "px";
    div.style.width = ((obj.end - obj.start) * SCALE) + "px";

    div.innerText = obj.type;
    timelineDiv.appendChild(div);
  });
}

// ---------- PLAYBACK ----------

function play() {
  if (playing) return; // FIX: prevents stacking

  videoLength = +document.getElementById("videoLength").value;

  playing = true;

  if (time >= videoLength) time = 0;

  loop();
}

function stop() {
  playing = false;
  cancelAnimationFrame(animationId);
}

function loop() {
  if (!playing) return;

  time += 0.016;

  if (time >= videoLength) {
    time = videoLength;
    stop();
  }

  render();
  updateUI();

  animationId = requestAnimationFrame(loop);
}

// ---------- UI ----------

function updateUI() {
  document.getElementById("timeDisplay").innerText = time.toFixed(2);
  playhead.style.left = (time * SCALE) + "px";
}

// ---------- RENDER ----------

function render() {
  canvas.innerHTML = "";

  timeline.forEach(obj => {
    if (time >= obj.start && time <= obj.end) {

      if (obj.type === "text") {
        let el = document.createElement("div");
        el.className = "element";
        el.innerText = obj.content;
        el.style.left = obj.x + "px";
        el.style.top = obj.y + "px";
        canvas.appendChild(el);
      }

      if (obj.type === "image") {
        let img = document.createElement("img");
        img.src = obj.src;
        img.className = "element";
        img.style.left = obj.x + "px";
        img.style.top = obj.y + "px";
        img.width = 120;
        canvas.appendChild(img);
      }

    }
  });
}
