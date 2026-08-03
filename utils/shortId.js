const BASE62_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function base62Encode(buffer) {
  let num = 0;
  for (let i = 0; i < buffer.length; i++) {
    num = (num << 8) | buffer[i];
  }

  if (num === 0) return "0";

  const chars = [];
  while (num > 0) {
    chars.push(BASE62_ALPHABET[num % 62]);
    num = Math.floor(num / 62);
  }
  return chars.reverse().join("");
}

export function generateShortId() {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return base62Encode(bytes);
}

export async function ensureUniqueShortId(collection, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const shortId = generateShortId();
    const existing = await collection.findOne({ shortId });
    if (!existing) return shortId;
  }
  throw new Error("Failed to generate unique shortId");
}
