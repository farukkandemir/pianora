Pod::Spec.new do |s|
  s.name           = 'PianoSound'
  s.version        = '1.0.0'
  s.summary        = 'Piano playback for piano.learn: AVAudioUnitSampler + AVAudioSequencer'
  s.description    = 'Loads a SoundFont into the built-in sampler and plays a MIDI file through it, reporting the position for the score cursor.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation', 'AudioToolbox'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
