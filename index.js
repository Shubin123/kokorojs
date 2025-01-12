// import eSpeakNG from "espeak";
import {
  log,
  readTextFile,
  encodeWAV,
  phonemizeAndTokenize,
  createDownloadButton,
  fetchAndCombineChunks,
} from "./helpers.js";

const audioCtx = new (window.AudioContext || window.wexbkitAudioContext)();
const susresBtn = document.getElementById("susresBtn");
const userText = document.getElementById("userText");
const outputBox = document.getElementById("outputBox");
const cacheOverride = document.getElementById("cacheOverride");
let combinedBuffer; // when we rerun main dont recreate this

async function main() {
  // try {
  log("main");
  //   const modelUrl = "./kokoro-v0_19_chunks"; <---use this directory

  const modelChunksDir = "./kokoro-v0_19_chunks"; // Directory containing model chunks
  
  if (!combinedBuffer) {
  if ("caches" in window && !cacheOverride.checked) {
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
  }

  // Create a new session and load the model
  const session = await ort.InferenceSession.create(combinedBuffer);

  //   document.body.appendChild(document.createTextNode("model loaded "));
  outputBox.appendChild(document.createTextNode("model loaded "));
  outputBox.appendChild(document.createElement("br"));

  const text = userText.value;

  const tokens = await phonemizeAndTokenize(text, "en"); // token count does not conform to kokoro.py (when delimiters are used) more testing needed.


  log(`tokens (${tokens.length}): ${tokens}`); //input_text->phenomizer->tokenize

  
  
  const voiceSelection = document.querySelector("#voices");
  const selectedVoice = voiceSelection[voiceSelection.selectedIndex].value;
  log(`selectedVoice (voiceSelection.selectedIndex): (${selectedVoice})`); //voice tensor
  const data = await readTextFile(`./voices_json/${selectedVoice}.json`, cacheOverride);

  const style = new Float32Array(data[tokens.length][0]); 

  
  log(`style: ${style}`); 
  

  // const feeds = {
  //   tokens: new ort.Tensor("int64", tokens, [1, tokens.length]),
  //   style: new ort.Tensor("float32", style, [1, style.length]),
  //   speed: new ort.Tensor("float32", [1]),
  // };
  // const results = await session.run(feeds); // this is now an audio buffer
  // // log(results);


  let results = null;

  if (Array.isArray(tokens[0])) {
    // If tokens is an array of arrays, loop through each set of tokens
    let combinedAudio = [];
    for (const tokenSet of tokens) {
      const style = new Float32Array(data[tokenSet.length][0]);
      const feeds = {
        tokens: new ort.Tensor("int64", tokenSet, [1, tokenSet.length]),
        style: new ort.Tensor("float32", style, [1, style.length]),
        speed: new ort.Tensor("float32", [1]),
      };
      const result = await session.run(feeds);
      combinedAudio = combinedAudio.concat(Array.from(result.audio.cpuData));
    }
    results = { audio: { cpuData: new Float32Array(combinedAudio) } };
  } else {
    // If tokens is a single array
    const style = new Float32Array(data[tokens.length][0]);
    const feeds = {
      tokens: new ort.Tensor("int64", tokens, [1, tokens.length]),
      style: new ort.Tensor("float32", style, [1, style.length]),
      speed: new ort.Tensor("float32", [1]),
    };
    results = await session.run(feeds);
  }
  
  if (results == null) 
  {
    throw new Error("Failed to generate audio results.");
  }



  
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

    const wavBuffer = encodeWAV(buffer.getChannelData(0), buffer.sampleRate);
    createDownloadButton(wavBuffer, "output.wav", "audio/wav");
  } else {
    console.error(
      "Invalid audio slice parameters. Check that the start and end positions are correct."
    );
  }

  outputBox.appendChild(document.createTextNode("done!"));
  outputBox.appendChild(document.createElement("br"));

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
