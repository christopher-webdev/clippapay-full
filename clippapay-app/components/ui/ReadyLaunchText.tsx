import React from 'react';
import { Text, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const scale = width / 428;

export default function ReadyLaunchText() {
  return (
    <Text style={styles.text}>
      Ready to launch your next viral campaign?
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    width: 283 * scale,
    height: 20 * scale,
    top: 172 * scale, // Relative positioning; adjust in parent if needed
    left: 25 * scale,
    fontFamily: 'OpenSans',
    fontWeight: '400',
    fontSize: 14 * scale,
    lineHeight: 14 * scale * 1.4,
    letterSpacing: 0.2 * scale,
    color: '#000', // Assuming black text
  },
});