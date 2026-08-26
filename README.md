# expo-inline-video

[![npm version](https://img.shields.io/npm/v/expo-inline-video.svg)](https://www.npmjs.com/package/expo-inline-video)
[![CI](https://github.com/huextrat/expo-inline-video/actions/workflows/ci.yml/badge.svg)](https://github.com/huextrat/expo-inline-video/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A tiny video surface for the one case general-purpose players are bad at: **muted, looping, decorative clips inside a scrolling list**.

One `AVPlayerLayer`. No `AVPlayerViewController`, no controls, no audio session.

## Why

Mount seven video teasers in a `FlashList` and watch what a normal player does:

- **`expo-video` builds a full `AVPlayerViewController` per view, unconditionally.** `nativeControls={false}` only sets `showsPlaybackControls = false` — the view controller, its gesture recognizers and its overlay hierarchy are created anyway. (`expo-video@57`, `ios/VideoView.swift`: `lazy var playerViewController` is touched in `init`.)
- **`react-native-video` v7 does the same** (`VideoComponentView.swift` creates an `AVPlayerViewController` as soon as a player is assigned), so swapping libraries does not address it.
- **`expo-video` builds its player during React's render phase** (`useReleasingSharedObjectWithLifecycle` calls the factory outside of an effect), i.e. synchronously on the JS thread.

This module renders through a bare `AVPlayerLayer` on the view's own layer, and builds the `AVPlayer` **natively, when the view is attached to a window** — never during render.

### What it does not make faster

`AVPlayerLayer` removes the cost of the **view**, not of the **player**. `AVPlayer`, `AVPlayerItem` and the decode pipeline are identical. Do not expect a gain on player creation itself.

## Install

```sh
npx expo install expo-inline-video
```

Needs a [development build](https://docs.expo.dev/develop/development-builds/introduction/) — there is native code, so it does not run in Expo Go. No config plugin, no extra setup: autolinking picks it up on the next `expo prebuild` / `pod install`.

## Usage

```tsx
import { InlineVideo } from 'expo-inline-video';

<InlineVideo
  source={{ uri: clip.videoUrl }}
  posterSource={{ uri: clip.posterUrl }}
  paused={!isVisible}
  contentFit="cover"
  style={{ width: '100%', aspectRatio: 16 / 9 }}
  accessible
  accessibilityLabel={`${clip.title} teaser`}
  onFirstFrame={() => setLoaded(true)}
  onError={(error) => console.warn(error.message)}
/>;
```

`paused` is the whole control surface. The component never decides on its own to start or stop — viewability, screen focus and app state stay where they belong, in your list. See [`example/App.tsx`](./example/App.tsx) for a `FlatList` wired to `onViewableItemsChanged`.

## API

### `<InlineVideo />`

| Prop           | Type                                   | Default   | Notes                                                        |
| -------------- | -------------------------------------- | --------- | ------------------------------------------------------------ |
| `source`       | `{ uri: string } \| string`            | —         | Remote URL or `file://`.                                     |
| `posterSource` | `ImageSourcePropType`                  | —         | Drawn under the video until the first frame, then unmounted. |
| `paused`       | `boolean`                              | —         | Required. Playback intent.                                   |
| `contentFit`   | `'cover' \| 'contain' \| 'fill'`       | `'cover'` | Maps to `AVLayerVideoGravity`.                               |
| `onFirstFrame` | `() => void`                           | —         | Fires once per source, when the layer has drawn.             |
| `onError`      | `(error: { message: string }) => void` | —         | The item failed to load or decode.                           |

All standard `ViewProps` (`style`, `accessible`, `accessibilityLabel`, `testID`…) are forwarded to the wrapping view.

### `isInlineVideoAvailable: boolean`

`true` only when the platform is supported **and** the native module is actually linked into the running binary. The second half matters: autolinking failures are silent, and a build that shipped without the module would otherwise render an inert view. Branch on this to fall back to `expo-video` or a still image.

### `InlineVideoView`

The raw native view, or `null` when unavailable. Same props as `InlineVideo` minus the poster. Use it if you want to own the poster layer yourself.

### `setMaxConcurrentPlayers(value: number): void`

iOS caps how many hardware decode pipelines a process can hold; past the cap an item fails to play instead of erroring loudly, and on older devices that cap can be as low as ~4 for HEVC. Views over the cap keep their poster and are queued until a slot frees. Defaults to `12`. No-op where the native module is unavailable.

## Deliberate limitations

**iOS and tvOS only.** On Android, web, or anywhere else, `isInlineVideoAvailable` is `false` and `<InlineVideo>` renders the poster alone. Use [`expo-video`](https://docs.expo.dev/versions/latest/sdk/video/) there — its API maps one to one:

```tsx
{isInlineVideoAvailable ? <InlineVideo … /> : <VideoView … />}
```

**Always muted, and `AVAudioSession` is never touched.** No `setCategory`, no `setActive`, no registration as an audio source. Because the player never outputs audio, the system never activates the shared session on its behalf: the user's background music is neither interrupted nor ducked, and this module cannot fight another player stack over the session. If you need sound, you need a different component.

**No caching.** Every mount fetches from the network. If your clips are re-shown often, `expo-video`'s `useCaching` is likely worth more than the rendering this saves — measure before switching.

**No controls, transport bar, fullscreen, Picture-in-Picture, AirPlay, subtitles, audio tracks, DRM, seeking, or imperative ref.** The surface is decorative, and that is what makes it small.

## Notes on the implementation

- **Looping** uses `AVPlayerLooper` on an `AVQueuePlayer`. Observing `AVPlayerItemDidPlayToEndTime` and seeking back to zero is cheaper, but it hitches visibly at every wrap on short clips because the seek only starts once the item has already ended.
- **Teardown on detach.** Leaving the window releases the player and its decode pipeline. The clip restarts from zero when it comes back, which is invisible on a muted loop, and it is the difference between memory returning to its initial level after a scroll and a slow climb.
- **Accessibility.** The layer exposes nothing to VoiceOver on its own; accessibility props land on the React host view above it, exactly like on a `<View>`.

## Measuring it

On a **release build, on a physical device** — the simulator decodes in software, so no video performance conclusion can be drawn from it:

- Instruments (Allocations) during a scroll: no `AVPlayerViewController` should appear.
- Mount and unmount a screenful of clips ten times: memory returns to its initial level.
- Play music in another app and scroll: it must be neither interrupted nor ducked.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT © [Hugo Extrat](https://github.com/huextrat)
