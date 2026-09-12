// Loads a SoundFont into Apple's sampler (the same one iOS uses) and renders a
// short phrase offline to a WAV file. Usage: swift render.swift in.sf2 out.wav
import AVFoundation
import Foundation
setvbuf(stdout, nil, _IONBF, 0)

let args = CommandLine.arguments
guard args.count == 3 else { print("usage: render.swift in.sf2 out.wav"); exit(2) }
let sf2 = URL(fileURLWithPath: args[1]); let out = URL(fileURLWithPath: args[2])

let engine = AVAudioEngine()
let sampler = AVAudioUnitSampler()
engine.attach(sampler)
let format = AVAudioFormat(standardFormatWithSampleRate: 44100, channels: 2)!
engine.connect(sampler, to: engine.mainMixerNode, format: format)
let t0 = Date()
do {
  try sampler.loadSoundBankInstrument(at: sf2, program: 0, bankMSB: UInt8(kAUSampler_DefaultMelodicBankMSB), bankLSB: UInt8(kAUSampler_DefaultBankLSB))
} catch { print("LOAD FAILED:", error); exit(1) }
print("loaded in", String(format: "%.1f", Date().timeIntervalSince(t0)), "s")
try! engine.enableManualRenderingMode(.offline, format: format, maximumFrameCount: 4096)
try! engine.start()

// Phrase: C major arpeggio at rising velocities, then a held chord, then a soft high note.
struct Ev { let t: Double; let on: Bool; let note: UInt8; let vel: UInt8 }
var evs: [Ev] = []
let arp: [(UInt8, UInt8)] = [(48, 30), (52, 50), (55, 70), (60, 90), (64, 110), (67, 127)]
for (i, (n, v)) in arp.enumerated() { let t = Double(i) * 0.35; evs += [Ev(t: t, on: true, note: n, vel: v), Ev(t: t + 0.6, on: false, note: n, vel: 0)] }
for n: UInt8 in [36, 48, 55, 60, 64, 67, 72] { evs += [Ev(t: 2.6, on: true, note: n, vel: 80), Ev(t: 5.6, on: false, note: n, vel: 0)] }
evs += [Ev(t: 6.0, on: true, note: 84, vel: 40), Ev(t: 7.5, on: false, note: 84, vel: 0)]
evs.sort { $0.t < $1.t }

let total = 9.0
let totalFrames = Int(total * 44100)
let file = try! AVAudioFile(forWriting: out, settings: format.settings, commonFormat: .pcmFormatFloat32, interleaved: false)
let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: engine.manualRenderingMaximumFrameCount)!
var renderedFrames = 0; var next = 0
var peak: Float = 0
while renderedFrames < totalFrames {
  let now = Double(renderedFrames) / 44100
  while next < evs.count && evs[next].t <= now {
    let e = evs[next]; next += 1
    if e.on { sampler.startNote(e.note, withVelocity: e.vel, onChannel: 0) } else { sampler.stopNote(e.note, onChannel: 0) }
  }
  let frames = AVAudioFrameCount(min(1024, totalFrames - renderedFrames))
  let status = try! engine.renderOffline(frames, to: buf)
  guard status == .success, buf.frameLength > 0 else { print("render status", status.rawValue, "frames", buf.frameLength); break }
  for c in 0..<2 { let p = buf.floatChannelData![c]; for i in 0..<Int(buf.frameLength) { peak = max(peak, abs(p[i])) } }
  try! file.write(from: buf)
  renderedFrames += Int(buf.frameLength)
}
let rendered = Double(renderedFrames) / 44100
print("rendered", String(format: "%.1f", rendered), "s, peak", peak)
engine.stop()
exit(0)
