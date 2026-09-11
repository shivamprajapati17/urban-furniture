import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion, useReducedMotion } from "motion/react";
import { Button, Field, Input } from "../components/ui";
import LoginStage from "../components/LoginStage";
import CtaVisuals from "../components/CtaVisuals";

const DEMO_ACCOUNTS = [
  { role: "Owner · Admin", email: "admin@urbanfurniture.com", password: "admin123", tint: "walnut" },
  { role: "Accountant", email: "accountant@urbanfurniture.com", password: "accountant123", tint: "azure" },
  { role: "Customer portal", email: "nimesh@pathak.com", password: "contact123", tint: "leaf" },
];

export default function Login() {
  const { user, login, needsFaceVerify } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const shouldReduce = useReducedMotion();

  if (user) {
    if (needsFaceVerify) return <Navigate to="/verify-face" replace />;
    return <Navigate to={user.role === "contact" ? "/my" : "/"} replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      if (u.faceImageUrl && !u.faceVerifiedAt) {
        navigate("/verify-face", { replace: true });
      } else {
        navigate(u.role === "contact" ? "/my" : "/", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — CTA video + lily flower */}
      <div className="relative hidden overflow-hidden bg-ink lg:flex">
        <CtaVisuals />
        <LoginStage />
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center bg-paper px-4 py-10 sm:px-10">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-walnut-600 text-lg font-bold text-white">UF</div>
            <div className="leading-tight">
              <p className="text-base font-semibold text-ink">Urban Furniture</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-walnut-600">Ledger & accounts</p>
            </div>
          </div>

          <h2 className="text-[22px] font-semibold tracking-tight text-ink">Sign in to your workspace</h2>
          <p className="mt-1 text-sm text-ink-mute">Use the demo accounts below to explore each role.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
              <Field label="Email address">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" strokeWidth={1.8} />
                  <motion.div
                    initial={shouldReduce ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <Input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="pl-9"
                    />
                  </motion.div>
                </div>
              </Field>
              <Field label="Password">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" strokeWidth={1.8} />
                  <motion.div
                    initial={shouldReduce ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.06, ease: "easeOut" }}
                  >
                    <Input
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9"
                    />
                  </motion.div>
                </div>
              </Field>

            {error && (
              <p className="flex items-center gap-1.5 rounded-lg border border-clay-100 bg-clay-50 px-3 py-2 text-[13px] text-clay-700">
                <ShieldCheck className="h-4 w-4 shrink-0" /> {error}
              </p>
            )}

            <Button type="submit" loading={busy} className="w-full" size="md">
              Sign in <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Button>
          </form>

          <div className="mt-8 border-t border-line pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Demo accounts</p>
            <div className="mt-3 space-y-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(a.password);
                    setError("");
                  }}
                  className="group flex w-full items-center justify-between rounded-lg border border-line bg-surface px-3.5 py-2.5 text-left transition-colors hover:border-walnut-400 hover:bg-walnut-50"
                >
                  <span className="block text-[13px] font-medium text-ink">{a.role}</span>
                  <span className="block text-xs text-ink-mute">{a.email}</span>
                  <span className="rounded bg-paper-deep px-1.5 py-0.5 font-mono text-[11px] text-ink-soft group-hover:bg-surface">
                    {a.password}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}