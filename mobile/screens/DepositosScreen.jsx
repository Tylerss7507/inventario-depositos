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
  Avatar,
} from 'react-native-paper';
import { useInventoryStore } from '../store/useInventoryStore';
import { theme } from '../theme';

export default function DepositosScreen({ navigation }) {
  const {
    depositos,
    loadingDepositos,
    errorDepositos,
    fetchDepositos,
    crearDeposito,
    renombrarDeposito,
    eliminarDeposito,
  } = useInventoryStore();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [editando, setEditando] = useState(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    fetchDepositos();
  }, []);

  const handleCrear = async () => {
    if (!nombreNuevo.trim()) return;
    const ok = await crearDeposito(nombreNuevo.trim());
    if (ok) {
      setNombreNuevo('');
      setDialogVisible(false);
    }
  };

  const abrirEdicion = (deposito) => {
    setEditando(deposito);
    setNombreEditado(deposito.titulo);
  };

  const handleGuardarEdicion = async () => {
    if (!nombreEditado.trim()) return;
    await renombrarDeposito(editando.sheetId, nombreEditado.trim());
    setEditando(null);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }} dark>
        <Appbar.Content title="Depósitos" titleStyle={styles.headerTitle} />
      </Appbar.Header>

      {loadingDepositos && <ActivityIndicator style={{ marginTop: 24 }} animating color={theme.colors.primary} />}
      {errorDepositos && <Text style={styles.error}>{errorDepositos}</Text>}

      <FlatList
        data={depositos}
        keyExtractor={(item) => String(item.sheetId)}
        onRefresh={fetchDepositos}
        refreshing={loadingDepositos}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => (
          <List.Item
            title={item.titulo}
            titleStyle={styles.itemTitle}
            style={styles.listItem}
            left={() => (
              <Avatar.Icon size={44} icon="warehouse" style={{ backgroundColor: theme.colors.secondary }} />
            )}
            right={(props) => (
              <View style={styles.rowActions}>
                <IconButton {...props} icon="pencil" onPress={() => abrirEdicion(item)} />
                <IconButton {...props} icon="delete" iconColor="#C62828" onPress={() => setConfirmDelete(item)} />
              </View>
            )}
            onPress={() =>
              navigation.navigate('DepositoDetail', {
                nombre: item.titulo,
                sheetId: item.sheetId,
              })
            }
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
          <Dialog.Title>Nuevo depósito</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Nombre del depósito" value={nombreNuevo} onChangeText={setNombreNuevo} autoFocus mode="outlined" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancelar</Button>
            <Button onPress={handleCrear}>Crear</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!editando} onDismiss={() => setEditando(null)}>
          <Dialog.Title>Renombrar depósito</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Nombre" value={nombreEditado} onChangeText={setNombreEditado} autoFocus mode="outlined" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditando(null)}>Cancelar</Button>
            <Button onPress={handleGuardarEdicion}>Guardar</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!confirmDelete} onDismiss={() => setConfirmDelete(null)}>
          <Dialog.Title>¿Eliminar depósito?</Dialog.Title>
          <Dialog.Content>
            <Text>¿Eliminar depósito "{confirmDelete?.titulo}" y todo su contenido? Esta acción no se puede deshacer.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button textColor="#C62828" onPress={() => { eliminarDeposito(confirmDelete.sheetId); setConfirmDelete(null); }}>
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
  rowActions: { flexDirection: 'row', alignItems: 'center' },
});
