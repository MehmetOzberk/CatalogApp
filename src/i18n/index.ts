import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Çeviriler
const resources = {
  en: {
    translation: {
      "catalogs": "Catalogs",
      "set": "Set",
      "embroidered": "Embroidered",
      "lace": "Lace",
      "product_catalog": "Product Catalog",
      "back": "Back",
      "loading": "Loading catalog..."
    }
  },
  tr: {
    translation: {
      "catalogs": "Kataloglar",
      "set": "Set",
      "embroidered": "Nakışlı",
      "lace": "Dantelli",
      "product_catalog": "Ürün Kataloğu",
      "back": "Geri",
      "loading": "Katalog yükleniyor..."
    }
  },
  ru: {
    translation: {
      "catalogs": "Каталоги",
      "set": "Комплект",
      "embroidered": "С вышивкой",
      "lace": "Кружевные",
      "product_catalog": "Каталог товаров",
      "back": "Назад",
      "loading": "Загрузка каталога..."
    }
  }
};

// --- DİL ALGILAYICI VE KAYDEDİCİ (LANGUAGE DETECTOR) ---
const languageDetector: any = {
  type: 'languageDetector',
  async: true, // Asenkron çalışacağını belirtiyoruz (AsyncStorage için)
  
  // 1. DİLİ ALGILA (Uygulama açılınca çalışır)
  detect: async (callback: (lang: string) => void) => {
    try {
      // Önce hafızaya bak
      const savedLanguage = await AsyncStorage.getItem('user-language');
      
      if (savedLanguage) {
        // Kayıt varsa onu döndür
        return callback(savedLanguage);
      }
    } catch (error) {
      console.log('Dil okuma hatası', error);
    }

    // Kayıt yoksa telefonun dilini döndür (Varsayılan TR)
    const phoneLanguage = Localization.getLocales()[0].languageCode ?? 'tr';
    return callback(phoneLanguage);
  },

  // 2. BAŞLATMA (Boş bırakabiliriz)
  init: () => {},

  // 3. DİLİ KAYDET (i18n.changeLanguage çağrılınca çalışır)
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem('user-language', language);
      console.log('Dil kaydedildi:', language);
    } catch (error) {
      console.log('Dil kaydetme hatası', error);
    }
  },
};

i18n
  .use(languageDetector) // Dedektörü kullan
  .use(initReactI18next)
  .init({
    resources,
    // ÖNEMLİ: 'lng' parametresini kaldırdık! 
    // Çünkü 'lng' yazarsak dedektörü ezer ve hep o dille başlar.
    // Artık dili dedektör belirleyecek.
    
    fallbackLng: 'en', // Dil bulunamazsa İngilizce aç
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
    react: {
      useSuspense: false // Yükleme sırasında ekranın donmasını engeller
    }
  });

export default i18n;