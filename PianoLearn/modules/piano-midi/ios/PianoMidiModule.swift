import CoreAudioKit
import CoreMIDI
import ExpoModulesCore
import UIKit

/// MIDI input for PianoLearn.
///
/// - Opens one CoreMIDI client + input port and connects every MIDI source
///   (USB, Bluetooth, network, virtual). iOS presents a paired Bluetooth MIDI
///   keyboard as a normal CoreMIDI source, so no separate BLE code is needed.
/// - Emits `onMidiMessage` for each channel-voice message and
///   `onSourcesChanged` whenever devices appear or disappear.
/// - `showBluetoothPairing` presents Apple's built-in pairing screen.
public class PianoMidiModule: Module {
  private var client = MIDIClientRef()
  private var inputPort = MIDIPortRef()
  private var connectedSources: [MIDIEndpointRef] = []
  /// Stable per-source refCon pointers (uniqueID -> pointer). Never freed
  /// until teardown so the receive callback can't read a dangling pointer.
  private var refCons: [Int32: UnsafeMutablePointer<Int32>] = [:]
  private var pairingDelegate: PairingDelegate?
  private var timebase = mach_timebase_info_data_t()

  public func definition() -> ModuleDefinition {
    Name("PianoMidi")

    Events("onMidiMessage", "onSourcesChanged")

    OnCreate {
      mach_timebase_info(&self.timebase)
      self.setup()
    }

    OnDestroy {
      self.teardown()
    }

    Function("listSources") { () -> [[String: Any]] in
      return self.listSources()
    }

    AsyncFunction("showBluetoothPairing") { (promise: Promise) in
      guard let presenter = self.appContext?.utilities?.currentViewController() else {
        promise.reject("E_NO_VIEW_CONTROLLER", "No view controller available to present from")
        return
      }
      let picker = CABTMIDICentralViewController()
      let nav = UINavigationController(rootViewController: picker)
      nav.modalPresentationStyle = .formSheet

      let finish: () -> Void = { [weak self] in
        self?.pairingDelegate = nil
        self?.refreshConnections()
        promise.resolve(nil)
      }
      let delegate = PairingDelegate(onDismiss: finish)
      self.pairingDelegate = delegate
      nav.presentationController?.delegate = delegate
      picker.navigationItem.rightBarButtonItem = UIBarButtonItem(
        systemItem: .done,
        primaryAction: UIAction { _ in nav.dismiss(animated: true, completion: finish) }
      )
      presenter.present(nav, animated: true)
    }.runOnQueue(.main)
  }

  // MARK: - CoreMIDI setup

  private func setup() {
    let clientStatus = MIDIClientCreateWithBlock("PianoLearn" as CFString, &client) { [weak self] notification in
      switch notification.pointee.messageID {
      case .msgSetupChanged, .msgObjectAdded, .msgObjectRemoved:
        DispatchQueue.main.async { self?.refreshConnections() }
      default:
        break
      }
    }
    guard clientStatus == noErr else {
      NSLog("PianoMidi: MIDIClientCreate failed (\(clientStatus))")
      return
    }

    let portStatus = MIDIInputPortCreateWithProtocol(client, "PianoLearn Input" as CFString, ._1_0, &inputPort) {
      [weak self] eventList, srcConnRefCon in
      self?.receive(eventList: eventList, refCon: srcConnRefCon)
    }
    guard portStatus == noErr else {
      NSLog("PianoMidi: MIDIInputPortCreate failed (\(portStatus))")
      return
    }

    refreshConnections()
  }

  private func teardown() {
    for source in connectedSources {
      MIDIPortDisconnectSource(inputPort, source)
    }
    connectedSources.removeAll()
    if inputPort != 0 { MIDIPortDispose(inputPort); inputPort = 0 }
    if client != 0 { MIDIClientDispose(client); client = 0 }
    for (_, ptr) in refCons { ptr.deallocate() }
    refCons.removeAll()
  }

  private func refreshConnections() {
    guard inputPort != 0 else { return }
    for source in connectedSources {
      MIDIPortDisconnectSource(inputPort, source)
    }
    connectedSources.removeAll()

    for index in 0..<MIDIGetNumberOfSources() {
      let source = MIDIGetSource(index)
      let refCon = refConPointer(for: uniqueID(of: source))
      if MIDIPortConnectSource(inputPort, source, refCon) == noErr {
        connectedSources.append(source)
      }
    }
    sendEvent("onSourcesChanged", ["sources": listSources()])
  }

  private func refConPointer(for uid: Int32) -> UnsafeMutablePointer<Int32> {
    if let existing = refCons[uid] { return existing }
    let ptr = UnsafeMutablePointer<Int32>.allocate(capacity: 1)
    ptr.initialize(to: uid)
    refCons[uid] = ptr
    return ptr
  }

  // MARK: - Receiving

