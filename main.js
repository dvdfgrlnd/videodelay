let vheight = document.querySelector("#videocontainer").clientHeight;
let vwidth = document.querySelector("#videocontainer").clientWidth;
let aspect_ratio = vwidth / vheight;

let ctx = document.querySelector("#c1")
ctx.width = 1080 * aspect_ratio;
ctx.height = 1080;
let c1 = ctx.getContext("2d", { willReadFrequently: true });
c1.imageSmoothingEnabled = false;

let ctx2 = document.querySelector("#c2");
ctx2.width = 1080 * aspect_ratio;
ctx2.height = 1080;
let c2 = ctx2.getContext("2d");
c2.imageSmoothingEnabled = false;

let video = document.querySelector("#video");
video.muted = true;
video.playsinline = true;

var video_height = 0;
var video_width = 0;
var source_left = 0;
var source_top = 0;
var source_width = 0;
var source_height = 0;

var stored_frames = [];
var starttime = Date.now()
var stream = null;

var pause = false;

function switchVideoVisibility() {
  var canvas = document.querySelector("#c2");
  var videoloader = document.querySelector("#videoloader");

  let style = window.getComputedStyle(canvas);
  let is_hidden = style.display === "none";

  // Switch visibility
  videoloader.style.display = is_hidden ? "none" : "block";
  canvas.style.display = is_hidden ? "block" : "none";
}

document.addEventListener("click", () => {
  let b = document.querySelector("#toggleswitch");
  if (video.paused) {
    // Start video
    b.textContent = "PAUSE";
    pause = false;
    start_stream();
  } else {
    b.textContent = "PLAY";
    pause = true;
    stop_stream();
    stored_frames = [];
    switchVideoVisibility();
  }
});


const delay_input = document.querySelector("#delayseconds");
const delay_value = document.querySelector("#delayvalue");
delay_value.textContent = delay_input.value;
delay_input.addEventListener("input", (event) => {
  delay_value.textContent = event.target.value;
});

var delay_seconds = parseInt(delay_input.value);
var deadlineTimeout = null;
delay_input.addEventListener("change", (event) => {
  if (deadlineTimeout) {
    clearTimeout(deadlineTimeout);
  }
  deadlineTimeout = setTimeout(() => {
    let new_delay_seconds = parseInt(event.target.value);
    if (delay_seconds === new_delay_seconds) {
      return;
    }
    switchVideoVisibility()
    delay_seconds = new_delay_seconds;
    console.log(`Delay = ${delay_seconds}`);
    stored_frames = [];
    starttime = Date.now();
    setTimeout(() => {
      switchVideoVisibility()
    }, delay_seconds * 1000)
  }, 1500);
});


function f() {
  c1.drawImage(video, source_left, source_top, source_width, source_height, 0, 0, ctx.width, ctx.height);

  const frame = c1.getImageData(0, 0, ctx.width, ctx.height);
  stored_frames.push(frame);
  if (Date.now() - starttime >= (delay_seconds * 1000)) {
    let oldframe = stored_frames.shift();
    c2.putImageData(oldframe, 0, 0);
  }

  if(pause){
    return;
  }
  requestAnimationFrame(f);
}

function init_stream(e) {
    console.log("START");
    video_width = this.videoWidth;
    video_height = this.videoHeight;

    source_width = video_height * aspect_ratio;
    source_left = (video_width - source_width) / 2;
    source_top = 0;
    source_height = video_height;

    f();
  }

function stop_stream(){
  stream.getTracks().forEach(track => track.stop());
  video.removeEventListener("loadedmetadata", init_stream);
  video.pause();
  video.currentTime = 0;
}

async function start_stream() {
  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      // aspectRatio: {exact: aspect_ratio},
      min: 24,  // very important to define min value here
      ideal: 60,
      max: 120,
    }
  });
  video.addEventListener("loadedmetadata", init_stream, false);

  video.srcObject = stream;
  video.play()

  video.style.display = 'none';
  starttime = Date.now();

  setTimeout(() => {
    switchVideoVisibility()
  }, delay_seconds * 1000)
}

function startStream() {
  console.log("PLAY");
  let d = document.querySelector("#startmessage");
  d.style.display = 'none';
  start_stream()
    .then((r) => console.log(r))
    .catch((err) => console.error(err));
}

document.querySelector("#startmessage").addEventListener("click", async () => {
  startStream();
});

if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  console.log("Auto start due to localhost");
  startStream();
}


