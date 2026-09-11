import { useEffect, useRef } from "react";
import Hls from "hls.js";

const MUX_SRC =
  "https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8";

/**
 * HLS video background for the login brand panel. Sits at z-0 so the lily
 * poster layers above it. No text or buttons.
 */
export default function CtaVisuals() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(MUX_SRC);
      hls.attachMedia(video);
      return () => hls.destroy();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = MUX_SRC;
    }
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      className="absolute inset-0 z-0 h-full w-full object-cover"
    />
  );
}