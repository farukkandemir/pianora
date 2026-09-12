import AVFoundation
import ExpoModulesCore

/// Piano playback for "Listen".
///
/// - `load(path)` puts a SoundFont into Apple's sampler (AVAudioUnitSampler)
///   and starts the audio engine. The sampler maps the file rather than
///   copying it, so a ~300 MB bank loads in well under a second.
/// - `play(midiBase64)` hands a Standard MIDI File to AVAudioSequencer, which
///   drives the sampler with sample-accurate timing on the audio thread.
///   While playing, `onPosition` fires ~30 times a second with the position
///   in milliseconds; `onEnded` fires once at the end.
/// - `stop()` halts the sequencer and silences held notes.
public class PianoSoundModule: Module {
  private let engine = AVAudioEngine()
  private let sampler = AVAudioUnitSampler()
  private var sequencer: AVAudioSequencer?
  private var ticker: Timer?
  private var lengthSeconds: Double = 0
  private var loadedPath: String?

  public func definition() -> ModuleDefinition {
    Name("PianoSound")

    Events("onPosition", "onEnded")

    OnCreate {
      self.engine.attach(self.sampler)
      self.engine.connect(self.sampler, to: self.engine.mainMixerNode, format: nil)
      NotificationCenter.default.addObserver(
        self, selector: #selector(self.onInterruption(_:)),
        name: AVAudioSession.interruptionNotification, object: nil)
    }

    OnDestroy {
      self.stopPlayback(emitEnded: false)
      self.engine.stop()
      NotificationCenter.default.removeObserver(self)
    }

    Function("isLoaded") { () -> Bool in
      return self.loadedPath != nil
    }

    AsyncFunction("load") { (path: String) in
      if self.loadedPath == path { return }
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.playback, mode: .default, options: [])
      try session.setActive(true)
      try self.sampler.loadSoundBankInstrument(
        at: URL(fileURLWithPath: path), program: 0,
        bankMSB: UInt8(kAUSampler_DefaultMelodicBankMSB), bankLSB: UInt8(kAUSampler_DefaultBankLSB))
      if !self.engine.isRunning { try self.engine.start() }
      self.loadedPath = path
    }

    AsyncFunction("play") { (midiBase64: String) in
      guard self.loadedPath != nil else { throw Exception(name: "E_NOT_LOADED", description: "Load a SoundFont before playing") }
      guard let data = Data(base64Encoded: midiBase64) else { throw Exception(name: "E_BAD_MIDI", description: "MIDI data is not valid base64") }
      self.stopPlayback(emitEnded: false)
      if !self.engine.isRunning { try self.engine.start() }
      let seq = AVAudioSequencer(audioEngine: self.engine)
      try seq.load(from: data, options: [])
      for track in seq.tracks { track.destinationAudioUnit = self.sampler }
      self.lengthSeconds = seq.tracks.map { $0.lengthInSeconds }.max() ?? 0
      seq.currentPositionInSeconds = 0
      seq.prepareToPlay()
      try seq.start()
      self.sequencer = seq
      self.startTicker()
    }.runOnQueue(.main)

    Function("stop") {
      self.stopPlayback(emitEnded: false)
    }

    Function("positionMs") { () -> Double in
      return (self.sequencer?.currentPositionInSeconds ?? 0) * 1000
    }

    Function("unload") {
      self.stopPlayback(emitEnded: false)
      self.engine.stop()
      self.loadedPath = nil
    }
  }

  private func startTicker() {
    ticker?.invalidate()
    ticker = Timer.scheduledTimer(withTimeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in
      guard let self = self, let seq = self.sequencer else { return }
      let pos = seq.currentPositionInSeconds
      if pos >= self.lengthSeconds || !seq.isPlaying {
        self.stopPlayback(emitEnded: true)
        return
      }
      self.sendEvent("onPosition", ["ms": pos * 1000])
    }
    RunLoop.main.add(ticker!, forMode: .common)
  }

  private func stopPlayback(emitEnded: Bool) {
    ticker?.invalidate()
    ticker = nil
    if let seq = sequencer {
      if seq.isPlaying { seq.stop() }
      sequencer = nil
    }
    // Release anything still sounding: CC 123 = all notes off.
    sampler.sendController(123, withValue: 0, onChannel: 0)
    if emitEnded { sendEvent("onEnded", [:]) }
  }

  /// A phone call or another app taking the audio session stops Listen.
  @objc private func onInterruption(_ note: Notification) {
    guard let info = note.userInfo, let raw = info[AVAudioSessionInterruptionTypeKey] as? UInt,
          AVAudioSession.InterruptionType(rawValue: raw) == .began else { return }
    DispatchQueue.main.async { self.stopPlayback(emitEnded: true) }
  }
}
