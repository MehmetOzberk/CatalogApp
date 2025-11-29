import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router'; // Parametreyi okumak için
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Flipbook } from '../../src/components/FlipBook';
import { useTranslation } from 'react-i18next';
import { getCatalogData } from '../../src/services/sheetService';
import { Product } from '../../src/types/product';

export default function DynamicCatalogScreen() {
  const { t } = useTranslation();
  
  // URL'den ID'yi alıyoruz (örn: "catalog1", "catalog2")
  const { id } = useLocalSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // Gelen ID'nin geçerli bir katalog olup olmadığını kontrol edebilirsin
      // veya direkt servise yollarsın.
      if (id) {
        // "as any" kullanarak TypeScript'e güvenmesini söylüyoruz
        // çünkü id'nin string olarak geldiğini ama bizim key beklediğimizi biliyoruz.
        const data = await getCatalogData(id as any);
        setProducts(data);
        setLoading(false);
      }
    };

    loadData();
  }, [id]); // ID değişirse (farklı kataloğa tıklanırsa) yeniden yükle

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack.Screen 
        options={{
          // Başlık sabit kalabilir veya dinamikleştirebilirsin
          headerShown: false,
          title: t('product_catalog'), 
          headerStyle: { backgroundColor: '#fff' }, 
          headerTintColor: '#333',
          headerShadowVisible: false,
          headerBackTitle: t('back'),
        }} 
      />
      
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: '#fff', marginTop: 10 }}>{t('catalogs')}...</Text>
        </View>
      ) : (
        <Flipbook products={products} />
      )}
    </GestureHandlerRootView>
  );
}