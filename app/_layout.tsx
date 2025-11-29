import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { TouchableOpacity, View, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import '../src/i18n';

export const unstable_settings = {
  anchor: '(tabs)',
};

// --- DEĞİŞİKLİK 1: Yerel Dosyaları Tanımlama ---
// require kullanırken dosya yolunun doğru olduğundan emin ol.
// app klasöründen çıktığımız için (..) assets klasörüne giriyoruz.
const FLAGS = {
  tr: require('../assets/images/tr.png'),
  en: require('../assets/images/uk.png'),
  ru: require('../assets/images/ru.png'),
};

export default function Layout() {
  const { i18n } = useTranslation();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      
      <Stack 
        screenOptions={{ 
          headerShown: true, 
          headerTitle: 'Madame Larissa',
          headerTitleStyle: { fontSize: 40, fontWeight: 'bold', color: '#333' },
          headerStyle: { backgroundColor: '#fff', }, 
          headerTintColor: '#333',
          
          headerRight: () => (
            <View style={styles.flagContainer}>
              
              {/* TR Bayrağı */}
              <TouchableOpacity onPress={() => changeLanguage('tr')}>
                <Image 
                  // --- DEĞİŞİKLİK 2: 'source' kullanımı değişti ---
                  // { uri: ... } yerine direkt değişkeni veriyoruz.
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

const styles = StyleSheet.create({
  flagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flag: {
    width: 52,
    height: 36,
    borderRadius: 3,
    resizeMode: 'contain', 
  }
});