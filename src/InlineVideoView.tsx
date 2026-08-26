import { requireNativeView, requireOptionalNativeModule } from 'expo';
import type { ComponentType } from 'react';
import { Platform } from 'react-native';

import type { InlineVideoViewProps } from './InlineVideo.types';

/**
 * Whether the native surface is usable on this device.
 *
 * Two things have to be true: the platform is one this module implements
 * natively (iOS/tvOS only — see the README), and the native module is really
 * linked into the running binary. The second half matters more than it looks:
 * autolinking failures are silent, and a build that quietly shipped without the
 * module would otherwise render an inert view stuck on its poster.
 */
export const isInlineVideoAvailable: boolean =
  Platform.OS === 'ios' && requireOptionalNativeModule('ExpoInlineVideo') != null;

/**
 * The raw native view. `null` when the native module is unavailable —
 * `requireNativeView` looks the view up in the native registry, so it must not
 * even be called there.
 *
 * Prefer `<InlineVideo>`, which handles the poster and the unavailable case.
 */
export const InlineVideoView: ComponentType<InlineVideoViewProps> | null = isInlineVideoAvailable
  ? requireNativeView<InlineVideoViewProps>('ExpoInlineVideo')
  : null;
