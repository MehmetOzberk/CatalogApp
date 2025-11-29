import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next'; 

// DÜZELTME 1: Rota tiplerini yeni yapıya (/catalog/id) göre güncelledik
type RoutePath = '/catalog/catalog1' | '/catalog/catalog2' | '/catalog/catalog3';

export default function Index() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  
  const { t } = useTranslation(); 

  const catalogs: { id: number; name: string; route: RoutePath; image: any }[] = [
    { 
      id: 1, 
      name: t('embroidered'), 
      // DÜZELTME 2: Rota artık dinamik klasöre gidiyor
      route: '/catalog/catalog1', 
      image: require('../assets/images/catalog1.jpg') 
    },
    { 
      id: 2, 
      name: t('printed'), 
      route: '/catalog/catalog2', 
      image: require('../assets/images/catalog2.jpg') 
    },
    { 
      id: 3, 
      name: t('lace'), 
      route: '/catalog/catalog3', 
      image: require('../assets/images/catalog3.jpg') 
    },
  ];

  // Stil hesaplamaları (Senin ayarların)
  let imageStyle;
  if (isLandscape) {
    const size = width * 0.22;
    imageStyle = { width: size, height: size };
  } else {
    const h = height * 0.22;
    imageStyle = { height: h, width: h, aspectRatio: 1 };
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>{t('catalogs')}</Text>
      </View>
      
      <View style={[
        styles.catalogRow, 
        { flexDirection: isLandscape ? 'row' : 'column' } 
      ]}>
        {catalogs.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => router.push(cat.route as any)}
            style={styles.catalogButton}
          >
            <Image
              source={cat.image}
              style={[styles.catalogImage, imageStyle]}
            />
            <Text style={styles.catalogText}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 0 },
  headerContainer: { height: '8%', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', margin: 0, padding: 0 },
  catalogRow: { flex: 1, justifyContent: 'space-evenly', alignItems: 'center', width: '100%', paddingBottom: 15 },
  catalogButton: { alignItems: 'center', justifyContent: 'center' },
  catalogText: { marginTop: 5, fontSize: 16, fontWeight: '600' },
  catalogImage: { borderRadius: 15, resizeMode: 'cover', borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOffset: { width:10, height: 2 }, shadowOpacity: 0.3, shadowRadius: 100},
});