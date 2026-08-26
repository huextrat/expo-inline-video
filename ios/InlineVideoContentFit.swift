// Copyright (c) 2026 Hugo Extrat. MIT License.

import AVFoundation
import ExpoModulesCore

enum InlineVideoContentFit: String, Enumerable {
  /// Fills the view, cropping whatever overflows. The default.
  case cover
  /// Fits inside the view, letterboxing whatever is left.
  case contain
  /// Stretches to the view, ignoring the aspect ratio.
  case fill

  func toVideoGravity() -> AVLayerVideoGravity {
    switch self {
    case .cover:
      return .resizeAspectFill
    case .contain:
      return .resizeAspect
    case .fill:
      return .resize
    }
  }
}
