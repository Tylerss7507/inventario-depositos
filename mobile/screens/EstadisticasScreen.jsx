import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Appbar, Card, Text, ActivityIndicator, List } from 'react-native-paper';
import { useInventoryStore } from '../store/useInventoryStore';
import { theme } from '../theme';

export default function EstadisticasScreen({ navigation }) {
  const { estadisticas, loadingEstadisticas, errorEstadisticas, fetchEstadisticas } = useInventoryStore();

  useEffect(() => {
    fetchEstadisticas();
  }, []);

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }} dark>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Estadísticas" titleStyle={styles.headerTitle} />
      </Appbar.Header>

      {loadingEstadisticas && <ActivityIndicator style={{ marginTop: 24 }} animating color={theme.colors.primary} />}
      {errorEstadisticas && <Text style={styles.error}>{errorEstadisticas}</Text>}

      {estadisticas && (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.grid}>
            <Card style={styles.card}><Card.Content><Text style={styles.numero}>{estadisticas.totalDepositos}</Text><Text style={styles.label}>Depósitos</Text></Card.Content></Card>
            <Card style={styles.card}><Card.Content><Text style={styles.numero}>{estadisticas.totalItems}</Text><Text style={styles.label}>Ítems distintos</Text></Card.Content></Card>
            <Card style={styles.card}><Card.Content><Text style={styles.numero}>{estadisticas.totalUnidades}</Text><Text style={styles.label}>Unidades totales</Text></Card.Content></Card>
            <Card style={[styles.card, estadisticas.itemsBajoStock > 0 && styles.cardAlerta]}>
              <Card.Content>
                <Text style={[styles.numero, estadisticas.itemsBajoStock > 0 && styles.numeroAlerta]}>{estadisticas.itemsBajoStock}</Text>
                <Text style={styles.label}>En alerta de stock bajo</Text>
              </Card.Content>
            </Card>
          </View>

          <Card style={styles.cardAncha}>
            <Card.Content>
              <Text style={styles.label}>Depósito con más stock</Text>
              <Text style={styles.destacado}>{estadisticas.depositoConMasStock}</Text>
            </Card.Content>
          </Card>

          <Text style={styles.subtitulo}>Últimos movimientos</Text>
          {estadisticas.movimientosRecientes.length === 0 && <Text style={styles.vacio}>Todavía no hay movimientos.</Text>}
          {estadisticas.movimientosRecientes.map((m, index) => (
            <List.Item
              key={`${m.fecha}-${index}`}
              title={m.detalle}
              description={`${m.usuario || 'Anónimo'} · ${m.deposito || '-'}`}
              style={styles.listItem}
              left={(props) => <List.Icon {...props} icon="history" color={theme.colors.primary} />}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  error: { color: 'red', textAlign: 'center', marginTop: 8 },
  headerTitle: { fontWeight: 'bold' },
  scroll: { padding: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', marginBottom: 10, borderRadius: 12 },
  cardAlerta: { backgroundColor: '#FDEDED' },
  cardAncha: { marginBottom: 16, borderRadius: 12 },
  numero: { fontSize: 28, fontWeight: 'bold', color: '#1565C0' },
  numeroAlerta: { color: '#C62828' },
  label: { color: '#666', marginTop: 2 },
  destacado: { fontSize: 20, fontWeight: '700', marginTop: 4, color: '#1565C0' },
  subtitulo: { fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 6, marginLeft: 4 },
  listItem: { backgroundColor: '#fff', marginBottom: 4, borderRadius: 10 },
  vacio: { textAlign: 'center', color: '#888', marginTop: 8 },
});
