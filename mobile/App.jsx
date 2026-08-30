import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaperProvider, TextInput, Button, Text } from 'react-native-paper';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DepositosScreen from './screens/DepositosScreen';
import DepositoDetailScreen from './screens/DepositoDetailScreen';
import HistorialScreen from './screens/HistorialScreen';
import { theme } from './theme';
import { useInventoryStore } from './store/useInventoryStore';

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({ ...MaterialCommunityIcons.font });
  const { usuario, usuarioCargado, cargarUsuario, guardarUsuario, connectSocket } = useInventoryStore();
  const [nombreInput, setNombreInput] = useState('');

  useEffect(() => {
    cargarUsuario();
    connectSocket();
  }, []);

  if (!fontsLoaded || !usuarioCargado) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!usuario) {
    return (
      <PaperProvider theme={theme}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F5F7FA' }}
        >
          <Text variant="headlineSmall" style={{ marginBottom: 8, textAlign: 'center' }}>
            ¿Cómo te llamás?
          </Text>
          <Text style={{ marginBottom: 20, textAlign: 'center', color: '#666' }}>
            Se usa para saber quién hizo cada cambio en el historial.
          </Text>
          <TextInput mode="outlined" label="Tu nombre" value={nombreInput} onChangeText={setNombreInput} autoFocus />
          <Button
            mode="contained"
            style={{ marginTop: 16 }}
            disabled={!nombreInput.trim()}
            onPress={() => guardarUsuario(nombreInput.trim())}
          >
            Continuar
          </Button>
        </KeyboardAvoidingView>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Depositos" component={DepositosScreen} options={{ headerShown: false }} />
          <Stack.Screen name="DepositoDetail" component={DepositoDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Historial" component={HistorialScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
