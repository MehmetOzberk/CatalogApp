import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { TouchableOpacity, View, Image, StyleSheet, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import '../src/i18n';

export const unstable_settings = {
  anchor: '(tabs)',
};

// --- EKSİK OLAN BAYRAK TANIMLARI GERİ GELDİ ---
// require kullanırken dosya yolunun doğru olduğundan emin ol (assets/images).
const FLAGS = {
  tr: require('../assets/images/tr.png'),
  en: require('../assets/images/uk.png'),
  ru: require('../assets/images/ru.png'),
};

export default function Layout() {
  const { t, i18n } = useTranslation();
  
  // Ekran genişliği (Font boyutu için)
  const { width } = useWindowDimensions(); 
  const dynamicFontSize = width < 380 ? 17 : 20;

  // Dil Değiştirme Fonksiyonu
  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack 
        screenOptions={{ 
          headerShown: true, 
          headerTitle: "Madame Larissa", // Artık t() fonksiyonunu kullanıyor
          headerStyle: { backgroundColor: '#fff' }, 
          headerTintColor: '#333',
          
          headerTitleStyle: {
            fontSize: dynamicFontSize, 
            fontWeight: 'bold',
          },
          
          // --- headerRight BLOKU GERİ GELDİ ---
          headerRight: () => (
            <View style={styles.flagContainer}>
              
              {/* TR Bayrağı */}
              <TouchableOpacity onPress={() => changeLanguage('tr')}>
                <Image 
                  source={FLAGS.tr} 
                  style={[styles.flag, { opacity: i18n.language === 'tr' ? 1 : 0.4 }]} 
                />
              </TouchableOpacity>

              {/* EN Bayrağı */}
              <TouchableOpacity onPress={() => changeLanguage('en')}>
                <Image 
                  source={FLAGS.en} 
                  style={[styles.flag, { opacity: i18n.language === 'en' ? 1 : 0.4 }]} 
                />
              </TouchableOpacity>

              {/* RU Bayrağı */}
              <TouchableOpacity onPress={() => changeLanguage('ru')}>
                <Image 
                  source={FLAGS.ru} 
                  style={[styles.flag, { opacity: i18n.language === 'ru' ? 1 : 0.4 }]} 
                />
              </TouchableOpacity>

            </View>
          ),
        }} 
      />
    </GestureHandlerRootView>
  );
}

// --- EKLENMESİ GEREKEN STİLLER (Önceki hatadan dolayı silinmişti) ---
const styles = StyleSheet.create({
  flagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    gap: 12,
  },
  flag: {
    width: 52,
    height: 36,
    borderRadius: 3,
    resizeMode: 'contain',
  }
});