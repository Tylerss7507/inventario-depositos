import React, { useEffect, useMemo, useState } from 'react';
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
  Searchbar,
} from 'react-native-paper';
import uuid from 'react-native-uuid';
import { useInventoryStore } from '../store/useInventoryStore';
import { theme } from '../theme';
import IconPicker from '../components/IconPicker';

export default function DepositoDetailScreen({ route, navigation }) {
  const { nombre, sheetId } = route.params;
  const { items, loadingItems, errorItems, fetchItems, agregarItem, editarItem, ajustarCantidad, eliminarItem } =
    useInventoryStore();

  const [busqueda, setBusqueda] = useState('');

  const [dialogVisible, setDialogVisible] = useState(false);
  const [nombreItem, setNombreItem] = useState('');
  const [cantidadItem, setCantidadItem] = useState('');
  const [iconoItem, setIconoItem] = useState('package-variant');
  const [stockMinItem, setStockMinItem] = useState('');

  const [editando, setEditando] = useState(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [cantidadEditada, setCantidadEditada] = useState('');
  const [iconoEditado, setIconoEditado] = useState('package-variant');
  const [stockMinEditado, setStockMinEditado] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    fetchItems(nombre);
  }, [nombre]);

  const itemsFiltrados = useMemo(() => {
    if (!busqueda.trim()) return items;
    const q = busqueda.trim().toLowerCase();
    return items.filter((i) => i.nombreItem.toLowerCase().includes(q));
  }, [items, busqueda]);

  const esBajoStock = (item) => item.stockMinimo > 0 && item.cantidad <= item.stockMinimo;

  const handleAgregar = async () => {
    if (!nombreItem.trim()) return;
    const id = uuid.v4();
    const ok = await agregarItem(id, nombreItem.trim(), Number(cantidadItem) || 0, iconoItem, Number(stockMinItem) || 0);
    if (ok) {
      setNombreItem('');
      setCantidadItem('');
      setIconoItem('package-variant');
      setStockMinItem('');
      setDialogVisible(false);
    }
  };

  const abrirEdicion = (item) => {
    setEditando(item);
    setNombreEditado(item.nombreItem);
    setCantidadEditada(String(item.cantidad));
    setIconoEditado(item.icono);
    setStockMinEditado(String(item.stockMinimo || 0));
  };

  const handleGuardarEdicion = async () => {
    if (!nombreEditado.trim()) return;
    await editarItem(editando.idItem, {
      nombreItem: nombreEditado.trim(),
      cantidad: Number(cantidadEditada) || 0,
      icono: iconoEditado,
      stockMinimo: Number(stockMinEditado) || 0,
    });
    setEditando(null);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }} dark>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={nombre} titleStyle={styles.headerTitle} />
      </Appbar.Header>

      <Searchbar placeholder="Buscar ítem..." value={busqueda} onChangeText={setBusqueda} style={styles.searchbar} />

      {loadingItems && <ActivityIndicator style={{ marginTop: 24 }} animating color={theme.colors.primary} />}
      {errorItems && <Text style={styles.error}>{errorItems}</Text>}

      <FlatList
        data={itemsFiltrados}
        keyExtractor={(item) => item.idItem}
        onRefresh={() => fetchItems(nombre)}
        refreshing={loadingItems}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => {
          const bajoStock = esBajoStock(item);
          return (
            <List.Item
              title={item.nombreItem}
              titleStyle={styles.itemTitle}
              description={() => (
                <Text style={styles.cantidadText}>
                  Cantidad: <Text style={[styles.cantidadNumero, bajoStock && styles.cantidadAlerta]}>{item.cantidad}</Text>
                  {bajoStock ? '  ⚠ Stock bajo' : ''}
                </Text>
              )}
              style={[styles.listItem, bajoStock && styles.listItemAlerta]}
              left={(props) => (
                <List.Icon {...props} icon={bajoStock ? 'alert-circle' : item.icono || 'package-variant'} color={bajoStock ? '#C62828' : theme.colors.primary} />
              )}
              right={() => (
                <View style={styles.rowActions}>
                  <IconButton icon="minus" mode="contained-tonal" size={18} onPress={() => ajustarCantidad(item.idItem, -1)} />
                  <IconButton icon="plus" mode="contained-tonal" size={18} onPress={() => ajustarCantidad(item.idItem, 1)} />
                  <IconButton icon="pencil" mode="contained-tonal" size={18} onPress={() => abrirEdicion(item)} />
                  <IconButton icon="delete" mode="contained-tonal" size={18} iconColor="#C62828" onPress={() => setConfirmDelete(item)} />
                </View>
              )}
            />
          );
        }}
      />

      <FAB style={[styles.fab, { backgroundColor: theme.colors.primary }]} icon="plus" color="#fff" onPress={() => setDialogVisible(true)} />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Nuevo ítem</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Nombre del ítem" value={nombreItem} onChangeText={setNombreItem} mode="outlined" style={{ marginBottom: 8 }} />
            <TextInput label="Cantidad" value={cantidadItem} onChangeText={setCantidadItem} mode="outlined" keyboardType="numeric" style={{ marginBottom: 8 }} />
            <TextInput label="Stock mínimo (opcional)" value={stockMinItem} onChangeText={setStockMinItem} mode="outlined" keyboardType="numeric" style={{ marginBottom: 12 }} />
            <IconPicker value={iconoItem} onChange={setIconoItem} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancelar</Button>
            <Button onPress={handleAgregar}>Agregar</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!editando} onDismiss={() => setEditando(null)}>
          <Dialog.Title>Editar ítem</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Nombre del ítem" value={nombreEditado} onChangeText={setNombreEditado} mode="outlined" style={{ marginBottom: 8 }} />
            <TextInput label="Cantidad" value={cantidadEditada} onChangeText={setCantidadEditada} mode="outlined" keyboardType="numeric" style={{ marginBottom: 8 }} />
            <TextInput label="Stock mínimo (opcional)" value={stockMinEditado} onChangeText={setStockMinEditado} mode="outlined" keyboardType="numeric" style={{ marginBottom: 12 }} />
            <IconPicker value={iconoEditado} onChange={setIconoEditado} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditando(null)}>Cancelar</Button>
            <Button onPress={handleGuardarEdicion}>Guardar</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!confirmDelete} onDismiss={() => setConfirmDelete(null)}>
          <Dialog.Title>¿Eliminar ítem?</Dialog.Title>
          <Dialog.Content>
            <Text>¿Eliminar "{confirmDelete?.nombreItem}" del depósito? Esta acción no se puede deshacer.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button textColor="#C62828" onPress={() => { eliminarItem(confirmDelete.idItem, sheetId); setConfirmDelete(null); }}>
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
  searchbar: { marginHorizontal: 10, marginTop: 8, borderRadius: 10 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
  error: { color: 'red', textAlign: 'center', marginTop: 8 },
  headerTitle: { fontWeight: 'bold' },
  listItem: { backgroundColor: '#fff', marginHorizontal: 10, marginVertical: 4, borderRadius: 10 },
  listItemAlerta: { backgroundColor: '#FDEDED', borderWidth: 1, borderColor: '#F5C6C6' },
  itemTitle: { fontWeight: '600' },
  cantidadText: { color: '#555' },
  cantidadNumero: { fontWeight: 'bold', color: '#1565C0', fontSize: 15 },
  cantidadAlerta: { color: '#C62828' },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
});
