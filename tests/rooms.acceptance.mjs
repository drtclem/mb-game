import { test } from "node:test";
import assert from "node:assert/strict";
import { createRoomServer } from "../server/rooms.mjs";
test("private room authority, readiness, four slots and disconnect takeover", async () => {
  const server = createRoomServer({ origins: ["https://game.example"] });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const streams = [];
  const request = async (body, member) => {
    const response = await fetch(base + "/api/room", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(member ? { Authorization: `Bearer ${member.token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  const open = async (member, code) => {
    const controller = new AbortController();
    streams.push(controller);
    const response = await fetch(
      `${base}/api/events?room=${code}&token=${member.token}`,
      { signal: controller.signal },
    );
    const reader = response.body.getReader();
    await reader.read();
    return controller;
  };
  try {
    assert.equal(
      (
        await fetch(base + "/api/health", {
          headers: { Origin: "https://bad.example" },
        })
      ).status,
      403,
    );
    const host = (await request({ action: "create", name: "Host" })).data,
      code = host.room.code;
    const guest = (await request({ action: "join", code, name: "Guest" })).data;
    await open(host, code);
    const guestStream = await open(guest, code);
    assert.equal(
      (
        await request(
          { action: "select", code, show: "reprise", difficulty: "Hard" },
          guest,
        )
      ).status,
      403,
    );
    assert.equal((await request({ action: "start", code }, host)).status, 409);
    assert.equal(
      (await request({ action: "ready", code, ready: true }, host)).status,
      200,
    );
    assert.equal(
      (await request({ action: "ready", code, ready: true }, guest)).status,
      200,
    );
    const started = await request({ action: "start", code }, host);
    assert.equal(started.status, 200);
    assert.ok(started.data.room.run.at > Date.now());
    assert.equal(
      (await request({ action: "join", code, name: "Late" })).status,
      409,
    );
    guestStream.abort();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const resumed = (await request({ action: "resume", code }, guest)).data;
    assert.equal(
      resumed.room.members.find((m) => m.id === guest.id).incomplete,
      true,
    );
    assert.equal(
      resumed.room.members.find((m) => m.id === guest.id).connected,
      false,
    );
    await open(guest, code);
    assert.equal(
      (await request({ action: "resume", code }, guest)).data.room.members.find(
        (m) => m.id === guest.id,
      ).incomplete,
      true,
    );
    await request({ action: "lobby", code }, host);
    for (const name of ["Third", "Fourth"])
      assert.equal((await request({ action: "join", code, name })).status, 200);
    assert.equal(
      (await request({ action: "join", code, name: "Fifth" })).status,
      409,
    );
    assert.equal(
      (
        await request(
          { action: "ready", code, ready: true },
          { token: "invalid" },
        )
      ).status,
      403,
    );
  } finally {
    streams.forEach((s) => s.abort());
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("production entry serves built files and byte ranges without exposing parent files", async () => {
  const { mkdtemp, writeFile, mkdir, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const root = await mkdtemp(join(tmpdir(), "on-the-dot-"));
  await mkdir(join(root, "public"));
  await writeFile(join(root, "public", "index.html"), "<h1>On the Dot</h1>");
  await writeFile(join(root, "public", "demo.wav"), "0123456789");
  await writeFile(join(root, "private.txt"), "secret");
  const server = createRoomServer({ staticDir: join(root, "public") });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal(await (await fetch(base + "/")).text(), "<h1>On the Dot</h1>");
    const range = await fetch(base + "/demo.wav", {
      headers: { Range: "bytes=2-5" },
    });
    assert.equal(range.status, 206);
    assert.equal(await range.text(), "2345");
    assert.equal((await fetch(base + "/%2e%2e/private.txt")).status, 404);
    assert.equal((await fetch(base + "/.env")).status, 404);
    assert.equal(
      (await fetch(base + "/demo.wav", { headers: { Range: "bytes=100-200" } }))
        .status,
      416,
    );
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true });
  }
});
test("behind a trusted proxy, rate limits apply per player, not per proxy", async () => {
  const server = createRoomServer({ trustProxy: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const burst = (ip, n) =>
    Promise.all(
      Array.from({ length: n }, () =>
        fetch(base + "/api/health", {
          headers: { "X-Forwarded-For": `${ip}, 10.0.0.1` },
        }).then((r) => r.status),
      ),
    );
  try {
    assert.ok((await burst("203.0.113.1", 40)).every((s) => s === 200));
    assert.ok((await burst("203.0.113.2", 40)).every((s) => s === 200));
    assert.ok((await burst("203.0.113.1", 5)).includes(429));
  } finally {
    server.close();
  }
});
