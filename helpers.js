import eSpeakNG from "espeak";

const LOGGER = true;
const outputBox = document.getElementById("outputBox");
const additionalLog = document.getElementById("additionalLog");
const cacheOverride = document.getElementById("cacheOverride");
const totalChunks = 5; // on the website we split into 5 chunks
export async function readTextFile(file, cacheOverride) {
  console.log(!cacheOverride.checked);
  if ("caches" in window && !cacheOverride.checked) {
    const cache = await caches.open("json-cache");
    const cachedResponse = await cache.match(file);
    if (cachedResponse) {
      return await cachedResponse.json();
    }

    const response = await fetch(file);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json(); // assuming it's a JSON file
    cache.put(file, new Response(JSON.stringify(data))); // Cache the JSON data
    return data; // Return the JSON data when the file is successfully loaded
  } else {
    const response = await fetch(file);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json(); // assuming it's a JSON file
    return data; // Return the JSON data when the file is successfully loaded
  }
}

export const VOCAB = (() => {
  const _pad = "$";
  const _punctuation = ";:,.!?¡¿—…«»“” ";
  const _letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const _lettersIPA =
    "ɑɐɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸθœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑʼʴʰʱʲʷˠˤ˞↓↑→↗↘'̩'ᵻ";
  const symbols = [_pad, ..._punctuation, ..._letters, ..._lettersIPA];
  const vocabMap = {};
  symbols.forEach((symbol, idx) => (vocabMap[symbol] = idx));
  return vocabMap;
})();

export function splitNum(num) {
  num = num[0];
  if (num.includes(".")) {
    return num;
  } else if (num.includes(":")) {
    let [h, m] = num.split(":").map(Number);
    if (m === 0) {
      return `${h} o'clock`;
    } else if (m < 10) {
      return `${h} oh ${m}`;
    }
    return `${h} ${m}`;
  }
  let year = parseInt(num.slice(0, 4));
  if (year < 1100 || year % 1000 < 10) {
    return num;
  }
  let left = num.slice(0, 2);
  let right = parseInt(num.slice(2, 4));
  let s = num.endsWith("s") ? "s" : "";
  if (100 <= year % 1000 && year % 1000 <= 999) {
    if (right === 0) {
      return `${left} hundred${s}`;
    } else if (right < 10) {
      return `${left} oh ${right}${s}`;
    }
  }
  return `${left} ${right}${s}`;
}

export function flipMoney(m) {
  m = m[0];
  let bill = m[0] === "$" ? "dollar" : "pound";
  if (isNaN(m[m.length - 1])) {
    return `${m.slice(1)} ${bill}s`;
  } else if (!m.includes(".")) {
    let s = m.slice(1) === "1" ? "" : "s";
    return `${m.slice(1)} ${bill}${s}`;
  }
  let [b, c] = m.slice(1).split(".");
  let s = b === "1" ? "" : "s";
  c = parseInt(c.padEnd(2, "0"));
  let coins =
    m[0] === "$" ? `cent${c === 1 ? "" : "s"}` : c === 1 ? "penny" : "pence";
  return `${b} ${bill}${s} and ${c} ${coins}`;
}

export function pointNum(num) {
  let [a, b] = num[0].split(".");
  return `${a} point ${b.split("").join(" ")}`;
}

export function normalizeText(text) {
  text = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/«/g, '"')
    .replace(/»/g, '"')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\(/g, "«")
    .replace(/\)/g, "»");
  for (let [a, b] of Object.entries({
    "、": ",",
    "。": ".",
    "！": "!",
    "，": ",",
    "：": ":",
    "；": ";",
    "？": "?",
  })) {
    text = text.replace(new RegExp(a, "g"), b + " ");
  }
  text = text
    .replace(/[^\S\n]/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/(?<=\n) +(?=\n)/g, "")
    .replace(/\bD[Rr]\.(?= [A-Z])/g, "Doctor")
    .replace(/\b(?:Mr\.|MR\.(?= [A-Z]))/g, "Mister")
    .replace(/\b(?:Ms\.|MS\.(?= [A-Z]))/g, "Miss")
    .replace(/\b(?:Mrs\.|MRS\.(?= [A-Z]))/g, "Mrs")
    .replace(/\betc\.(?! [A-Z])/g, "etc")
    .replace(/\b(y)eah?\b/gi, "$1e'a")
    .replace(
      /\d*\.\d+|\b\d{4}s?\b|(?<!:)\b(?:[1-9]|1[0-2]):[0-5]\d\b(?!:)/g,
      splitNum
    )
    .replace(/(?<=\d),(?=\d)/g, "")
    .replace(
      /[$£]\d+(?:\.\d+)?(?: hundred| thousand|(?:billion|million|trillion))*\b|[$£]\d+\.\d\d?\b/g,
      flipMoney
    )
    .replace(/\d*\.\d+/g, pointNum)
    .replace(/(?<=\d)-(?=\d)/g, " to ")
    .replace(/(?<=\d)S/g, " S")
    .replace(/(?<=[BCDFGHJ-NP-TV-Z])'?s\b/g, "'S")
    .replace(/(?<=X')S\b/g, "s")
    .replace(/(?:[A-Za-z]\.){2,} [a-z]/g, (m) => m.replace(/\./g, "-"))
    .replace(/(?<=[A-Z])\.(?=[A-Z])/g, "-");
  return text.trim();
}

export function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  const floatTo16BitPCM = (output, offset, input) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  };

  writeString(view, 0, "RIFF");
  view.setUint32(4, 32 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);

  return buffer;
}

