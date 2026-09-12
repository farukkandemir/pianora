"""
Builds a SoundFont (.sf2) for piano.learn from the Salamander Grand Piano V3
16-bit set. Stdlib only.

- Keeps the note samples only (no release/pedal/resonance layers: SF2 has no
  release triggers and Apple's sampler ignores them anyway).
- Merges the 16 velocity layers into LAYERS by pairing neighbours and keeping
  the louder sample of each pair with the union of their velocity ranges.
- Trims every sample to MAX_SEC with a FADE_SEC linear fade so the whole
  bank fits in a phone's memory (Apple's sampler keeps samples in RAM).
- Stereo: each region becomes two SF2 samples (L/R) linked to each other,
  with two instrument zones panned hard left/right.
"""
import array, os, re, struct, sys, wave, math

SRC = sys.argv[1]            # folder containing SalamanderGrandPianoV3.sfz
OUT = sys.argv[2]            # output .sf2 path
LAYERS = int(sys.argv[3]) if len(sys.argv) > 3 else 8
MAX_SEC = float(sys.argv[4]) if len(sys.argv) > 4 else 8.0
FADE_SEC = float(sys.argv[5]) if len(sys.argv) > 5 else 1.5
RELEASE_SEC = 1.0            # sfz: ampeg_release=1 on the note group

# ---- parse the note regions from the sfz -------------------------------------------------
regions = []
NOTE_NUM = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
def root_from_name(sample):
    m = re.match(r'([A-G]#?)(\d)v\d+\.wav$', os.path.basename(sample))
    return (int(m.group(2)) + 1) * 12 + NOTE_NUM[m.group(1)]
with open(os.path.join(SRC, 'SalamanderGrandPianoV3.sfz'), encoding='latin-1') as f:
    for line in f:
        if 'trigger=release' in line:
            break  # note regions end where the release-trigger groups begin
        if line.startswith('<region>'):
            kv = dict(re.findall(r'(\w+)=(\S+)', line))
            sample = kv['sample'].replace('\\', '/')
            regions.append({
                'sample': sample,
                'lokey': int(kv['lokey']), 'hikey': int(kv['hikey']),
                'lovel': int(kv.get('lovel', 1)), 'hivel': int(kv.get('hivel', 127)),
                'root': int(kv['pitch_keycenter']) if 'pitch_keycenter' in kv else root_from_name(sample),
            })
print('note regions in sfz:', len(regions))

# group by root, sort by velocity, merge pairs
by_root = {}
for r in regions:
    by_root.setdefault(r['root'], []).append(r)
merged = []
per = 16 // LAYERS
for root, rs in sorted(by_root.items()):
    rs.sort(key=lambda r: r['lovel'])
    assert len(rs) == 16, (root, len(rs))
    for i in range(0, 16, per):
        chunk = rs[i:i + per]
        top = chunk[-1]
        merged.append({**top, 'lovel': chunk[0]['lovel'], 'hivel': chunk[-1]['hivel']})
merged[-1]['hivel'] = 127
if os.environ.get('MAX_REGIONS'): merged = merged[:int(os.environ['MAX_REGIONS'])]
print('regions after merge:', len(merged))

# ---- load, trim, fade samples --------------------------------------------------------------
smpl = array.array('h')      # all sample data, mono runs, 46 zero pad after each
headers = []                 # shdr records
def add_sample(name, data, rate, root, link_index, stype):
    start = len(smpl)
    smpl.extend(data)
    smpl.extend([0] * 46)
    end = start + len(data)
    headers.append(dict(name=name, start=start, end=end, rate=rate, root=root, link=link_index, type=stype))
    return len(headers) - 1

zones = []  # (lokey,hikey,lovel,hivel,root,sampleL,sampleR)
for r in merged:
    path = os.path.join(SRC, r['sample'])
    w = wave.open(path)
    assert w.getnchannels() == 2 and w.getsampwidth() == 2, path
    rate = w.getframerate()
    n = min(w.getnframes(), int(MAX_SEC * rate))
    frames = array.array('h'); frames.frombytes(w.readframes(n)); w.close()
    if sys.byteorder == 'big': frames.byteswap()
    L = frames[0::2]; R = frames[1::2]
    fade = min(int(FADE_SEC * rate), n)
    if n == int(MAX_SEC * rate):  # only fade samples we actually cut
        for i in range(fade):
            g = (fade - i) / fade
            j = n - fade + i
            L[j] = int(L[j] * g); R[j] = int(R[j] * g)
    base = os.path.splitext(os.path.basename(path))[0]
    li = len(headers); ri = li + 1
    add_sample((base + 'L')[:20], L, rate, r['root'], ri, 4)   # 4 = leftSample
    add_sample((base + 'R')[:20], R, rate, r['root'], li, 2)   # 2 = rightSample
    zones.append((r['lokey'], r['hikey'], r['lovel'], r['hivel'], r['root'], li, ri))
    if len(zones) % 40 == 0: print('  loaded', len(zones), 'regions')
