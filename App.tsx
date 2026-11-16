import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { resolveStreamLink } from './src/UrlResolverService';
import { ClipperService } from './src/ClipperService';

export default function App() {
  const [pastedUrl, setPastedUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [clipper, setClipper] = useState<ClipperService | null>(null);

  const handleStartClipping = async () => {
    if (!pastedUrl) {
      Alert.alert("Error", "Please paste a live stream link.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Resolve the pasted YouTube/Twitch link automatically
      const streamInfo = await resolveStreamLink(pastedUrl);

      // 2. Initialize the clipper with the resolved direct stream URL
      const newClipper = new ClipperService(streamInfo.streamUrl);
      
      await newClipper.start(streamInfo.identifier, () => {
        console.log("🔥 Chat spike detected! Clip saved to device.");
      });

      setClipper(newClipper);
      setIsMonitoring(true);
      Alert.alert("Success", `Connected! Automatically clipping chat spikes.`);
    } catch (error) {
      Alert.alert("Error", "Failed to start stream monitoring. Check the URL.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    clipper?.stop();
    setIsMonitoring(false);
    Alert.alert("Stopped", "Monitoring paused.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Live Stream Spike Clipper</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Paste Twitch or YouTube Live link here..."
        placeholderTextColor="#888"
        value={pastedUrl}
        onChangeText={setPastedUrl}
        editable={!isMonitoring}
      />

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: isMonitoring ? '#ff4444' : '#00C851' }]} 
        onPress={isMonitoring ? handleStop : handleStartClipping}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{isMonitoring ? 'Stop Clipping' : 'Start Clipping'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', padding: 20 },
  header: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  input: { backgroundColor: '#1e1e1e', color: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, fontSize: 16 },
  button: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
