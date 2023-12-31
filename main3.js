var data = [];
var started = false;
var log = msg => console.log(msg);


var recorder = null;

const delay_input = document.querySelector("#delayseconds");
const delay_value = document.querySelector("#delayvalue");
delay_value.textContent = delay_input.value;
delay_input.addEventListener("input", (event) => {
  delay_value.textContent = event.target.value;
});

function switchVideoVisibility() {
  var video = document.querySelector("video");
  var videoloader = document.querySelector("#videoloader");

  let style = window.getComputedStyle(video);
  let is_hidden = style.display === "none";

  // Switch visibility
  videoloader.style.display = is_hidden ? "none" : "block";
  video.style.display = is_hidden ? "block" : "none";
}

var deadlineTimeout = null;
var delay_seconds = parseInt(delay_input.value);

function restartVideo(){
  switchVideoVisibility();

  var video = document.querySelector("video");
  video.pause();
  recorder.stop();

  log(delay_seconds);
  startRecording(delay_seconds);
}
delay_input.addEventListener("change", (event) => {
  if(recorder) {
    if(deadlineTimeout){
      clearTimeout(deadlineTimeout);
    }
    deadlineTimeout = setTimeout(()=>{
      delay_seconds = parseInt(event.target.value);
      restartVideo();
    }, 2000);
  }
});

var last_video_time = null;
setInterval(()=> {
  var video = document.querySelector("video");
  if(video.paused) {
    return;
  }
  if(last_video_time == null){
    last_video_time = video.currentTime;
    return;
  }
  let new_time = video.currentTime;
  if(new_time >= last_video_time && new_time - last_video_time < 0.1 && new_time > 0) {
      log(`RESTART = ${new_time} - ${last_video_time}`);
      restartVideo();
  }
  last_video_time = new_time;

}, 1000)



let window_height = document.querySelector("#videocontainer").clientHeight;
let window_width = document.querySelector("#videocontainer").clientWidth;
console.log(window_height, window_width);
let aspect_ratio = window_width / window_height;

async function startRecording(delaySeconds) {
  let delay = delaySeconds * 1000
  let stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      aspectRatio: {exact: aspect_ratio},
      // min: 24,  // very important to define min value here
      // ideal: 24,
      // max: 25,
    }
  });
  const mimeType = `video/webm; codecs="vp9"`;
  const mediaSource = new MediaSource();
  var video = document.querySelector("video");
  video.src = URL.createObjectURL(mediaSource);
  await new Promise((res) =>
    mediaSource.addEventListener("sourceopen", res, { once: true })
  );
  const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
  sourceBuffer.mode = "sequence";
  recorder = new MediaRecorder(stream, { mimeType });
  recorder.ondataavailable = async ({ data }) => {
    if (mediaSource.readyState !== "open" || !data.size) {
      return;
    }
    try {
      sourceBuffer.appendBuffer(await data.arrayBuffer());
    } catch (error) {
      console.error(error);
      log("sourcebuffer appendbuffer error. RESTART");
      restartVideo();
    }
  };
  // sourceBuffer.addEventListener("update", () => {
  //   if (
  //     video.buffered.length &&
  //     video.buffered.end(0) - video.buffered.start(0) > 35
  //   ) {
  //     let diff = video.buffered.end(0) - video.buffered.start(0);
  //     // Can't remove if video is short
  //     try {
  //       sourceBuffer.remove(0, video.buffered.end(0) - 35)
  //     } catch (error) {
  //       console.error(error);
  //       log("sourcebuffer appendbuffer error. RESTART");
  //       restartVideo();
  //     }
  //   }
  // });
  video.pause();
  recorder.start(50);
  setTimeout(() => {
    video.play()
    switchVideoVisibility();
  }, delay);
}

startRecording(parseInt(delay_input.value)).then(()=> {}).catch(log);
