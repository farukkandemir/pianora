import CoreBluetooth
import Foundation

/// Remembers Bluetooth MIDI keyboards the user has paired and reconnects to
/// them without the system picker.
///
/// iOS creates the CoreMIDI source for a BLE MIDI device as soon as any app
/// holds a Bluetooth connection to it. So "reconnect" here just means: ask
/// CoreBluetooth to connect to a known peripheral. A pending connect request
/// survives until the device appears (e.g. the keyboard is switched on), which
/// gives automatic reconnection for free.
final class BluetoothReconnector: NSObject, CBCentralManagerDelegate {
  struct KnownDevice: Codable, Equatable {
    let id: String   // CBPeripheral.identifier
    let name: String
  }

  enum Status: String { case connecting, connected, disconnected, failed, unavailable }

  private static let midiService = CBUUID(string: "03B80E5A-EDE8-4B33-A751-6CE34EC4C700")
  private static let defaultsKey = "PianoMidi.knownDevices"
  private static let maxKnown = 5

  private var central: CBCentralManager?
  private var peripherals: [UUID: CBPeripheral] = [:]
  private var wantsReconnect = false
  private let onStatus: (Status, KnownDevice?) -> Void

  init(onStatus: @escaping (Status, KnownDevice?) -> Void) {
    self.onStatus = onStatus
    super.init()
  }

  // MARK: - Public

  var knownDevices: [KnownDevice] {
    get {
      guard let data = UserDefaults.standard.data(forKey: Self.defaultsKey),
            let list = try? JSONDecoder().decode([KnownDevice].self, from: data) else { return [] }
      return list
    }
    set {
      let data = try? JSONEncoder().encode(Array(newValue.prefix(Self.maxKnown)))
      UserDefaults.standard.set(data, forKey: Self.defaultsKey)
    }
  }

  /// Record every currently connected BLE MIDI peripheral as known.
  /// Creating the central manager shows the Bluetooth permission alert, so
  /// the periodic refresh passes `createManager: false` and only the pairing
  /// flow (behind a user tap) may create it.
  func rememberConnected(createManager: Bool) {
    let manager = createManager ? ensureCentral() : central
    guard let central = manager, central.state == .poweredOn else { return }
    let connected = central.retrieveConnectedPeripherals(withServices: [Self.midiService])
    var list = knownDevices
    for p in connected {
      peripherals[p.identifier] = p
      let device = KnownDevice(id: p.identifier.uuidString, name: p.name ?? "Bluetooth MIDI")
      list.removeAll { $0.id == device.id }
      list.insert(device, at: 0)
    }
    if !connected.isEmpty { knownDevices = list }
  }

  /// Ask iOS to connect to every known device. Safe to call repeatedly.
  func reconnectKnown() {
    // Nothing to reconnect on a fresh install. Creating the central manager
    // is what shows the Bluetooth permission alert, so do not create it until
    // there is a remembered piano or the user taps Pair.
    let ids = knownDevices.compactMap { UUID(uuidString: $0.id) }
    guard !ids.isEmpty else { return }
    wantsReconnect = true
    guard let central = ensureCentral() else { return }
    guard central.state == .poweredOn else { return } // will run from didUpdateState
    for p in central.retrievePeripherals(withIdentifiers: ids) {
      peripherals[p.identifier] = p
      if p.state == .connected { onStatus(.connected, known(for: p)); continue }
      onStatus(.connecting, known(for: p))
      central.connect(p, options: nil)
    }
  }

  func forget(id: String) {
    knownDevices = knownDevices.filter { $0.id != id }
    if let uuid = UUID(uuidString: id), let p = peripherals[uuid] {
      central?.cancelPeripheralConnection(p)
      peripherals[uuid] = nil
    }
  }

  // MARK: - CBCentralManagerDelegate

  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    switch central.state {
    case .poweredOn:
      if wantsReconnect { reconnectKnown() }
    case .unauthorized, .unsupported, .poweredOff:
      onStatus(.unavailable, nil)
    default:
      break
    }
  }

  func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    onStatus(.connected, known(for: peripheral))
  }

  func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
    onStatus(.failed, known(for: peripheral))
  }

  func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
    onStatus(.disconnected, known(for: peripheral))
    // Keep a standing request so the keyboard reconnects when it comes back.
    if wantsReconnect, knownDevices.contains(where: { $0.id == peripheral.identifier.uuidString }) {
      central.connect(peripheral, options: nil)
    }
  }

  // MARK: - Private

  private func ensureCentral() -> CBCentralManager? {
    if central == nil {
      central = CBCentralManager(delegate: self, queue: .main, options: [CBCentralManagerOptionShowPowerAlertKey: false])
    }
    return central
  }

  private func known(for p: CBPeripheral) -> KnownDevice {
    knownDevices.first { $0.id == p.identifier.uuidString }
      ?? KnownDevice(id: p.identifier.uuidString, name: p.name ?? "Bluetooth MIDI")
  }
}