print('samples:', len(headers), 'PCM MB:', round(len(smpl) * 2 / 1e6))

# ---- build pdta -----------------------------------------------------------------------------
def gen(op, value):  # value: int (signed short) or (lo,hi) range
    if isinstance(value, tuple):
        return struct.pack('<HBB', op, value[0], value[1])
    return struct.pack('<Hh', op, value)

GEN_PAN, GEN_RELEASE, GEN_INSTRUMENT, GEN_KEYRANGE, GEN_VELRANGE, GEN_SAMPLEID, GEN_SAMPLEMODES, GEN_ROOTKEY = 17, 38, 41, 43, 44, 53, 54, 58
release_tc = int(round(1200 * math.log2(RELEASE_SEC)))

igen = bytearray(); ibag = bytearray(); imod = bytearray()
def ibag_add():
    ibag.extend(struct.pack('<HH', len(igen) // 4, len(imod) // 10))
# global zone: release envelope, plus a velocity->attenuation modulator that
# overrides the SF2 default (960 cB). 700 ~ Salamander's amp_veltrack=73: the
# velocity layers carry most of the dynamics, the curve only adds the rest.
ibag_add(); igen.extend(gen(GEN_RELEASE, release_tc))
imod.extend(struct.pack('<HHhHH', 0x0502, 48, 700, 0, 0))
for lokey, hikey, lovel, hivel, root, li, ri in zones:
    for sid, pan in ((li, -500), (ri, 500)):
        ibag_add()
        igen.extend(gen(GEN_KEYRANGE, (lokey, hikey)))
        igen.extend(gen(GEN_VELRANGE, (lovel, hivel)))
        igen.extend(gen(GEN_PAN, pan))
        igen.extend(gen(GEN_ROOTKEY, root))
        igen.extend(gen(GEN_SAMPLEMODES, 0))
        igen.extend(gen(GEN_SAMPLEID, sid))
ibag_add()                      # terminal bag
igen.extend(gen(0, 0))          # terminal gen
imod.extend(bytes(10))          # terminal mod

inst = bytearray()
inst.extend(struct.pack('<20sH', b'Salamander Grand', 0))
inst.extend(struct.pack('<20sH', b'EOI', len(ibag) // 4 - 1))

pgen = bytearray(gen(GEN_INSTRUMENT, 0) + gen(0, 0))
pbag = bytearray(struct.pack('<HH', 0, 0) + struct.pack('<HH', 1, 0))
pmod = bytearray(bytes(10))
phdr = bytearray()
phdr.extend(struct.pack('<20sHHHIII', b'Salamander Grand Piano', 0, 0, 0, 0, 0, 0))
phdr.extend(struct.pack('<20sHHHIII', b'EOP', 0, 0, 1, 0, 0, 0))

shdr = bytearray()
for h in headers:
    shdr.extend(struct.pack('<20sIIIIIBbHH', h['name'].encode(), h['start'], h['end'], h['start'], h['end'], h['rate'], h['root'], 0, h['link'], h['type']))
shdr.extend(struct.pack('<20sIIIIIBbHH', b'EOS', 0, 0, 0, 0, 0, 0, 0, 0, 0))

def chunk(id_, data):
    if len(data) % 2: data += b'\0'
    return id_.encode() + struct.pack('<I', len(data)) + data
def list_chunk(kind, *chunks):
    body = kind.encode() + b''.join(chunks)
    return b'LIST' + struct.pack('<I', len(body)) + body

info = list_chunk('INFO',
    chunk('ifil', struct.pack('<HH', 2, 1)),
    chunk('isng', b'EMU8000\0'),
    chunk('INAM', b'Salamander Grand Piano for piano.learn\0'),
    chunk('IENG', b'Alexander Holm\0'),
    chunk('ICOP', b'Salamander Grand Piano V3 by Alexander Holm, CC BY 3.0. Trimmed for mobile.\0'),
    chunk('ICMT', f'{LAYERS} velocity layers, samples capped at {MAX_SEC}s.\0'.encode()),
)
if sys.byteorder == 'big': smpl.byteswap()
sdta = list_chunk('sdta', chunk('smpl', smpl.tobytes()))
pdta = list_chunk('pdta',
    chunk('phdr', bytes(phdr)), chunk('pbag', bytes(pbag)), chunk('pmod', bytes(pmod)), chunk('pgen', bytes(pgen)),
    chunk('inst', bytes(inst)), chunk('ibag', bytes(ibag)), chunk('imod', bytes(imod)), chunk('igen', bytes(igen)),
    chunk('shdr', bytes(shdr)))
body = b'sfbk' + info + sdta + pdta
with open(OUT, 'wb') as f:
    f.write(b'RIFF' + struct.pack('<I', len(body)) + body)
print('wrote', OUT, round(os.path.getsize(OUT) / 1e6), 'MB')
