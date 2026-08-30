import React from 'react';
import { View, StyleSheet } from 'react-native';
import { IconButton } from 'react-native-paper';
import { ICONOS_DISPONIBLES } from '../constants/icons';
import { theme } from '../theme';

export default function IconPicker({ value, onChange }) {
  return (
    <View style={styles.grid}>
      {ICONOS_DISPONIBLES.map((icono) => (
        <IconButton
          key={icono}
          icon={icono}
          mode={value === icono ? 'contained' : 'outlined'}
          containerColor={value === icono ? theme.colors.primary : undefined}
          iconColor={value === icono ? '#fff' : theme.colors.primary}
          size={22}
          onPress={() => onChange(icono)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
});
