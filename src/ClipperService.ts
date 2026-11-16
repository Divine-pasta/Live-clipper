import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { HLSBufferManager } from './HLSBufferManager';

export class ClipperService {
  private ws: WebSocket | null = null;
  private messageTimestamps: number[] = [];
  private historyRates: number[] = [];
  private isProcessing = false;
  private bufferManager: HLSBufferManager;

  constructor(streamUrl: string) {
    this.bufferManager = new HLSBufferManager(streamUrl);
  }

  public async start(channelName: string, onClipSaved: () => void) {
    await this.bufferManager.init();
    this.bufferManager.startBuffering(3000);

    this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

    this.ws.onopen = () => {
      this.ws?.send('PASS SCHMOOPIIE');
      this.ws?.send(`NICK justinfan${Math.floor(Math.random() * 99999)}`);
      this.ws?.send(`JOIN #${channelName.toLowerCase()}`);
    };

    this.ws.onmessage = (event) => {
      const data = event.data as string;
      if (data.startsWith('PING')) {
        this.ws?.send('PONG :tmi.twitch.tv');
        return;
      }
      if (data.includes('PRIVMSG')) {
        this.messageTimestamps.push(Date.now());
      }
    };

    // Check chat velocity every 5 seconds
    setInterval(() => this.evaluateSpike(onClipSaved), 5000);
  }

  private async evaluateSpike(onClipSaved: () => void) {
    const now = Date.now();
    this.messageTimestamps = this.messageTimestamps.filter(t => now - t <= 5000);
    const count = this.messageTimestamps.length;

    this.historyRates.push(count);
    if (this.historyRates.length > 24) this.historyRates.shift();

    const avgRate = this.historyRates.reduce((a, b) => a + b, 0) / this.historyRates.length;

    // Trigger if chat spikes to 4x average (with a minimum baseline of 10 messages)
    if (!this.isProcessing && count > 10 && count > avgRate * 4) {
      this.isProcessing = true;
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          const tempOut = `${FileSystem.cacheDirectory}clip_${Date.now()}.mp4`;
          const finalPath = await this.bufferManager.exportSpikeClip(tempOut);
          
          if (finalPath) {
            await MediaLibrary.saveToLibraryAsync(finalPath);
            await FileSystem.deleteAsync(finalPath, { idempotent: true });
            onClipSaved();
          }
        }
      } finally {
        setTimeout(() => { this.isProcessing = false; }, 30000); // 30s cooldown
      }
    }
  }

  public stop() {
    this.ws?.close();
    this.bufferManager.stopBuffering();
  }
}
