import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Fingerprint, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button, Panel, formatError, useNotify } from "../components/ui";
import FaceVerify from "../components/FaceVerify";

export default function VerifyFace() {
  const { user, verifyFace, logout, needsFaceVerify } = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const [captured, setCaptured] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const home = user?.role === "contact" ? "/my" : "/";

  if (!user) return <Navigate to="/login" replace />;
  // No face on file, or already verified — nothing to do.
  if (!needsFaceVerify) return <Navigate to={home} replace />;

  const confirm = async () => {
    setSaving(true);
    setError("");
    try {
      await verifyFace(captured);
      notify({
        title: "Identity verified",
        detail: "One-time live face verification complete. You now have full access.",
        tone: "success",
      });
      navigate(home, { replace: true });
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-walnut-600 text-white shadow-card">
            <Fingerprint className="h-6 w-6" strokeWidth={1.7} />
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">Verify your identity</h1>
          <p className="mt-1 text-sm text-ink-mute">
            Welcome, <span className="font-medium text-ink">{user.name}</span>. This one-time live face
            check unlocks your access.
          </p>
        </div>

        <Panel className="p-5">
          <FaceVerify captured={captured} onCapture={setCaptured} />

          {error && (
            <p className="mt-4 rounded-lg border border-clay-100 bg-clay-50 px-3 py-2 text-[13px] text-clay-700">
              {error}
            </p>
          )}

          <div className="mt-5 flex items-center justify-between gap-2 border-t border-line pt-4">
            <Button variant="secondary" icon={LogOut} onClick={() => { logout(); navigate("/login", { replace: true }); }}>
              Sign out
            </Button>
            <Button icon={ShieldCheck} loading={saving} disabled={!captured} onClick={confirm}>
              {captured ? "Verify & continue" : "Capture your face first"}
            </Button>
          </div>
        </Panel>

        <p className="mt-4 text-center text-xs leading-relaxed text-ink-faint">
          Your live photo is stored as the verification image for this account. Future sign-ins after this
          one-time check do not ask again.
        </p>
      </div>
    </div>
  );
}