import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

const resources = {
  en: {
    translation: {
      "catalogs": "Catalogs",
      "printed": "Printed",
      "embroidered": "Embroidered",
      "lace": "Lace",
      "product_catalog": "Product Catalog",
      "back": "Back",
    }
  },
  tr: {
    translation: {
      "catalogs": "Kataloglar",
      "printed": "Baskılı",
      "embroidered": "Nakışlı",
      "lace": "Dantelli",
      "product_catalog": "Ürün Kataloğu",
      "back": "Geri",
    }
  },
  // YENİ EKLENEN KISIM: RUSÇA
  ru: {
    translation: {
      "catalogs": "Каталоги",
      "printed": "С принтом",
      "embroidered": "С вышивкой",
      "lace": "Кружевные",
      "product_catalog": "Каталог товаров",
      "back": "Назад",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: Localization.getLocales()[0].languageCode ?? 'tr',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4'
  });

export default i18n;