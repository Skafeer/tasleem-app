// ========================== BannerSlider.tsx (المعدل) ==========================
import { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Image,
  Text, Linking, useWindowDimensions, ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY       = '#0c6679';
const AUTO_INTERVAL = 4000;

type Banner = { id: number; imageUrl: string; title?: string; link?: string; isActive: boolean; sortOrder: number; };

export default function BannerSlider({ banners, containerWidth }: { banners: Banner[]; containerWidth?: number }) {
  const { width: screenWidth } = useWindowDimensions();
  const width = containerWidth ?? screenWidth;
  const BANNER_H = Math.round(width / 3); // 3:1 ratio
  
  const scrollRef  = useRef<ScrollView>(null);
  const idxRef     = useRef(0);
  const isManual   = useRef(false);
  const [activeIdx, setActiveIdx] = useState(0);
  
  const dotWidthAnim = useRef(new Animated.Value(6)).current;

  // فلترة البنرات النشطة فقط وترتيبها حسب sortOrder
  const activeBanners = banners
    .filter(b => b.isActive === true)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    
    const timer = setInterval(() => {
      if (isManual.current) return;
      const next = (idxRef.current + 1) % activeBanners.length;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      idxRef.current = next;
      setActiveIdx(next);
    }, AUTO_INTERVAL);
    
    return () => clearInterval(timer);
  }, [activeBanners.length, width]);

  useEffect(() => {
    Animated.spring(dotWidthAnim, {
      toValue: 20,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  }, [activeIdx]);

  if (!activeBanners.length) return null;

  const handleScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / width);
    if (idx !== activeIdx && idx >= 0 && idx < activeBanners.length) {
      idxRef.current = idx;
      setActiveIdx(idx);
    }
  };

  return (
    <View style={s.container}>
      <ScrollView
        ref={scrollRef}
        horizontal 
        pagingEnabled 
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => { isManual.current = true; }}
        onMomentumScrollEnd={(e) => {
          handleScroll(e);
          isManual.current = false;
        }}
        onScroll={handleScroll}
      >
        {activeBanners.map((b) => (
          <TouchableOpacity 
            key={b.id}
            activeOpacity={b.link ? 0.9 : 1}
            onPress={() => b.link && Linking.openURL(b.link).catch(() => {})}
            style={[s.slide, { width, height: BANNER_H }]}
          >
            <Image 
              source={{ uri: b.imageUrl }} 
              style={s.img} 
              resizeMode="cover"
            />
            {b.title ? (
              <View style={s.titleBox}>
                <Text style={s.titleTxt} numberOfLines={1}>{b.title}</Text>
              </View>
            ) : null}
            {b.link ? (
              <View style={s.linkBadge}>
                <Ionicons name="link" size={12} color="#fff" />
              </View>
            ) : null}
            
            {activeBanners.length > 1 && (
              <View style={s.counter}>
                <Text style={s.counterTxt}>{activeIdx + 1} / {activeBanners.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {activeBanners.length > 1 && (
        <View style={s.dots}>
          {activeBanners.map((_, i) => {
            const isActive = activeIdx === i;
            return (
              <TouchableOpacity 
                key={i} 
                onPress={() => {
                  isManual.current = true;
                  scrollRef.current?.scrollTo({ x: i * width, animated: true });
                  idxRef.current = i;
                  setActiveIdx(i);
                  setTimeout(() => { isManual.current = false; }, 1000);
                }}
              >
                <Animated.View 
                  style={[
                    s.dot, 
                    isActive ? { width: dotWidthAnim, backgroundColor: PRIMARY } : { width: 6, backgroundColor: '#d1d5db' }
                  ]} 
                />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { 
    marginBottom: 10,
  },
  slide: { 
    overflow: 'hidden', 
    backgroundColor: '#f0f0f0',
  },
  img: { 
    width: '100%', 
    height: '100%',
  },
  titleBox: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    paddingHorizontal: 12, 
    paddingVertical: 8 
  },
  titleTxt: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 14, 
    textAlign: 'right' 
  },
  linkBadge: { 
    position: 'absolute', 
    top: 12, 
    left: 12, 
    backgroundColor: 'rgba(12, 102, 121, 0.85)', 
    borderRadius: 20, 
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  counterTxt: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  dots: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    gap: 8, 
    marginTop: 12,
    marginBottom: 4,
  },
  dot: { 
    height: 6, 
    borderRadius: 3, 
  },
});