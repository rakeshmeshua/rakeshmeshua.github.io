"""Pre-extract N head-rotation frames (transparent WebP) + a neutral centre frame from source/character.mp4.

Head trajectory (found by inspecting the clip): one clockwise loop UP -> RIGHT -> DOWN -> LEFT -> UP,
then a neutral look-at-camera pose at the end. Anchors below are (compass angle in screen degrees,
y-down, so RIGHT=0, DOWN=90, LEFT=180, UP=270) -> source frame number.

The clip's backdrop is a static dark-blue radial gradient, so it is removed by estimating the backdrop
per pixel (the frame in which that pixel is bluest across the whole clip) and keying on distance from it.
"""
import cv2, numpy as np, os, sys

SRC, OUT, N, QUALITY = "source/character.mp4", "public/frames", 128, 88   # N must match N in CharacterHero.jsx
SUB = 4                                # synthesised in-betweens per source frame step (optical-flow warp)
ANCHORS = [
    ("UP", 270, 18), ("UP-RIGHT", 315, 38), ("RIGHT", 360, 62), ("DOWN-RIGHT", 405, 84),
    ("DOWN", 450, 106), ("DOWN-LEFT", 495, 127), ("LEFT", 540, 150), ("UP-LEFT", 585, 172), ("UP", 630, 195),
]
CENTER_FRAME = 238
STARS = [(1160, 600), (1232, 667)]  # generator sparkle marks, painted out
PREVIEW = len(sys.argv) > 1          # python tools/extract_frames.py <preview-dir>: only write previews

cap = cv2.VideoCapture(SRC); frames = []
while True:
    ok, f = cap.read()
    if not ok: break
    frames.append(f)
H, W = frames[0].shape[:2]
mask = np.zeros((H, W), np.uint8)
for x, y in STARS: cv2.circle(mask, (x, y), 32, 255, -1)
frames = [cv2.inpaint(f, mask, 5, cv2.INPAINT_TELEA) for f in frames]

# backdrop estimate: per pixel, the colour from the frame where it is bluest (b - r highest)
best = np.full((H, W), -999, np.int16); bg = np.zeros((H, W, 3), np.uint8)
for f in frames:
    blue = f[..., 0].astype(np.int16) - f[..., 2].astype(np.int16)
    upd = blue > best
    best[upd] = blue[upd]; bg[upd] = f[upd]
valid = (best >= 30).astype(np.uint8)    # pixel was clearly backdrop (blue) in at least one frame
valid = cv2.erode(valid, np.ones((5, 5), np.uint8)).astype(np.float32)
# smooth backdrop model: normalised blur of the valid pixels, coarse-to-fine to fill the area the head always covers
bgf = bg.astype(np.float32); model = None
for sigma in (250, 100, 40, 15):
    w = cv2.GaussianBlur(valid, (0, 0), sigma)
    est = cv2.GaussianBlur(bgf * valid[..., None], (0, 0), sigma) / np.maximum(w, 1e-4)[..., None]
    conf = np.clip(w * 4, 0, 1)[..., None]
    model = est if model is None else est * conf + model * (1 - conf)
bg = model.astype(np.uint8)

