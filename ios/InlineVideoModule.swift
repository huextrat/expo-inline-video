// Copyright (c) 2026 Hugo Extrat. MIT License.

import ExpoModulesCore
import Foundation

public final class InlineVideoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoInlineVideo")

    // Hops to the main thread on purpose: the registry is main-thread confined
    // because everything else that touches it is a UIView lifecycle callback,
    // while module functions run on whatever thread called them.
    Function("setMaxConcurrentPlayers") { (value: Int) in
      DispatchQueue.main.async {
        InlineVideoSlots.shared.setMaxConcurrentPlayers(value)
      }
    }

    View(InlineVideoView.self) {
      Events("onFirstFrame", "onError")

      Prop("source") { (view: InlineVideoView, source: URL?) in
        view.source = source
      }

      Prop("paused") { (view: InlineVideoView, paused: Bool?) in
        view.paused = paused ?? true
      }

      Prop("contentFit") { (view: InlineVideoView, contentFit: InlineVideoContentFit?) in
        view.contentFit = contentFit ?? .cover
      }
    }
  }
}
