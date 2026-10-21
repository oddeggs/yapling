import AVFoundation
import QuartzCore
import ExpoModulesCore

/// Voice processing (echo cancellation, noise suppression, AGC) for the call's audio graph.
///
/// `react-native-audio-api` runs one `AVAudioEngine` for the mic and every player, but never turns
/// on Apple's voice processing, so the character's voice would leak into the mic. This module
/// enables it on that engine's input node (which enables it on the output node too, so the canceller
/// sees what is played). The library rebuilds its engine on interruptions and route changes; a hook
/// on its engine factory re-applies the setting to every new engine before it starts.
public class VoiceSessionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VoiceSession")

    /// Turns voice processing on or off for the call graph; returns the resulting status.
    Function("setVoiceProcessing") { (enabled: Bool) -> [String: Any] in
      VoiceProcessing.shared.set(enabled: enabled)
      return VoiceProcessing.shared.status()
    }

    /// The session and engine as they are now: route, latencies, voice processing.
    Function("status") { () -> [String: Any] in
      VoiceProcessing.shared.status()
    }

    /// Asks for a shorter hardware buffer (lower mic and playout latency). iOS may round it.
    Function("setPreferredIOBufferDuration") { (seconds: Double) -> Double in
      let session = AVAudioSession.sharedInstance()
      try? session.setPreferredIOBufferDuration(seconds)
      return session.ioBufferDuration
    }
  }
}

final class VoiceProcessing {
  static let shared = VoiceProcessing()

  private var wanted = false
  private var hooked = false
  private var configHooked = false
  private var lastRebuild: CFTimeInterval = 0
  private(set) var restarts = 0
  private(set) var rebuilds = 0
  var lastError: String?

  private var engineHolderClass: AnyClass? { NSClassFromString("AudioEngine") }

  /// The library's `AudioEngine` singleton (an Objective-C object), if it exists yet.
  private func holder() -> NSObject? {
    guard let cls = engineHolderClass as? NSObject.Type else { return nil }
    let selector = NSSelectorFromString("sharedInstance")
    guard cls.responds(to: selector) else { return nil }
    return cls.perform(selector)?.takeUnretainedValue() as? NSObject
  }

  private func engine(of holder: NSObject?) -> AVAudioEngine? {
    holder?.value(forKey: "audioEngine") as? AVAudioEngine
  }

  func set(enabled: Bool) {
    wanted = enabled
    installHook()
    installConfigHook()
    guard let holder = holder(), let engine = engine(of: holder) else { return }
    if engine.inputNode.isVoiceProcessingEnabled == enabled { return }
    if engine.isRunning {
      // Voice processing can only change on a stopped engine: let the library rebuild and restart
      // it; the hook applies the setting to the new engine.
      let restart = NSSelectorFromString("restartAudioEngine")
      if holder.responds(to: restart) { holder.perform(restart) }
    } else {
      apply(to: engine)
    }
  }

  /// Applies the wanted setting to an engine that is not running.
  fileprivate func apply(to engine: AVAudioEngine?) {
    guard let engine, !engine.isRunning else { return }
    let input = engine.inputNode
    if input.isVoiceProcessingEnabled == wanted { return }
    do {
      try input.setVoiceProcessingEnabled(wanted)
      if wanted {
        input.isVoiceProcessingAGCEnabled = true
        input.isVoiceProcessingBypassed = false
        if #available(iOS 17.0, *) {
          // Don't push other apps' audio down further than needed.
          input.voiceProcessingOtherAudioDuckingConfiguration =
            AVAudioVoiceProcessingOtherAudioDuckingConfiguration(
              enableAdvancedDucking: false, duckingLevel: .min)
        }
      }
      lastError = nil
    } catch {
      lastError = error.localizedDescription
    }
  }

  /// Wraps `-[AudioEngine createAudioEngineIfNeeded]` so each engine the library creates gets the
  /// wanted setting before its nodes are connected and it starts.
  private func installHook() {
    guard !hooked, let cls = engineHolderClass else { return }
    let selector = NSSelectorFromString("createAudioEngineIfNeeded")
    guard let method = class_getInstanceMethod(cls, selector) else { return }
    typealias Original = @convention(c) (AnyObject, Selector) -> Void
    let original = unsafeBitCast(method_getImplementation(method), to: Original.self)
    let block: @convention(block) (AnyObject) -> Void = { [weak self] holder in
      let hadEngine = (holder as? NSObject)?.value(forKey: "audioEngine") != nil
      original(holder, selector)
      guard let self, self.wanted, !hadEngine else { return }
      self.apply(to: self.engine(of: holder as? NSObject))
    }
    method_setImplementation(method, imp_implementationWithBlock(block))
    hooked = true
  }

  /**
   * Starting an engine with voice processing reconfigures its I/O unit once, which posts a
   * configuration change; the library answers every change by building a new engine, which then
   * does the same, forever. A change that comes right after a rebuild is answered by restarting the
   * engine that exists (its nodes already use the voice-processing formats) instead.
   */
  private func installConfigHook() {
    guard !configHooked, let cls = NSClassFromString("SystemNotificationManager") else { return }
    let selector = NSSelectorFromString("handleEngineConfigurationChange:")
    guard let method = class_getInstanceMethod(cls, selector) else { return }
    typealias Original = @convention(c) (AnyObject, Selector, AnyObject?) -> Void
    let original = unsafeBitCast(method_getImplementation(method), to: Original.self)
    let block: @convention(block) (AnyObject, AnyObject?) -> Void = { [weak self] manager, note in
      guard let self, self.wanted else {
        original(manager, selector, note)
        return
      }
      let now = CACurrentMediaTime()
      if now - self.lastRebuild < 2.0 {
        DispatchQueue.main.async {
          guard let engine = self.engine(of: self.holder()), !engine.isRunning else { return }
          engine.prepare()
          do {
            try engine.start()
            self.restarts += 1
          } catch {
            self.lastError = error.localizedDescription
          }
        }
        return
      }
      self.lastRebuild = now
      self.rebuilds += 1
      original(manager, selector, note)
    }
    method_setImplementation(method, imp_implementationWithBlock(block))
    configHooked = true
  }

  func status() -> [String: Any] {
    let session = AVAudioSession.sharedInstance()
    let engine = engine(of: holder())
    let ports = { (list: [AVAudioSessionPortDescription]) in
      list.map { ["type": $0.portType.rawValue, "name": $0.portName] }
    }
    var result: [String: Any] = [
      "wanted": wanted,
      "hooked": hooked,
      "category": session.category.rawValue,
      "mode": session.mode.rawValue,
      "sampleRate": session.sampleRate,
      "ioBufferDuration": session.ioBufferDuration,
      "inputLatency": session.inputLatency,
      "outputLatency": session.outputLatency,
      "inputs": ports(session.currentRoute.inputs),
      "outputs": ports(session.currentRoute.outputs),
      "engineExists": engine != nil,
      "engineRunning": engine?.isRunning ?? false,
      "rebuilds": rebuilds,
      "restarts": restarts,
    ]
    if let engine {
      result["voiceProcessing"] = engine.inputNode.isVoiceProcessingEnabled
    } else {
      result["voiceProcessing"] = false
    }
    if let lastError { result["error"] = lastError }
    return result
  }
}
