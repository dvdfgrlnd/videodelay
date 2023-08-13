// Constants
const bufferTimeThreshold = 4000;
const saveWaitTime = 1500;
const peakTime = 1000;
const canvasPixels = 720;

var lastSaveTime = 0;
var saveTimeout = null;
var playbackRate = 0.5
var savedFramesBuffer = [];
var stream = null;
var audioContext = null;
var thresholdFrequency = 14000;


const frequencyInputElement = document.querySelector("#frequencyinput");
const frequencyValueElement = document.querySelector("#frequencyvalue");
frequencyValueElement.textContent = frequencyInputElement.value;
frequencyInputElement.addEventListener("input", (event) => {
  frequencyValueElement.textContent = event.target.value;
});
var frequencyInputEvent = null;
frequencyInputElement.addEventListener("change", (event) => {
  if (frequencyInputEvent) {
    clearTimeout(frequencyInputEvent);
  }
  frequencyInputEvent = setTimeout(() => {
    let newThreshold = parseInt(event.target.value);
    if (thresholdFrequency === newThreshold) {
      return;
    }
    thresholdFrequency = newThreshold;
    switchVideoVisibility();
    stopStream();
    start_stream();
  }, 1500);
});


const sensitivityInputElement = document.querySelector("#sensitivityinput");
const sensitivityValueElement = document.querySelector("#sensitivityvalue");
sensitivityValueElement.textContent = sensitivityInputElement.value;
sensitivityInputElement.addEventListener("input", (event) => {
  sensitivityValueElement.textContent = event.target.value / 1000;
});

var sensitivityThreshold = parseInt(sensitivityInputElement.value);
var sensitivityInputEvent = null;
sensitivityInputElement.addEventListener("change", (event) => {
  if (sensitivityInputEvent) {
    clearTimeout(sensitivityInputEvent);
  }
  sensitivityInputEvent = setTimeout(() => {
    sensitivityThreshold = parseInt(event.target.value);
  }, 1500);
});

let video = document.querySelector("#video");
video.muted = true;
video.playsinline = true;
let previewVideo = document.querySelector("#preview");

var pauseCamera = false;

function switchVideoVisibility() {
  var canvas = document.querySelector("#preview");
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
    pauseCamera = false;
    start_stream();
  } else {
    pause_button.textContent = "PLAY";
    pauseCamera = true;
    stopStream();
    switchVideoVisibility();
  }
});



document.querySelector("#savebutton").addEventListener("click", () => {
  saveVideo();
});

function saveVideo() {
  let saveVideoCanvas = document.querySelector("#saveVideoCanvas")
  saveVideoCanvas.width = canvasPixels * getAspectRatio();
  saveVideoCanvas.height = canvasPixels;
  let saveVideoCanvasContext = saveVideoCanvas.getContext("2d", { willReadFrequently: true });
  saveVideoCanvasContext.imageSmoothingEnabled = false;

  // Copy frames since the array of saved frames will be updated during the playback
  let savedFramesBufferCopy = [];
  console.log("len", savedFramesBuffer.length);
  savedFramesBuffer.forEach((frame) => savedFramesBufferCopy.push(frame));

  let canvasRecorder = new MediaRecorder(saveVideoCanvas.captureStream(30));
  let savedFrameStartTime = savedFramesBufferCopy[0][1];
  var playbackStartTime = null;

  let videoPlayback = function (timestamp) {
    if (playbackStartTime === null) {
      playbackStartTime = timestamp;
    }

    // Find closest frame. Must be a later frame than last shown frame
    while (savedFramesBufferCopy.length > 1) {
      let currentFrameTimeDiff = savedFramesBufferCopy[0][1] - savedFrameStartTime;
      let nextFrameTimeDiff = savedFramesBufferCopy[1][1] - savedFrameStartTime;
      let timeSinceFirstDrawnFrame = timestamp - playbackStartTime;
      if (
        Math.abs(timeSinceFirstDrawnFrame - currentFrameTimeDiff)
        <= Math.abs(timeSinceFirstDrawnFrame - nextFrameTimeDiff)
      ) {
        break;
      }
      // Remove current frame the next frame is closer
      savedFramesBufferCopy.shift();
    }

    saveVideoCanvasContext.putImageData(savedFramesBufferCopy[0][0], 0, 0);
    if (savedFramesBufferCopy.length <= 1) {
      // All frames have been used. Stop video playback
      canvasRecorder.stop();
      return;
    }
    requestAnimationFrame(videoPlayback);
  };

  let videoBlobs = [];
  canvasRecorder.ondataavailable = (event) => {
    videoBlobs.push(event.data);
  };
  canvasRecorder.onstop = () => {
    let recordedBlob = new Blob(videoBlobs, { type: "video/webm" });
    previewVideo.pause();
    previewVideo.srcObject = null;
    previewVideo.src = URL.createObjectURL(recordedBlob);
    previewVideo.load();
    previewVideo.playbackRate = playbackRate;
    previewVideo.play();
    let downloadButton = document.querySelector("#downloadButton");
    downloadButton.href = previewVideo.src;
    downloadButton.download = "RecordedVideo.webm";
    console.log(
      `Successfully recorded ${recordedBlob.size} bytes of ${recordedBlob.type} media.`,
    );
  };

  canvasRecorder.start();

  requestAnimationFrame(videoPlayback)
}


