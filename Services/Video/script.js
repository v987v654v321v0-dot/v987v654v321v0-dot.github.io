const canvas = document.getElementById("canvas");

let timeline = [];
let time = 0;
let playing = false;

// Image list
const images = [
  "cat.jpg","shrek.jpeg","cat2.jpg","nuke.jpeg","sushi.jpeg",
  "burger.jpeg","background.jpg","user.png","enstein.jpeg",
  "warrior.jpeg","sad.jpeg","Slay.png","gun.jpeg",
  "explosion.jpeg","roblox.jpeg","cat3.jpeg","hamster.jpeg"
];

// Populate dropdown
const imageSelect = document.getElementById("imageSelect");
images.forEach(img => {
  let opt = document.createElement("option");
  opt.value = img;
  opt.textContent = img;
  imageSelect.appendChild(opt);
});

function addText() {
  timeline.push({
    type: "text",
    content: document.getElementById("textContent").value,
    x: +document.getElementById("textX").value,
    y: +document.getElementById("textY").value,
    start: +document.getElementById("textStart").value,
    end: +document.getElementById("textEnd").value
  });
}

function addImage() {
  timeline.push({
    type: "image",
    src: document.getElementById("imageSelect").value,
    start: +document.getElementById("imgStart").value,
    end: +document.getElementById("imgEnd").value,
    keyframes: [
      {
        time: 0,
        x: +document.getElementById("imgX").value,
        y: +document.getElementById("imgY").value
      },
      {
        time: 1,
        x: +document.getElementById("imgX2").value,
        y: +document.getElementById("imgY2").value
      }
    ],
    interpolation: document.getElementById("interp").value
  });
}

function play() {
  playing = true;
  time = 0;
  loop();
}

function stop() {
  playing = false;
}

function loop() {
  if (!playing) return;

  time += 0.016; // ~60fps
  render();

  requestAnimationFrame(loop);
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

      if (obj.type === "image") {
        let progress = (time - obj.start) / (obj.end - obj.start);

        let x = lerp(
          obj.keyframes[0].x,
          obj.keyframes[1].x,
          progress
        );

        let y = lerp(
          obj.keyframes[0].y,
          obj.keyframes[1].y,
          progress
        );

        let img = document.createElement("img");
        img.src = obj.src;
        img.className = "element";
        img.style.left = x + "px";
        img.style.top = y + "px";
        img.width = 100;

        canvas.appendChild(img);
      }
    }
  });
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function exportJSON() {
  const data = JSON.stringify(timeline, null, 2);

  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "video_project.json";
  a.click();
}