// Tokenize Using VOCAB
export function tokenize(text) {
  return text
    .split("")
    .map((char) => VOCAB[char] || null)
    .filter((idx) => idx !== null)
    .map((idx) => idx + 1);
}

// Main Phonemization Function
export async function phonemizeAndTokenize(text, language = "en") {
  // Normalize Text
  const normalizedText = normalizeText(text);

  // using espeak-ng service worker
  const espeak = await eSpeakNG({
    arguments: [
      "--phonout",
      "generated",
      '--sep=""',
      "-q",
      "-b=1",
      `--ipa=3`,
      "-v",
      "en-us", // en-gb and en-us is our only other option for accents right now
      text,
    ],
  });
  // log(espeak)
  // ESpeakNg is compiled with FS support so you can read its output.
  const phonemes = await espeak.FS.readFile("generated", {
    encoding: "utf8",
  });

  // Tokenize Phonemes
  let tokens = tokenize(phonemes);
  const tokenChunks = []; // used if tokens too long.

  // Ensure token count does not exceed 510
  log(
    `if token count ${tokens.length} exceeds 510, split into chunks of 510 tokens.`
  );
  const chunkSize = 510;
  for (let i = 0; i < tokens.length; i += chunkSize) {
    tokenChunks.push(tokens.slice(i, i + chunkSize));
  }
  tokens = tokenChunks;

  return tokens;
}

export function download(data, filename, type) {
  log("download started");
  var file = new Blob([data], { type: type });
  if (window.navigator.msSaveOrOpenBlob)
    // IE10+
    window.navigator.msSaveOrOpenBlob(file, filename);
  else {
    // Others
    var a = document.createElement("a"),
      url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  }
}

export function createDownloadButton(blob, filename, type) {
  const button = document.getElementById("downloadBtn");
  button.disabled = false;
  // button.textContent = "Download Audio";
  button.onclick = () => download(blob, filename, type);
  // document.body.appendChild(button);
}

export async function fetchAndCombineChunks(chunksDir) {
  log("Fetching chunks from:", chunksDir);

  // List chunk files (assumes sequential naming like `chunk_0.bin`, `chunk_1.bin`, etc.)
  const chunkUrls = [];
  let index = 0;

  // Try fetching chunks sequentially until one fails
  while (index < totalChunks) {
    const chunkUrl = `${chunksDir}/chunk_${index}.bin`;
    try {
      log(`Fetching: ${chunkUrl}`);
      const response = await fetch(chunkUrl);
      if (!response.ok) throw new Error(`Chunk ${index} not found`);
      chunkUrls.push(response);
      index++;
    } catch {
      // Assume no more chunks exist when a chunk fetch fails
      log(`No more chunks after chunk_${index - 1}.`);
      break;
    }
  }

  // Combine all the chunks into a single ArrayBuffer
  const chunks = await Promise.all(
    chunkUrls.map(async (res) => res.arrayBuffer())
  );
  const totalSize = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
  const combined = new Uint8Array(totalSize);

  let offset = 0;
  for (const chunk of chunks) {
    combined.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }

  log(`Successfully combined ${index} chunks into a single buffer`);
  return combined.buffer; // Return the final ArrayBuffer
}

export async function cacheModelChunks(modelChunksDir) {
  if ("caches" in window && !cacheOverride.checked) {
    log("Cache enabled");
    const cacheName = "onnx-model-chunks-cache";
    const cache = await caches.open(cacheName);
    // Check if combined model buffer is cached
    const cachedResponse = await cache.match(modelChunksDir);
    if (cachedResponse) {
      log("Using cached model");
      return await cachedResponse.arrayBuffer();
    } else {
      log("Fetching model chunks and caching combined buffer");
      const combinedBuffer = await fetchAndCombineChunks(modelChunksDir);
      // Create a Response object with the combined buffer and cache it
      const response = new Response(combinedBuffer);
      await cache.put(modelChunksDir, response);
      return combinedBuffer;
    }
  } else {
    log("Cache disabled");
    // Fetch the model chunks and combine them
    return await fetchAndCombineChunks(modelChunksDir);
  }
}

export async function cacheEntireModel(modelPath) {
  if ("caches" in window && !cacheOverride.checked) {
    log("Cache enabled");
    const cacheName = "onnx-model-cache";
    const cache = await caches.open(cacheName);
    // Check if the model is cached
    const cachedResponse = await cache.match(modelPath);
    if (cachedResponse) {
      log("Using cached model");
      return await cachedResponse.arrayBuffer();
    } else {
      log("Fetching model and caching it");
      const response = await fetch(modelPath);
      const modelBuffer = await response.arrayBuffer();
      // Create a Response object with the model buffer and cache it
      const cacheResponse = new Response(modelBuffer);
      await cache.put(modelPath, cacheResponse);
      return modelBuffer;
    }
  } else {
    log("Cache disabled");
    // Fetch the model directly
    const response = await fetch(modelPath);
    return await response.arrayBuffer();
  }
}

export function log(...message) {
  if (LOGGER) {
    console.log(...message);
  }
  if (additionalLog.checked) {
    outputBox.appendChild(document.createTextNode(...message));
    outputBox.appendChild(document.createElement("br"));
  }
}
