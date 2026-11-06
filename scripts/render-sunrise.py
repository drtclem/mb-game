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
    # Lead line (rev 3): trumpets carry the tune on top instead of leaving it inside the chords.
    def lead(at, length, pitch, level=.24, pan=.1):
        add(at, length, pitch, 'lead', level, pan)
    for pickup, minor, major in [(23, 75, 76), (47, 75, 76)]:  # the minor-to-major turn, sung as melody
        lead(pickup, .9, 67, .2)
        lead(pickup+1, 3.5, minor, .3)
        lead(pickup+5, 3.5, major, .32)
    lead(52, 3.5, 84, .2, -.1)
    for pitch, delta, length in [(72, 0, 4), (79, 4, 4), (84, 8, 6)]:  # second call, an octave higher
        lead(32+delta, length, pitch, .22)
    lead(56, 4, 72, .24); lead(60, 4, 79, .26); lead(64, 2, 84, .28)  # third call climbs into the hit
    for i, pitch in enumerate([76, 77, 79, 81, 83]):
        lead(66+i, .9, pitch, .26+.02*i)
    lead(71, 1, 83, .34); lead(72, 7.5, 84, .38)
    for i, pitch in enumerate([72, 74, 76, 79, 76, 79, 84, 86]):  # rising phrase doubled on top
        lead(80+i*2, 1.75, pitch, .2)
    lead(96, 4, 79, .3); lead(100, 2, 81, .32); lead(102, 2, 83, .34); lead(104, 8, 84, .42)  # final climb to high C
    return sorted(notes, key=lambda n: n['count'])

# Corps brass sections: players per written note, spectral rolloff, bell formant, tongue speed, edge at loud dynamics.
SECTIONS_SOUND = {
    'trumpet':    dict(players=5, cutoff=5200, slope=.80, formant=(1700, 1100), attack=.010, drive=1.6, gain=1.4, floor=.52, span=.45, fund=1.0),
    'mellophone': dict(players=4, cutoff=3500, slope=.95, formant=(1250, 900), attack=.015, drive=1.3, gain=1.1, floor=.50, span=.40, fund=1.1),
    'baritone':   dict(players=4, cutoff=1800, slope=1.20, formant=(600, 350), attack=.024, drive=.5, gain=.95, floor=.45, span=.30, fund=1.5),
    'tuba':       dict(players=3, cutoff=800, slope=1.50, formant=(260, 180), attack=.045, drive=0, gain=.9, floor=.40, span=.22, fund=2.0),
}

def spectral_filter(x, curve):
    """Zero-phase EQ: curve(freqs) -> gain, applied per channel in the frequency domain."""
    n = 1 << int(np.ceil(np.log2(len(x))))
    gain = curve(np.fft.rfftfreq(n, 1/RATE))
    return np.fft.irfft(np.fft.rfft(x, n, axis=0)*gain[:, None], n, axis=0)[:len(x)]

def convolve(x, ir):
    n = 1 << int(np.ceil(np.log2(len(x)+len(ir))))
    spec = np.fft.rfft(ir, n, axis=0)
    return np.fft.irfft(np.fft.rfft(x, n, axis=0)*spec, n, axis=0)[:len(x)]