def cutout(f):
    d = np.abs(f.astype(np.int16) - bg.astype(np.int16)).max(axis=2).astype(np.float32)
    a = np.clip((d - 10) / 26, 0, 1)
    # keep the matte tidy: drop specks, close pinholes, soften the edge a touch
    a8 = (a * 255).astype(np.uint8)
    a8 = cv2.morphologyEx(a8, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    a8 = cv2.morphologyEx(a8, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    big = cv2.morphologyEx(a8, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
    a8[:560] = np.maximum(a8[:560], big[:560])   # heal larger gaps on the head (temple/ear), leave the neck-shoulder notch alone
    # the character has no holes: any backdrop-coloured region not connected to the frame border is really her
    n, lab = cv2.connectedComponents((a8 < 128).astype(np.uint8))
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    for i in range(1, n):
        if i not in edge: a8[lab == i] = 255
    a = cv2.GaussianBlur(a8, (0, 0), 0.9).astype(np.float32) / 255
    # remove backdrop colour bleeding into semi-transparent edge pixels
    fa = np.maximum(a, 0.04)[..., None]
    fg = np.clip((f.astype(np.float32) - (1 - a)[..., None] * bg.astype(np.float32)) / fa, 0, 255)
    fg = np.where((a > 0.98)[..., None], f.astype(np.float32), fg)
    return np.dstack([fg.astype(np.uint8), (a * 255).astype(np.uint8)])

def preview(bgra, path):
    a = bgra[..., 3:4].astype(np.float32) / 255
    yy, xx = np.mgrid[0:H, 0:W]; r = np.hypot((xx - W / 2) / (W * .6), (yy - H * .45) / (H * .8))
    light = np.clip(np.stack([255 - 40 * r, 255 - 22 * r, 255 - 8 * r], -1), 0, 255)[..., ::-1]  # BGR
    cv2.imwrite(path, (bgra[..., :3] * a + light * (1 - a)).astype(np.uint8))

# ---- dense pose timeline: every source frame step is split into SUB flow-warped in-betweens ----------
dis = cv2.DISOpticalFlow.create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
small = lambda f: cv2.cvtColor(cv2.resize(f, (640, 360), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
_grid = np.dstack(np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32)))

def flows(a, b):
    ga, gb = small(frames[a]), small(frames[b])
    up = lambda fl: cv2.resize(fl, (W, H)) * 2.0
    return up(dis.calc(ga, gb, None)), up(dis.calc(gb, ga, None))

def synth(a, b, t, fl=None):
    """Frame at fraction t between source frames a and b: each side is warped toward t, then cross-faded
    (the two warps coincide where the flow is right, so this does not double-expose the face)."""
    if t == 0: return frames[a]
    fab, fba = fl or flows(a, b)
    wa = cv2.remap(frames[a], _grid - t * fab, None, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    wb = cv2.remap(frames[b], _grid - (1 - t) * fba, None, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    return cv2.addWeighted(wa, 1 - t, wb, t, 0)

first, last = ANCHORS[0][2], ANCHORS[-1][2]
entries = []   # (a, b, t): a pose on the loop, first..last
for i in range(first, last):
    for j in range(SUB): entries.append((i, i + 1, j / SUB))
entries.append((last, last, 0.0))   # the clip's two UP poses differ too much to morph, so the loop closes with one cut at UP
head = lambda f: cv2.resize(cv2.cvtColor(f[0:620, 280:1000], cv2.COLOR_BGR2GRAY), (180, 155), interpolation=cv2.INTER_AREA).astype(np.float32)
grays = []
for (a, b, t) in entries:
    if t == 0 or a == b: grays.append(head(frames[a])); continue
    fl = flows(a, b) if (a, b) != getattr(synth, "_k", None) else synth._v
    synth._k, synth._v = (a, b), fl
    grays.append(head(synth(a, b, t, fl)))
step = [np.abs(grays[i + 1] - grays[i]).mean() for i in range(len(grays) - 1)]
cum = np.concatenate([[0], np.cumsum(step)])            # cumulative head motion along the loop
anchor_pos = {}                                          # anchor index -> entry index
for k, (name, ang, fr) in enumerate(ANCHORS):
    anchor_pos[k] = len(entries) - 1 if k == len(ANCHORS) - 1 else next(i for i, e in enumerate(entries) if e[0] == fr and e[2] == 0)
per = N // (len(ANCHORS) - 1)
chosen = []
for sgm in range(len(ANCHORS) - 1):
    c0, c1 = cum[anchor_pos[sgm]], cum[anchor_pos[sgm + 1]]
    for j in range(per):                                 # equal head-motion steps inside each 45-degree sector
        target = c0 + (c1 - c0) * j / per
        lo, hi = anchor_pos[sgm], anchor_pos[sgm + 1]
        chosen.append(lo + int(np.argmin(np.abs(cum[lo:hi + 1] - target))))
print("entries:", len(entries), "distinct chosen:", len(set(chosen)), "of", N)
jumps = [np.abs(grays[chosen[(k + 1) % N]] - grays[chosen[k]]).mean() for k in range(N)]
print("jump between neighbouring output frames: median %.1f max %.1f min %.1f" % (np.median(jumps), max(jumps), min(jumps)))

def render(e):
    a, b, t = entries[e]
    return synth(a, b, t)
if PREVIEW:
    os.makedirs(sys.argv[1], exist_ok=True)
    for k in (0, 20, 41, 75, 98, 124, 127): preview(cutout(render(chosen[k])), f"{sys.argv[1]}/k{k}.jpg")
    mids = [e for e, x in enumerate(entries) if x[2] == 0.5][60]
    preview(cutout(render(mids)), f"{sys.argv[1]}/mid.jpg"); preview(cutout(render(len(entries) - 6)), f"{sys.argv[1]}/tail.jpg")
else:
    os.makedirs(OUT, exist_ok=True)
    for fn in os.listdir(OUT): os.remove(os.path.join(OUT, fn))
    for k, e in enumerate(chosen):
        cv2.imwrite(f"{OUT}/f{k:03d}.webp", cutout(render(e)), [cv2.IMWRITE_WEBP_QUALITY, QUALITY])
    cv2.imwrite(f"{OUT}/center.webp", cutout(frames[CENTER_FRAME]), [cv2.IMWRITE_WEBP_QUALITY, QUALITY])
    print("total KB:", sum(os.path.getsize(f"{OUT}/{f}") for f in os.listdir(OUT)) // 1024)
