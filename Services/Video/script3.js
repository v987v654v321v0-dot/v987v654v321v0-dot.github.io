const canvas = document.getElementById("canvas");
const timelineDiv = document.getElementById("timeline");
const playhead = document.getElementById("playhead");

let timeline = [];
let time = 0;
let playing = false;

const SCALE = 100; // pixels per second

function addDemo() {
  let clip = {
    type: "text",
    content: "Hello World",
    x: 100,
    y: 100,
    start: time,
    end: time + 3
  };

  timeline.push(clip);
  drawTimeline();
}

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

function play() {
  playing = true;
  requestAnimationFrame(loop);
}

function stop() {
  playing = false;
}

function loop() {
  if (!playing) return;

  time += 0.016;

  render();
  updateUI();

  requestAnimationFrame(loop);
}

function updateUI() {
  document.getElementById("timeDisplay").innerText = time.toFixed(2);

  // move playhead
  playhead.style.left = (time * SCALE) + "px";
}

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
    }
  });
}
