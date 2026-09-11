import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export function useFetch(path, { skip = false } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (skip) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api.get(path));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [path, skip]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}