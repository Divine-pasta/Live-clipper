import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ClipperService } from './src/ClipperService';

export default function App() {
  const [channel, setChannel] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [clipper, setClipper] = useState<ClipperService | null>(null);

  const toggleMonitoring = () => {
    if (isMonitoring) {
      clipper?.stop();
      setIsMonitoring(false);
      Alert.alert("Stopped", "Live chat clipping monitoring paused.");
    } else {
      if (!channel || !streamUrl) {
        Alert.alert("Error", "Please fill in both fields.");
        return;
      }
      const newClipper = new ClipperService(streamUrl);
      newClipper.start(channel, () => {
        console.log("🔥 Chat spike detected! Clip saved to device gallery.");
      });
      setClipper(newClipper);
      setIsMonitoring(true);
      Alert.alert("Started", `Listening to ${channel}'s chat and buffering live stream!`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Live Chat Spike Clipper</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Twitch Channel Name (e.g. shroud)"
        placeholderTextColor="#888"
        value={channel}
        onChangeText={setChannel}
      />

      <TextInput
        style={styles.input}
        placeholder="Direct .m3u8 Stream URL"
        placeholderTextColor="#888"
        value={streamUrl}
        onChangeText={setStreamUrl}
      />

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: isMonitoring ? '#ff4444' : '#00C851' }]} 
        onPress={toggleMonitoring}
      >
        <Text style={styles.buttonText}>{isMonitoring ? 'Stop Monitoring' : 'Start Live Clipping'}</Text>
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

