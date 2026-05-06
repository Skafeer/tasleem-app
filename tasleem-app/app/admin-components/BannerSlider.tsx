import { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Image,
  Text, Linking, useWindowDimensions, FlatList, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY       = '#0c6679';
const AUTO_INTERVAL = 4000;
const RATIO         = 3; // نسبة 3:1

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
  const W = containerWidth ?? screenWidth;
  const H = Math.round(W / RATIO);

  const flatRef   = useRef<FlatList>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const idxRef    = useRef(0);
  const isManual  = useRef(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const dotAnim   = useRef(new Animated.Value(6)).current;

  // فقط البنرات النشطة مرتبة
  const list = banners
    .filter(b => b.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // ── Auto scroll ──────────────────────────────────────────────
  const startTimer = () => {
    if (list.length <= 1) return;
    timerRef.current = setInterval(() => {
      if (isManual.current) return;
      const next = (idxRef.current + 1) % list.length;
      flatRef.current?.scrollToIndex({ index: next, animated: true });
      idxRef.current = next;
      setActiveIdx(next);
    }, AUTO_INTERVAL);
  };

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [list.length]);

  // ── Dot animation ────────────────────────────────────────────
  useEffect(() => {
    dotAnim.setValue(6);
    Animated.spring(dotAnim, {
      toValue: 20, useNativeDriver: false, speed: 20, bounciness: 6,
    }).start();
  }, [activeIdx]);

  if (!list.length) return null;

  const goTo = (i: number) => {
    isManual.current = true;
    flatRef.current?.scrollToIndex({ index: i, animated: true });
    idxRef.current = i;
    setActiveIdx(i);
    setTimeout(() => { isManual.current = false; }, 800);
  };

  return (
    <View style={s.wrapper}>
      <FlatList
        ref={flatRef}
        data={list}
        keyExtractor={b => String(b.id)}
        horizontal
        pagingEnabled={false}
        snapToInterval={W}
        snapToAlignment="start"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
        onScrollBeginDrag={() => { isManual.current = true; }}
        onMomentumScrollEnd={e => {
          const i = Math.round(e.nativeEvent.contentOffset.x / W);
          const clamped = Math.max(0, Math.min(list.length - 1, i));
          idxRef.current = clamped;
          setActiveIdx(clamped);
          isManual.current = false;
        }}
        renderItem={({ item: b }) => (
          <TouchableOpacity
            activeOpacity={b.link ? 0.85 : 1}
            onPress={() => b.link && Linking.openURL(b.link).catch(() => {})}
            style={{ width: W, height: H }}>

            <Image
              source={{ uri: b.imageUrl }}
              style={s.img}
              resizeMode="cover"
            />

            {/* عنوان */}
            {b.title ? (
              <View style={s.titleBox}>
                <Text style={s.titleTxt} numberOfLines={1}>{b.title}</Text>
              </View>
            ) : null}

            {/* أيقونة رابط */}
            {b.link ? (
              <View style={s.linkBadge}>
                <Ionicons name="link" size={12} color="#fff" />
              </View>
            ) : null}

            {/* عداد */}
            {list.length > 1 && (
              <View style={s.counter}>
                <Text style={s.counterTxt}>{activeIdx + 1} / {list.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      {/* نقاط التنقل */}
      {list.length > 1 && (
        <View style={s.dots}>
          {list.map((_, i) => {
            const isActive = activeIdx === i;
            return (
              <TouchableOpacity key={i} onPress={() => goTo(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Animated.View style={[
                  s.dot,
                  isActive
                    ? { width: dotAnim, backgroundColor: PRIMARY }
                    : { width: 6, backgroundColor: '#d1d5db' },
                ]} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { marginBottom: 10 },
  img:     { width: '100%', height: '100%' },

  titleBox: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  titleTxt: { color: '#fff', fontWeight: '600', fontSize: 14, textAlign: 'right' },

  linkBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: 'rgba(12,102,121,0.85)',
    borderRadius: 20, width: 28, height: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  counter: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  counterTxt: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  dots: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, marginTop: 10, marginBottom: 2,
  },
  dot: { height: 6, borderRadius: 3 },
});
