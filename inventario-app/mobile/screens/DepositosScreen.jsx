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
import { useInventoryStore } from '../store/useInventoryStore';

export default function DepositosScreen({ navigation }) {
  const {
    depositos,
    loadingDepositos,
    errorDepositos,
    fetchDepositos,
    crearDeposito,
    eliminarDeposito,
  } = useInventoryStore();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // depósito a eliminar

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

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Depósitos" />
      </Appbar.Header>

      {loadingDepositos && <ActivityIndicator style={{ marginTop: 24 }} animating />}
      {errorDepositos && <Text style={styles.error}>{errorDepositos}</Text>}

      <FlatList
        data={depositos}
        keyExtractor={(item) => String(item.sheetId)}
        onRefresh={fetchDepositos}
        refreshing={loadingDepositos}
        renderItem={({ item }) => (
          <List.Item
            title={item.titulo}
            left={(props) => <List.Icon {...props} icon="warehouse" />}
            right={(props) => (
              <IconButton {...props} icon="delete" onPress={() => setConfirmDelete(item)} />
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

      <FAB style={styles.fab} icon="plus" onPress={() => setDialogVisible(true)} />

      <Portal>
        {/* Dialog: crear depósito */}
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Nuevo depósito</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nombre del depósito"
              value={nombreNuevo}
              onChangeText={setNombreNuevo}
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancelar</Button>
            <Button onPress={handleCrear}>Crear</Button>
          </Dialog.Actions>
        </Dialog>

        {/* AlertDialog: confirmación obligatoria de borrado */}
        <Dialog visible={!!confirmDelete} onDismiss={() => setConfirmDelete(null)}>
          <Dialog.Title>¿Eliminar depósito?</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Eliminar depósito "{confirmDelete?.titulo}" y todo su contenido? Esta acción no
              se puede deshacer.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button
              textColor="red"
              onPress={() => {
                eliminarDeposito(confirmDelete.sheetId);
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
});
