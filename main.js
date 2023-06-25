if (true) {
    var data = [];
    var started = false;
    var log = msg => div.innerHTML += "<br>" + msg;

    var start = ms => navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "user" }} })
        .then(async (stream) => {
            const delay = 6000;
              const mimeType = `video/webm; codecs="vp8"`;
              const mediaSource = new MediaSource();
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
              video.pause();
              recorder.start(50);
              setTimeout(() => video.play(), delay);
            if(false){
            started = true;
            setInterval(()=>{
                if (!started || data.length == 0) {
                    return;
                }
                //log(`data len = ${data.length}`);
                recording = data;
                video.src = link.href = URL.createObjectURL(new Blob(recording));
                link.download = "recording.webm";
                link.innerHTML = "Download recording";
                data.length = 1;
                //log("Playing recording");
            }, 1200);
            record(stream, ms)
        }
        })
        .catch(log);


    start(5000)
    var record = (stream, ms) => {
      var rec = new MediaRecorder(stream);
      rec.ondataavailable = e => {
          console.log("data");
          data.push(e.data);
      };
      rec.start(500);
      log(rec.state + " for "+ (ms / 1000) +" seconds...");
    };


    // var stop = stream => stream.getTracks().forEach(track => track.stop());
    // var wait = ms => new Promise(resolve => setTimeout(resolve, ms));
}
if (false) {
    var start = ms => navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => record(stream, ms)
        .then(recording => {
          stop(stream);
          video.src = link.href = URL.createObjectURL(new Blob(recording));
          link.download = "recording.webm";
          link.innerHTML = "Download recording";
          log("Playing "+ recording[0].type +" recording:");
        })
        .catch(log).then(() => stop(stream)))
      .catch(log);

    var record = (stream, ms) => {
      var rec = new MediaRecorder(stream), data = [];
      rec.ondataavailable = e => {
          console.log("data");
          data.push(e.data);
      }
      rec.start();
      log(rec.state + " for "+ (ms / 1000) +" seconds...");
      var stopped = new Promise((y, n) => (rec.onstop = y, rec.onerror = e => n(e.error || e.name)));
      return Promise.all([stopped, wait(ms).then(() => rec.stop())])
        .then(() => data);
    };

    var stop = stream => stream.getTracks().forEach(track => track.stop());
    var wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    var log = msg => div.innerHTML += "<br>" + msg;
}
