import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken, setToken, clearToken } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("uf_user") || "null");
    } catch {
      return null;
    }
  });
  const [booting, setBooting] = useState(false);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener("uf:unauthorized", onUnauthorized);
    return () => window.removeEventListener("uf:unauthorized", onUnauthorized);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.post("/auth/login", { email, password });
    setToken(data.token);
    localStorage.setItem("uf_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  /** One-time live face verification after a successful password login. */
  const verifyFace = useCallback(async (faceImageUrl) => {
    const data = await api.post("/auth/verify-face", { faceImageUrl });
    localStorage.setItem("uf_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem("uf_user");
    setUser(null);
  }, []);

  // A user with a face on file who has not completed the one-time verification.
  const needsFaceVerify = !!user && !!user.faceImageUrl && !user.faceVerifiedAt;

  const value = { user, setUser, login, verifyFace, logout, booting, needsFaceVerify };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}