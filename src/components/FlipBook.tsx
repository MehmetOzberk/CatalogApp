import React, { useState, useRef } from 'react'; // useRef eklendi
import { StyleSheet, View, Text, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
  SharedValue,
  Easing,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { Audio } from 'expo-av';
import { Product } from '../types/product';

const PERSPECTIVE = 2000;
const ANIMATION_DURATION = 300; 

interface FlipbookProps {
  products: Product[];
}

// --- İÇERİK BİLEŞENİ ---
const PageContent = React.memo(({ item, index, isLandscape }: { item: Product; index: number; isLandscape: boolean }) => {
  return (
    <View style={styles.pageContainer}>
      <View style={[
        styles.imageWrapper, 
        { padding: isLandscape ? 50 : 20 }
      ]}>
        <Image 
          key={item.image} 
          source={{ uri: item.image }} 
          style={styles.image} 
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      </View>

      <View style={styles.overlay}>
        <Text style={styles.codeText}>{item.code}</Text>
      </View>
      <View style={styles.pageNumber}>
        <Text style={styles.pageNumberText}>{index + 1}</Text>
      </View>
      <View style={styles.spineShadow} />
    </View>
  );
}, (prev, next) => prev.item.code === next.item.code && prev.isLandscape === next.isLandscape);


// --- ANİMASYONLU WRAPPER ---
const AnimatedPage = ({ 
  item, 
  index, 
  animatedIndex, 
  translationX,
  pageWidth,
  isLandscape
}: { 
  item: Product; 
  index: number; 
  animatedIndex: SharedValue<number>;
  translationX: SharedValue<number>;
  pageWidth: number;
  isLandscape: boolean;
}) => {
  
  const animatedStyle = useAnimatedStyle(() => {
    const offset = index - animatedIndex.value;

    if (offset > 0) {
      return { 
        transform: [{ rotateY: '0deg' }], 
        zIndex: -index, 
        opacity: 1 
      };
    }

    if (offset === 0) {
      if (translationX.value > 0) { 
         return { transform: [{ rotateY: '0deg' }], zIndex: 10, opacity: 1 };
      }
      const rotateY = interpolate(translationX.value, [0, -pageWidth], [0, -180], Extrapolation.CLAMP);
      return {
        transform: [
          { perspective: PERSPECTIVE },
          { translateX: -pageWidth / 2 }, 
          { rotateY: `${rotateY}deg` }, 
          { translateX: pageWidth / 2 },
        ],
        zIndex: 10,
        opacity: rotateY < -90 ? 0 : 1, 
      };
    }

    if (offset === -1) {
      if (translationX.value <= 0) {
        return { transform: [{ rotateY: '-110deg' }], zIndex: -1, opacity: 0 };
      }
      const rotateY = interpolate(translationX.value, [0, pageWidth], [-110, 0], Extrapolation.CLAMP);
      return {
        transform: [
          { perspective: PERSPECTIVE },
          { translateX: -pageWidth / 2 }, 
          { rotateY: `${rotateY}deg` }, 
          { translateX: pageWidth / 2 },
        ],
        zIndex: 20, 
        opacity: 1,
      };
    }

    return { opacity: 0, zIndex: -100, transform: [{ translateX: 10000 }] };
  });

  const shadowStyle = useAnimatedStyle(() => {
    const offset = index - animatedIndex.value;
    let opacity = 0;

    if (offset === 1 && translationX.value < 0) {
        opacity = interpolate(translationX.value, [0, -pageWidth], [0.5, 0], Extrapolation.CLAMP);
    }
    if (offset === 0 && translationX.value < 0) {
        opacity = interpolate(translationX.value, [0, -pageWidth / 2], [0, 0.15], Extrapolation.CLAMP);
    }
    if (offset === 0 && translationX.value > 0) {
       opacity = interpolate(translationX.value, [0, pageWidth], [0, 0.5], Extrapolation.CLAMP);
    }

    return { opacity, zIndex: 100 };
  });

  return (
    <Animated.View style={[styles.pageWrapper, animatedStyle]} pointerEvents="none">
      <PageContent item={item} index={index} isLandscape={isLandscape} />
      <Animated.View style={[styles.shadowOverlay, shadowStyle]} />
    </Animated.View>
  );
};


export const Flipbook: React.FC<FlipbookProps> = ({ products }) => {
  const { width: PAGE_WIDTH, height: PAGE_HEIGHT } = useWindowDimensions();
  const isLandscape = PAGE_WIDTH > PAGE_HEIGHT;
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const translationX = useSharedValue(0);
  const animatedIndex = useSharedValue(0);

  // --- SES KORUMASI İÇİN REF ---
  // Son ses çalınma zamanını tutar
  const lastSoundTime = useRef(0);

  // --- GÜNCELLENMİŞ SES FONKSİYONU ---
  const playFlipSound = async () => {
    const now = Date.now();
    
    // Eğer son ses çalınmasından bu yana 200ms geçmediyse, sesi ÇALMA.
    // Bu sayede spam engellenir.
    if (now - lastSoundTime.current < 200) {
      return;
    }

    // Zamanı güncelle ve sesi çal
    lastSoundTime.current = now;

    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/page-flip.mp3') 
      );
      await sound.playAsync();
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) { 
      // Dosya yoksa sessiz kal
    }
  };

  const handleStateUpdate = (newIndex: number) => {
    setCurrentIndex(newIndex);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (animatedIndex.value >= products.length - 1 && e.translationX < 0) return;
      if (animatedIndex.value === 0 && e.translationX > 0) return;
      translationX.value = e.translationX;
    })
    .onEnd((e) => {
      if (
        (e.translationX < -PAGE_WIDTH * 0.3 || e.velocityX < -500) && 
        animatedIndex.value < products.length - 1
      ) {
        runOnJS(playFlipSound)(); 
        
        translationX.value = withTiming(-PAGE_WIDTH, { duration: ANIMATION_DURATION, easing: Easing.out(Easing.quad) }, (finished) => {
          if (finished) {
            animatedIndex.value += 1;
            translationX.value = 0;
            runOnJS(handleStateUpdate)(animatedIndex.value);
          }
        });
      } 
      else if (
        (e.translationX > PAGE_WIDTH * 0.3 || e.velocityX > 500) && 
        animatedIndex.value > 0
      ) {
        runOnJS(playFlipSound)(); 

        translationX.value = withTiming(PAGE_WIDTH, { duration: ANIMATION_DURATION, easing: Easing.out(Easing.quad) }, (finished) => {
          if (finished) {
            animatedIndex.value -= 1;
            translationX.value = 0;
            runOnJS(handleStateUpdate)(animatedIndex.value);
          }
        });
      } 
      else {
        translationX.value = withTiming(0, { duration: 200 });
      }
    });

  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      if (e.x > PAGE_WIDTH / 2) {
        if (animatedIndex.value < products.length - 1) {
          runOnJS(playFlipSound)(); 

          translationX.value = withTiming(-PAGE_WIDTH, { duration: ANIMATION_DURATION, easing: Easing.out(Easing.quad) }, (finished) => {
            if (finished) {
              animatedIndex.value += 1;
              translationX.value = 0;
              runOnJS(handleStateUpdate)(animatedIndex.value);
            }
          });
        }
      } 
      else {
        if (animatedIndex.value > 0) {
          runOnJS(playFlipSound)();

          translationX.value = withTiming(PAGE_WIDTH, { duration: ANIMATION_DURATION, easing: Easing.out(Easing.quad) }, (finished) => {
            if (finished) {
              animatedIndex.value -= 1;
              translationX.value = 0;
              runOnJS(handleStateUpdate)(animatedIndex.value);
            }
          });
        }
      }
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  if (!products || products.length === 0) return null;

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View 
          key={`book-${PAGE_WIDTH}`} 
          style={[styles.bookContainer, { width: PAGE_WIDTH, height: PAGE_HEIGHT }]}
        >
          {products.map((item, index) => {
            if (index < currentIndex - 2 || index > currentIndex + 2) return null;

            return (
              <AnimatedPage
                key={`${item.code}_${index}`} 
                item={item}
                index={index}
                animatedIndex={animatedIndex}
                translationX={translationX}
                pageWidth={PAGE_WIDTH}
                isLandscape={isLandscape}
              />
            );
          })}
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookContainer: {
    elevation: 0,
    shadowOpacity: 0,
  },
  pageWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#e5e5e5', 
    backfaceVisibility: 'hidden', 
  },
  pageContainer: {
    flex: 1,
    backgroundColor: '#e5e5e5', 
    overflow: 'hidden',
  },
  shadowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
    pointerEvents: 'none',
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%', 
    height: '100%', 
  },
  spineShadow: {
    position: 'absolute',
    left: 0, 
    top: 0,
    bottom: 0,
    width: 25,
    backgroundColor: 'rgba(0,0,0,0.0)', 
    borderRightWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    zIndex: 5
  },
  overlay: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  codeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 60,
    right: 20,
    backgroundColor: 'white',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  pageNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  }
});