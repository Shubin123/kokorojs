// import eSpeakNG from "espeak";
import {log,readTextFile,encodeWAV,phonemizeAndTokenize,createDownloadButton,fetchAndCombineChunks } from "./helpers.js"



const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const susresBtn = document.getElementById("susresBtn");
const userText = document.getElementById("userText");
const outputBox = document.getElementById("outputBox");

async function main() {
  // try {
    log("main")

//   const modelUrl = "./kokoro-v0_19_chunks"; <---use this directory
  
    
  const modelChunksDir = "./kokoro-v0_19_chunks"; // Directory containing model chunks
  let combinedBuffer;
  
  if ("caches" in window) {
    log("Cache enabled");
    const cacheName = "onnx-model-cache";
    const cache = await caches.open(cacheName);
  
    // Check if combined model buffer is cached
    const cachedResponse = await cache.match(modelChunksDir);
    if (cachedResponse) {
      log("Using cached model");
      combinedBuffer = await cachedResponse.arrayBuffer();
    } else {
      log("Fetching model chunks and caching combined buffer");
      combinedBuffer = await fetchAndCombineChunks(modelChunksDir);
      // Create a Response object with the combined buffer and cache it
      const response = new Response(combinedBuffer);
      await cache.put(modelChunksDir, response);
    }
  } else {
    log("Cache disabled");
    // Fetch the model chunks and combine them
    combinedBuffer = await fetchAndCombineChunks(modelChunksDir);
  }
  
  // Create a new session and load the model
  const session = await ort.InferenceSession.create(combinedBuffer);


//   document.body.appendChild(document.createTextNode("model loaded "));
    outputBox.appendChild(document.createTextNode("model loaded "));
    outputBox.appendChild(document.createElement("br"));
  
  const text = userText.value;

  const tokens = await phonemizeAndTokenize(text, "en"); // token count does not conform to kokoro.py (when delimiters are used) more testing needed.
  
  const voiceSelection = document.querySelector('#voices');
  const selectedVoice = voiceSelection[voiceSelection.selectedIndex].value;
  log(selectedVoice);
  const data = await readTextFile(`./voices_json/${selectedVoice}.json`);

  // log(data.length);
  // log(data[0].length)
  // log(data[tokens.length][0]);
  log(tokens);

  const style = new Float32Array(data[tokens.length][0]);
  // log(style)

  // log("Tokens:", tokens.length);

  // prepare feeds. use model input names as keys.
  const feeds = {
    tokens: new ort.Tensor("int64", tokens, [1, tokens.length]),
    style: new ort.Tensor("float32", style, [1, style.length]),
    speed: new ort.Tensor("float32", [1]),
  };
  const results = await session.run(feeds); // this is now an audio buffer
  // log(results);

  // Get the length in samples for the audio
  const originalLength = results.audio.cpuData.length;

  // Calculate the sample offset for the start and end
  const sampleRate = 24000;
  const startCut = 0.0 * sampleRate; // seconds * sampleRate
  const endCut = 0.0 * sampleRate;

  // Ensure we don't go out of bounds
  const endIndex = originalLength - endCut;
  const length = endIndex - startCut;

  if (length > 0 && startCut < endIndex) {
    log("wow");
    const slicedAudio = results.audio.cpuData.slice(startCut, endIndex);

    // Create a new AudioBuffer to hold the cut audio
    const buffer = audioCtx.createBuffer(1, slicedAudio.length, sampleRate);

    // Copy the sliced audio data into the new AudioBuffer
    buffer.copyToChannel(slicedAudio, 0);

    // Create a source to play the audio
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);

    // Start playing the audio
    source.start();

    // const wavData = WAVEncoder.encode({
    //     sampleRate: buffer.sampleRate,
    //     channelData: [buffer.getChannelData(0)]
    // });

    log(buffer.sampleRate);
    const wavBuffer = encodeWAV(buffer.getChannelData(0), buffer.sampleRate);

    // Create a Blob from the WAV data
    // const blob = new Blob([wavData], { type: 'audio/wav' });

    // Create a download link for the WAV file
    // download(wavBuffer, "output.wav", "audio/wav");
    createDownloadButton(wavBuffer, "output.wav", "audio/wav")
  } else {
    console.error(
      "Invalid audio slice parameters. Check that the start and end positions are correct."
    );
  }


  outputBox.appendChild(document.createTextNode("done! "));

  susresBtn.style.display = true;
}


susresBtn.onclick = async function () {

    await audioCtx.resume().then(function () {
      main();
      // log(userText.value);

      outputBox.appendChild(document.createTextNode("started"));
      outputBox.appendChild(document.createElement("br"));

      // susresBtn.style.display = false;
    });
  
};