  /// Runs on CoreMIDI's high-priority thread. Keep it allocation-light and
  /// hand results to the main queue for delivery to JS.
  private func receive(eventList: UnsafePointer<MIDIEventList>, refCon: UnsafeMutableRawPointer?) {
    let sourceId = refCon?.assumingMemoryBound(to: Int32.self).pointee ?? 0
    var messages: [[String: Any]] = []

    for packet in eventList.unsafeSequence() {
      let timestampMs = hostTicksToMilliseconds(packet.pointee.timeStamp)
      let count = Int(packet.pointee.wordCount)
      // `words` is a fixed-size C array (tuple in Swift); read it by pointer.
      withUnsafePointer(to: packet.pointee.words) { tuplePtr in
        tuplePtr.withMemoryRebound(to: UInt32.self, capacity: count) { words in
          for i in 0..<count {
            let word = words[i]
            // Universal MIDI Packet: message type 0x2 = MIDI 1.0 channel voice.
            guard (word >> 28) & 0xF == 0x2 else { continue }
            let status = UInt8((word >> 16) & 0xFF)
            let data1 = Int((word >> 8) & 0x7F)
            let data2 = Int(word & 0x7F)
            messages.append(decode(status: status, data1: data1, data2: data2, sourceId: Int(sourceId), timestampMs: timestampMs))
          }
        }
      }
    }

    guard !messages.isEmpty else { return }
    DispatchQueue.main.async { [weak self] in
      for message in messages {
        self?.sendEvent("onMidiMessage", message)
      }
    }
  }

  private func decode(status: UInt8, data1: Int, data2: Int, sourceId: Int, timestampMs: Double) -> [String: Any] {
    let kind = status & 0xF0
    let channel = Int(status & 0x0F)
    var body: [String: Any] = ["channel": channel, "sourceId": sourceId, "timestampMs": timestampMs]
    switch kind {
    case 0x90 where data2 > 0:
      body["type"] = "noteOn"; body["note"] = data1; body["velocity"] = data2
    case 0x80, 0x90:
      body["type"] = "noteOff"; body["note"] = data1; body["velocity"] = data2
    case 0xB0:
      body["type"] = "controlChange"; body["controller"] = data1; body["value"] = data2
    default:
      body["type"] = "other"; body["status"] = Int(status); body["data1"] = data1; body["data2"] = data2
    }
    return body
  }

  private func hostTicksToMilliseconds(_ ticks: MIDITimeStamp) -> Double {
    guard timebase.denom != 0 else { return 0 }
    let nanos = Double(ticks) * Double(timebase.numer) / Double(timebase.denom)
    return nanos / 1_000_000
  }

  // MARK: - Source metadata

  private func listSources() -> [[String: Any]] {
    var result: [[String: Any]] = []
    for index in 0..<MIDIGetNumberOfSources() {
      result.append(describe(MIDIGetSource(index)))
    }
    return result
  }

  private func describe(_ endpoint: MIDIEndpointRef) -> [String: Any] {
    let name = stringProperty(endpoint, kMIDIPropertyDisplayName)
      ?? stringProperty(endpoint, kMIDIPropertyName)
      ?? "Unknown device"
    var manufacturer = stringProperty(endpoint, kMIDIPropertyManufacturer)
    var driver = stringProperty(endpoint, kMIDIPropertyDriverOwner)

    var entity = MIDIEntityRef()
    var device = MIDIDeviceRef()
    if MIDIEndpointGetEntity(endpoint, &entity) == noErr, MIDIEntityGetDevice(entity, &device) == noErr {
      manufacturer = manufacturer ?? stringProperty(device, kMIDIPropertyManufacturer)
      driver = driver ?? stringProperty(device, kMIDIPropertyDriverOwner)
    }

    let transport: String
    switch driver?.lowercased() ?? "" {
    case let d where d.contains("bluetooth"): transport = "bluetooth"
    case let d where d.contains("usb"): transport = "usb"
    case let d where d.contains("rtp") || d.contains("network"): transport = "network"
    default: transport = "other"
    }

    var offline: Int32 = 0
    MIDIObjectGetIntegerProperty(endpoint, kMIDIPropertyOffline, &offline)

    return [
      "id": Int(uniqueID(of: endpoint)),
      "name": name,
      "manufacturer": manufacturer ?? "",
      "transport": transport,
      "isOffline": offline != 0,
    ]
  }

  private func uniqueID(of object: MIDIObjectRef) -> Int32 {
    var uid: Int32 = 0
    MIDIObjectGetIntegerProperty(object, kMIDIPropertyUniqueID, &uid)
    return uid
  }

  private func stringProperty(_ object: MIDIObjectRef, _ property: CFString) -> String? {
    var value: Unmanaged<CFString>?
    guard MIDIObjectGetStringProperty(object, property, &value) == noErr, let cf = value?.takeRetainedValue() else {
      return nil
    }
    let s = cf as String
    return s.isEmpty ? nil : s
  }
}

/// Detects the user swiping the pairing sheet away instead of tapping Done.
private final class PairingDelegate: NSObject, UIAdaptivePresentationControllerDelegate {
  private let onDismiss: () -> Void
  init(onDismiss: @escaping () -> Void) { self.onDismiss = onDismiss }
  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) { onDismiss() }
}
