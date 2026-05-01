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
  // حساب العرض ليكون متجاوباً مع ترك مسافة جانبية
  const width = (containerWidth ?? screenWidth) - 24;
  // جعل الارتفاع متناسباً مع العرض (نسبة 16:9 تقريباً) بحد أقصى 180 للموبايل
  const BANNER_H = Math.min(width * 0.45, 180);
  
  const scrollRef  = useRef<ScrollView>(null);
  const idxRef     = useRef(0);
  const isManual   = useRef(false);
  const [activeIdx, setActiveIdx] = useState(0);
  
  // قيمة متحركة لعرض النقطة النشطة بسلاسة
  const dotWidthAnim = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    if (banners.length <= 1) return;
    
    const timer = setInterval(() => {
      if (isManual.current) return;
      const next = (idxRef.current + 1) % banners.length;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      idxRef.current = next;
      setActiveIdx(next);
    }, AUTO_INTERVAL);
    
    return () => clearInterval(timer);
  }, [banners.length, width]);

  // تحريك عرض النقطة النشطة عند تغيير الفهرس
  useEffect(() => {
    Animated.spring(dotWidthAnim, {
      toValue: 20,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
    
    // إعادة النقاط الأخرى لحجمها الطبيعي (يتم التعامل معه عبر الشرط في الـ JSX)
  }, [activeIdx]);

  if (!banners.length) return null;

  const handleScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / width);
    if (idx !== activeIdx && idx >= 0 && idx < banners.length) {
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
        onScroll={(e) => {
          // تحديث الفهرس أثناء السحب أيضاً لتفاعل أسرع
          const x = e.nativeEvent.contentOffset.x;
          const idx = Math.round(x / width);
          if (idx !== activeIdx && idx >= 0 && idx < banners.length) {
            setActiveIdx(idx);
            idxRef.current = idx;
          }
        }}
      >
        {banners.map((b) => (
          <TouchableOpacity key={b.id}
            activeOpacity={b.link ? 0.9 : 1}
            onPress={() => b.link && Linking.openURL(b.link).catch(() => {})}
            style={[s.slide, { width, height: BANNER_H }]}
          >
            <Image source={{ uri: b.imageUrl }} style={s.img} resizeMode="cover" />
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
            
            {/* ترقيم الصور */}
            <View style={s.counter}>
              <Text style={s.counterTxt}>{activeIdx + 1} / {banners.length}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {banners.length > 1 && (
        <View style={s.dots}>
          {banners.map((_, i) => {
            const isActive = activeIdx === i;
            return (
              <TouchableOpacity key={i} onPress={() => {
                isManual.current = true;
                scrollRef.current?.scrollTo({ x: i * width, animated: true });
                idxRef.current = i;
                setActiveIdx(i);
                setTimeout(() => { isManual.current = false; }, 1000);
              }}>
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
    alignItems: 'center',
  },
  slide: { 
    overflow: 'hidden', 
    borderRadius: 16, // انحناء الأطراف الأربعة
    backgroundColor: '#eee',
    // إضافة ظل خفيف لإبراز الانحناء
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: 'rgba(0,0,0,0.4)', 
    paddingHorizontal: 12, 
    paddingVertical: 6 
  },
  titleTxt: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 13, 
    textAlign: 'right' 
  },
  linkBadge: { 
    position: 'absolute', 
    top: 10, 
    left: 10, 
    backgroundColor: 'rgba(12, 102, 121, 0.8)', 
    borderRadius: 12, 
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  counterTxt: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dots: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    gap: 6, 
    marginTop: 8 
  },
  dot: { 
    height: 6, 
    borderRadius: 3, 
  },
});
