import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui";

export default function NotFound() {
  const { user } = useAuth();
  const home = user ? (user.role === "contact" ? "/my" : "/") : "/login";
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-walnut-600">
          <Compass className="h-7 w-7" strokeWidth={1.6} />
        </div>
        <p className="text-lg font-semibold text-ink">This page does not exist</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-mute">
          The address may have changed, or you followed an outdated link.
        </p>
        <div className="mt-5">
          <Link to={home}>
            <Button icon={Compass}>Back to {user ? "your workspace" : "sign in"}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}