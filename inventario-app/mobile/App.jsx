import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaperProvider } from 'react-native-paper';
import DepositosScreen from './screens/DepositosScreen';
import DepositoDetailScreen from './screens/DepositoDetailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Depositos"
            component={DepositosScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="DepositoDetail"
            component={DepositoDetailScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
