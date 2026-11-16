import * as FileSystem from 'expo-file-system';
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-extended';

export class HLSBufferManager {
  private streamUrl: string;
  private bufferDir: string;
  private activeSegments: string[] = [];
  private pollInterval: NodeJS.Timeout | null = null;
  private maxBufferedSegments = 20; // Keeps ~60 seconds of video chunks

  constructor(streamUrl: string) {
    this.streamUrl = streamUrl;
    this.bufferDir = `${FileSystem.cacheDirectory}stream_buffer/`;
  }

  public async init() {
    const dirInfo = await FileSystem.getInfoAsync(this.bufferDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.bufferDir, { intermediates: true });
    }
  }

  public startBuffering(intervalMs = 3000) {
    this.pollInterval = setInterval(async () => {
      try {
        const response = await fetch(this.streamUrl);
        const playlistText = await response.text();
        const segments = this.parseM3U8Segments(playlistText);
        
        for (const segUrl of segments) {
          const fileName = segUrl.split('/').pop()?.split('?')[0] || `seg_${Date.now()}.ts`;
          const localPath = `${this.bufferDir}${fileName}`;

          if (!this.activeSegments.includes(localPath)) {
            const { uri } = await FileSystem.downloadAsync(segUrl, localPath);
            this.activeSegments.push(uri);

            if (this.activeSegments.length > this.maxBufferedSegments) {
              const oldSegment = this.activeSegments.shift();
              if (oldSegment) {
                await FileSystem.deleteAsync(oldSegment, { idempotent: true });
              }
            }
          }
        }
      } catch (error) {
        console.error("Buffering error:", error);
      }
    }, intervalMs);
  }

  public stopBuffering() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  private parseM3U8Segments(m3u8Content: string): string[] {
    const lines = m3u8Content.split('\n');
    const urls: string[] = [];
    const baseUrl = this.streamUrl.substring(0, this.streamUrl.lastIndexOf('/') + 1);

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const fullUrl = trimmed.startsWith('http') ? trimmed : `${baseUrl}${trimmed}`;
        urls.push(fullUrl);
      }
    }
    return urls;
  }

  public async exportSpikeClip(outputPath: string): Promise<string | null> {
    if (this.activeSegments.length === 0) return null;

    const listFileContent = this.activeSegments.map(path => `file '${path}'`).join('\n');
    const listFilePath = `${this.bufferDir}concat_list.txt`;
    await FileSystem.writeAsStringAsync(listFilePath, listFileContent);

    const mergedPath = `${this.bufferDir}merged_raw.mp4`;
    const concatCommand = `-y -f concat -safe 0 -i "${listFilePath}" -c copy "${mergedPath}"`;
    let session = await FFmpegKit.execute(concatCommand);
    
    if (!ReturnCode.isSuccess(await session.getReturnCode())) return null;

    // Crop center to 9:16 vertical format (1080x1920)
    const cropCommand = `-y -i "${mergedPath}" -vf "crop=ih*9/16:ih,scale=1080:1920,setsar=1" -c:v libx264 -preset ultrafast -crf 23 -c:a aac "${outputPath}"`;
    session = await FFmpegKit.execute(cropCommand);

    if (ReturnCode.isSuccess(await session.getReturnCode())) {
      await FileSystem.deleteAsync(mergedPath, { idempotent: true });
      return outputPath;
    }
    return null;
  }
}
