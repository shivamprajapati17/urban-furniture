import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Upload } from "lucide-react";
import { Button } from "./ui";

/**
 * Face verification step. Live webcam preview with Capture / Retake, plus an
 * Upload photo fallback when no camera is available. The captured image is
 * returned as a data URL via onCapture.
 */
export default function FaceVerify({ captured, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState("");

  const startCamera = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera is not available in this browser — upload a photo instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraOn(true);
    } catch {
      setError("Camera unavailable. Upload a photo instead.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    stopCamera();
    onCapture(canvas.toDataURL("image/jpeg", 0.85));
  };

  const onPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();
    const reader = new FileReader();
    reader.onload = () => onCapture(String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const retake = () => {
    onCapture("");
    startCamera();
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-gold-100 bg-gold-50 px-3 py-2 text-[13px] text-gold-700">{error}</p>
      )}
      <div className="relative mx-auto aspect-[4/5] w-full max-w-[240px] overflow-hidden rounded-xl border border-line bg-ink">
        {captured ? (
          <img src={captured} alt="Verified face" className="h-full w-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            muted
            playsInline
            className="h-full w-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
        )}
        {!captured && !cameraOn && !error && (
          <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-white/50">
            Starting camera…
          </p>
        )}
      </div>

      {!captured ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" size="sm" icon={Camera} onClick={capture} disabled={!cameraOn}>
            Capture
          </Button>
          <Button type="button" size="sm" variant="secondary" icon={Upload} onClick={() => fileRef.current?.click()}>
            Upload photo
          </Button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <Button type="button" size="sm" variant="secondary" icon={RefreshCw} onClick={retake}>
            Retake
          </Button>
        </div>
      )}

      <p className="text-center text-xs leading-relaxed text-ink-mute">
        Capture a clear photo of the person's face. It is stored as the verification image for this login and
        shown in the users list.
      </p>
    </div>
  );
}