function getAspectRatio(){
  let vheight = document.querySelector("#videocontainer").clientHeight;
  let vwidth = document.querySelector("#videocontainer").clientWidth;
  let aspect_ratio = vwidth / vheight;
  return aspect_ratio;
}

function startVideoCopy(e) {
  let cameraCanvas = document.querySelector("#cameraCanvas")
  let aspect_ratio = getAspectRatio();
  cameraCanvas.width = canvasPixels * aspect_ratio;
  cameraCanvas.height = canvasPixels;
  let cameraCanvasContext = cameraCanvas.getContext("2d", { willReadFrequently: true });
  cameraCanvasContext.imageSmoothingEnabled = false;

  let VIDEOWIDTH = this.videoWidth;
  let VIDEOHEIGHT = this.videoHeight;

  let SOURCEWIDTH = VIDEOHEIGHT * aspect_ratio;
  let SOURCELEFT = (VIDEOWIDTH - SOURCEWIDTH) / 2;
  let SOURCETOP = 0;
  let SOURCEHEIGHT = VIDEOHEIGHT;

  let copyVideoFrame = function (timestamp) {
    cameraCanvasContext.drawImage(video, SOURCELEFT, SOURCETOP, SOURCEWIDTH, SOURCEHEIGHT, 0, 0, cameraCanvas.width, cameraCanvas.height);

    const frame = cameraCanvasContext.getImageData(0, 0, cameraCanvas.width, cameraCanvas.height);
    let now = Date.now();
    savedFramesBuffer.push([frame, timestamp, now]);
    if (now - savedFramesBuffer[0][2] >= bufferTimeThreshold) {
      savedFramesBuffer.shift();
    }

    if (pauseCamera) {
      return;
    }
    requestAnimationFrame(copyVideoFrame);
  }
  requestAnimationFrame(copyVideoFrame);
}

function stopStream() {
  stream.getTracks().forEach(track => track.stop());
  video.removeEventListener("loadedmetadata", startVideoCopy);
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
      min: 24,
      ideal: 60,
      max: 120,
    }
  });
  video.addEventListener("loadedmetadata", startVideoCopy, false);

  initMicrophone(stream);

  video.srcObject = stream;
  video.play()

  previewVideo.srcObject = stream;
  previewVideo.play()

  video.style.display = 'none';

  switchVideoVisibility();
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


