import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useState } from 'react';

export default function App() {
  const [loading, setLoading] = useState(true);

  const handleLoadEnd = () => {
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <WebView
        source={{ uri: 'http://localhost:3000' }}
        style={styles.webview}
        onLoadEnd={handleLoadEnd}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
      />
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});
