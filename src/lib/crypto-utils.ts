/**
 * Crypto utilities for password decryption on the client side
 */

import scrypt from "scrypt-js";

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Derive encryption key using scrypt with same parameters as backend
 * Parameters: n=16384, r=8, p=1, dkLen=32, salt="salt"
 */
async function deriveKey(keyString: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const password = enc.encode(keyString);
  const salt = enc.encode("salt");
  
  // Use scrypt with the same parameters as backend
  const N = 16384; // CPU/memory cost parameter
  const r = 8;     // Block size parameter
  const p = 1;     // Parallelization parameter
  const dkLen = 32; // Desired key length (32 bytes = 256 bits)
  
  const key = await scrypt.scrypt(password, salt, N, r, p, dkLen);
  return new Uint8Array(key);
}

/**
 * Decrypt password using AES-CBC encryption
 * @param encrypted - The encrypted password in format "iv:ciphertext" (hex)
 * @param keyString - The encryption key from environment variable
 * @returns Decrypted password string
 */
export async function decryptPassword(
  encrypted: string,
  keyString: string
): Promise<string> {
  try {
    // Split the encrypted string into IV and ciphertext
    const [ivHex, ctHex] = encrypted.split(":");
    
    if (!ivHex || !ctHex) {
      throw new Error("Invalid encrypted password format");
    }

    const iv = hexToBytes(ivHex);
    const ct = hexToBytes(ctHex);

    // Derive key using the same parameters as backend
    const key = await deriveKey(keyString);

    // Import the key for decryption
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );

    // Decrypt the password
    const plain = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      cryptoKey,
      ct
    );

    // Convert decrypted bytes to string
    return new TextDecoder().decode(plain);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt password");
  }
}

/**
 * Safely decrypt password with error handling
 * Returns "-" if decryption fails
 */
export async function safeDecryptPassword(
  encrypted: string | null | undefined,
  keyString: string
): Promise<string> {
  if (!encrypted) {
    return "-";
  }

  try {
    const result = await decryptPassword(encrypted, keyString);
    console.log("✅ Password decrypted successfully");
    return result;
  } catch (error) {
    console.error("❌ Password decryption error:", error);
    console.error("Encrypted value:", encrypted);
    console.error("Key length:", keyString?.length);
    return "Decryption failed";
  }
}
