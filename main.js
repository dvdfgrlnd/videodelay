let vheight = document.querySelector("#videocontainer").clientHeight;
let vwidth = document.querySelector("#videocontainer").clientWidth;
let aspect_ratio = vwidth / vheight;

let canvas_pixels = 720;
let ctx = document.querySelector("#c1")
ctx.width = canvas_pixels * aspect_ratio;
ctx.height = canvas_pixels;
let c1 = ctx.getContext("2d", { willReadFrequently: true });
c1.imageSmoothingEnabled = false;

let ctx2 = document.querySelector("#c2");
ctx2.width = canvas_pixels * aspect_ratio;
ctx2.height = canvas_pixels;
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
var audioContext = null;

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

let pause_button = document.querySelector("#toggleswitch");
pause_button.addEventListener("click", () => {
  if (video.paused) {
    // Start video
    pause_button.textContent = "PAUSE";
    pause = false;
    start_stream();
  } else {
    pause_button.textContent = "PLAY";
    pause = true;
    stop_stream();
    stored_frames = [];
    switchVideoVisibility();
  }
});


const frequency_input = document.querySelector("#frequencyinput");
const frequency_value = document.querySelector("#frequencyvalue");
frequency_value.textContent = frequency_input.value;
frequency_input.addEventListener("input", (event) => {
  frequency_value.textContent = event.target.value;
});
var deadlineTimeout2 = null;
frequency_input.addEventListener("change", (event) => {
  if (deadlineTimeout2) {
    clearTimeout(deadlineTimeout2);
  }
  deadlineTimeout2 = setTimeout(() => {
    let new_delay_seconds = parseInt(event.target.value);
    if (delay_seconds === new_delay_seconds) {
      return;
    }
    // switchVideoVisibility()
    // delay_seconds = new_delay_seconds;
    // console.log(`Delay = ${delay_seconds}`);
    // stored_frames = [];
    // starttime = Date.now();
    // setTimeout(() => {
    //   switchVideoVisibility()
    // }, delay_seconds * 1000)
  }, 1500);
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
    // let new_delay_seconds = parseInt(event.target.value);
    // if (delay_seconds === new_delay_seconds) {
    //   return;
    // }
    // switchVideoVisibility()
    // delay_seconds = new_delay_seconds;
    // console.log(`Delay = ${delay_seconds}`);
    // stored_frames = [];
    // starttime = Date.now();
    // setTimeout(() => {
    //   switchVideoVisibility()
    // }, delay_seconds * 1000)
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

  if (pause) {
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

function stop_stream() {
  stream.getTracks().forEach(track => track.stop());
  video.removeEventListener("loadedmetadata", init_stream);
  video.pause();
  video.currentTime = 0;

  if (audioContext) {
    audioContext.suspend();
  }
  stream.getAudioTracks().forEach(track => {
    track.stop()
    this.stream.removeTrack(track);
  });
}

async function start_stream() {
  stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: {
      facingMode: "user",
      // aspectRatio: {exact: aspect_ratio},
      min: 24,  // very important to define min value here
      ideal: 60,
      max: 120,
    }
  });
  video.addEventListener("loadedmetadata", init_stream, false);

  start_microphone(stream);

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


function start_microphone(stream) {

  audioContext = new AudioContext();
  let thresholdFrequency = 14000;

  let spectogramEl = document.getElementById("spectogram");
  let spectogramCtx = spectogramEl.getContext("2d");
  spectogramCtx.textBaseline = "top";
  spectogramCtx.font = "12px serif";

  let WIDTH = spectogramEl.width;
  let HEIGHT = spectogramEl.height;

  let microphone_stream = audioContext.createMediaStreamSource(stream);

  var biquadFilter = audioContext.createBiquadFilter();
  microphone_stream.connect(biquadFilter);
  biquadFilter.type = "bandpass";
  biquadFilter.frequency.value = thresholdFrequency;
  biquadFilter.gain.value = 25;

  biquadFilter.connect(audioContext.destination);

  let analyser_node = audioContext.createAnalyser();
  analyser_node.smoothingTimeConstant = 0;
  analyser_node.fftSize = 2048;

  biquadFilter.connect(analyser_node);

  var buffer_length = analyser_node.frequencyBinCount;

  var array_freq_domain = new Uint8Array(buffer_length);

  console.log("buffer_length " + buffer_length);
  console.log("sample rate = ", audioContext.sampleRate);
  let freqBinSize = (audioContext.sampleRate / 2) / buffer_length;
  console.log("freqBinSize = ", freqBinSize);
  let nonEmptySlots = buffer_length - Math.floor(thresholdFrequency / freqBinSize);
  console.log("non empty = ", nonEmptySlots);

  delay_input.max = nonEmptySlots*256;

  var buffer = [];
  let bufferTimeThreshold = 4000;
  var max = 0;

  var draw = function () {
    if (pause) {
      return;
    }
    requestAnimationFrame(draw);

    analyser_node.getByteFrequencyData(array_freq_domain);

    if (microphone_stream.playbackState == microphone_stream.PLAYING_STATE) {
      let s = array_freq_domain.reduce((acc, v) => v + acc);

      let dn = Date.now();
      buffer.push([s, dn]);
      if (buffer[buffer.length - 1][1] - buffer[0][1] > bufferTimeThreshold) {
        buffer.shift()
      }
      if (s > max * 0.7) {
        console.log("non zero", array_freq_domain.reduce((acc, v) => acc + (v > 0 ? 1 : 0)));
      }

      spectogramCtx.clearRect(0, 0, WIDTH, HEIGHT);
      spectogramCtx.fillStyle = "rgb(200, 200, 200)";
      spectogramCtx.fillRect(0, 0, WIDTH, HEIGHT);
      spectogramCtx.lineWidth = 4;
      spectogramCtx.strokeStyle = "rgb(0, 0, 0)";
      spectogramCtx.beginPath();

      max = Math.max(
        buffer.reduce((acc, v) => Math.max(acc, v[0]), 0),
        max
      );
      spectogramCtx.fillStyle = "rgb(0, 0, 0)";
      spectogramCtx.fillText(`${max}`, 0, 0);

      let ts = buffer[0][1];
      for (let i = 1; i < buffer.length; i += 1) {
        let x = ((buffer[i][1] - ts) / bufferTimeThreshold) * WIDTH;
        let v = buffer[i][0];
        let y = HEIGHT - (v / max) * HEIGHT;
        if (i === 1) {
          spectogramCtx.moveTo(x, y);
        } else {
          spectogramCtx.lineTo(x, y);
        }

        if (v > max * 0.5) {
          spectogramCtx.fillText(`${v}`, x * 1.01, y * 0.95);
        }
      }

      spectogramCtx.stroke();
    }

  }
  draw();
}


window.onerror = function (msg, url, line, col, error) {
  let err = "A fatal exception has occurred. The application will now reload.\nException details -> " + msg + "\nUrl: " + url + "\nLine: " + line + '\nColumn: ' + col + '\nError: ' + error;
  console.error(err);
  if (!(navigator.userAgent.match("FxiOS") && msg === "Script error.")) {
    alert(err);
    location.reload();
  }
  return true;
}