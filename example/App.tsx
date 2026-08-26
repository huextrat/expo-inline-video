import { InlineVideo, isInlineVideoAvailable, setMaxConcurrentPlayers } from 'expo-inline-video';
import { useCallback, useState } from 'react';
import type { ViewToken } from 'react-native';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';

type Clip = {
  id: string;
  title: string;
  video: string;
  poster: string;
};

const BUCKET = 'https://storage.googleapis.com/gtv-videos-bucket/sample';

const CLIPS: Clip[] = [
  'ForBiggerBlazes',
  'ForBiggerEscapes',
  'ForBiggerFun',
  'ForBiggerJoyrides',
  'ForBiggerMeltdowns',
  'ElephantsDream',
].map((name) => ({
  id: name,
  title: name.replace(/([A-Z])/g, ' $1').trim(),
  video: `${BUCKET}/${name}.mp4`,
  poster: `${BUCKET}/images/${name}.jpg`,
}));

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

// The whole point of the module: many surfaces alive at once in a recycling
// list. Six is already past what a phone shows, so some of them are always
// paused.
setMaxConcurrentPlayers(8);

export default function App() {
  const [visibleIds, setVisibleIds] = useState<string[]>([]);

  // FlatList reads this once; a new function per render throws
  // "Changing onViewableItemsChanged on the fly is not supported". The empty
  // dependency list is what keeps it stable — the callback only calls a setter.
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      setVisibleIds(viewableItems.map((token) => String(token.key)));
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: Clip }) => <ClipCard clip={item} paused={!visibleIds.includes(item.id)} />,
    [visibleIds]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>expo-inline-video</Text>
        <Text style={styles.subtitle}>
          {isInlineVideoAvailable
            ? 'Native surface available — clips play through AVPlayerLayer.'
            : 'Native surface unavailable on this platform — posters only.'}
        </Text>
      </View>
      <FlatList
        data={CLIPS}
        keyExtractor={(clip) => clip.id}
        renderItem={renderItem}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

function ClipCard({ clip, paused }: { clip: Clip; paused: boolean }) {
  const [state, setState] = useState<'loading' | 'playing' | 'failed'>('loading');

  return (
    <View style={styles.card}>
      <InlineVideo
        source={{ uri: clip.video }}
        posterSource={{ uri: clip.poster }}
        paused={paused}
        contentFit="cover"
        style={styles.video}
        accessible
        accessibilityLabel={`${clip.title} teaser`}
        onFirstFrame={() => setState('playing')}
        onError={(error) => {
          console.warn(`[${clip.id}] ${error.message}`);
          setState('failed');
        }}
      />
      <View style={styles.caption}>
        <Text style={styles.captionTitle}>{clip.title}</Text>
        <Text style={styles.captionState}>
          {state === 'failed' ? 'failed' : paused ? 'paused' : state}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1115' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#8ba1ad', fontSize: 13, marginTop: 4 },
  list: { padding: 16, gap: 16 },
  card: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#131c22' },
  video: { width: '100%', aspectRatio: 16 / 9 },
  caption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  captionTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  captionState: { color: '#8ba1ad', fontSize: 12 },
});
