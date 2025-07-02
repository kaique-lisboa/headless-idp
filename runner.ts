import { createHash } from "node:crypto";

const codeVerifier = "test";

const hash = createHash("sha256")
  .update(codeVerifier)
  .digest("base64url");

console.log(hash);