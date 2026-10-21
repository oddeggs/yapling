import { StyleSheet, Text, View } from 'react-native';

// The wordmark in the system font until `@yapling/theme` provides the type and colour tokens.
const ink = '#17131C';

export default function Home() {
  return (
    <View style={styles.screen}>
      <Text style={styles.wordmark} accessibilityRole="header">
        Yapling
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wordmark: { color: ink, fontSize: 40, fontWeight: '800' },
});
