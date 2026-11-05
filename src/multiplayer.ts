import type { Dot } from "./drill";
import type { Difficulty } from "./repertoire";
import type { Result, Step } from "./performance";
export type Member = {
  id: string;
  name: string;
  slot: number;
  ready: boolean;
  connected: boolean;
  incomplete: boolean;
};
export type Room = {
  code: string;
  host: string;
  show: string;
  difficulty: Difficulty;
  members: Member[];
  run: { id: string; at: number; seed: number } | null;
  iceServers: RTCIceServer[];
  serverTime: number;
};
export type Packet = (
  | {
      kind: "position";
      id: string;
      count: number;
      position: Dot;
      step?: Step;
      turn?: { page: number; direction: number };
    }
  | {
      kind: "result";
      id: string;
      result: Result;
      incomplete: boolean;
      band?: number;
    }
) & { runId?: string };
type Signal = {
  kind: "offer" | "answer" | "candidate";
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};
export class RoomClient {
  room!: Room;
  id = "";
  token = "";
  offset = 0;
  onroom: () => void = () => {};
  onpacket: (p: Packet) => void = () => {};
  onnotice: (text: string) => void = () => {};
  private events?: EventSource;
  private peers = new Map<string, RTCPeerConnection>();
  private channels = new Map<string, RTCDataChannel>();
  private candidates = new Map<string, RTCIceCandidateInit[]>();
  private host = "";
  get isHost() {
    return this.room?.host === this.id;
  }
  get me() {
    return this.room?.members.find((m) => m.id === this.id);
  }
  get transportReady() {
    return this.room?.members
      .filter((m) => m.connected && m.id !== this.id)
      .every((m) =>
        this.isHost
          ? this.channels.get(m.id)?.readyState === "open"
          : this.channels.get(this.room.host)?.readyState === "open",
      );
  }
  async request(action: string, body: Record<string, unknown> = {}) {
    const sent = Date.now(),
      response = await fetch("/api/room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ action, code: this.room?.code, ...body }),
      });
    const data = await response.json();
    if (!response.ok) throw Error(data.error ?? "Room request failed");
    const serverTime = data.serverTime ?? data.room?.serverTime;
    if (serverTime) this.offset = serverTime - (sent + Date.now()) / 2;
    return data;
  }
  async enter(action: "create" | "join", name: string, code = "") {
    const data = await this.request(action, { name, code });
    this.id = data.id;
    this.token = data.token;
    this.room = data.room;
    this.connect();
    sessionStorage.setItem(
      "mb-room",
      JSON.stringify({ id: this.id, token: this.token, code: this.room.code }),
    );
  }
  async restore() {
    const stored = sessionStorage.getItem("mb-room");
    if (!stored) return false;
    try {
      const s = JSON.parse(stored);
      this.id = s.id;
      this.token = s.token;
      this.room = { code: s.code } as Room;
      const data = await this.request("resume");
      this.room = data.room;
      this.connect();
      return true;
    } catch {
      sessionStorage.removeItem("mb-room");
      return false;
    }
  }
  private connect() {
    this.events = new EventSource(
      `/api/events?room=${encodeURIComponent(this.room.code)}&token=${encodeURIComponent(this.token)}`,
    );
    this.events.addEventListener("room", (event) => {
      const next: Room = JSON.parse((event as MessageEvent).data),
        old = this.room;
      for (const m of next.members) {
        const before = old?.members?.find((x) => x.id === m.id);
        if (before?.connected && !m.connected)
          this.onnotice(`${m.name} disconnected · AI takes over`);
        if (before && !before.connected && m.connected && next.run)
          this.onnotice(`${m.name} reconnected`);
      }
      this.room = next;
      if (this.host !== next.host) {
        this.clearPeers();
        this.host = next.host;
      }
      for (const [id, peer] of this.peers)
        if (!next.members.find((m) => m.id === id && m.connected)) {
          peer.close();
          this.peers.delete(id);
          this.channels.delete(id);
        }
      if (this.isHost)
        for (const m of next.members)
          if (m.id !== this.id && m.connected && !this.peers.has(m.id))
            void this.offer(m.id).catch((e) => this.onnotice(String(e)));
      this.onroom();
    });
    this.events.addEventListener("signal", (event) => {
      const s = JSON.parse((event as MessageEvent).data);
      void this.signal(s.from, s.signal).catch(() =>
        this.onnotice("Peer connection interrupted; reconnecting…"),
      );
    });
    this.events.onerror = () =>
      this.onnotice("Room connection interrupted · reconnecting…");
  }
  private peer(id: string) {
    let p = this.peers.get(id);
    if (p) return p;
    p = new RTCPeerConnection({ iceServers: this.room.iceServers });
    this.peers.set(id, p);
    p.onicecandidate = (e) => {
      if (e.candidate)
        void this.request("signal", {
          to: id,
          signal: { kind: "candidate", candidate: e.candidate.toJSON() },
        }).catch(() => {});
    };
    p.ondatachannel = (e) => this.channel(id, e.channel);
    p.onconnectionstatechange = () => {
      if (p!.connectionState !== "failed") return;
      this.onnotice("Peer link lost · reconnecting…");
      if (this.isHost && this.peers.get(id) === p) {
        this.peers.delete(id);
        p!.close();
        setTimeout(() => {
          if (
            this.room.members.some((m) => m.id === id && m.connected) &&
            !this.peers.has(id)
          )
            void this.offer(id).catch(() =>
              this.onnotice(
                "Peer connection could not recover. Check your connection.",
              ),
            );
        }, 500);
      }
    };
    return p;
  }
  private channel(id: string, c: RTCDataChannel) {
    this.channels.set(id, c);
    c.onopen = () => this.onroom();
    c.onclose = () => {
      if (this.channels.get(id) === c) this.channels.delete(id);
      this.onroom();
    };
    c.onmessage = (e) => {
      if (typeof e.data !== "string" || e.data.length > 30000) return;
      let packet: Packet;
      try {
        packet = JSON.parse(e.data);
      } catch {
        return;
      }
      if (!packet || !["position", "result"].includes(packet.kind)) return;
      if (packet.runId !== this.room.run?.id) return;
      if (this.isHost) packet.id = id;
      else if (!this.room.members.some((m) => m.id === packet.id)) return;
      if (
        packet.kind === "position" &&
        (!Number.isFinite(packet.count) ||
          !packet.position ||
          !Number.isFinite(packet.position.x) ||
          !Number.isFinite(packet.position.y) ||
          Math.abs(packet.position.x) > 90 ||
          packet.position.y < 0 ||
          packet.position.y > 90)
      )
        return;
      if (
        packet.kind === "result" &&
        (!packet.result ||
          !Number.isFinite(packet.result.total) ||
          packet.result.total < 0 ||
          packet.result.total > 100)
      )
        return;
      if (
        packet.kind === "position" &&
        packet.turn &&
        (!Number.isInteger(packet.turn.page) ||
          packet.turn.page < 0 ||
          packet.turn.page > 30 ||
          ![-1, 0, 1].includes(packet.turn.direction))
      )
        return;
      if (packet.kind === "position" && packet.step) {
        const s = packet.step;
        if (
          !s.from ||
          !s.to ||
          ![
            s.seconds,
            s.end,
            s.from.x,
            s.from.y,
            s.to.x,
            s.to.y,
            s.number,
          ].every(Number.isFinite) ||
          s.end <= s.seconds ||
          s.end - s.seconds > 2 ||
          distanceSafe(s.from, s.to) > 2.01
        )
          return;
      }
      if (
        packet.kind === "result" &&
        packet.band !== undefined &&
        (!Number.isFinite(packet.band) || packet.band < 0 || packet.band > 100)
      )
        return;
      if (this.isHost) this.broadcast(packet, id);
      this.onpacket(packet);
    };
  }
  private async offer(id: string) {
    const p = this.peer(id);
    this.channel(id, p.createDataChannel("field", { ordered: true }));
    await p.setLocalDescription(await p.createOffer());
    await this.request("signal", {
      to: id,
      signal: { kind: "offer", description: p.localDescription },
    });
  }
  private async signal(id: string, s: Signal) {
    if (
      !this.room.members.some((m) => m.id === id) ||
      (id !== this.room.host && !this.isHost)
    )
      return;
    const p = this.peer(id);
    if (s.kind === "candidate" && s.candidate) {
      if (p.remoteDescription) await p.addIceCandidate(s.candidate);
      else
        this.candidates.set(id, [
          ...(this.candidates.get(id) ?? []),
          s.candidate,
        ]);
      return;
    }
    if (!s.description) return;
    await p.setRemoteDescription(s.description);
    for (const c of this.candidates.get(id) ?? []) await p.addIceCandidate(c);
    this.candidates.delete(id);
    if (s.kind === "offer") {
      await p.setLocalDescription(await p.createAnswer());
      await this.request("signal", {
        to: id,
        signal: { kind: "answer", description: p.localDescription },
      });
    }
  }
  send(packet: Packet) {
    this.broadcast({ ...packet, id: this.id, runId: this.room.run?.id });
  }
  private broadcast(packet: Packet, except = "") {
    const text = JSON.stringify(packet);
    for (const [id, c] of this.channels)
      if (id !== except && c.readyState === "open" && c.bufferedAmount < 65536)
        c.send(text);
  }
  private clearPeers() {
    for (const p of this.peers.values()) p.close();
    this.peers.clear();
    this.channels.clear();
    this.candidates.clear();
  }
  async leave() {
    try {
      await this.request("leave");
    } finally {
      this.events?.close();
      this.clearPeers();
      sessionStorage.removeItem("mb-room");
    }
  }
}

function distanceSafe(a: Dot, b: Dot) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
