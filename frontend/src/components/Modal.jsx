import { useState } from "react";
import { API } from "../constants.js";
import s from "../styles.js";

const VIO = "#7C4DFF";

/**
 * Modale login/registrazione.
 * mode="login" | mode="register"
 * onLogin(data) viene chiamato con la risposta del server in caso di successo.
 */
export function Modal({ mode, onClose, onSwitch, onLogin }) {
  const isLogin = mode === "login";

  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !username)) return;
    setError(null);
    setLoading(true);
    try {
      const body = isLogin ? { email, password } : { username, email, password };
      const res = await fetch(`${API}/auth/${isLogin ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Errore");
      onLogin(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <button style={s.modalClose} onClick={onClose} aria-label="chiudi">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <line x1="1" y1="1" x2="13" y2="13"/>
            <line x1="13" y1="1" x2="1" y2="13"/>
          </svg>
        </button>

        <p style={s.modalTitle}>{isLogin ? "accedi" : "crea un account"}</p>

        <div style={s.modalForm}>
          {!isLogin && (
            <div style={s.fieldGroup}>
              <label style={s.fieldLabel}>username</label>
              <input
                style={s.fieldInput}
                type="text" value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKey}
                onFocus={(e) => { e.target.style.background = "#EDE9FF"; }}
                onBlur={(e) => { e.target.style.background = "#E5E4DF"; }}
              />
            </div>
          )}
          <div style={s.fieldGroup}>
            <label style={s.fieldLabel}>email</label>
            <input
              style={s.fieldInput}
              type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKey}
              onFocus={(e) => { e.target.style.background = "#EDE9FF"; }}
              onBlur={(e) => { e.target.style.background = "#E5E4DF"; }}
            />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.fieldLabel}>password</label>
            <input
              style={s.fieldInput}
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKey}
              onFocus={(e) => { e.target.style.background = "#EDE9FF"; }}
              onBlur={(e) => { e.target.style.background = "#E5E4DF"; }}
            />
          </div>

          {error && <p style={s.modalError}>{error}</p>}

          <button
            style={{ ...s.btnPrimary, width: "100%", padding: "12px", justifyContent: "center", opacity: loading ? 0.5 : 1 }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = "translate(4px,4px)"; e.currentTarget.style.boxShadow = "none"; } }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `4px 4px 0 ${VIO}`; }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "…" : isLogin ? "entra" : "registrati"}
          </button>
        </div>

        <p style={s.modalSwitch}>
          {isLogin ? "Non hai un account?" : "Hai già un account?"}{" "}
          <span style={s.modalSwitchLink} onClick={onSwitch}>
            {isLogin ? "registrati" : "accedi"}
          </span>
        </p>
      </div>
    </div>
  );
}