def render(notes):
    rng = np.random.default_rng(2001)
    length = int((seconds(TOTAL)+3)*RATE)
    dry = np.zeros((length, 2), dtype=np.float64)
    # Intensity: notes struck together form one ensemble hit, so judge loudness by the group, not each mix gain.
    groups = {}
    for n in notes:
        groups.setdefault((n['count'], n['duration']), []).append(n)
    for n in notes:
        group = groups[(n['count'], n['duration'])]
        intensity = float(np.clip(n['level']*np.sqrt(len(group))/.7, .3, 1))
        s = SECTIONS_SOUND[n['voice']]
        duration = seconds(n['count']+n['duration']) - seconds(n['count'])
        t = np.arange(int((duration+.6)*RATE))/RATE
        freq = 440*2**((n['midi']-69)/12)
        held = np.minimum(t/max(duration, .05), 1)
        # Long tones build into the hit (the corps "wall"); short notes stay accented.
        build = .55 + .45*held*held*(3-2*held) if duration > 1.2 else np.full(len(t), .9)
        note = np.zeros(len(t))
        for player in range(s['players']):
            onset = abs(rng.normal(0, .003))
            local = np.maximum(0, t-onset)
            env = (1-np.exp(-local/s['attack']))*np.exp(-np.maximum(0, local-duration)/.09)
            env *= build*(1+.35*intensity*np.exp(-local/.06))
            if duration > 4:  # staggered breaths so the section sustains
                breath = 2.2 + (player*1.37) % (duration-1.5)
                env *= 1-.85*np.exp(-((local-breath)/.07)**2)
            cents = rng.normal(0, 2.5) - 18*np.exp(-local/.03)  # tuning spread + lip scoop into pitch
            inst = freq*2**(cents/1200)
            phase = 2*np.pi*np.cumsum(inst)/RATE + rng.uniform(0, 2*np.pi)
            # Brass gets brighter, not just louder, as it is pushed: harmonic weight rises with loudness.
            bright = s['floor'] + s['span']*np.clip(env*intensity, 0, 1)
            c, s_prev, s_cur, weight = np.cos(phase), np.zeros(len(t)), np.sin(phase), np.ones(len(t))
            tone = np.zeros(len(t))
            for h in range(1, min(8 if freq < 45 else 70, int(RATE*.45/freq))+1):  # pedal tones: depth, not buzz
                hz = h*freq
                base = np.exp(-(hz/s['cutoff'])**1.3)/h**s['slope']
                base *= 1+.8*np.exp(-((hz-s['formant'][0])/s['formant'][1])**2)
                base *= s['fund'] if h == 1 else (1+s['fund'])/2 if h == 2 else 1  # low brass is mostly fundamental
                tone += s_cur*weight*base
                s_prev, s_cur = s_cur, 2*c*s_cur - s_prev  # sin((h+1)φ) by recurrence
                weight = weight*bright
            note += tone*env
        # Tongue: a short bright air burst on the attack.
        burst = int(.018*RATE)
        noise = rng.normal(0, 1, burst)*np.exp(-np.arange(burst)/(.005*RATE))
        note[:burst] += np.diff(noise, prepend=0)*.04*intensity*s['players']
        peak = np.max(np.abs(note)) or 1
        g = .4 + s['drive']*max(0, intensity-.55)*2  # edge only on genuinely loud hits
        note = np.tanh(g*note/peak)/np.tanh(g)  # edge ("blat") at loud dynamics
        signal = note*n['level']*.42*s['gain']*(.8 if n['midi'] < 30 else 1)  # pedal tones support, not rumble
        start = round(seconds(n['count'])*RATE)
        end = min(length, start+len(signal))
        pan = np.clip(n['pan'], -.9, .9)
        dry[start:end, 0] += signal[:end-start]*np.sqrt((1-pan)/2)
        dry[start:end, 1] += signal[:end-start]*np.sqrt((1+pan)/2)
    # Outdoor stadium: turf reflection, an echo off the far stands, and a short diffuse tail (all generated here).
    wet = np.zeros_like(dry)
    for delay, gain, cutoff in [(.009, .15, 5000), (.43, .05, 1800)]:
        shift = round(delay*RATE)
        echo = np.zeros_like(dry)
        echo[shift:] = dry[:-shift, ::-1]*gain
        wet += spectral_filter(echo, lambda f, c=cutoff: 1/np.sqrt(1+(f/c)**4))
    tail_t = np.arange(int(1.6*RATE))/RATE
    ir = rng.normal(0, 1, (len(tail_t), 2))*np.exp(-tail_t/.25)[:, None]
    ir = spectral_filter(ir, lambda f: 1/np.sqrt(1+(f/3500)**2))
    ir *= .07/np.sqrt(np.sum(ir**2, axis=0))
    mix = dry + wet + convolve(dry, ir)
    # Master: low-end weight, brass presence, then bus compression and a soft ceiling.
    mix = spectral_filter(mix, lambda f: np.sqrt(f**4/(f**4+28.0**4)) * (1+.15/(1+(f/90)**2))
                          * (1-.3*np.exp(-((f-300)/150)**2)) * (1+.35*np.exp(-((f-2800)/1300)**2)) / np.sqrt(1+(f/13000)**8))
    win = int(.05*RATE)
    rms = np.sqrt(np.convolve(np.mean(mix**2, axis=1), np.ones(win)/win, mode='same')) + 1e-9
    level = rms/np.max(rms)
    gain = np.where(level > .4, (level/.4)**(1/2-1), 1)  # gentle 2:1 above threshold
    mix *= np.convolve(gain, np.ones(win)/win, mode='same')[:, None]
    # Clean peak limiter (no distortion): pull isolated transients down so the whole line can sit louder.
    mix /= np.max(np.abs(mix))
    block = int(.005*RATE)
    peaks = np.abs(mix).max(axis=1)
    padded = np.pad(peaks, (0, -len(peaks) % block)).reshape(-1, block).max(axis=1)
    padded = np.maximum(padded, np.roll(padded, 1))  # hold one block ahead so gain falls before the peak
    limit = np.minimum(1, .55/np.maximum(np.repeat(padded, block)[:len(peaks)], 1e-9))
    limit = np.convolve(limit, np.ones(block)/block, mode='same')
    mix *= limit[:, None]
    mix *= .89/max(np.max(np.abs(mix)), 1e-9)
    mix[-RATE:] *= np.linspace(1, 0, RATE)[:, None]
    return mix

