"""
Regenerates public/trilha.mp3 (python3 scripts/compose-trilha.py tema.wav, then
ffmpeg -i tema.wav -af volume=-6.6dB -c:a libmp3lame -b:a 128k public/trilha.mp3). Needs numpy.

"Galhaween" background theme, composed and synthesized here from scratch (no samples, no third-party
material). D harmonic minor, 100 BPM, 16 bars = 38.4 s, built to loop seamlessly: two cycles are
rendered and the second is kept, so reverb tails from the end carry into the start.
Layers: dark pad, music-box melody, a muffled four-on-the-floor kick as if heard through the walls
of the party, sub bass, a church bell on bars 1 and 9, and wind.
"""
import sys
import numpy as np

SR = 44100
BPM = 100
BEAT = 60 / BPM
BARS = 16
CYCLE = BARS * 4 * BEAT
rng = np.random.default_rng(7)
N = int(CYCLE * SR) * 2
t_all = np.arange(N) / SR

def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)

def env_adsr(n, a, d, s, r, sr=SR):
    a_n, d_n, r_n = int(a * sr), int(d * sr), int(r * sr)
    s_n = max(n - a_n - d_n - r_n, 0)
    e = np.concatenate([np.linspace(0, 1, a_n, endpoint=False), np.linspace(1, s, d_n, endpoint=False), np.full(s_n, s), np.linspace(s, 0, r_n)])
    return np.pad(e, (0, max(0, n - len(e))))[:n]

def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if lo:
        g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(X * g, len(x))

def reverb(x, seconds=2.8, mix=0.35):
    n = int(seconds * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * (6.9 / seconds))
    ir = fft_filter(ir, lo=200, hi=5000)
    ir /= np.sqrt(np.sum(ir ** 2))
    L = len(x) + n
    size = 1 << (L - 1).bit_length()
    wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return (1 - mix) * x + mix * wet

def place(buf, sig, start):
    i = int(start * SR)
    if i >= len(buf):
        return
    end = min(len(buf), i + len(sig))
    buf[i:end] += sig[: end - i]

# Harmony: Dm | Bb | Gm | A (4 bars each), A major for the harmonic-minor pull back to Dm.
CHORDS = [[50, 53, 57, 62], [46, 50, 53, 58], [43, 46, 50, 55], [45, 49, 52, 57]]
ROOTS = [38, 34, 31, 33]

pad = np.zeros(N)
bass = np.zeros(N)
for cycle in range(2):
    for ci, chord in enumerate(CHORDS):
        start = cycle * CYCLE + ci * 4 * 4 * BEAT
        dur = 4 * 4 * BEAT
        n = int((dur + 1.5) * SR)
        tt = np.arange(n) / SR
        e = env_adsr(n, 1.2, 0.5, 0.8, 2.0)
        voice = np.zeros(n)
        for note in chord:
            for det in (-0.12, 0.0, 0.11):
                f = hz(note + det)
                ph = rng.random()
                # soft saw: a few harmonics only, so it stays dark
                for k in range(1, 7):
                    voice += np.sin(2 * np.pi * f * k * tt + ph * k) / k * (0.85 ** k)
        voice *= e * (1 + 0.15 * np.sin(2 * np.pi * 0.21 * tt))
        place(pad, voice, start)
        # sub bass: root on every beat, short and round, follows the kick
        for b in range(16):
            n_b = int(0.42 * SR)
            tb = np.arange(n_b) / SR
            sb = np.sin(2 * np.pi * hz(ROOTS[ci]) * tb) * np.exp(-tb * 7) * env_adsr(n_b, 0.01, 0.05, 1, 0.08)
            place(bass, sb, start + b * BEAT + BEAT * 0.5)  # off-beat bass, house style
pad = fft_filter(pad, lo=90, hi=1400)

