// Copyright (c) 2026 Hugo Extrat. MIT License.

import Foundation

/**
 iOS caps how many hardware video decode pipelines a process can hold at once.
 The limit depends on the chip and the codec — on older devices it can be as low
 as ~4 for HEVC. Past the cap `AVPlayerItem` fails with a "cannot decode" error
 instead of playing, and from JS the failure is invisible: the view just stays
 empty forever, in production, on the oldest devices.

 A recycling list normally keeps a handful of players alive, so the cap is not
 reached in the nominal case. This registry exists so the behaviour BEYOND it is
 decided rather than discovered: views over the cap keep their poster, get
 queued, and build their player as soon as a slot frees.

 Main thread only — every caller is a UIView lifecycle callback.
 */
final class InlineVideoSlots {
  static let shared = InlineVideoSlots()

  /**
   Deliberately conservative: enough for a list that shows 5 to 7 clips at once
   plus the transient doubling of a fast scroll, and low enough to leave room
   for whatever else in the app decodes video. Tune with
   `setMaxConcurrentPlayers` from JS.
   */
  private(set) var maxConcurrentPlayers = 12

  private struct WeakView {
    weak var view: InlineVideoView?
  }

  private var active: [WeakView] = []
  private var waiting: [WeakView] = []

  private init() {}

  func setMaxConcurrentPlayers(_ value: Int) {
    dispatchPrecondition(condition: .onQueue(.main))
    maxConcurrentPlayers = max(1, value)
    promoteWaitingViews()
  }

  /**
   Returns true when the caller may build its player. When false, the caller
   MUST stay on its poster: it has been queued and will be called back through
   `slotBecameAvailable()`.
   */
  func acquire(_ view: InlineVideoView) -> Bool {
    dispatchPrecondition(condition: .onQueue(.main))
    compact()

    if active.contains(where: { $0.view === view }) {
      return true
    }
    guard active.count < maxConcurrentPlayers else {
      if !waiting.contains(where: { $0.view === view }) {
        waiting.append(WeakView(view: view))
      }
      return false
    }
    active.append(WeakView(view: view))
    return true
  }

  /**
   Give the slot back. Also drops the view from the waiting list: a view torn
   down before it ever got a slot must not be woken up later.
   */
  func release(_ view: InlineVideoView) {
    dispatchPrecondition(condition: .onQueue(.main))
    active.removeAll { $0.view === view || $0.view == nil }
    waiting.removeAll { $0.view === view || $0.view == nil }
    promoteWaitingViews()
  }

  private func compact() {
    active.removeAll { $0.view == nil }
    waiting.removeAll { $0.view == nil }
  }

  private func promoteWaitingViews() {
    compact()
    while active.count < maxConcurrentPlayers, !waiting.isEmpty {
      let next = waiting.removeFirst()
      // A promoted view that is no longer attached does not take the slot (its
      // `setupPlayerIfNeeded` bails out), so the loop moves on to the next
      // candidate instead of leaving the slot idle.
      next.view?.slotBecameAvailable()
    }
  }
}
