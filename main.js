var data = [];
var started = false;
var log = msg => console.log(msg); // document.querySelector("#logdiv").innerHTML += "<br>" + msg;

navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
  .then(async (stream) => {
    const delay = 2000;
    const mimeType = `video/webm; codecs="vp9"`;
    const mediaSource = new MediaSource();
    var video = document.querySelector("video");
    video.src = URL.createObjectURL(mediaSource);
    await new Promise((res) =>
      mediaSource.addEventListener("sourceopen", res, { once: true })
    );
    const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = async ({ data }) => {
      if (mediaSource.readyState !== "open" || !data.size) {
        return;
      }
      sourceBuffer.appendBuffer(await data.arrayBuffer());
    };
    sourceBuffer.addEventListener("updateend", ()=>{
      if (
          video.buffered.length &&
          video.buffered.end(0) - video.buffered.start(0) > 35
      )
      {
          // Can't remove if video is short
          sourceBuffer.remove(0, video.buffered.end(0) - 35)
          log("REMOVED");
      }
    });
    video.pause();
    recorder.start(50);
    setTimeout(() => video.play(), delay);
  })
  .catch(log);

