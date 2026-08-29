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
    const id = uuid.v4(); // ID_Item generado localmente en formato UUID v4
    const ok = await agregarItem(id, nombreItem.trim(), Number(cantidadItem) || 0);
    if (ok) {
      setNombreItem('');
      setCantidadItem('');
      setDialogVisible(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={nombre} />
      </Appbar.Header>

      {loadingItems && <ActivityIndicator style={{ marginTop: 24 }} animating />}
      {errorItems && <Text style={styles.error}>{errorItems}</Text>}

      <FlatList
        data={items}
        keyExtractor={(item) => item.idItem}
        onRefresh={() => fetchItems(nombre)}
        refreshing={loadingItems}
        renderItem={({ item }) => (
          <List.Item
            title={item.nombreItem}
            description={`Cantidad: ${item.cantidad}`}
            left={(props) => <List.Icon {...props} icon="package-variant" />}
            right={() => (
              <View style={styles.rowActions}>
                <IconButton icon="minus" onPress={() => ajustarCantidad(item.idItem, -1)} />
                <IconButton icon="plus" onPress={() => ajustarCantidad(item.idItem, 1)} />
                <IconButton icon="delete" onPress={() => setConfirmDelete(item)} />
              </View>
            )}
          />
        )}
      />

      <FAB style={styles.fab} icon="plus" onPress={() => setDialogVisible(true)} />

      <Portal>
        {/* Dialog: agregar ítem */}
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Nuevo ítem</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nombre del ítem"
              value={nombreItem}
              onChangeText={setNombreItem}
              style={{ marginBottom: 8 }}
            />
            <TextInput
              label="Cantidad"
              value={cantidadItem}
              onChangeText={setCantidadItem}
              keyboardType="numeric"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancelar</Button>
            <Button onPress={handleAgregar}>Agregar</Button>
          </Dialog.Actions>
        </Dialog>

        {/* AlertDialog: confirmación obligatoria de borrado de ítem */}
        <Dialog visible={!!confirmDelete} onDismiss={() => setConfirmDelete(null)}>
          <Dialog.Title>¿Eliminar ítem?</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Eliminar "{confirmDelete?.nombreItem}" del depósito? Esta acción no se puede
              deshacer.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button
              textColor="red"
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
  container: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
  error: { color: 'red', textAlign: 'center', marginTop: 8 },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
});
