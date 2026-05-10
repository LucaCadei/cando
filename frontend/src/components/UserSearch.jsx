import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../constants.js";
import s from "../styles.js";

const INK = "#0E0E0C";
const YEL = "#FFD43A";
const BG  = "#E5E4DF";

/**
 * Campo di ricerca utenti con dropdown autocomplete.
 * La navigazione al profilo avviene direttamente con React Router
 * — nessun callback verso App necessario.
 */
export function UserSearch({ currentUserId }) {
  const navigate              = useNavigate();
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen]       = useState(false);
  const wrapRef               = useRef(null);

  // Debounce 300ms — evita una chiamata API per ogni tasto premuto
  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`${API}/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        // Filtra l'utente corrente — non ha senso cercare se stessi
        const data = (await res.json()).filter((u) => u.id !== currentUserId);
        setResults(data);
        setOpen(data.length > 0);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, currentUserId]);

  // Chiude il dropdown cliccando fuori
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (user) => {
    navigate(`/utenti/${user.id}`);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapRef} style={s.searchWrap}>
      <input
        style={s.searchInput}
        placeholder="cerca collezionisti…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); if (e.target.value.trim()) setOpen(true); }}
        onFocus={(e) => {
          e.target.style.background = YEL;
          if (results.length > 0) setOpen(true);
        }}
        onBlur={(e) => { e.target.style.background = BG; }}
      />
      {open && (
        <div style={s.searchDropdown}>
          {results.map((u) => (
            <div
              key={u.id}
              style={s.searchResultItem}
              onMouseEnter={(e) => { e.currentTarget.style.background = YEL; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = BG; }}
              onClick={() => handleSelect(u)}
            >
              <div style={s.searchResultAvatar}>{u.username[0].toUpperCase()}</div>
              <span style={{ fontFamily: "var(--f-body)", fontSize: 14, fontWeight: 600, color: INK }}>
                {u.username}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
