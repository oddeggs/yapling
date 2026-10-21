Pod::Spec.new do |s|
  s.name           = 'VoiceSession'
  s.version        = '1.0.0'
  s.summary        = 'Voice processing for the live call audio graph'
  s.description    = 'Turns on echo cancellation for the react-native-audio-api engine during calls'
  s.author         = 'Odd Eggs Studio'
  s.homepage       = 'https://oddeggs.studio'
  s.license        = { type: 'UNLICENSED' }
  s.platforms      = { :ios => '17.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift}"
end
