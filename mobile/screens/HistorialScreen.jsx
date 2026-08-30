import React, { useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Appbar, List, ActivityIndicator, Text } from 'react-native-paper';
import { useInventoryStore } from '../store/useInventoryStore';
import { theme } from '../theme';

function formatearFecha(iso) {
  try {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function HistorialScreen({ navigation }) {
  const { historial, loadingHistorial, errorHistorial, fetchHistorial } = useInventoryStore();

  useEffect(() => {
    fetchHistorial();
  }, []);

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }} dark>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Historial" titleStyle={styles.headerTitle} />
      </Appbar.Header>

      {loadingHistorial && <ActivityIndicator style={{ marginTop: 24 }} animating color={theme.colors.primary} />}
      {errorHistorial && <Text style={styles.error}>{errorHistorial}</Text>}

      <FlatList
        data={historial}
        keyExtractor={(item, index) => `${item.fecha}-${index}`}
        onRefresh={fetchHistorial}
        refreshing={loadingHistorial}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => (
          <List.Item
            title={item.detalle}
            titleStyle={styles.itemTitle}
            description={`${item.usuario || 'Anónimo'} · ${item.deposito || '-'} · ${formatearFecha(item.fecha)}`}
            style={styles.listItem}
            left={(props) => <List.Icon {...props} icon="history" color={theme.colors.primary} />}
          />
        )}
        ListEmptyComponent={!loadingHistorial ? <Text style={styles.vacio}>Todavía no hay movimientos registrados.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  error: { color: 'red', textAlign: 'center', marginTop: 8 },
  headerTitle: { fontWeight: 'bold' },
  listItem: { backgroundColor: '#fff', marginHorizontal: 10, marginVertical: 4, borderRadius: 10 },
  itemTitle: { fontWeight: '600' },
  vacio: { textAlign: 'center', marginTop: 40, color: '#888' },
});
