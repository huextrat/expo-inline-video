import type { ImageSourcePropType, StyleProp, ViewProps, ViewStyle } from 'react-native';

/** How the video fills its view. Mirrors `AVLayerVideoGravity`. */
export type InlineVideoContentFit = 'cover' | 'contain' | 'fill';

export type InlineVideoErrorEventPayload = {
  message: string;
};

/** Props of the raw native surface. */
export type InlineVideoViewProps = ViewProps & {
  /** Absolute URL, remote or `file://`. `undefined` leaves the surface empty. */
  source?: string;
  /** Playback intent. The view never starts or stops on its own. */
  paused: boolean;
  /** @default 'cover' */
  contentFit?: InlineVideoContentFit;
  /** Fired once, when the layer has drawn its first frame. */
  onFirstFrame?: () => void;
  onError?: (event: { nativeEvent: InlineVideoErrorEventPayload }) => void;
};

export type InlineVideoProps = Omit<ViewProps, 'children'> & {
  source: { uri: string } | string;
  /**
   * Rendered under the video until its first frame, then unmounted. Anything
   * `<Image source>` accepts — a `{ uri }` or a `require()`.
   */
  posterSource?: ImageSourcePropType;
  /** Playback intent. The component never starts or stops on its own. */
  paused: boolean;
  /** @default 'cover' */
  contentFit?: InlineVideoContentFit;
  style?: StyleProp<ViewStyle>;
  onFirstFrame?: () => void;
  onError?: (error: InlineVideoErrorEventPayload) => void;
};
