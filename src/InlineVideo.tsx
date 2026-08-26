import { useCallback, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import type { InlineVideoErrorEventPayload, InlineVideoProps } from './InlineVideo.types';
import { InlineVideoView, isInlineVideoAvailable } from './InlineVideoView';

const resolveUri = (source: InlineVideoProps['source']): string =>
  typeof source === 'string' ? source : source.uri;

/**
 * Muted, looping, inline video.
 *
 * Renders the poster underneath until the first frame arrives, then drops it.
 * Where the native surface is unavailable (Android, web, or a build where
 * autolinking skipped the module) it renders the poster alone and nothing else
 * — check `isInlineVideoAvailable` if you want to fall back to another player.
 */
export function InlineVideo(props: InlineVideoProps) {
  const {
    source,
    posterSource,
    paused,
    contentFit = 'cover',
    style,
    onFirstFrame,
    onError,
    ...viewProps
  } = props;

  const uri = resolveUri(source);
  const [hasFirstFrame, setHasFirstFrame] = useState(false);

  // Reset during render rather than in an effect: after a source change the
  // poster has to be back on screen in the SAME commit, otherwise the frame in
  // between shows the previous video's last frame under the new one.
  const [renderedUri, setRenderedUri] = useState(uri);
  if (uri !== renderedUri) {
    setRenderedUri(uri);
    setHasFirstFrame(false);
  }

  const handleFirstFrame = useCallback(() => {
    setHasFirstFrame(true);
    onFirstFrame?.();
  }, [onFirstFrame]);

  const handleError = useCallback(
    (event: { nativeEvent: InlineVideoErrorEventPayload }) => {
      onError?.(event.nativeEvent);
    },
    [onError]
  );

  return (
    <View style={style} {...viewProps}>
      {posterSource != null && !hasFirstFrame ? (
        <Image
          source={posterSource}
          style={StyleSheet.absoluteFill}
          resizeMode={contentFit === 'fill' ? 'stretch' : contentFit}
          testID="inline-video-poster"
        />
      ) : null}
      {InlineVideoView != null ? (
        <InlineVideoView
          source={uri}
          paused={paused}
          contentFit={contentFit}
          onFirstFrame={handleFirstFrame}
          onError={handleError}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );
}

export { isInlineVideoAvailable };
