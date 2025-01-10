const fs = require("fs");
const path = require("path");

function splitModel(filePath, chunkSize = 80 * 1024 * 1024) {
  const fileData = fs.readFileSync(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));
  const chunksDir = `${baseName}_chunks`;

  // Create a directory to store the chunks
  if (!fs.existsSync(chunksDir)) {
    fs.mkdirSync(chunksDir);
  }

  let index = 0;
  for (let i = 0; i < fileData.length; i += chunkSize) {
    const chunk = fileData.slice(i, i + chunkSize);
    const chunkFile = path.join(chunksDir, `chunk_${index}.bin`);
    fs.writeFileSync(chunkFile, chunk);
    index++;
  }

  console.log(`Model split into ${index} chunks and saved in ${chunksDir}`);
}

// Example usage
splitModel("kokoro-v0_19.onnx");
