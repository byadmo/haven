// useDebounce: standardized 300ms debounce for search inputs, text filters,
// and dynamic queries (per the design spec). Returns a debounced value that
// only updates after `delay` ms of no input changes — pair with a useEffect
// driven by the debounced value to throttle expensive lookups.
//
//   const [q, setQ] = useState("");
//   const debounced = useDebounce(q, 300);
//   useEffect(() => { search(debounced); }, [debounced]);
//
// `delay` defaults to 300ms (component & search spec). Set to 0 for instant
// updates when you only want the debounced shape, not the timing.
import { useState, useEffect } from "react";

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default useDebounce;