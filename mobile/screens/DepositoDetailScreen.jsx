import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import {
  Appbar,
  List,
  FAB,
  Portal,
  Dialog,
  TextInput,
  Button,
  ActivityIndicator,
  IconButton,
  Text,
} from 'react-native-paper';
import uuid from 'react-native-uuid';
import { useInventoryStore } from '../store/useInventoryStore';
import { theme } from '../theme';

export default function DepositoDetailScreen({ route, navigation }) {
  const { nombre, sheetId } = route.params;
  const {
    items,
    loadingItems,
    errorItems,
    fetchItems,
    agregarItem,
    ajustarCantidad,
    eliminarItem,
  } = useInventoryStore();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [nombreItem, setNombreItem] = useState('');
  const [cantidadItem, setCantidadItem] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    fetchItems(nombre);
  }, [nombre]);

  const handleAgregar = async () => {
    if (!nombreItem.trim()) return;
    const id = uuid.v4();
    const ok = await agregarItem(id, nombreItem.trim(), Number(cantidadItem) || 0);
    if (ok) {
      setNombreItem('');
      setCantidadItem('');
      setDialogVisible(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }} dark>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={nombre} titleStyle={styles.headerTitle} />
      </Appbar.Header>

      {loadingItems && <ActivityIndicator style={{ marginTop: 24 }} animating color={theme.colors.primary} />}
      {errorItems && <Text style={styles.error}>{errorItems}</Text>}

      <FlatList
        data={items}
        keyExtractor={(item) => item.idItem}
        onRefresh={() => fetchItems(nombre)}
        refreshing={loadingItems}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => (
          <List.Item
            title={item.nombreItem}
            titleStyle={styles.itemTitle}
            description={() => <Text style={styles.cantidadText}>Cantidad: {item.cantidad}</Text>}
            style={styles.listItem}
            left={(props) => <List.Icon {...props} icon="package-variant" color={theme.colors.primary} />}
            right={() => (
              <View style={styles.rowActions}>
                <IconButton icon="minus" mode="contained-tonal" size={18} onPress={() => ajustarCantidad(item.idItem, -1)} />
                <IconButton icon="plus" mode="contained-tonal" size={18} onPress={() => ajustarCantidad(item.idItem, 1)} />
                <IconButton icon="delete" mode="contained-tonal" size={18} iconColor="#C62828" onPress={() => setConfirmDelete(item)} />
              </View>
            )}
          />
        )}
      />

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        color="#fff"
        onPress={() => setDialogVisible(true)}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Nuevo ítem</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Nombre del ítem" value={nombreItem} onChangeText={setNombreItem} mode="outlined" style={{ marginBottom: 8 }} />
            <TextInput label="Cantidad" value={cantidadItem} onChangeText={setCantidadItem} mode="outlined" keyboardType="numeric" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancelar</Button>
            <Button onPress={handleAgregar}>Agregar</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!confirmDelete} onDismiss={() => setConfirmDelete(null)}>
          <Dialog.Title>¿Eliminar ítem?</Dialog.Title>
          <Dialog.Content>
            <Text>¿Eliminar "{confirmDelete?.nombreItem}" del depósito? Esta acción no se puede deshacer.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button
              textColor="#C62828"
              onPress={() => {
                eliminarItem(confirmDelete.idItem, sheetId);
                setConfirmDelete(null);
              }}
            >
              Eliminar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
  error: { color: 'red', textAlign: 'center', marginTop: 8 },
  headerTitle: { fontWeight: 'bold' },
  listItem: { backgroundColor: '#fff', marginHorizontal: 10, marginVertical: 4, borderRadius: 10 },
  itemTitle: { fontWeight: '600' },
  cantidadText: { color: '#1565C0', fontWeight: '600' },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
});
