import http from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
export function createRoomServer({
  origins = [],
  iceServers = [],
  staticDir = null,
  trustProxy = false,
} = {}) {
  const rooms = new Map(),
    rates = new Map();
  const publicRoom = (r) => ({
    code: r.code,
    host: r.host,
    show: r.show,
    difficulty: r.difficulty,
    run: r.run,
    members: r.members.map((m) => ({
      id: m.id,
      name: m.name,
      slot: m.slot,
      ready: m.ready,
      connected: !!m.stream,
      incomplete: m.incomplete,
    })),
    iceServers,
    serverTime: Date.now(),
  });
  const send = (m, type, data) => {
    if (m.stream && !m.stream.destroyed && !m.stream.writableEnded)
      m.stream.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  const publish = (r) => {
    for (const m of r.members) send(m, "room", publicRoom(r));
    r.updated = Date.now();
  };
  const server = http.createServer(async (req, res) => {
    const json = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(data));
    };
    try {
      const origin = req.headers.origin;
      if (origin && origins.length && !origins.includes(origin))
        return json(403, { error: "Origin not allowed" });
      // Behind a host's proxy every socket is the proxy; the first forwarded address is the player.
      // shortcut: a client can forge this header to dodge its own rate limit; fine for private games.
      const forwarded = trustProxy && req.headers["x-forwarded-for"]?.split(",")[0].trim();
      const ip = forwarded || (req.socket.remoteAddress ?? "unknown"),
        now = Date.now(),
        rate = rates.get(ip) ?? { at: now, n: 0 };
      if (now - rate.at > 1000) {
        rate.at = now;
        rate.n = 0;
      }
      if (++rate.n > 40) return json(429, { error: "Please slow down" });
      rates.set(ip, rate);
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/api/health") return json(200, { ok: true });
      if (url.pathname === "/api/events" && req.method === "GET") {
        const r = rooms.get(url.searchParams.get("room")),
          m = r?.members.find((m) => m.token === url.searchParams.get("token"));
        if (!m) return json(403, { error: "Room session expired" });
        const old = m.stream;
        m.stream = res;
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });
        if (old) old.end();
        if (r.run) m.incomplete = true;
        publish(r);
        req.on("close", () => {
          if (m.stream !== res) return;
          m.stream = null;
          m.ready = false;
          if (r.run) m.incomplete = true;
          if (r.host === m.id)
            r.host = r.members.find((x) => x.stream)?.id ?? m.id;
          publish(r);
        });
        return;
      }
      if (
        staticDir &&
        ["GET", "HEAD"].includes(req.method) &&
        !url.pathname.startsWith("/api/")
      ) {
        const root = path.resolve(staticDir);
        const name = decodeURIComponent(
          url.pathname === "/" ? "/index.html" : url.pathname,
        );
        const file = path.resolve(root, "." + name);
        if (
          !file.startsWith(root + path.sep) ||
          name.split("/").some((part) => part.startsWith("."))
        )
          return json(404, { error: "Not found" });
        let info;
        try {
          info = await stat(file);
        } catch {
          return json(404, { error: "Not found" });
        }
        if (!info.isFile()) return json(404, { error: "Not found" });
        const types = {
          ".html": "text/html; charset=utf-8",
          ".js": "text/javascript",
          ".css": "text/css",
          ".json": "application/json",
          ".glb": "model/gltf-binary",
          ".wav": "audio/wav",
          ".svg": "image/svg+xml",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".webp": "image/webp",
        };
        let start = 0,
          end = info.size - 1,
          status = 200;
        if (req.headers.range) {
          const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
          if (!range) {
            res.writeHead(416, { "Content-Range": `bytes */${info.size}` });
            return res.end();
          }
          start = Number(range[1]);
          end = range[2] ? Math.min(Number(range[2]), end) : end;
          if (start > end || start >= info.size) {
            res.writeHead(416, { "Content-Range": `bytes */${info.size}` });
            return res.end();
          }
          status = 206;
        }
        res.writeHead(status, {
          "Content-Type":
            types[path.extname(file)] ?? "application/octet-stream",
          "Content-Length": Math.max(0, end - start + 1),
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-cache",
          "X-Content-Type-Options": "nosniff",
          ...(status === 206
            ? { "Content-Range": `bytes ${start}-${end}/${info.size}` }
            : {}),
        });
        if (req.method === "HEAD") return res.end();
        const stream = createReadStream(file, { start, end });
        stream.on("error", () => res.destroy());
        stream.pipe(res);
        return;
      }
      if (req.method !== "POST" || url.pathname !== "/api/room")
        return json(404, { error: "Not found" });
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 32768)
          return json(413, { error: "Request too large" });
      }
      let b;
      try {
        b = JSON.parse(body);
      } catch {
        return json(400, { error: "Invalid JSON" });
      }
      if (!b || typeof b !== "object")
        return json(400, { error: "Invalid request" });
      if (b.action === "create" || b.action === "join") {
        const name =
          typeof b.name === "string" ? b.name.trim().slice(0, 24) : "";
        if (!name) return json(400, { error: "Enter a display name" });
        let r;
        if (b.action === "create") {
          if (rooms.size >= 500)
            return json(503, { error: "Rooms are busy; try again shortly" });
          let code;
          do {
            code = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
          } while (rooms.has(code));
          r = {
            code,
            host: "",
            show: "sunrise",
            difficulty: "Medium",
            members: [],
            run: null,
            updated: now,
          };
          rooms.set(code, r);
        } else r = rooms.get(String(b.code).toUpperCase());
        if (!r) return json(404, { error: "Room not found" });
        if (r.members.length >= 4 || r.run)
          return json(409, {
            error: r.run
              ? "Show in progress; wait for the lobby"
              : "Room is full",
          });
        const m = {
          id: randomBytes(8).toString("hex"),
          token: randomBytes(24).toString("hex"),
          name,
          slot: [4, 5, 6, 7].find(
            (slot) => !r.members.some((member) => member.slot === slot),
          ),
          ready: false,
          stream: null,
          incomplete: false,
        };
        r.members.push(m);
        if (!r.host) r.host = m.id;
        publish(r);
        return json(200, { id: m.id, token: m.token, room: publicRoom(r) });
      }
      const r = rooms.get(String(b.code).toUpperCase()),
        m = r?.members.find(
          (x) => x.token === req.headers.authorization?.replace("Bearer ", ""),
        );
      if (!m) return json(403, { error: "Room session expired" });
      if (b.action === "ready") {
        if (r.run) return json(409, { error: "Show already started" });
        m.ready = b.ready === true;
      } else if (b.action === "select") {
        if (r.host !== m.id || r.run)
          return json(403, {
            error: "Only the host can change the lobby selection",
          });
        if (
          !["sunrise", "reprise"].includes(b.show) ||
          !["Easy", "Medium", "Hard"].includes(b.difficulty)
        )
          return json(400, { error: "Invalid show or difficulty" });
        r.show = b.show;
        r.difficulty = b.difficulty;
        r.members.forEach((x) => (x.ready = false));
      } else if (b.action === "start") {
        if (
          r.host !== m.id ||
          r.run ||
          r.members.filter((x) => x.stream).length < 2 ||
          r.members.some((x) => !x.stream || !x.ready)
        )
          return json(409, { error: "Everyone must be connected and Ready" });
        r.run = {
          id: randomBytes(8).toString("hex"),
          at: Date.now() + 2000,
          seed: randomBytes(4).readUInt32LE(),
        };
        r.members.forEach((x) => (x.incomplete = false));
      } else if (b.action === "lobby") {
        if (r.host !== m.id)
          return json(403, {
            error: "Only the host can return the room to lobby",
          });
        r.run = null;
        r.members = r.members.filter((x) => x.stream);
        r.members.forEach((x, index) => {
          x.slot = 4 + index;
          x.ready = false;
          x.incomplete = false;
        });
      } else if (b.action === "signal") {
        const peer = r.members.find((x) => x.id === b.to);
        if (
          !peer ||
          !b.signal ||
          !["offer", "answer", "candidate"].includes(b.signal.kind)
        )
          return json(400, { error: "Invalid signal" });
        send(peer, "signal", { from: m.id, signal: b.signal });
        return json(200, { ok: true, serverTime: Date.now() });
      } else if (b.action === "resume") {
        return json(200, { id: m.id, token: m.token, room: publicRoom(r) });
      } else if (b.action === "leave") {
        m.stream?.end();
        m.stream = null;
        m.ready = false;
        m.incomplete = true;
        if (!r.run) {
          r.members = r.members.filter((x) => x !== m);
          r.members.forEach((member, index) => {
            member.slot = 4 + index;
          });
        }
        if (r.host === m.id) r.host = r.members.find((x) => x.stream)?.id ?? "";
      } else return json(400, { error: "Unknown action" });
      publish(r);
      json(200, { room: publicRoom(r), serverTime: Date.now() });
    } catch {
      if (!res.headersSent) json(500, { error: "Room request failed" });
      else res.end();
    }
  });
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [code, r] of rooms) {
      for (const m of r.members)
        if (m.stream && !m.stream.writableEnded)
          m.stream.write(": heartbeat\n\n");
      if (!r.members.some((m) => m.stream) && now - r.updated > 30 * 60 * 1000)
        rooms.delete(code);
    }
    for (const [ip, r] of rates) if (now - r.at > 60000) rates.delete(ip);
  }, 15000);
  timer.unref();
  server.on("close", () => {
    clearInterval(timer);
    for (const r of rooms.values())
      for (const m of r.members) {
        const stream = m.stream;
        m.stream = null;
        stream?.end();
      }
  });
  server.headersTimeout = 10000;
  server.requestTimeout = 15000;
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const iceServers = JSON.parse(
    process.env.ICE_SERVERS ?? '[{"urls":"stun:stun.cloudflare.com:3478"}]',
  );
  const server = createRoomServer({
    origins: (process.env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean),
    iceServers,
    staticDir: process.env.STATIC_DIR ?? "dist",
    trustProxy: process.env.TRUST_PROXY === "1",
  });
  server.listen(
    Number(process.env.PORT ?? 8787),
    process.env.HOST ?? "127.0.0.1",
    () =>
      console.log("Room signaling ready on port " + (process.env.PORT ?? 8787)),
  );
}
