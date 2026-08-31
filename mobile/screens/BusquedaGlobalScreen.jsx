import React, { useState, useRef } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Appbar, Searchbar, List, ActivityIndicator, Text } from 'react-native-paper';
import { useInventoryStore } from '../store/useInventoryStore';
import { theme } from '../theme';

export default function BusquedaGlobalScreen({ navigation }) {
  const { busquedaGlobalResultados, loadingBusquedaGlobal, errorBusquedaGlobal, buscarGlobal } = useInventoryStore();
  const [query, setQuery] = useState('');
  const debounceRef = useRef(null);

  const handleChange = (text) => {
    setQuery(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscarGlobal(text), 400);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }} dark>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Buscar en todos los depósitos" titleStyle={styles.headerTitle} />
      </Appbar.Header>

      <Searchbar placeholder="Buscar ítem..." value={query} onChangeText={handleChange} style={styles.searchbar} autoFocus />

      {loadingBusquedaGlobal && <ActivityIndicator style={{ marginTop: 24 }} animating color={theme.colors.primary} />}
      {errorBusquedaGlobal && <Text style={styles.error}>{errorBusquedaGlobal}</Text>}

      <FlatList
        data={busquedaGlobalResultados}
        keyExtractor={(item) => `${item.deposito}-${item.idItem}`}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => (
          <List.Item
            title={item.nombreItem}
            description={`${item.deposito} · Cantidad: ${item.cantidad}`}
            style={styles.listItem}
            left={(props) => <List.Icon {...props} icon={item.icono || 'package-variant'} color={theme.colors.primary} />}
            onPress={() => navigation.navigate('DepositoDetail', { nombre: item.deposito, sheetId: item.sheetId })}
          />
        )}
        ListEmptyComponent={!loadingBusquedaGlobal && query.trim() ? <Text style={styles.vacio}>Sin resultados.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  searchbar: { marginHorizontal: 10, marginTop: 8, borderRadius: 10 },
  error: { color: 'red', textAlign: 'center', marginTop: 8 },
  headerTitle: { fontWeight: 'bold' },
  listItem: { backgroundColor: '#fff', marginHorizontal: 10, marginVertical: 4, borderRadius: 10 },
  vacio: { textAlign: 'center', marginTop: 40, color: '#888' },
});
