import { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Image,
  Text, Linking, useWindowDimensions, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY       = '#0c6679';
const BANNER_H      = 170;
const AUTO_INTERVAL = 3500;

type Banner = { id: number; imageUrl: string; title?: string; link?: string; isActive: boolean; sortOrder: number; };

export default function BannerSlider({ banners, containerWidth }: { banners: Banner[]; containerWidth?: number }) {
  const { width: screenWidth } = useWindowDimensions();
  const width = (containerWidth ?? screenWidth) - 24;
  const scrollRef  = useRef<ScrollView>(null);
  const idxRef     = useRef(0);
  const isManual   = useRef(false);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    idxRef.current = 0;
    setActiveIdx(0);
    const timer = setInterval(() => {
      if (isManual.current) return;
      const next = (idxRef.current + 1) % banners.length;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      idxRef.current = next;
      setActiveIdx(next);
    }, AUTO_INTERVAL);
    return () => clearInterval(timer);
  }, [banners.length, width]);

  if (!banners.length) return null;

  return (
    <View style={s.container}>
      <ScrollView
        ref={scrollRef}
        horizontal pagingEnabled scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => { isManual.current = true; }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          idxRef.current = idx;
          setActiveIdx(idx);
          isManual.current = false;
        }}
      >
        {banners.map((b) => (
          <TouchableOpacity key={b.id}
            activeOpacity={b.link ? 0.88 : 1}
            onPress={() => b.link && Linking.openURL(b.link).catch(() => {})}
            style={[s.slide, { width, height: BANNER_H }]}
          >
            <Image source={{ uri: b.imageUrl }} style={s.img} resizeMode="cover" />
            {b.title ? <View style={s.titleBox}><Text style={s.titleTxt}>{b.title}</Text></View> : null}
            {b.link  ? <View style={s.linkBadge}><Ionicons name="link-outline" size={10} color="#fff" /></View> : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
      {banners.length > 1 && (
        <View style={s.dots}>
          {banners.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => {
              isManual.current = true;
              scrollRef.current?.scrollTo({ x: i * width, animated: true });
              idxRef.current = i;
              setActiveIdx(i);
            }}>
              <View style={[s.dot, activeIdx === i && s.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: 14 },
  slide:     { overflow: 'hidden' },
  img:       { width: '100%', height: '100%' },
  titleBox:  { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.38)', paddingHorizontal: 14, paddingVertical: 8 },
  titleTxt:  { color: '#fff', fontWeight: '700', fontSize: 14, textAlign: 'right' },
  linkBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, padding: 5 },
  dots:      { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d1d5db' },
  dotActive: { backgroundColor: PRIMARY, width: 20, borderRadius: 3 },
});