function initMicrophone(stream) {

  audioContext = new AudioContext();

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

  var bufferLength = analyser_node.frequencyBinCount;

  console.log("buffer_length " + bufferLength);
  console.log("sample rate = ", audioContext.sampleRate);
  let frequencyBinSize = (audioContext.sampleRate / 2) / bufferLength;
  console.log("freqBinSize = ", frequencyBinSize);
  let nonEmptySlots = bufferLength - Math.floor(thresholdFrequency / frequencyBinSize);
  console.log("non empty = ", nonEmptySlots);

  var buffer = [];
  let baseThreshold = 10;
  var max = 0;
  var avgSum = 0;
  var avgCount = 0;
  var avgAudioValue = 0;

  var analyzeAudio = function () {
    if (pauseCamera) {
      return;
    }
    requestAnimationFrame(analyzeAudio);

    let array_freq_domain = new Uint8Array(bufferLength);
    analyser_node.getByteFrequencyData(array_freq_domain);

    if (microphone_stream.playbackState == microphone_stream.PLAYING_STATE) {
      let s = array_freq_domain.reduce((acc, v) => v + acc);

      let currentTime = Date.now();
      buffer.push([s, currentTime]);
      if (buffer[buffer.length - 1][1] - buffer[0][1] > bufferTimeThreshold) {
        buffer.shift()
      }
      // Update avg value
      avgSum += s;
      avgCount += 1;
      avgAudioValue = avgSum / avgCount;

      if ((s / avgAudioValue) > baseThreshold * (sensitivityThreshold / 1000)) {
        if (saveTimeout != null && currentTime - saveTimeout[1] < peakTime) {
          console.log("Clear video save");
          clearTimeout(saveTimeout[0]);
        } else if (currentTime - lastSaveTime > bufferTimeThreshold) {
          console.log("Potential save");
          lastSaveTime = currentTime;
          let event = setTimeout(() => {
            console.log("Save video");
            saveVideo();
          }, saveWaitTime);
          saveTimeout = [event, lastSaveTime];
        }
      }

      spectogramCtx.clearRect(0, 0, WIDTH, HEIGHT);
      spectogramCtx.fillStyle = "rgb(200, 200, 200)";
      spectogramCtx.fillRect(0, 0, WIDTH, HEIGHT);
      spectogramCtx.lineWidth = 2;
      spectogramCtx.strokeStyle = "rgb(0, 0, 0)";
      spectogramCtx.beginPath();

      max = Math.max(
        buffer.reduce((acc, v) => Math.max(acc, v[0]), 0),
        max
      );
      spectogramCtx.fillStyle = "rgb(0, 0, 0)";
      spectogramCtx.fillText(`${max}`, 0, 0);
      spectogramCtx.fillText(`${Math.round(avgAudioValue)}`, 50, 0);

      let firstTimestamp = buffer[0][1];
      for (let i = 1; i < buffer.length; i += 1) {
        let x = ((buffer[i][1] - firstTimestamp) / bufferTimeThreshold) * WIDTH;
        let v = buffer[i][0];
        let y = HEIGHT - (v / max) * HEIGHT;
        if (i === 1) {
          spectogramCtx.moveTo(x, y);
        } else {
          spectogramCtx.lineTo(x, y);
        }

        if ((v / avgAudioValue) > baseThreshold * (sensitivityThreshold / 1000)) {
          spectogramCtx.fillText(`${v}`, x * 1.01, y * 0.95);
        }
      }

      spectogramCtx.stroke();

      spectogramCtx.lineWidth = 4;
      spectogramCtx.strokeStyle = "rgb(0, 0, 255)";
      spectogramCtx.beginPath();
      // v/a > b*a
      let triggerThreshold = (baseThreshold * (sensitivityThreshold / 1000)) * avgAudioValue;
      let yTriggerThreshold = (HEIGHT - (triggerThreshold / max) * HEIGHT);
      spectogramCtx.moveTo(0, yTriggerThreshold);
      spectogramCtx.lineTo(WIDTH, yTriggerThreshold);
      spectogramCtx.stroke();
    }

  }
  analyzeAudio();
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
