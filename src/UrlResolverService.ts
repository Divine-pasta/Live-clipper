// src/UrlResolverService.ts

export async function resolveStreamLink(pastedUrl: string) {
  try {
    // You can host a free 10-line Python/Node script on Vercel/Render 
    // that runs yt-dlp and returns { streamUrl: "...", platform: "...", channelId: "..." }
    const response = await fetch(`https://your-backend-resolver.vercel.app/api/resolve?url=${encodeURIComponent(pastedUrl)}`);
    const data = await response.json();
    
    return {
      streamUrl: data.streamUrl, // Direct .m3u8 link
      platform: data.platform,     // 'twitch' or 'youtube'
      identifier: data.identifier  // Channel name or video ID
    };
  } catch (error) {
    console.error("Failed to resolve stream link:", error);
    throw new Error("Could not parse stream link. Make sure it's a live broadcast.");
  }
}
