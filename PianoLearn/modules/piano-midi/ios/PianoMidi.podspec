Pod::Spec.new do |s|
  s.name           = 'PianoMidi'
  s.version        = '1.0.0'
  s.summary        = 'CoreMIDI input (USB + Bluetooth MIDI) for PianoLearn'
  s.description    = 'Receives MIDI note events from connected keyboards and exposes the system Bluetooth MIDI pairing screen.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'CoreMIDI', 'CoreAudioKit'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
