import { act, render, screen } from '@testing-library/react-native';
import * as React from 'react';

const mockNativeView = jest.fn();
const mockSetMaxConcurrentPlayers = jest.fn();

jest.mock('expo', () => {
  const ReactModule = require('react');
  return {
    requireNativeView: () => (props: Record<string, unknown>) => {
      mockNativeView(props);
      return ReactModule.createElement('ExpoInlineVideoNativeView');
    },
    requireOptionalNativeModule: () => ({
      setMaxConcurrentPlayers: mockSetMaxConcurrentPlayers,
    }),
  };
});

const { InlineVideo, isInlineVideoAvailable, setMaxConcurrentPlayers } = require('../index');

const POSTER = 'inline-video-poster';

const props = {
  source: { uri: 'https://cdn.test/clip.mp4' },
  posterSource: { uri: 'https://cdn.test/clip.jpg' },
};

const lastNativeProps = () => mockNativeView.mock.calls.at(-1)?.[0];

const emit = async (event: string, payload?: unknown) => {
  await act(async () => {
    lastNativeProps()?.[event](payload);
  });
};

describe('InlineVideo', () => {
  it('reports the native surface as available', () => {
    expect(isInlineVideoAvailable).toBe(true);
  });

  it('keeps the poster until the first frame', async () => {
    render(<InlineVideo {...props} paused={false} />);
    expect(screen.getByTestId(POSTER)).toBeTruthy();

    await emit('onFirstFrame');
    expect(screen.queryByTestId(POSTER)).toBeNull();
  });

  it('calls back on the first frame', async () => {
    const onFirstFrame = jest.fn();
    render(<InlineVideo {...props} paused={false} onFirstFrame={onFirstFrame} />);

    await emit('onFirstFrame');
    expect(onFirstFrame).toHaveBeenCalledTimes(1);
  });

  it('brings the poster back when the source changes', async () => {
    render(<InlineVideo {...props} paused={false} />);
    await emit('onFirstFrame');
    expect(screen.queryByTestId(POSTER)).toBeNull();

    await act(async () => {
      screen.rerender(
        <InlineVideo
          source={{ uri: 'https://cdn.test/other.mp4' }}
          posterSource={{ uri: 'https://cdn.test/other.jpg' }}
          paused={false}
        />
      );
    });
    expect(screen.getByTestId(POSTER)).toBeTruthy();
  });

  it('forwards playback intent and content fit to the native surface', () => {
    render(<InlineVideo {...props} paused contentFit="contain" />);

    expect(lastNativeProps()).toMatchObject({
      source: props.source.uri,
      paused: true,
      contentFit: 'contain',
    });
  });

  it('accepts a plain string source', () => {
    render(<InlineVideo source="https://cdn.test/plain.mp4" paused={false} />);

    expect(lastNativeProps()).toMatchObject({ source: 'https://cdn.test/plain.mp4' });
  });

  it('unwraps the native error payload', async () => {
    const onError = jest.fn();
    render(<InlineVideo {...props} paused={false} onError={onError} />);

    await emit('onError', { nativeEvent: { message: 'boom' } });
    expect(onError).toHaveBeenCalledWith({ message: 'boom' });
  });

  it('forwards accessibility props to the wrapper', () => {
    render(<InlineVideo {...props} paused={false} accessible accessibilityLabel="A clip" />);

    expect(screen.getByLabelText('A clip')).toBeTruthy();
  });

  it('sets the concurrent player cap through the native module', () => {
    setMaxConcurrentPlayers(4);
    expect(mockSetMaxConcurrentPlayers).toHaveBeenCalledWith(4);
  });
});
