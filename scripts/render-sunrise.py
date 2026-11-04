"""Render our original Strauss-inspired game arrangement. No samples required.
Run with Python 3 + numpy. Score units are musical counts, not seconds.
"""
import json
import sys
from pathlib import Path
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RATE = 32000
TEMPOS = [(0, 84), (32, 96), (64, 84), (96, 72)]
TOTAL = 112
SECTIONS = [
    (0, 8, 'First light', 'HOLD'), (8, 24, 'First call', 'MOVE'),
    (24, 32, 'First impact', 'HOLD'), (32, 48, 'Answering call', 'MOVE'),
    (48, 56, 'Second impact', 'HOLD'), (56, 72, 'Brass ascent', 'MOVE'),
    (72, 80, 'Full ensemble', 'HOLD'), (80, 96, 'Final approach', 'MOVE'),
    (96, 112, 'Sunrise arrival', 'HOLD'),
]

def seconds(count):
    return sum(max(0, min(count, TEMPOS[i+1][0] if i+1 < len(TEMPOS) else TOTAL) - start) * 60 / bpm
               for i, (start, bpm) in enumerate(TEMPOS))

def score():
    notes = []
    def add(at, length, pitch, voice, level, pan=0):
        family = 'tuba' if pitch < 45 else 'baritone' if pitch < 60 else 'mellophone' if pitch < 67 else 'trumpet'
        if voice == 'brass' and pitch >= 60: family = 'trumpet' if pitch >= 67 else 'mellophone'
        notes.append(dict(count=at, duration=length, midi=pitch, voice=family, level=level, pan=pan))
    def chord(at, length, pitches, level):
        for i, pitch in enumerate(pitches):
            add(at, length, pitch, 'brass', level / len(pitches)**.5, (i/(len(pitches)-1)-.5)*.9)
    # Low foundation and three increasingly broad C-G-C calls.
    for at, length in [(0, 24), (32, 16), (56, 16), (80, 16), (96, 16)]:
        add(at, length, 24, 'low', .24)
        add(at, length, 36, 'low', .14, -.25)
    for at, level in [(8, .26), (32, .34), (56, .42)]:
        for pitch, delta, length in [(60, 0, 4), (67, 4, 4), (72, 8, 6)]:
            for cents_pan in [-.55, .05, .55]:
                add(at+delta, length, pitch, 'brass', level/2.2, cents_pan)
        chord(at+14, 2, [36, 48, 55, 60, 64, 67, 72], level*.9)
    # Original connective writing and a minor-to-major impact response.
    chord(24, 4, [36, 48, 55, 60, 63, 67, 72], .46)
    chord(28, 3.5, [36, 48, 55, 60, 64, 67, 72], .5)
    chord(48, 4, [36, 43, 48, 55, 63, 67, 72], .52)
    chord(52, 3.5, [36, 48, 55, 60, 64, 67, 76], .56)
    chord(72, 7.5, [36, 43, 48, 55, 60, 64, 67, 72, 76], .64)
    for i, pitch in enumerate([60, 62, 64, 67, 64, 67, 72, 74]):
        add(80+i*2, 1.75, pitch, 'brass', .26, -.4)
        add(80+i*2, 1.75, pitch-12, 'brass', .19, .4)
    chord(96, 8, [36, 43, 48, 55, 60, 64, 67, 72, 76], .66)
    chord(104, 8, [24, 36, 48, 55, 60, 64, 67, 72, 76, 79], .78)
    # Brass-only rhythmic answers replace the battery; no percussion assets.
    for start in [20, 44, 68, 92]:
        for delta, pitch in [(0, 48), (1, 55), (2, 60), (3, 55)]:
            add(start+delta, .75, pitch, 'brass', .16, .25)
    return sorted(notes, key=lambda n: n['count'])

