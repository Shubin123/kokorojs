import {
  log,
  readTextFile,
  encodeWAV,
  phonemizeAndTokenize,
  createDownloadButton,
  cacheModelChunks,
  cacheEntireModel,
} from "./helpers.js";

const audioCtx = new (window.AudioContext || window.wexbkitAudioContext)();
const susresBtn = document.getElementById("susresBtn");
const userText = document.getElementById("userText");
const cacheOverride = document.getElementById("cacheOverride");
const modelChunksDir = "./model/model_quantized.onnx"; // Directory containing model chunks use ./kokoro-v0_19_chunks.onnx if your using modelVersion = 0.
const cacheEntire = true;
const modelVersion = 1; // either 0 or 1
const inputKeys = ["tokens", "input_ids"]; //will be one of these
const outputKeys = ["audio", "waveform"];

let combinedBuffer; // when we rerun main dont recreate this

async function main() {
  if (!cacheEntire) {
    combinedBuffer = await cacheModelChunks(modelChunksDir);
  } else {
    combinedBuffer = await cacheEntireModel(modelChunksDir);
  }

  // Create a new session and load the model
  const session = await ort.InferenceSession.create(combinedBuffer);
  log("model loaded");
  const text = userText.value;
  const tokens = await phonemizeAndTokenize(text, "en"); // token count does not conform to kokoro.py (when delimiters are used) more testing needed.
  log(`tokens (${tokens.length}): ${tokens}`); //input_text->phenomizer->tokenize
  const voiceSelection = document.querySelector("#voices");
  const selectedVoice = voiceSelection[voiceSelection.selectedIndex].value;
  log(`selectedVoice : (${selectedVoice})`); //voice tensor
  const styleData = await readTextFile(
    `./voices_json/${selectedVoice}.json`,
    cacheOverride
  );
  const style = new Float32Array(styleData[tokens.length][0]);
  log(`style: ${style}`);

  let results = null;

  if (Array.isArray(tokens[0])) {
    // If tokens is an array of arrays, loop through each set of tokens
    let combinedAudio = [];
    for (const tokenSet of tokens) {
      const feeds = {
        [inputKeys[modelVersion]]: new ort.Tensor("int64", tokenSet, [
          1,
          tokenSet.length,
        ]),
        style: new ort.Tensor("float32", style, [1, style.length]),
        speed: new ort.Tensor("float32", [1]),
      };
      const result = await session.run(feeds);
      console.log(result);
      combinedAudio = combinedAudio.concat(
        Array.from(result[outputKeys[modelVersion]].cpuData)
      );
    }
    results = { audio: { cpuData: new Float32Array(combinedAudio) } };
  } else {
    // If tokens is a single array
    const style = new Float32Array(styleData[tokens.length][0]);
    const feeds = {
      [inputKeys[modelVersion]]: new ort.Tensor("int64", tokens, [
        1,
        tokens.length,
      ]),
      style: new ort.Tensor("float32", style, [1, style.length]),
      speed: new ort.Tensor("float32", [1]),
    };
    results = await session.run(feeds);
  }

  if (results == null) {
    log("generation failed");
    throw new Error("Failed to generate audio results.");
  }
  log(results);
  // // Get the length in samples for the audio
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

  log("done");
  susresBtn.style.display = true;
}

susresBtn.onclick = async function () {
  await audioCtx.resume().then(function () {
    main();
  });
};
