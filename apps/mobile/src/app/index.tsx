import { colours, fontFor } from '@yapling/theme';
import { StyleSheet, Text, View } from 'react-native';

export default function Home() {
  return (
    <View style={styles.screen}>
      <Text style={styles.wordmark} accessibilityRole="header">
        yapling
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wordmark: { ...fontFor('wordmark'), color: colours.text },
});
