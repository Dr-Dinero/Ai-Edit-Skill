#!/usr/bin/env python3
"""Measured craft and technical checks for a rendered talking-head short.

Usage:  python3 craft_qc.py <render.mp4> [--plan edit-plan.json] [--out qa/]
Writes <out>/craft-qc.md and <out>/craft-qc.json, plus hero and opening contact sheets.

Checks (FAIL lines; NOT RUN lines need the same check done another way; must be fixed or explained before edit QC can pass):
  specs      1080x1920, video and audio within one frame of each other
  loudness   -14 LUFS (+-1), true peak <= -1.0 dBTP
  opening    first spoken word by 0.5 s, the picture moves in the first 0.5 s
  framing    longest stretch with no framing change (cut or punch-in) <= 6 s
             outside calm sections (8 s inside), and the share of time spent in
             stretches over 4 s
  glitches   1-frame flashes, black frames, frozen runs not explained by a plan event
  joins      sound level right at each cut vs. the speech level (a loud cut is
             inside a word or breath)
  words      fresh speech-to-text of the render vs. the plan's words (>= 95 %)
Measurements are evidence, not taste: a person still has to watch and listen.
"""
import json, os, re, subprocess, sys
import numpy as np

W, H = 72, 128


def frames(path):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'scale={W}:{H},format=gray',
                          '-f', 'rawvideo', '-'], stdout=subprocess.PIPE)
    raw = p.stdout.read(); p.wait()
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)


def audio(path, sr=16000):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)


def probe(path):
    j = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries',
                                   'stream=codec_type,width,height,r_frame_rate,duration', '-of', 'json', path],
                                  capture_output=True, text=True, check=True).stdout)
    v = next(s for s in j['streams'] if s['codec_type'] == 'video')
    a = next(s for s in j['streams'] if s['codec_type'] == 'audio')
    n, d = v['r_frame_rate'].split('/')
    return dict(w=v['width'], h=v['height'], fps=float(n) / float(d), vdur=float(v['duration']), adur=float(a['duration']))


