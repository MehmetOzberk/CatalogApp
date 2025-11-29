import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { Audio } from 'expo-av'; // <--- 1. SES KÜTÜPHANESİ EKLENDİ

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PAGE_WIDTH = SCREEN_WIDTH; 
const PAGE_HEIGHT = SCREEN_HEIGHT; 
const PERSPECTIVE = 2000;

interface Product {
  code: string;
  image: string;
}

interface FlipbookProps {
  products: Product[];
}

// --- İÇERİK BİLEŞENİ (SABİT) ---
const PageContent = React.memo(({ item, index }: { item: Product; index: number }) => {
  return (
    <View style={styles.pageContainer}>
      <Image 
        source={{ uri: item.image }} 
        style={styles.image} 
        contentFit="scale-down"
        cachePolicy="memory-disk"
      />
      <View style={styles.overlay}>
        <Text style={styles.codeText}>{item.code}</Text>
      </View>
      <View style={styles.pageNumber}>
        <Text style={styles.pageNumberText}>{index + 1}</Text>
      </View>
      <View style={styles.spineShadow} />
    </View>
  );
}, (prev, next) => prev.item.code === next.item.code);


// --- ANİMASYONLU WRAPPER ---
const AnimatedPage = ({ 
  item, 
  index, 
  animatedIndex, 
  translationX 
}: { 
  item: Product; 
  index: number; 
  animatedIndex: SharedValue<number>;
  translationX: SharedValue<number>;
}) => {
  
  const animatedStyle = useAnimatedStyle(() => {
    const offset = index - animatedIndex.value;

    if (offset > 0) {
      return { transform: [{ rotateY: '0deg' }], zIndex: 1, opacity: 1 };
    }

    if (offset === 0) {
      if (translationX.value > 0) {
         return { transform: [{ rotateY: '0deg' }], zIndex: 10, opacity: 1 };
      }
      const rotateY = interpolate(translationX.value, [0, -SCREEN_WIDTH], [0, -180], Extrapolation.CLAMP);
      return {
        transform: [{ perspective: PERSPECTIVE }, { translateX: -PAGE_WIDTH / 2 }, { rotateY: `${rotateY}deg` }, { translateX: PAGE_WIDTH / 2 }],
        zIndex: 10,
        opacity: rotateY < -90 ? 0 : 1, 
      };
    }

    if (offset === -1) {
      if (translationX.value <= 0) {
        return { transform: [{ rotateY: '-180deg' }], zIndex: -1, opacity: 0 };
      }
      const rotateY = interpolate(translationX.value, [0, SCREEN_WIDTH], [-180, 0], Extrapolation.CLAMP);
      return {
        transform: [{ perspective: PERSPECTIVE }, { translateX: -PAGE_WIDTH / 2 }, { rotateY: `${rotateY}deg` }, { translateX: PAGE_WIDTH / 2 }],
        zIndex: 20, 
        opacity: 1,
      };
    }

    return { opacity: 0, zIndex: -100, transform: [{ translateX: 10000 }] };
  });

  return (
    <Animated.View style={[styles.pageWrapper, animatedStyle]} pointerEvents="none">
      <PageContent item={item} index={index} />
    </Animated.View>
  );
};


export const Flipbook: React.FC<FlipbookProps> = ({ products }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translationX = useSharedValue(0);
  const animatedIndex = useSharedValue(0);

  // --- 2. SES ÇALMA FONKSİYONU ---
  const playFlipSound = async () => {
    try {
      // Dosya yolunu kendi dosya adınıza göre güncelleyin
      // assets klasöründe page-flip.mp3 olduğunu varsayıyoruz
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/page-flip.mp3') 
      );
      
      // Sesi oynat
      await sound.playAsync();
      
      // Ses bitince bellekten temizlenmesi için (Otomatik de temizlenir ama garanti olsun)
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('Ses çalma hatası:', error);
    }
  };

  const handleStateUpdate = (newIndex: number) => {
    setCurrentIndex(newIndex);
  };

  // --- PAN GESTURE ---
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (animatedIndex.value >= products.length - 1 && e.translationX < 0) return;
      if (animatedIndex.value === 0 && e.translationX > 0) return;
      translationX.value = e.translationX;
    })
    .onEnd((e) => {
      // İLERİ
      if (e.translationX < -SCREEN_WIDTH * 0.3 && animatedIndex.value < products.length - 1) {
        // Animasyon başladığında sesi çal
        runOnJS(playFlipSound)(); 
        
        translationX.value = withTiming(-SCREEN_WIDTH, { duration: 500 }, (finished) => {
          if (finished) {
            animatedIndex.value += 1;
            translationX.value = 0;
            runOnJS(handleStateUpdate)(animatedIndex.value);
          }
        });
      } 
      // GERİ
      else if (e.translationX > SCREEN_WIDTH * 0.3 && animatedIndex.value > 0) {
        runOnJS(playFlipSound)(); // Sesi çal

        translationX.value = withTiming(SCREEN_WIDTH, { duration: 500 }, (finished) => {
          if (finished) {
            animatedIndex.value -= 1;
            translationX.value = 0;
            runOnJS(handleStateUpdate)(animatedIndex.value);
          }
        });
      } 
      // İPTAL
      else {
        translationX.value = withTiming(0, { duration: 300 });
      }
    });

  // --- TAP GESTURE ---
  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      // SAĞA TIK (İLERİ)
      if (e.x > SCREEN_WIDTH / 2) {
        if (animatedIndex.value < products.length - 1) {
          runOnJS(playFlipSound)(); // Sesi çal

          translationX.value = withTiming(-SCREEN_WIDTH, { duration: 600 }, (finished) => {
            if (finished) {
              animatedIndex.value += 1;
              translationX.value = 0;
              runOnJS(handleStateUpdate)(animatedIndex.value);
            }
          });
        }
      } 
      // SOLA TIK (GERİ)
      else {
        if (animatedIndex.value > 0) {
          runOnJS(playFlipSound)(); // Sesi çal

          translationX.value = withTiming(SCREEN_WIDTH, { duration: 600 }, (finished) => {
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
        <View style={styles.bookContainer}>
          {products.map((item, index) => {
            if (index < currentIndex - 1 || index > currentIndex + 1) return null;

            return (
              <AnimatedPage
                key={item.code} 
                item={item}
                index={index}
                animatedIndex={animatedIndex}
                translationX={translationX}
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
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookContainer: {
    width: PAGE_WIDTH,
    height: '100%',
    elevation: 0,
    shadowOpacity: 0,
  },
  pageWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#b4b2b2ff', 
    backfaceVisibility: 'hidden', 
  },
  pageContainer: {
    flex: 1,
    opacity: 1,
    backgroundColor: '#000', 
    overflow: 'hidden',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#b4b2b2ff',
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
    bottom: 30,
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
    bottom: 30,
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