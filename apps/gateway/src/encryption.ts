import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm" as const;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getKey(): Buffer {
  if (!process.env.ENCRYPTION_KEY) {
    const searchPaths = [
      path.join(process.cwd(), ".encryption-key"),
      path.join(__dirname, ".encryption-key"),
      path.join(__dirname, "..", ".encryption-key"),
      path.join(__dirname, "..", "..", ".encryption-key"),
      path.join(__dirname, "..", "..", "..", ".encryption-key"),
    ];
    for (const checkPath of searchPaths) {
      if (fs.existsSync(checkPath)) {
        process.env.ENCRYPTION_KEY = fs.readFileSync(checkPath, "utf8").trim();
        break;
      }
    }
  }
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length === 0) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  // Derive a 256-bit key from whatever length string we have
  return crypto.scryptSync(key, "oh-my-pi-salt", 32);
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return "";
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  // Format: iv:tag:ciphertext (all hex)
  return `${iv.toString("hex")}:${tag}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) return "";
  const key = getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value format");
  }
  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
