export function validateExternalUrl(url: string): { valid: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL" };
  }

  // Enforce HTTPS only
  if (parsed.protocol !== "https:") {
    return { valid: false, error: "Only HTTPS URLs are allowed" };
  }

  // Block localhost and private IPs
  const hostname = parsed.hostname.toLowerCase();
  const blocked = [
    "localhost", "127.0.0.1", "0.0.0.0", "::1",
    "metadata.google.internal", "169.254.169.254",
  ];
  if (blocked.includes(hostname)) {
    return { valid: false, error: "Internal addresses are not allowed" };
  }

  // Block private IP ranges
  const parts = hostname.split(".");
  if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
    const octets = parts.map(Number);
    if (octets[0] === 10) return { valid: false, error: "Private IP addresses are not allowed" };
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return { valid: false, error: "Private IP addresses are not allowed" };
    if (octets[0] === 192 && octets[1] === 168) return { valid: false, error: "Private IP addresses are not allowed" };
    if (octets[0] === 169 && octets[1] === 254) return { valid: false, error: "Link-local addresses are not allowed" };
  }

  return { valid: true };
}
