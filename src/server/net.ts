import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent, fetch as undiciFetch, type RequestInit as UndiciRequestInit } from "undici";

/**
 * Outbound requests to addresses a user gave us (links, thumbnails, media, the sites a video
 * mentions). The server must never be turned into a way into its own network: loopback, private
 * ranges, link-local (cloud metadata at 169.254.169.254) and the like are refused, on the first
 * request and on every redirect, and checked again when the socket connects so a name that changes
 * its answer between the check and the connection (DNS rebinding) is refused too. Every request has
 * a total time limit that also covers reading the body, and bodies are read up to a size limit.
 */

export class BlockedAddressError extends Error {
  constructor(what: string) {
    super(`Blocked address: ${what}`);
    this.name = "BlockedAddressError";
  }
}

function v4ToInt(ip: string): number {
  return ip.split(".").reduce((n, part) => (n << 8) + Number(part), 0) >>> 0;
}

const V4_BLOCKS: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function inV4Block(ip: string): boolean {
  const n = v4ToInt(ip);
  return V4_BLOCKS.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (v4ToInt(base) & mask);
  });
}

/** True for any address that is not a public unicast address on the internet. */
export function isPrivateAddress(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, "").toLowerCase();
  const kind = isIP(ip);
  if (kind === 4) return inV4Block(ip);
  if (kind !== 6) return true;
  if (ip === "::" || ip === "::1") return true;
  // IPv4 inside IPv6: mapped (::ffff:a.b.c.d), compatible, and the NAT64 prefix.
  const tail = /(?:^::ffff:|^::|^64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/.exec(ip)?.[1];
  if (tail) return inV4Block(tail);
  const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(ip);
  if (mapped) {
    const n = (parseInt(mapped[1], 16) << 16) | parseInt(mapped[2], 16);
    return inV4Block([n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join("."));
  }
  const first = parseInt(ip.split(":")[0] || "0", 16);
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((first & 0xff00) === 0xff00) return true; // multicast
  if (first === 0x2001 && ip.startsWith("2001:db8:")) return true; // documentation
  return false;
}

const BLOCKED_HOSTS = /(^|\.)(localhost|local|internal|home\.arpa|localdomain)$/i;

/** Parses and checks an address before any request: http(s) only, a public host, no credentials. */
export async function assertPublicUrl(raw: string | URL): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BlockedAddressError("not a URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new BlockedAddressError(url.protocol);
  if (url.username || url.password) throw new BlockedAddressError("credentials in URL");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host || BLOCKED_HOSTS.test(host)) throw new BlockedAddressError(host || "empty host");
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new BlockedAddressError(host);
    return url;
  }
  const answers = await lookup(host, { all: true, verbatim: true }).catch(() => []);
  if (!answers.length) throw new BlockedAddressError(`${host} does not resolve`);
  if (answers.some((a) => isPrivateAddress(a.address))) throw new BlockedAddressError(host);
  return url;
}

/** Checked again at connect time, on the address the socket actually uses. */
const guardedAgent = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      lookup(hostname, { all: true, verbatim: true })
        .then((answers) => {
          const bad = answers.find((a) => isPrivateAddress(a.address));
          if (!answers.length || bad) return callback(new BlockedAddressError(hostname), "", 4);
          const wantsAll = typeof options === "object" && options !== null && (options as { all?: boolean }).all;
          if (wantsAll) return (callback as unknown as (e: null, a: typeof answers) => void)(null, answers);
          callback(null, answers[0].address, answers[0].family);
        })
        .catch((err) => callback(err, "", 4));
    },
  },
});

export type SafeInit = UndiciRequestInit & { timeoutMs?: number; maxRedirects?: number };

/**
 * fetch for user-supplied addresses. Redirects are followed by hand (at most 5) so each hop is
 * checked; the time limit keeps running while the caller reads the body.
 */
export async function safeFetch(input: string | URL, init: SafeInit = {}) {
  const { timeoutMs = 15000, maxRedirects = 5, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error(`Timed out after ${timeoutMs} ms`)), timeoutMs);
  timer.unref?.();
  let url = await assertPublicUrl(input);
  let req: UndiciRequestInit = { ...rest };
  for (let hop = 0; ; hop++) {
    const res = await undiciFetch(url, { ...req, redirect: "manual", signal: ctrl.signal, dispatcher: guardedAgent });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel().catch(() => undefined);
      if (hop >= maxRedirects) throw new Error("Too many redirects");
      url = await assertPublicUrl(new URL(location, url));
      if (res.status !== 307 && res.status !== 308) req = { ...req, method: "GET", body: undefined };
      continue;
    }
    return res;
  }
}

/** Reads a response body up to `maxBytes`; null when it is larger (the rest is not downloaded). */
type Readable = { getReader(): { read(): Promise<{ done: boolean; value?: Uint8Array }>; cancel(): Promise<void> }; cancel(): Promise<void> };

export async function readLimited(res: { body: unknown; headers: { get(name: string): string | null } }, maxBytes: number): Promise<Buffer | null> {
  const body = res.body as Readable | null;
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > maxBytes) {
    await body?.cancel().catch(() => undefined);
    return null;
  }
  if (!body) return Buffer.alloc(0);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