# Muffled kick: four on the floor, low-passed hard, like the party behind a wall.
kick = np.zeros(N)
n_k = int(0.35 * SR)
tk = np.arange(n_k) / SR
freq = 45 + 85 * np.exp(-tk * 30)
k_sig = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-tk * 9)
for b in range(int(2 * CYCLE / BEAT)):
    bar = (b // 4) % BARS
    if bar in (0, 1):  # the beat comes in on bar 3, so the loop opens on the bell
        continue
    place(kick, k_sig, b * BEAT)
kick = fft_filter(kick, hi=160)

# Music box: inharmonic bell partials, quick attack, long decay.
def music_box(f, dur=1.6):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    s = np.zeros(n)
    for ratio, amp, decay in [(1, 1, 2.8), (2.0, 0.35, 4.5), (3.01, 0.18, 6), (4.17, 0.12, 8), (5.43, 0.06, 10)]:
        s += amp * np.sin(2 * np.pi * f * ratio * tt) * np.exp(-tt * decay)
    return s * env_adsr(n, 0.004, 0.0, 1, 0.05)

# Melody in eighths over each chord (scale degrees as MIDI); None = rest.
PHRASES = [
    [74, None, 77, 76, 74, None, 69, None, 70, None, 69, 67, 69, None, None, None],
    [70, None, 74, 72, 70, None, 65, None, 67, None, 65, 62, 65, None, None, None],
    [67, None, 70, 69, 67, None, 62, None, 63, None, 62, 60, 62, None, None, None],
    [69, None, 73, 76, 73, None, 69, None, 64, None, 67, 69, 73, None, 76, None],
]
box = np.zeros(N)
for cycle in range(2):
    for ci, phrase in enumerate(PHRASES):
        for rep in range(2):  # each 2-bar phrase twice per chord (4 bars)
            start = cycle * CYCLE + (ci * 4 + rep * 2) * 4 * BEAT
            first_half = ci * 4 + rep * 2 < 8
            for i, note in enumerate(phrase):
                if note is None:
                    continue
                if first_half and i % 2 == 1:  # sparser in the first half of the loop
                    continue
                vel = 0.55 + 0.25 * rng.random()
                place(box, vel * music_box(hz(note + 12)), start + i * BEAT / 2)
box = fft_filter(box, lo=300, hi=7000)

# Church bell on bars 1 and 9.
bell = np.zeros(N)
n_bell = int(6 * SR)
tb = np.arange(n_bell) / SR
bell_sig = np.zeros(n_bell)
for ratio, amp, decay in [(0.5, 0.6, 0.5), (1, 1, 0.7), (1.19, 0.5, 0.9), (1.5, 0.35, 1.1), (2, 0.4, 1.4), (2.74, 0.2, 2.2), (3.76, 0.1, 3)]:
    bell_sig += amp * np.sin(2 * np.pi * hz(50) * ratio * tb) * np.exp(-tb * decay)
for cycle in range(2):
    for bar in (0, 8):
        place(bell, bell_sig * 0.6, cycle * CYCLE + bar * 4 * BEAT)

# Wind: band-limited noise that swells.
wind = fft_filter(rng.standard_normal(N), lo=250, hi=900)
wind *= 0.5 + 0.5 * np.sin(2 * np.pi * t_all / CYCLE * 2 - 1.2) ** 2

def norm(x):
    return x / (np.max(np.abs(x)) + 1e-9)

mix = (
    0.30 * reverb(norm(pad), 3.5, 0.45)
    + 0.30 * norm(bass)
    + 0.55 * norm(kick)
    + 0.32 * reverb(norm(box), 2.8, 0.45)
    + 0.32 * reverb(norm(bell), 4.0, 0.5)
    + 0.06 * norm(wind)
)
loop = mix[int(CYCLE * SR): int(2 * CYCLE * SR)]
loop = np.tanh(loop * 1.4) / np.tanh(1.4)
loop = loop / np.max(np.abs(loop)) * 0.89
# Stereo: a little width from a short delay on the right channel.
d = int(0.012 * SR)
right = np.concatenate([loop[-d:], loop[:-d]])
stereo = np.stack([loop, 0.85 * right + 0.15 * loop], axis=1)
pcm = (stereo * 32767).astype("<i2")
out = sys.argv[1]
import wave
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("seconds", len(loop) / SR)