def loudness(path):
    s = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    i = re.findall(r'I:\s+(-?[\d.]+) LUFS', s); tp = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', s)
    return float(i[-1]), float(tp[-1])


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__); sys.exit(1)
    video = args[0]
    opt = lambda k, d=None: args[args.index(k) + 1] if k in args else d
    out = opt('--out', os.path.join(os.path.dirname(os.path.abspath(video)), '..', 'qa'))
    os.makedirs(out, exist_ok=True)
    plan = json.load(open(opt('--plan'))) if opt('--plan') else None
    rows = []
    def row(name, ok, detail):
        rows.append(dict(check=name, result='PASS' if ok else 'FAIL', detail=detail))

    sp = probe(video)
    fps = sp['fps']
    row('specs', sp['w'] == 1080 and sp['h'] == 1920 and abs(sp['vdur'] - sp['adur']) <= 1.5 / fps,
        f"{sp['w']}x{sp['h']} {fps:.3f} fps, video {sp['vdur']:.3f}s, audio {sp['adur']:.3f}s")
    I, TP = loudness(video)
    row('loudness', abs(I + 14) <= 1 and TP <= -1.0, f'{I:.1f} LUFS integrated, {TP:.1f} dBTP true peak')

    F = frames(video)
    d = np.abs(np.diff(F, axis=0)).mean(axis=(1, 2))
    # framing changes: a cut (big jump) or the start of a planned shot
    changes = set(np.where(d > 9)[0] + 1)
    if plan:
        changes |= {int(round(s['start'] * fps)) for s in plan['shots']}
    ch = sorted(changes | {0, len(F)})
    stretches = [(a / fps, (b - a) / fps) for a, b in zip(ch, ch[1:]) if b > a]
    calm = []
    if plan and plan.get('captions'):
        calm = [(c['start'], c['end']) for c in plan['captions'] if c.get('calm')]
    def is_calm(t):
        return any(a - 1 <= t <= b + 1 for a, b in calm)
    worst = max(stretches, key=lambda s: s[1] - (2 if is_calm(s[0]) else 0))
    lim = 8 if is_calm(worst[0]) else 6
    long_share = sum(l for _, l in stretches if l > 4) / (len(F) / fps)
    row('framing', worst[1] <= lim,
        f'{len(stretches)} framing stretches, longest {worst[1]:.1f}s at {worst[0]:.1f}s (limit {lim}s); '
        f'{long_share:.0%} of runtime sits in stretches over 4 s')

    move = float(np.abs(F[min(15, len(F) - 1)] - F[0]).mean())
    a16 = audio(video)
    env = np.sqrt(np.convolve(a16 ** 2, np.ones(160) / 160, mode='same'))
    db = 20 * np.log10(env + 1e-9)
    speech = np.percentile(db, 70)
    first_sound = float(np.argmax(db > speech - 12) / 16000)
    row('opening', first_sound <= 0.5 and (move >= 1.5 or any(c < 15 for c in changes if c)),
        f'first speech at {first_sound:.2f}s, picture change in first 0.5 s = {move:.1f}')

    planned = set()
    if plan:
        for key in ('slams', 'chips'):
            for e in plan.get(key) or []:
                planned |= {int(round(e['start'] * fps)), int(round(e['end'] * fps))}
        planned |= {int(round(s['start'] * fps)) for s in plan['shots']}
    near = lambda i: any(abs(i - p) <= 3 for p in planned)
    issues = []
    bright = F.mean(axis=(1, 2))
    for i in range(1, len(d) - 1):
        if d[i] > 18 and d[i + 1] > 0.6 * d[i] and not near(i + 1):
            issues.append(f'flash at {(i + 1) / fps:.2f}s')
    for i, b in enumerate(bright):
        if b < 8 and 0 < i < len(F) - 1:
            issues.append(f'black frame at {i / fps:.2f}s')
    run = 0
    for i, x in enumerate(d):
        run = run + 1 if x < 0.05 else 0
        if run == 8:
            issues.append(f'frozen picture from {(i - 7) / fps:.2f}s')
    row('glitches', not issues, ', '.join(issues[:12]) or 'no unplanned flashes, black frames, or freezes')

    if plan:
        loud = []
        for j in plan['joins']:
            k = int(j * 16000)
            w = db[max(0, k - 80):k + 80]
            if len(w) and w.max() > speech - 8:
                loud.append(f'{j:.2f}s ({w.max() - speech:+.0f} dB vs speech)')
        row('joins', not loud, f"{len(plan['joins'])} cuts; " + (', '.join(loud) if loud else 'all sit in quiet'))

        try:
            from faster_whisper import WhisperModel
            m = WhisperModel('small', compute_type='int8')
            segs, _ = m.transcribe(a16, language='en', word_timestamps=False, vad_filter=True)
            heard = re.findall(r"[a-z']+", ' '.join(s.text for s in segs).lower())
            want = re.findall(r"[a-z']+", ' '.join(w['t'] for w in plan['words']).lower().replace('-', ' '))
            import difflib
            sm = difflib.SequenceMatcher(a=want, b=heard, autojunk=False)
            ratio = sum(b.size for b in sm.get_matching_blocks()) / max(1, len(want))
            row('words', ratio >= 0.95, f'{ratio:.1%} of planned words heard in the render ({len(heard)} heard, {len(want)} planned)')
        except Exception as e:      # not installed, or the model download is blocked
            rows.append(dict(check='words', result='NOT RUN',
                             detail=f'speech-to-text unavailable ({type(e).__name__}); transcribe the render '
                                    'with the job provider and compare by hand'))

    # contact sheets for the human pass
    ff = lambda *a: subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], check=True)
    ff('-i', video, '-vf', 'fps=1/6,scale=270:-1,tile=6x5', '-frames:v', '1', os.path.join(out, 'hero-sheet.jpg'))
    ff('-i', video, '-t', '3', '-vf', 'fps=4,scale=270:-1,tile=6x2', '-frames:v', '1', os.path.join(out, 'opening-sheet.jpg'))

    fails = [r for r in rows if r['result'] == 'FAIL']
    md = ['# Craft QC (measured)', '', f'Render: `{video}`', '',
          '| Check | Result | Detail |', '| --- | --- | --- |']
    md += [f"| {r['check']} | {r['result']} | {r['detail']} |" for r in rows]
    md += ['', 'Contact sheets: `hero-sheet.jpg`, `opening-sheet.jpg`.',
           'These numbers do not replace watching and listening to the render.']
    open(os.path.join(out, 'craft-qc.md'), 'w').write('\n'.join(md) + '\n')
    json.dump(rows, open(os.path.join(out, 'craft-qc.json'), 'w'), indent=1)
    print('\n'.join(md))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
