import { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Image,
  Text, Linking, useWindowDimensions,
  FlatList, Animated,
} from 'react-native';

const PRIMARY       = '#0c6679';
const AUTO_INTERVAL = 7000; // تم التغيير من 4000 إلى 7000 لتقليل السرعة

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
  // نسبة العرض إلى الارتفاع 1536/990 = 1.5515
  const ASPECT_RATIO = 1536 / 990;
  const W        = containerWidth ?? screenWidth;
  const BANNER_H = Math.round(W / ASPECT_RATIO);

  const flatRef    = useRef<FlatList>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const isManual   = useRef(false);
  const currentIdx = useRef(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const dotAnim    = useRef(new Animated.Value(0)).current;

  // فلترة وترتيب البنرات
  const active = banners
    .filter(b => b.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // ── Auto-scroll ───────────────────────────────────────────────
  const startTimer = () => {
    if (active.length <= 1) return;
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

  // ── Dot animation ─────────────────────────────────────────────
  useEffect(() => {
    dotAnim.setValue(0);
    Animated.spring(dotAnim, {
      toValue: 1,
      useNativeDriver: false,
      friction: 7,
      tension: 50,
    }).start();
  }, [activeIdx]);

  if (!active.length) return null;

  const goTo = (idx: number) => {
    isManual.current = true;
    stopTimer();
    flatRef.current?.scrollToIndex({ index: idx, animated: true });
    currentIdx.current = idx;
    setActiveIdx(idx);
    setTimeout(() => {
      isManual.current = false;
      startTimer();
    }, 1000);
  };

  return (
    <View style={[s.container, { height: BANNER_H + 28 }]}>

      {/* ── الصور ── */}
      <FlatList
        ref={flatRef}
        data={active}
        keyExtractor={item => String(item.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
        bounces={false}
        getItemLayout={(_, index) => ({
          length: W,
          offset: W * index,
          index,
        })}
        onScrollBeginDrag={() => {
          isManual.current = true;
          stopTimer();
        }}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / W);
          const clamped = Math.max(0, Math.min(active.length - 1, idx));
          currentIdx.current = clamped;
          setActiveIdx(clamped);
          isManual.current = false;
          startTimer();
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={item.link ? 0.85 : 1}
            onPress={() => item.link && Linking.openURL(item.link).catch(() => {})}
            style={{ width: W, height: BANNER_H }}
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={[s.image, { width: W, height: BANNER_H }]}
              resizeMode="cover"
            />
            {/* عنوان اختياري */}
            {!!item.title && (
              <View style={s.titleBox}>
                <Text style={s.titleTxt} numberOfLines={1}>{item.title}</Text>
              </View>
            )}
            {/* عداد */}
            {active.length > 1 && (
              <View style={s.counter}>
                <Text style={s.counterTxt}>{activeIdx + 1} / {active.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      {/* ── نقاط التنقل ── */}
      {active.length > 1 && (
        <View style={s.dots}>
          {active.map((_, i) => {
            const isAct = activeIdx === i;
            const dotW  = dotAnim.interpolate({
              inputRange:  [0, 1],
              outputRange: isAct ? [6, 22] : [22, 6],
            });
            return (
              <TouchableOpacity key={i} onPress={() => goTo(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Animated.View style={[
                  s.dot,
                  isAct
                    ? { width: isAct ? 22 : 6, backgroundColor: PRIMARY }
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
  container: { marginBottom: 8 },
  image: { borderRadius: 20, overflow: 'hidden' }, // جعل البانر منحني الأطراف

  titleBox: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomLeftRadius: 20,  // لمطابقة انحناء الصورة
    borderBottomRightRadius: 20,
  },
  titleTxt: { color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'right' },

  counter: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  counterTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },

  dots: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 6, marginTop: 8,
  },
  dot: { height: 6, borderRadius: 3 },
});