def render(notes):
    rng = np.random.default_rng(2001)
    length = int((seconds(TOTAL)+3)*RATE)
    dry = np.zeros((length, 2), dtype=np.float64)
    for n in notes:
        duration = seconds(n['count']+n['duration']) - seconds(n['count'])
        t = np.arange(int((duration+.5)*RATE))/RATE
        freq = 440*2**((n['midi']-69)/12)
        voice = n['voice']
        # Distinct bore/brightness profiles; no generic organ-like oscillator.
        cutoff, slope, attack = {
            'trumpet': (4400, .95, .018), 'mellophone': (2600, 1.15, .028),
            'baritone': (1900, 1.2, .035), 'tuba': (1050, 1.4, .065),
        }[voice]
        # Several independent players per written note. Detuning, phase and
        # tongue offsets are deterministic, without changing the count map.
        for player in range(3):
            detune = rng.uniform(-4,4)
            player_freq = freq*2**(detune/1200)
            onset = rng.uniform(0,.012)
            local = np.maximum(0,t-onset)
            air = .88 + .025*np.sin(2*np.pi*rng.uniform(.55,.9)*local + player)
            swell = .8 + .2*np.minimum(local/max(duration,.1),1)
            env = (1-np.exp(-local/attack))*np.exp(-np.maximum(0,local-duration)/.085)
            env *= air*swell*(1+.14*np.exp(-local/.12))
            # Stagger breathing on long tones so the section sustains naturally.
            if duration > 5:
                breath = 2.8 + player*1.4
                env *= 1-.8*np.exp(-((local-breath)/.075)**2)
            phase = 2*np.pi*player_freq*local + rng.uniform(0,2*np.pi)
            phase += .012*np.sin(2*np.pi*.67*local+player)
            tone = np.zeros(len(t))
            harmonics = min(65, int((RATE*.46)/player_freq))
            # Dynamic high harmonics bloom after the tongued attack. Lip/bell
            # resonance gives more bite around 1–3 kHz than the former pad.
            brightness = .38 + .62*(1-np.exp(-local/.055))
            for h in range(1,harmonics+1):
                hz = h*player_freq
                bell = 1+.5*np.exp(-((hz-1500)/900)**2)
                spectral = np.exp(-(hz/cutoff)**1.25)/h**slope * bell
                bloom = brightness**(h/7)
                tone += np.sin(h*phase)*spectral*bloom
            signal = tone*env*n['level']*.36
            start = round(seconds(n['count'])*RATE)
            end = min(length,start+len(signal))
            pan = np.clip(n['pan']+(player-1)*.11,-.95,.95)
            dry[start:end,0] += signal[:end-start]*np.sqrt((1-pan)/2)
            dry[start:end,1] += signal[:end-start]*np.sqrt((1+pan)/2)
    # Original short stadium reflections, no impulse-response assets.
    mix = dry.copy()
    for delay, gain in [(.071,.13),(.113,.11),(.181,.08),(.293,.055),(.431,.035)]:
        shift = round(delay*RATE)
        mix[shift:] += dry[:-shift,::-1]*gain
    mix = np.tanh(mix*1.3)
    mix *= .89/max(np.max(np.abs(mix)), 1e-9)
    mix[-RATE:] *= np.linspace(1,0,RATE)[:,None]
    return mix

if __name__ == '__main__':
    reprise = '--reprise' in sys.argv
    if reprise:
        TEMPOS = [(0, 96), (32, 108), (64, 96), (96, 84)]
    notes = score()
    if reprise:
        for note in notes:
            note['midi'] += 2
            if note['voice'] != 'tuba':
                note['duration'] *= .85
        # A separate brighter reprise, not the same audio played faster.
    prefix = 'sunrise-reprise' if reprise else 'sunrise-demo'
    manifest = dict(title='Sunrise — Strauss Fanfare Study', draft=True, revision=2, instrumentation='brass only', totalCounts=TOTAL,
                    tempoChanges=[dict(count=c,bpm=b) for c,b in TEMPOS],
                    beats=[seconds(c) for c in range(TOTAL+1)],
                    sections=[dict(start=a,end=b,name=name,action=act) for a,b,name,act in SECTIONS],
                    notes=notes)
    folder = ROOT/'public/music'
    folder.mkdir(exist_ok=True)
    (folder/('sunrise-reprise-score.json' if reprise else 'sunrise-score.json')).write_text(json.dumps(manifest, indent=2)+'\n')
    audio = render(notes)
    with wave.open(str(folder/(prefix+'.wav')),'wb') as out:
        out.setnchannels(2); out.setsampwidth(2); out.setframerate(RATE)
        out.writeframes((audio*32767).astype('<i2').tobytes())
    print(f'Rendered {len(notes)} events; {seconds(TOTAL):.3f}s score + 3s tail; peak {np.max(np.abs(audio)):.3f}')
