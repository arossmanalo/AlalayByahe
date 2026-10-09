import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { Sha256Hasher } from "./modelStore";

// @noble/hashes 2.4.0 incremental SHA256 (contract v1.0 §7). Each chunk is
// hashed and discarded; no concatenation, base64 or Node crypto on the phone.
export function createNobleSha256(): Sha256Hasher {
  const hasher = sha256.create();
  return {
    update(chunk) {
      hasher.update(chunk);
    },
    digestHex() {
      return bytesToHex(hasher.digest());
    },
  };
}
