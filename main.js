// Constants
const bufferTimeThreshold = 4000;
const saveWaitTime = 1500;
const peakTime = 1000;
const canvasPixels = 720;
// const canvasPixels = 120;

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


function getAspectRatio() {
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

  let saveVideoCanvas = document.querySelector("#saveVideoCanvas")
  saveVideoCanvas.style.display = "block";
  saveVideoCanvas.width = canvasPixels * getAspectRatio();
  saveVideoCanvas.height = canvasPixels;
  let saveVideoCanvasContext = saveVideoCanvas.getContext("2d", { willReadFrequently: true });
  saveVideoCanvasContext.imageSmoothingEnabled = false;
  saveVideoCanvasContext.textBaseline = "top";
  saveVideoCanvasContext.font = "22px serif";

  let VIDEOWIDTH = this.videoWidth;
  let VIDEOHEIGHT = this.videoHeight;

  let SOURCEWIDTH = VIDEOHEIGHT * aspect_ratio;
  let SOURCELEFT = (VIDEOWIDTH - SOURCEWIDTH) / 2;
  let SOURCETOP = 0;
  let SOURCEHEIGHT = VIDEOHEIGHT;
  let rollAvg = [];
  let WIDTH = spectogramEl.width;
  let HEIGHT = spectogramEl.height;
  var max = 0;
  var paths = [];

  let copyVideoFrame = function (timestamp) {
    cameraCanvasContext.drawImage(video, SOURCELEFT, SOURCETOP, SOURCEWIDTH, SOURCEHEIGHT, 0, 0, cameraCanvas.width, cameraCanvas.height);

    const frame = cameraCanvasContext.getImageData(0, 0, cameraCanvas.width, cameraCanvas.height);
    let now = Date.now();
    savedFramesBuffer.push([frame, timestamp, now]);
    if (now - savedFramesBuffer[0][2] >= bufferTimeThreshold) {
      savedFramesBuffer.shift();
    }

    const diffImageData = saveVideoCanvasContext.createImageData(frame);
    let dind = Math.max(savedFramesBuffer.length-8, 0);
    let pdata = savedFramesBuffer[dind][0].data;
    let data = frame.data;
    let diffdata = diffImageData.data;
    var whitePixels = 0;
    var avx = 0;
    var avy = 0;
    var countP = 0;
    for (let index = 0; index < frame.data.length; index += 4) {
      let grey = (data[index] + data[index + 1] + data[index + 2]) / 3;
      let grey2 = (pdata[index] + pdata[index + 1] + pdata[index + 2]) / 3;
      let pred = Math.abs(grey-grey2) > 80;
      grey = pred? 255: 0;

      whitePixels += pred?1: 0;
      // let d = Math.abs(data[index]-data[index+1]) + Math.abs(data[index]-data[index+2]);
      // let grey = (d < 20) ? 255:0;
      diffdata[index + 0] = grey;
      diffdata[index + 1] = grey;
      diffdata[index + 2] = grey;
      diffdata[index + 3] = data[index + 3];

      if(pred){
        avx += (index/4) % diffImageData.width;
        avy += Math.floor((index/4) / diffImageData.width);
        countP += 1;
      }

    }
    avx = avx /countP;
    avy = avy /countP;

    whitePixels = whitePixels > (diffdata.length/4)*0.2? 0 : whitePixels;
    rollAvg.push([whitePixels, now]);
    paths.push([avx, avy]);
    if (rollAvg[rollAvg.length - 1][1] - rollAvg[0][1] > bufferTimeThreshold) {
      rollAvg.shift()
      paths.shift()
    }
    saveVideoCanvasContext.clearRect(0, 0, saveVideoCanvas.width, saveVideoCanvas.height);

    // let avgWhite = rollAvg.reduce((acc, v) => acc+v, 0) / rollAvg.length;
    saveVideoCanvasContext.putImageData(diffImageData, 0, 0);
    // saveVideoCanvasContext.fillStyle = "rgb(255, 0, 0)";
    // saveVideoCanvasContext.fillText(`${avgWhite}`, 50, 50);
    let nm = rollAvg.reduce((acc, v) => Math.max(acc, v[0]), 0);
    nm = nm > (diffdata.length/4)*0.2? 0 : nm;
    max = Math.max(
      nm,
      max
    );

    saveVideoCanvasContext.fillStyle = "red";
    saveVideoCanvasContext.lineWidth = 2;
    saveVideoCanvasContext.strokeStyle = "rgb(255, 0, 0)";
    saveVideoCanvasContext.beginPath()
    let n = 10;
    for(let i=0; i< paths.length; i+=1){
      let x = paths[i][0];
      let y = paths[i][1];
      if (i === 0) {
        saveVideoCanvasContext.moveTo(x, y);
      } else {
        saveVideoCanvasContext.lineTo(x, y);
      }
    }
    saveVideoCanvasContext.stroke()

    // saveVideoCanvasContext.arc(avx, avy, 10, 0, 2 * Math.PI);
    // saveVideoCanvasContext.fill()


    spectogramCtx.clearRect(0, 0, WIDTH, HEIGHT);
    spectogramCtx.lineWidth = 2;
    spectogramCtx.strokeStyle = "rgb(0, 255, 0)";
    spectogramCtx.beginPath();
    let firstTimestamp = rollAvg[0][1];
    for (let i = 1; i < rollAvg.length; i += 1) {
      let x = ((rollAvg[i][1] - firstTimestamp) / bufferTimeThreshold) * WIDTH;
      let v = rollAvg[i][0];
      let y = HEIGHT - (v / max) * HEIGHT;
      if (i === 1) {
        spectogramCtx.moveTo(x, y);
      } else {
        spectogramCtx.lineTo(x, y);
      }
    }
    spectogramCtx.stroke();

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
  // stream = await navigator.mediaDevices.getUserMedia({
  //   audio: true,
  //   video: {
  //     facingMode: "user",
  //     min: 24,
  //     ideal: 60,
  //     max: 120,
  //   }
  // });
  video.addEventListener("loadedmetadata", startVideoCopy, false);


  // video.srcObject = stream;
  imageFile = "IMG_0237_SHORT.MOV"
  video.src = imageFile;
  video.loop = true;
  video.muted = false;
  video.playbackRate = 1.0 // 0.5
  video.play();

  // previewVideo.srcObject = stream;
  previewVideo.src = imageFile;
  previewVideo.play()

  stream = video.captureStream ?video.captureStream():video.mozCaptureStream();
  let ctx = new AudioContext();
  var source = ctx.createMediaElementSource(video);
  var stream_dest = ctx.createMediaStreamDestination();
  source.connect(stream_dest);

  // stream = stream_dest.stream;
  // initMicrophone(stream_dest.stream);

  video.style.display = 'none';

  switchVideoVisibility();
}

function startStream() {
  console.log("PLAY");
  let d = document.querySelector("#startmessage");
  d.style.display = 'none';
  start_stream()
    .then((r) => console.log(r))
    // .catch((err) => console.error(err));
}

document.querySelector("#startmessage").addEventListener("click", async () => {
  startStream();
});

if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  console.log("Auto start due to localhost");
  // startStream();
}

let spectogramEl = document.getElementById("spectogram");
let spectogramCtx = spectogramEl.getContext("2d");

function initMicrophone(stream) {

  audioContext = new AudioContext();

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
            // saveVideo();
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