if __name__ == '__main__':
    reprise = '--reprise' in sys.argv
    challenge = '--challenge' in sys.argv
    if challenge:
        TEMPOS = [(0,120)]
        SECTIONS = [(0,8,'First move','MOVE'),(8,12,'Pivot turn','HOLD'),(12,20,'Diagonal arc','MOVE'),(20,24,'Pivot turn','HOLD'),(24,40,'Expand','MOVE'),(40,48,'Hold','HOLD'),(48,64,'Shape the arc','MOVE'),(64,72,'Hold','HOLD'),(72,88,'Contract','MOVE'),(88,112,'Release','HOLD')]
    if reprise:
        TEMPOS = [(0, 96), (32, 108), (64, 96), (96, 84)]
    notes = score()
    if reprise:
        for note in notes:
            note['midi'] += 2
            if note['voice'] != 'tuba':
                note['duration'] *= .85
        # A separate brighter reprise, not the same audio played faster.
    prefix = 'sunrise-challenge' if challenge else 'sunrise-reprise' if reprise else 'sunrise-demo'
    manifest = dict(title='Sunrise — Strauss Fanfare Study', draft=True, revision=3, instrumentation='brass only', totalCounts=TOTAL,
                    tempoChanges=[dict(count=c,bpm=b) for c,b in TEMPOS],
                    beats=[seconds(c) for c in range(TOTAL+1)],
                    sections=[dict(start=a,end=b,name=name,action=act) for a,b,name,act in SECTIONS],
                    notes=notes)
    folder = ROOT/'public/music'
    folder.mkdir(exist_ok=True)
    (folder/('sunrise-challenge-score.json' if challenge else 'sunrise-reprise-score.json' if reprise else 'sunrise-score.json')).write_text(json.dumps(manifest, indent=2)+'\n')
    audio = render(notes)
    with wave.open(str(folder/(prefix+'.wav')),'wb') as out:
        out.setnchannels(2); out.setsampwidth(2); out.setframerate(RATE)
        out.writeframes((audio*32767).astype('<i2').tobytes())
    print(f'Rendered {len(notes)} events; {seconds(TOTAL):.3f}s score + 3s tail; peak {np.max(np.abs(audio)):.3f}')
