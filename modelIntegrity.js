export const MODEL_PATH = "./model/model_quantized.onnx";

export const KNOWN_MODEL_HASHES = {
  [MODEL_PATH]:
    "0d55b15d4b735d61a21b0105136bc81b8768c4db94753193c19354fa863cd556",
};

export async function verifyModelIntegrity(buffer, path) {
  const expectedHash = KNOWN_MODEL_HASHES[path];
  if (!expectedHash) {
    throw new Error(`No integrity hash configured for ${path}`);
  }
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const hashHex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (hashHex !== expectedHash) {
    throw new Error(`Model integrity check failed for ${path}`);
  }
  return buffer;
}
