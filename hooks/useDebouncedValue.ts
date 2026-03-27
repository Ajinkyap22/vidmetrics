import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = globalThis.setTimeout(() => setDebounced(value), ms);

    return () => globalThis.clearTimeout(id);
  }, [value, ms]);

  return debounced;
}
