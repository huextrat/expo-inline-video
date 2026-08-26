// Copyright (c) 2026 Hugo Extrat. MIT License.

import AVFoundation
import ExpoModulesCore
import UIKit

/**
 A minimal inline video surface: one `AVPlayerLayer` on the view's own layer.
 No `AVPlayerViewController`.

 Both `expo-video` and `react-native-video` build a full `AVPlayerViewController`
 per view, unconditionally — hiding the controls only sets
 `showsPlaybackControls = false`, the view controller and its whole
 gesture/overlay hierarchy are created anyway. For a muted, looping,
 non-interactive clip in a recycling list that is pure overhead.

 What this deliberately does NOT do: controls, transport bar, fullscreen,
 Picture-in-Picture, AirPlay, subtitles, audio tracks, DRM, seeking, imperative
 refs, caching. The surface is decorative.

 It also never touches `AVAudioSession` — no `setCategory`, no `setActive`, no
 registration as an audio source. The player is muted for its entire life, so
 the system never activates the shared session on its behalf and the user's
 background music is neither interrupted nor ducked. That also keeps it from
 fighting whatever other player stack (`expo-video`…) lives in the same app.
 */
public final class InlineVideoView: ExpoView {
  private let playerLayer = AVPlayerLayer()
  private var queuePlayer: AVQueuePlayer?
  /**
   Held strongly: `AVPlayerLooper` is what keeps the queue fed, and it stops
   working the moment it is deallocated.
   */
  private var looper: AVPlayerLooper?
  private var readyForDisplayObservation: NSKeyValueObservation?
  private var itemStatusObservation: NSKeyValueObservation?

  private var didEmitFirstFrame = false
  private var didEmitError = false
  /**
   True from the moment this view asked the registry for a decode pipeline —
   whether it got one or was queued. Both cases must be undone on teardown,
   otherwise a view that scrolled away while waiting stays in the queue.
   */
  private var isRegisteredForSlot = false

  let onFirstFrame = EventDispatcher()
  let onError = EventDispatcher()

  /**
   Source URL. Assigning a different one rebuilds the player; assigning the same
   one is a no-op, which is what makes prop re-application during cell recycling
   free.
   */
  var source: URL? {
    didSet {
      guard source != oldValue else {
        return
      }
      teardownPlayer()
      didEmitFirstFrame = false
      didEmitError = false
      setupPlayerIfNeeded()
    }
  }

  /**
   Playback intent, owned entirely by JS. The view never decides on its own —
   viewability, screen focus and app state belong to the consumer.

   Defaults to paused so a view attached before its first prop update never
   starts decoding.
   */
  var paused = true {
    didSet {
      applyPlaybackState()
    }
  }

  var contentFit: InlineVideoContentFit = .cover {
    didSet {
      playerLayer.videoGravity = contentFit.toVideoGravity()
    }
  }

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)

    clipsToBounds = true
    // Transparent until the first frame is drawn, so a poster rendered
    // underneath shows through instead of a black rectangle.
    backgroundColor = .clear
    playerLayer.videoGravity = contentFit.toVideoGravity()
    playerLayer.backgroundColor = UIColor.clear.cgColor
    layer.addSublayer(playerLayer)

    // A bare layer exposes nothing to VoiceOver, and this view must not shadow
    // the accessibility props applied to the React host view above it
    // (`RCTViewComponentView` handles `accessible`, `accessibilityLabel`,
    // `testID`… for Expo views).
    isAccessibilityElement = false
  }

  deinit {
    // ExpoView deinit runs on the main thread, and the teardown only touches
    // main-thread-confined objects.
    teardownPlayer()
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    // Layer frame changes animate implicitly by default, which shows up as the
    // video sliding into place on the first layout pass and on rotation.
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    playerLayer.frame = bounds
    CATransaction.commit()
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      // Detached: give the decode pipeline back rather than keeping it warm.
      // The clip restarts from zero when it comes back, which is invisible on a
      // muted loop and is the difference between "mount/unmount returns to the
      // initial memory level" and a slow climb.
      teardownPlayer()
    } else {
      setupPlayerIfNeeded()
    }
  }

  /// Called by `InlineVideoSlots` when another view released its pipeline.
  func slotBecameAvailable() {
    setupPlayerIfNeeded()
  }

  private func setupPlayerIfNeeded() {
    guard window != nil, let url = source, queuePlayer == nil else {
      return
    }
    isRegisteredForSlot = true
    guard InlineVideoSlots.shared.acquire(self) else {
      // Over the decode-pipeline cap: stay empty. The registry calls back
      // through `slotBecameAvailable()` once a slot frees.
      return
    }

    let player = AVQueuePlayer()
    // Set before anything is enqueued: a player that never outputs audio never
    // causes the system to activate the shared audio session.
    player.isMuted = true
    player.allowsExternalPlayback = false
    // Defaults to true, which would keep the screen awake for a decorative
    // muted loop in a list.
    player.preventsDisplaySleepDuringVideoPlayback = false

    // Seamless looping. The cheaper alternative — observing
    // `AVPlayerItemDidPlayToEndTime` then seeking back to zero — hitches
    // visibly at every wrap on short clips, because the seek only starts once
    // the item has already ended. `AVPlayerLooper` keeps the next pass buffered
    // in the queue instead. The cost is an `AVQueuePlayer` plus the looper's
    // own copies of the item.
    looper = AVPlayerLooper(player: player, templateItem: AVPlayerItem(url: url))

    playerLayer.player = player
    queuePlayer = player

    observeFirstFrame()
    observeFailures(of: player)
    applyPlaybackState()
  }

  private func teardownPlayer() {
    readyForDisplayObservation?.invalidate()
    readyForDisplayObservation = nil
    itemStatusObservation?.invalidate()
    itemStatusObservation = nil

    looper?.disableLooping()
    looper = nil

    queuePlayer?.pause()
    // The looper is disabled first, otherwise it re-enqueues behind us.
    queuePlayer?.removeAllItems()
    playerLayer.player = nil
    queuePlayer = nil

    if isRegisteredForSlot {
      isRegisteredForSlot = false
      InlineVideoSlots.shared.release(self)
    }
  }

  private func applyPlaybackState() {
    guard let queuePlayer else {
      return
    }
    if paused {
      queuePlayer.pause()
    } else {
      queuePlayer.play()
    }
  }

  private func observeFirstFrame() {
    readyForDisplayObservation = playerLayer.observe(
      \.isReadyForDisplay,
      options: [.initial, .new]
    ) { [weak self] layer, _ in
      guard layer.isReadyForDisplay else {
        return
      }
      // KVO on `isReadyForDisplay` is not guaranteed to fire on the main
      // thread, and dispatching an event is a React commit.
      DispatchQueue.main.async {
        guard let self, !self.didEmitFirstFrame else {
          return
        }
        self.didEmitFirstFrame = true
        self.onFirstFrame()
      }
    }
  }

  private func observeFailures(of player: AVQueuePlayer) {
    itemStatusObservation = player.observe(
      \.currentItem?.status,
      options: [.initial, .new]
    ) { [weak self] player, _ in
      guard player.currentItem?.status == .failed else {
        return
      }
      let message =
        player.currentItem?.error?.localizedDescription ?? "The video failed to load"
      DispatchQueue.main.async {
        guard let self, !self.didEmitError else {
          return
        }
        self.didEmitError = true
        self.onError(["message": message])
      }
    }
  }
}
