import AsyncStorage from '@react-native-async-storage/async-storage';
import Papa from 'papaparse';
import { Product } from '../types/product';

// Katalog Linkleri (.env dosyasından)
const CATALOG_URLS = {
  catalog1: process.env.EXPO_PUBLIC_CATALOG_1_URL || '',
  catalog2: process.env.EXPO_PUBLIC_CATALOG_2_URL || '',
  catalog3: process.env.EXPO_PUBLIC_CATALOG_3_URL || '',
};

const CACHE_KEY_PREFIX = 'catalog_cache_';

// --- HIZLI LINK DÖNÜŞTÜRÜCÜ (Timeout Korumalı) ---
const convertDriveLink = (url: string): string => {
  if (!url || typeof url !== 'string') return '';
  
  if (url.includes('drive.google.com')) {
    // ID'yi ayıkla
    const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    
    if (idMatch && idMatch[1]) {
      // Bu format ('uc?export=view') genellikle API'den daha hızlı yanıt verir
      // ve büyük dosyalarda timeout yeme riski daha düşüktür.
      return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
    }
  }
  return url;
};

export const getCatalogData = async (catalogKey: keyof typeof CATALOG_URLS): Promise<Product[]> => {
  const csvUrl = CATALOG_URLS[catalogKey];
  const cacheKey = `${CACHE_KEY_PREFIX}${catalogKey}`;

  // --- ÖNEMLİ: GEÇİCİ TEMİZLİK ---
  // Eski/Bozuk veriler hafızada kalmasın diye önce siliyoruz.
  // Sorun tamamen çözülünce bu satırı silebilirsin.
  await AsyncStorage.removeItem(cacheKey);
  // ------------------------------

  console.log(`📡 Fetching ${catalogKey}...`);

  try {
    const response = await fetch(csvUrl);
    
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
            // --- AKILLI SATIR ANALİZİ ---
            // 1. Standart başlıkları dene
            // row[''] -> Senin loglarında çıkan "başlıksız sütun" hatasını çözer.
            let rawImage = row.image || row[''] || row.Image || row.IMAGE;
            let rawCode = row.code || row.Code || row.CODE;

            // 2. Eğer hala bulamadıysak, satırdaki değerleri incele (Fallback)
            if (!rawImage || !rawCode) {
               const values = Object.values(row);
               // Satırda en az 2 sütun varsa tahmin etmeye çalış
               if (values.length >= 2) {
                 const val1 = values[0] as string;
                 const val2 = values[1] as string;
                 
                 // İçinde 'http' geçen kesin linktir.
                 if (val1 && typeof val1 === 'string' && val1.includes('http')) { 
                    rawImage = val1; rawCode = val2; 
                 }
                 else if (val2 && typeof val2 === 'string' && val2.includes('http')) { 
                    rawImage = val2; rawCode = val1; 
                 }
               }
            }

            // Eğer hala yoksa bu satırı atla
            if (!rawCode || !rawImage) {
              // Sadece gerçekten boşsa uyar, spam yapmasın
              if (Object.keys(row).length > 1) {
                 console.warn(`⚠️ Satır ${index + 1} atlandı (Veri okunamadı):`, JSON.stringify(row));
              }
              return;
            }

            // Temizle, Linki Düzelt ve Ekle
            processedProducts.push({
              code: rawCode.toString().trim(), 
              image: convertDriveLink(rawImage.toString().trim())
            });
          });

          if (processedProducts.length > 0) {
            // Başarılı veriyi kaydet
            await AsyncStorage.setItem(cacheKey, JSON.stringify(processedProducts));
            console.log(`✅ ${catalogKey} updated successfully. Items: ${processedProducts.length}`);
            resolve(processedProducts);
          } else {
            console.error(`❌ ${catalogKey} returned 0 items after processing.`);
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