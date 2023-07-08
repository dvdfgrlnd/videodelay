let vheight = document.querySelector("#videocontainer").clientHeight;
let vwidth = document.querySelector("#videocontainer").clientWidth;
let aspect_ratio = vwidth / vheight;

let ctx = document.querySelector("#c1")
ctx.width = 1080*aspect_ratio;
ctx.height = 1080;
let c1 = ctx.getContext("2d", { willReadFrequently: true });
c1.imageSmoothingEnabled = false;

let ctx2 = document.querySelector("#c2");
ctx2.width = 1080*aspect_ratio;
ctx2.height = 1080;
let c2 = ctx2.getContext("2d");
c2.imageSmoothingEnabled = false;

let video = document.querySelector("#video");

var yheight = 0;
var ywidth = 0;

var stored_frames = [];
var starttime = Date.now()

function switchVideoVisibility() {
  var canvas = document.querySelector("#c2");
  var videoloader = document.querySelector("#videoloader");

  let style = window.getComputedStyle(canvas);
  let is_hidden = style.display === "none";

  // Switch visibility
  videoloader.style.display = is_hidden ? "none" : "block";
  canvas.style.display = is_hidden ? "block" : "none";
}


const delay_input = document.querySelector("#delayseconds");
const delay_value = document.querySelector("#delayvalue");
delay_value.textContent = delay_input.value;
delay_input.addEventListener("input", (event) => {
  delay_value.textContent = event.target.value;
});

var delay_seconds = parseInt(delay_input.value);
var deadlineTimeout = null;
delay_input.addEventListener("change", (event) => {
  if(deadlineTimeout){
    clearTimeout(deadlineTimeout);
  }
  deadlineTimeout = setTimeout(()=>{
    let new_delay_seconds = parseInt(event.target.value);
    if(delay_seconds === new_delay_seconds){
      return;
    }
    switchVideoVisibility()
    delay_seconds = new_delay_seconds;
    console.log(`Delay = ${delay_seconds}`);
    stored_frames = [];
    starttime = Date.now();
    setTimeout(()=>{
      switchVideoVisibility()
    }, delay_seconds*1000)
  }, 1500);
});

// ctx.style.display = 'none'


function f() {
  c1.drawImage(video, 0, 0, ctx.width, ctx.height);
  const frame = c1.getImageData(0, 0, ctx.width, ctx.height);
  stored_frames.push(frame);
  if(Date.now() - starttime >= (delay_seconds*1000)) {
    let oldframe = stored_frames.shift();
    c2.putImageData(oldframe, 0, 0);
  }

  requestAnimationFrame(f);
}


async function start() {
  let stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      aspectRatio: {exact: aspect_ratio},
      min: 24,  // very important to define min value here
      ideal: 60,
      max: 120,
    }
  });
  video.addEventListener( "loadedmetadata", function (e) {
    console.log("START");
    ywidth = this.videoWidth;
    yheight = this.videoHeight;
    console.log(ywidth, yheight);
    f();
  }, false );

  video.srcObject = stream;
  video.play()
  video.style.display = 'none';
  starttime = Date.now();

  setTimeout(()=>{
    switchVideoVisibility()
  }, delay_seconds*1000)
}

document.querySelector("#startmessage").addEventListener("click", async ()=>{
  console.log("PLAY");
  let d = document.querySelector("#startmessage");
  d.style.display = 'none';
  start()
    .then((r) => console.log(r))
    .catch((err) => console.error(err));
});


