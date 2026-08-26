import { requireOptionalNativeModule } from 'expo';
import type { NativeModule } from 'expo';

declare class ExpoInlineVideoModule extends NativeModule {
  setMaxConcurrentPlayers(value: number): void;
}

const nativeModule = requireOptionalNativeModule<ExpoInlineVideoModule>('ExpoInlineVideo');

/**
 * Cap on how many players may decode at the same time, process-wide.
 *
 * iOS limits how many hardware decode pipelines a process can hold; past the
 * limit an item fails to play instead of erroring loudly. Views over the cap
 * keep their poster and are queued until a slot frees. Defaults to 12; raise it
 * only if you have measured that your device tier copes.
 *
 * No-op where the native module is unavailable.
 */
export function setMaxConcurrentPlayers(value: number): void {
  nativeModule?.setMaxConcurrentPlayers(value);
}
