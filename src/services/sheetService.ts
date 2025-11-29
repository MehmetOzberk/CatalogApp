import AsyncStorage from '@react-native-async-storage/async-storage';
import Papa from 'papaparse';
import { Product } from '../types/product';

// API Key (Env'den)
const GOOGLE_DRIVE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_DRIVE_API_KEY || ''; 

// Katalog Linkleri (Env'den)
const CATALOG_URLS = {
  catalog1: process.env.EXPO_PUBLIC_CATALOG_1_URL || '',
  catalog2: process.env.EXPO_PUBLIC_CATALOG_2_URL || '',
  catalog3: process.env.EXPO_PUBLIC_CATALOG_3_URL || '',
};

const CACHE_KEY_PREFIX = 'catalog_cache_';

// --- YARDIMCI FONKSİYON: Resmi API Link Dönüştürücü ---
const convertToApiLink = (url: string): string => {
  if (!url) return '';
  
  // Eğer link zaten bir API linki ise dokunma
  if (url.includes('googleapis.com')) return url;

  // Google Drive linki mi?
  if (url.includes('drive.google.com')) {
    // ID'yi ayıkla
    // Regex: /d/ID/view  VEYA  id=ID formatlarını yakalar
    const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    
    if (idMatch && idMatch[1]) {
      const fileId = idMatch[1];
      
      // Resmi Google API linkini oluşturuyoruz.
      return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${GOOGLE_DRIVE_API_KEY}`;
    }
  }
  // Drive dışı bir linkse olduğu gibi bırak
  return url;
};

export const getCatalogData = async (catalogKey: keyof typeof CATALOG_URLS): Promise<Product[]> => {
  const csvUrl = CATALOG_URLS[catalogKey];
  const cacheKey = `${CACHE_KEY_PREFIX}${catalogKey}`;

  try {
    const response = await fetch(csvUrl);
    
    if (!response.ok) throw new Error('Network response was not ok');

    const csvText = await response.text();

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: any) => {
          const rawProducts = results.data as Product[];
          
          // VERİYİ İŞLEME VE DÜZELTME
          const processedProducts = rawProducts
            .filter((p: Product) => p.code && p.image) // Boş satırları at
            .map((p: Product) => ({
              ...p,
              // Linki API formatına çevir (Hız ve Güvenlik için)
              image: convertToApiLink(p.image)
            }));

          if (processedProducts.length > 0) {
            await AsyncStorage.setItem(cacheKey, JSON.stringify(processedProducts));
            console.log(`${catalogKey} updated via Google API. Count: ${processedProducts.length}`);
            resolve(processedProducts);
          } else {
            console.log('Data invalid, using cache.');
            const cached = await getFromCache(cacheKey);
            resolve(cached);
          }
        },
        error: async (err: any) => {
          console.log('PapaParse Error:', err);
          const cached = await getFromCache(cacheKey);
          resolve(cached);
        }
      });
    });

  } catch (error) {
    console.log('Offline or Error, using cache...', error);
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