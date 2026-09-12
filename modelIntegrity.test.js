import { test } from "node:test";
import assert from "node:assert/strict";
import {
  verifyModelIntegrity,
  KNOWN_MODEL_HASHES,
  MODEL_PATH,
} from "./modelIntegrity.js";

const TEST_PATH = "./test/synthetic-model.bin";

async function registerSyntheticHash(buffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const hashHex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  KNOWN_MODEL_HASHES[TEST_PATH] = hashHex;
}

test("MODEL_PATH has a well-formed known hash configured", () => {
  const hash = KNOWN_MODEL_HASHES[MODEL_PATH];
  assert.match(hash, /^[0-9a-f]{64}$/);
});

test("verifyModelIntegrity resolves the buffer when the digest matches", async () => {
  const buffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;
  await registerSyntheticHash(buffer);

  const result = await verifyModelIntegrity(buffer, TEST_PATH);
  assert.strictEqual(result, buffer);
});

test("verifyModelIntegrity rejects a tampered buffer", async () => {
  const buffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;
  await registerSyntheticHash(buffer);

  const tampered = new Uint8Array(buffer);
  tampered[0] ^= 0xff;

  await assert.rejects(
    () => verifyModelIntegrity(tampered.buffer, TEST_PATH),
    /Model integrity check failed/
  );
});

test("verifyModelIntegrity rejects paths with no configured hash", async () => {
  const buffer = new Uint8Array([1, 2, 3]).buffer;

  await assert.rejects(
    () => verifyModelIntegrity(buffer, "./some/unconfigured-model.onnx"),
    /No integrity hash configured/
  );
});
