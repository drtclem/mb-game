import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TempoMap } from './tempo';
const score = JSON.parse(readFileSync('public/music/sunrise-score.json', 'utf8'));
describe('Sunrise arrangement contract', () => {
  it('covers every count with a contiguous movement or hold section', () => {
    let end = 0;
    for (const section of score.sections) {
      expect(section.start).toBe(end);
      expect(section.end).toBeGreaterThan(section.start);
      expect(['MOVE', 'HOLD']).toContain(section.action);
      end = section.end;
    }
    expect(end).toBe(score.totalCounts);
    expect(score.sections.filter((s: {action: string}) => s.action === 'HOLD').length).toBeGreaterThan(1);
  });
  it('keeps every musical event inside the mapped show and round-trips tempo changes', () => {
    const map = new TempoMap(score.beats);
    expect(score.beats).toHaveLength(score.totalCounts + 1);
    for (const note of score.notes) {
      expect(note.count).toBeGreaterThanOrEqual(0);
      expect(note.duration).toBeGreaterThan(0);
      expect(note.count + note.duration).toBeLessThanOrEqual(score.totalCounts);
    }
    for (const change of score.tempoChanges) {
      expect(map.count(map.seconds(change.count))).toBeCloseTo(change.count, 8);
      expect(map.seconds(change.count + 1) - map.seconds(change.count)).toBeCloseTo(60/change.bpm, 8);
    }
  });
  it('ships audible stereo PCM without clipping, covering the entire score plus release', () => {
    const wav = readFileSync('public/music/sunrise-demo.wav');
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wav.readUInt16LE(22)).toBe(2);
    const frames = wav.readUInt32LE(40) / 4;
    expect(frames / wav.readUInt32LE(24)).toBeCloseTo(score.beats.at(-1) + 3, 3);
    let peak = 0, energy = 0;
    for (let i = 44; i < wav.length; i += 2) {
      const value = wav.readInt16LE(i); peak = Math.max(peak, Math.abs(value)); energy += value*value;
    }
    expect(peak).toBeLessThan(32000);
    expect(Math.sqrt(energy / ((wav.length-44)/2))).toBeGreaterThan(500);
  });
});
