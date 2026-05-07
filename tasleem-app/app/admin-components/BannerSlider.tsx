import { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Image,
  Text, Linking, useWindowDimensions, ScrollView,
} from 'react-native';

const PRIMARY       = '#0c6679';
const AUTO_INTERVAL = 6000;
const RADIUS        = 14;

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
  const W        = (containerWidth ?? screenWidth) - 24;
  const BANNER_H = Math.round(W * 990 / 1536);

  const scrollRef  = useRef<ScrollView>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const isManual   = useRef(false);
  const currentIdx = useRef(0);
  const [activeIdx, setActiveIdx] = useState(0);

  const active: Banner[] = (banners ?? [])
    .filter(b => b.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // ── scroll إلى index بدون تجاوز الحدود ──────────────────────
  const goTo = (idx: number, animated = true) => {
    const i = Math.max(0, Math.min(active.length - 1, idx));
    scrollRef.current?.scrollTo({ x: i * W, animated });
    currentIdx.current = i;
    setActiveIdx(i);
  };

  // ── timer ─────────────────────────────────────────────────────
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    if (active.length <= 1) return;
    timerRef.current = setInterval(() => {
      if (!isManual.current) {
        const next = (currentIdx.current + 1) % active.length;
        goTo(next);
      }
    }, AUTO_INTERVAL);
  };

  useEffect(() => {
    currentIdx.current = 0;
    setActiveIdx(0);
    // reset الـ scroll عند تغيير القائمة
    setTimeout(() => goTo(0, false), 50);
    startTimer();
    return stopTimer;
  }, [active.length, W]);

  if (!active.length) return null;

  const handleDotPress = (i: number) => {
    isManual.current = true;
    stopTimer();
    goTo(i);
    setTimeout(() => {
      isManual.current = false;
      startTimer();
    }, 1500);
  };

  return (
    <View style={[styles.wrapper, { marginHorizontal: 12, marginBottom: 8 }]}>

      {/* ── الصور ── */}
      <View style={[styles.clip, { width: W, height: BANNER_H, borderRadius: RADIUS }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled={false}
          snapToInterval={W}
          snapToAlignment="center"
          decelerationRate="fast"
          disableIntervalMomentum={true}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => {
            isManual.current = true;
            stopTimer();
          }}
          onMomentumScrollEnd={e => {
            const x   = e.nativeEvent.contentOffset.x;
            const idx = Math.max(0, Math.min(active.length - 1, Math.round(x / W)));
            currentIdx.current = idx;
            setActiveIdx(idx);
            isManual.current = false;
            startTimer();
          }}
        >
          {active.map(b => (
            <TouchableOpacity
              key={String(b.id)}
              activeOpacity={b.link ? 0.85 : 1}
              style={{ width: W, height: BANNER_H }}
              onPress={() => {
                if (b.link) Linking.openURL(b.link).catch(() => {});
              }}
            >
              <Image
                source={{ uri: b.imageUrl }}
                style={{ width: W, height: BANNER_H }}
                resizeMode="cover"
              />

              {/* عنوان اختياري */}
              {!!b.title && (
                <View style={styles.titleBox}>
                  <Text style={styles.titleTxt} numberOfLines={1}>{b.title}</Text>
                </View>
              )}

              {/* عداد */}
              {active.length > 1 && (
                <View style={styles.counter}>
                  <Text style={styles.counterTxt}>{activeIdx + 1} / {active.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── نقاط التنقل ── */}
      {active.length > 1 && (
        <View style={styles.dots}>
          {active.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => handleDotPress(i)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View
                style={[
                  styles.dot,
                  activeIdx === i
                    ? { width: 22, backgroundColor: PRIMARY }
                    : { width: 6,  backgroundColor: '#d1d5db' },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},

  // overflow:hidden على View خارجية يطبق الـ borderRadius على الصور
  clip: {
    overflow: 'hidden',
  },

  titleBox: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  titleTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'right',
  },

  counter: {
    position: 'absolute',
    top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  counterTxt: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
