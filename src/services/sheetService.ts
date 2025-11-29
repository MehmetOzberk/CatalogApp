import AsyncStorage from '@react-native-async-storage/async-storage';
import Papa from 'papaparse';
import { Product } from '../types/product';

// CATALOG URL'leri artık EAS Secret'tan (process.env) geliyor.
const CATALOG_URLS = {
  catalog1: process.env.EXPO_PUBLIC_CATALOG_1_URL || '',
  catalog2: process.env.EXPO_PUBLIC_CATALOG_2_URL || '',
  catalog3: process.env.EXPO_PUBLIC_CATALOG_3_URL || '',
};

const CACHE_KEY_PREFIX = 'catalog_cache_';

// --- HIZLI LINK DÖNÜŞTÜRÜCÜ ---
// Google Drive linklerini "Direct Download" formatına çevirir.
// Bu format API Key gerektirmez ve genellikle daha hızlıdır.
const convertDriveLink = (url: string): string => {
  if (!url || typeof url !== 'string') return '';
  
  if (url.includes('drive.google.com')) {
    // Link içindeki ID'yi yakalar (d/ID/view veya id=ID)
    const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    
    if (idMatch && idMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
    }
  }
  return url;
};

export const getCatalogData = async (catalogKey: keyof typeof CATALOG_URLS): Promise<Product[]> => {
  const csvUrl = CATALOG_URLS[catalogKey];
  const cacheKey = `${CACHE_KEY_PREFIX}${catalogKey}`;

  // Eğer URL yoksa (Secret yüklenmediyse) boş dön
  if (!csvUrl) {
    console.error(`❌ URL not found for ${catalogKey}. Check EAS Secrets.`);
    return await getFromCache(cacheKey);
  }

  console.log(`📡 Fetching ${catalogKey}...`);

  try {
    const response = await fetch(csvUrl, {
      // ÖNEMLİ: Google'ın isteği reddetmemesi için tarayıcı taklidi yapıyoruz
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/csv,text/plain,*/*',
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Network Error on ${catalogKey}:`, response.status);
      throw new Error('Network response was not ok');
    }

    const csvText = await response.text();

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: any) => {
          const rawProducts = results.data as any[];
          const processedProducts: Product[] = [];

          rawProducts.forEach((row, index) => {
            // AKILLI SATIR ANALİZİ:
            // 1. Standart 'image' veya hatalı boş başlık '' kontrolü
            let rawImage = row.image || row[''] || row.Image;
            let rawCode = row.code || row.Code;

            // 2. Eğer hala yoksa, satırdaki sütunları sırayla dene
            if (!rawImage || !rawCode) {
               const values = Object.values(row);
               if (values.length >= 2) {
                 const val1 = values[0] as string;
                 const val2 = values[1] as string;
                 
                 // Linke benzeyeni resim, diğerini kod yap
                 if (val1 && typeof val1 === 'string' && val1.includes('http')) { 
                    rawImage = val1; rawCode = val2; 
                 }
                 else if (val2 && typeof val2 === 'string' && val2.includes('http')) { 
                    rawImage = val2; rawCode = val1; 
                 }
               }
            }

            // Veri eksikse atla
            if (!rawCode || !rawImage) {
              return;
            }

            // Temizle ve Ekle
            processedProducts.push({
              code: rawCode.toString().trim(), 
              image: convertDriveLink(rawImage.toString().trim())
            });
          });

          if (processedProducts.length > 0) {
            // Başarılıysa telefona kaydet (Cache)
            await AsyncStorage.setItem(cacheKey, JSON.stringify(processedProducts));
            console.log(`✅ ${catalogKey} updated. Valid Items: ${processedProducts.length}`);
            resolve(processedProducts);
          } else {
            console.error(`❌ ${catalogKey} returned 0 valid items.`);
            // Boş geldiyse eski kaydı göster
            const cached = await getFromCache(cacheKey);
            resolve(cached);
          }
        },
        error: async (err: any) => {
          console.error('❌ PapaParse Error:', err);
          const cached = await getFromCache(cacheKey);
          resolve(cached);
        }
      });
    });

  } catch (error) {
    console.log(`⚠️ Offline or Error fetching ${catalogKey}, loading from cache...`);
    return await getFromCache(cacheKey);
  }
};

const getFromCache = async (key: string): Promise<Product[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch(e) {
    return [];
  }
};