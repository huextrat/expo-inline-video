import { render, screen } from '@testing-library/react-native';
import * as React from 'react';

jest.mock('expo', () => ({
  requireNativeView: () => {
    throw new Error('requireNativeView must not be called when the module is missing');
  },
  requireOptionalNativeModule: () => null,
}));

const { InlineVideo, isInlineVideoAvailable, setMaxConcurrentPlayers } = require('../index');

describe('InlineVideo without the native module', () => {
  it('reports the surface as unavailable', () => {
    expect(isInlineVideoAvailable).toBe(false);
  });

  it('renders the poster and nothing else', () => {
    render(
      <InlineVideo
        source={{ uri: 'https://cdn.test/clip.mp4' }}
        posterSource={{ uri: 'https://cdn.test/clip.jpg' }}
        paused={false}
      />
    );

    expect(screen.getByTestId('inline-video-poster')).toBeTruthy();
  });

  it('makes the concurrent player cap a no-op', () => {
    expect(() => setMaxConcurrentPlayers(4)).not.toThrow();
  });
});
