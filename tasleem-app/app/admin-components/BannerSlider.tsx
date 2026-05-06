import { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Image,
  Text, Linking, useWindowDimensions,
  FlatList, Animated,
} from 'react-native';

const PRIMARY = '#0c6679';
const AUTO_INTERVAL = 5000; // تم تقليل الوقت قليلاً لجعل التصفح أكثر حيوية

type Banner = {
  id: number;
  imageUrl: string;
  title?: string;
  link?: string;
  isActive: boolean;
  sortOrder: number;
};

export default function BannerSlider({
  banners,
  containerWidth,
}: {
  banners: Banner[];
  containerWidth?: number;
}) {
  const { width: screenWidth } = useWindowDimensions();
  
  // النسبة المطلوبة 18:7 (1440x560)
  const ASPECT_RATIO = 18 / 7; 
  const W = containerWidth ?? screenWidth;
  const BANNER_H = Math.round(W / ASPECT_RATIO);

  const flatRef = useRef<FlatList>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isManual = useRef(false);
  const currentIdx = useRef(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const active = banners
    .filter(b => b.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const startTimer = () => {
    if (active.length <= 1) return;
    stopTimer();
    timerRef.current = setInterval(() => {
      if (isManual.current) return;
      const next = (currentIdx.current + 1) % active.length;
      flatRef.current?.scrollToIndex({ index: next, animated: true });
      currentIdx.current = next;
      setActiveIdx(next);
    }, AUTO_INTERVAL);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    startTimer();
    return stopTimer;
  }, [active.length]);

  const handlePress = (link?: string) => {
    if (link) Linking.openURL(link).catch(() => {});
  };

  if (active.length === 0) return null;

  return (
    <View style={[styles.container, { height: BANNER_H }]}>
      <FlatList
        ref={flatRef}
        data={active}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / W);
          currentIdx.current = idx;
          setActiveIdx(idx);
          isManual.current = false;
          startTimer();
        }}
        onScrollBeginDrag={() => {
          isManual.current = true;
          stopTimer();
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handlePress(item.link)}
            style={{ width: W, height: BANNER_H }}
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
      />

      {active.length > 1 && (
        <View style={styles.dots}>
          {active.map((_, i) => {
            const width = scrollX.interpolate({
              inputRange: [(i - 1) * W, i * W, (i + 1) * W],
              outputRange: [8, 20, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange: [(i - 1) * W, i * W, (i + 1) * W],
              outputRange: [0.4, 1, 0.4],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width, opacity, backgroundColor: i === activeIdx ? PRIMARY : '#ccc' }]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
