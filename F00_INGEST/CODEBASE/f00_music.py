#!/usr/bin/env python3
"""F00-MUSIC: deterministic audio marker extraction for LACRIMAE dev7.
Outputs dev7.music-timeline.v1 JSON; visual F00 stages remain untouched.
"""
import argparse, json, math, subprocess, tempfile
from pathlib import Path

def run(cmd):
    return subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL).strip()

def probe(path):
    duration = float(run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(path)]) or 0)
    sample_rate = int(run(['ffprobe','-v','error','-select_streams','a:0','-show_entries','stream=sample_rate','-of','default=nw=1:nk=1',str(path)]) or 48000)
    return duration, sample_rate

def analyze(path, fps, threshold):
    duration, sample_rate = probe(path)
    sample_rate = 22050
    raw = subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-ac','1','-ar',str(sample_rate),'-f','s16le','-'], stderr=subprocess.DEVNULL)
    samples = [int.from_bytes(raw[i:i+2], 'little', signed=True) / 32768.0 for i in range(0, len(raw)-1, 2)]
    window = max(1, int(sample_rate * 0.05))
    envelope = []
    for i in range(0, len(samples), window):
        chunk = samples[i:i+window]
        if chunk:
            envelope.append(math.sqrt(sum(x*x for x in chunk) / len(chunk)))
    if not envelope:
        envelope = [0.0]
    average = sum(envelope) / len(envelope)
    spread = math.sqrt(sum((x-average)**2 for x in envelope) / len(envelope)) or 1.0
    min_gap = max(1, int(0.18 / 0.05))
    beats = []
    last = -min_gap
    for i in range(1, len(envelope)-1):
        value = envelope[i]
        local = envelope[i-1] <= value >= envelope[i+1]
        strong = value >= max(threshold, average + 0.55 * spread)
        if local and strong and i-last >= min_gap:
            beats.append({'id': f'beat_{len(beats)+1:04d}', 'time_seconds': round(i*0.05, 3), 'frame': round(i*0.05*fps), 'strength': round(value / max(average, 1e-6), 3), 'kind': 'impact' if value >= average + 1.2*spread else 'beat'})
            last = i
    # A conservative tempo estimate from the median detected interval.
    intervals = [beats[i]['time_seconds'] - beats[i-1]['time_seconds'] for i in range(1, len(beats)) if 0.25 <= beats[i]['time_seconds'] - beats[i-1]['time_seconds'] <= 1.5]
    bpm = round(60 / (sum(intervals)/len(intervals)), 1) if intervals else 0
    climax = max(beats, key=lambda b: b['strength'])['time_seconds'] if beats else None
    loop_out = min(4.0, duration) if duration else 4.0
    return {'schema_version':'dev7.music-timeline.v1','enabled':True,'audio_file':path.name,'audio_src':f'./audio/{path.name}','duration_seconds':round(duration,3),'sample_rate':48000,'bpm':bpm,'sync_mode':'assisted','beats':beats,'loop_in':0.0,'loop_out':round(loop_out,3),'loop_count':'auto','loop_enabled':True,'climax_time':climax,'match_cut_start_frame':0,'intro_volume':0.8,'climax_volume':1.0,'match_cut_volume':1.0,'offset_frames':0,'analysis':{'method':'rms-envelope-local-peaks','window_seconds':0.05,'threshold':threshold}}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--audio',required=True,type=Path); ap.add_argument('--output',required=True,type=Path); ap.add_argument('--fps',type=float,default=25); ap.add_argument('--threshold',type=float,default=0.08); args=ap.parse_args()
    if not args.audio.exists(): raise SystemExit(f'audio introuvable: {args.audio}')
    result=analyze(args.audio,args.fps,args.threshold); args.output.parent.mkdir(parents=True,exist_ok=True); args.output.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n'); print(json.dumps({'output':str(args.output),'beats':len(result['beats']),'bpm':result['bpm'],'climax_time':result['climax_time']}))
if __name__=='__main__': main()
