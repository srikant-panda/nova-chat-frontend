import { useEffect, useMemo, useRef, useState } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
  Navigate,
} from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUp,
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  User,
  X,
  Zap,
  RefreshCw,
  Palette,
  Command,
} from "lucide-react";
import * as api from "./api";
const DEFAULT_MODEL =
  import.meta.env.VITE_DEFAULT_MODEL || "nvidia/nemotron-3-nano-30b-a3b:free";
const MODELS = (import.meta.env.VITE_MODELS || DEFAULT_MODEL)
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);
const THEMES = [
  ["dark", "Dark", Moon],
  ["light", "Light", Sun],
  ["midnight", "Midnight", Palette],
  ["aurora", "Aurora", Sparkles],
];

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  useEffect(() => {
    (async () => {
      try {
        if (!api.getAccessToken() && !(await api.refreshAccessToken())) return;
        const me = await api.getMe();
        setUser(me.data);
      } catch {
        api.setAccessToken("");
      } finally {
        setChecking(false);
      }
    })();
  }, []);
  if (checking) return <Loading />;
  if (!user)
    return <Auth mode={authMode} setMode={setAuthMode} onSuccess={setUser} />;
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route
        path="/chat"
        element={
          <ChatShell
            user={user}
            setUser={setUser}
            onLogout={() => setUser(null)}
          />
        }
      />
      <Route
        path="/chat/:chatId"
        element={
          <ChatShell
            user={user}
            setUser={setUser}
            onLogout={() => setUser(null)}
          />
        }
      />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}
function Loading() {
  return (
    <div className="loading">
      <div className="logo">
        <Sparkles size={22} />
      </div>
      <b>NovaChat</b>
      <div className="loadbar">
        <i />
      </div>
    </div>
  );
}
function Auth({ mode, setMode, onSuccess }) {
  const login = mode === "login";
  const [f, setF] = useState({ name: "", email: "", password: "", age: 18 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      login
        ? await api.login(f.email, f.password)
        : await api.signup(f.name, f.email, f.password, f.age);
      const me = await api.getMe();
      onSuccess(me.data);
    } catch (e) {
      setErr(e.payload?.errors?.map?.((x) => x.message).join(" ") || e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth">
      <div className="ambient one" />
      <div className="ambient two" />
      <form className="authcard" onSubmit={submit}>
        <div className="authlogo">
          <Sparkles size={22} />
        </div>
        <small>PRIVATE AI WORKSPACE</small>
        <h1>{login ? "Welcome back." : "Create your workspace."}</h1>
        <p>
          {login
            ? "Continue your conversations where you left off."
            : "Your own ChatGPT-style interface, connected to your backend."}
        </p>
        {!login && (
          <Field label="Name">
            <input
              value={f.name}
              onChange={(e) => set("name", e.target.value)}
              minLength={3}
              maxLength={15}
              required
            />
          </Field>
        )}
        <Field label="Email">
          <input
            type="email"
            value={f.email}
            onChange={(e) => set("email", e.target.value)}
            required
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            value={f.password}
            onChange={(e) => set("password", e.target.value)}
            minLength={8}
            required
          />
        </Field>
        {!login && (
          <Field label="Age">
            <input
              type="number"
              min="10"
              max="100"
              value={f.age}
              onChange={(e) => set("age", e.target.value)}
            />
          </Field>
        )}
        {err && (
          <div className="error">
            <CircleAlert size={15} />
            {err}
          </div>
        )}
        <button className="primary" disabled={busy}>
          {busy ? (
            <>
              <Spinner />
              Working…
            </>
          ) : login ? (
            "Sign in"
          ) : (
            "Create account"
          )}
        </button>
        <div className="switch">
          {login ? "New here?" : "Already have an account?"}
          <button
            type="button"
            onClick={() => {
              setErr("");
              setMode(login ? "signup" : "login");
            }}
          >
            {login ? "Create account" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Spinner() {
  return <i className="spinner" />;
}
function ChatShell({ user, setUser, onLogout }) {
  const nav = useNavigate();
  const loc = useLocation();
  const { chatId } = useParams();
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState(false);
  const [theme, setTheme] = useState(
    localStorage.getItem("novachat.theme") || "dark",
  );
  const [model, setModel] = useState(
    localStorage.getItem("novachat.model") || DEFAULT_MODEL,
  );
  const [error, setError] = useState("");
  const [abort, setAbort] = useState(null);
  const bottom = useRef(null);
  const skipLoadRef = useRef(null);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("novachat.theme", theme);
  }, [theme]);
  useEffect(() => localStorage.setItem("novachat.model", model), [model]);
  useEffect(() => {
    loadChats();
  }, []);
  useEffect(() => {
    if (chatId) {
      if (String(skipLoadRef.current) === String(chatId)) {
        skipLoadRef.current = null;
        return;
      }
      loadMessages(chatId);
    } else setMessages([]);
  }, [chatId]);
  useEffect(() => {
    bottom.current?.scrollIntoView({
      behavior: sending ? "smooth" : "auto",
      block: "end",
    });
  }, [messages, sending]);
  async function loadChats() {
    setLoadingChats(true);
    try {
      setChats(await api.getRecentChats());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingChats(false);
    }
  }
  async function loadMessages(id) {
    setLoadingMessages(true);
    setError("");
    try {
      setMessages(await api.getMessages(id));
    } catch (e) {
      setError(e.message);
      if (e.status === 404) nav("/chat", { replace: true });
    } finally {
      setLoadingMessages(false);
    }
  }
  function newChat() {
    if (sending) return;
    nav("/chat");
    setMobile(false);
    setError("");
  }
  async function del(id) {
    if (!confirm("Delete this conversation?")) return;
    try {
      await api.deleteChat(id);
      setChats((x) => x.filter((c) => String(c._id) !== String(id)));
      if (String(chatId) === String(id)) nav("/chat");
    } catch (e) {
      setError(e.message);
    }
  }
  async function send(content) {
    content = content.trim();
    if (!content || sending) return;
    setError("");
    setSending(true);
    const uid = `u-${Date.now()}`,
      aid = `a-${Date.now()}`;
    setMessages((x) => [
      ...x,
      { _id: uid, role: "user", content, createdAt: new Date().toISOString() },
      {
        _id: aid,
        role: "assistant",
        content: "",
        streaming: true,
        createdAt: new Date().toISOString(),
      },
    ]);
    const controller = new AbortController();
    setAbort(controller);
    let resolvedChatId = chatId;
    let full = "";
    try {
      await api.streamMessage({
        content,
        chatId,
        model,
        signal: controller.signal,
        onEvent: (event, data) => {
          if (event === "chat") {
            resolvedChatId = data.chatId;
            if (!chatId) {
              skipLoadRef.current = data.chatId;
              nav(`/chat/${data.chatId}`, { replace: true });
            }
            setChats((x) => {
              const exists = x.some(
                (c) => String(c._id) === String(data.chatId),
              );
              return exists
                ? x
                : x.concat([
                    {
                      _id: data.chatId,
                      topic: data.topic || content.slice(0, 40),
                      model: data.model || model,
                      messageCount: 0,
                    },
                  ]);
            });
          } else if (event === "token") {
            full += data.text || "";
            setMessages((x) =>
              x.map((m) => (m._id === aid ? { ...m, content: full } : m)),
            );
          } else if (event === "done") {
            setMessages((x) =>
              x.map((m) =>
                m._id === aid
                  ? { ...m, content: data.reply || full, streaming: false }
                  : m,
              ),
            );
            if (data.usage)
              setUser((u) => ({
                ...u,
                usage: {
                  ...u.usage,
                  tokenUsed:
                    (u.usage?.tokenUsed || 0) + (data.usage.totalTokens || 0),
                  totalTokenUsed:
                    (u.usage?.totalTokenUsed || 0) +
                    (data.usage.totalTokens || 0),
                },
              }));
            setChats((x) =>
              x.map((c) =>
                String(c._id) === String(resolvedChatId)
                  ? {
                      ...c,
                      topic: data.topic || c.topic,
                      messageCount: data.messageCount || c.messageCount,
                    }
                  : c,
              ),
            );
            if (resolvedChatId) {
              loadMessages(resolvedChatId);
            }
          } else if (event === "error") {
            throw new Error(data.message || "Streaming failed");
          }
        },
      });
    } catch (e) {
      if (e.name !== "AbortError") {
        setMessages((x) =>
          x.map((m) =>
            m._id === aid
              ? {
                  ...m,
                  streaming: false,
                  error: true,
                  content: `**Request failed:** ${e.message}`,
                }
              : m,
          ),
        );
        setError(e.message);
      }
    } finally {
      setSending(false);
      setAbort(null);
      await loadChats();
    }
  }
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q
      ? chats.filter((c) => (c.topic || "New Chat").toLowerCase().includes(q))
      : chats;
  }, [chats, search]);
  const active = chats.find((c) => String(c._id) === String(chatId));
  return (
    <div className="app">
      <div
        className={`backdrop ${mobile ? "show" : ""}`}
        onClick={() => setMobile(false)}
      />
      <aside
        className={`sidebar ${sidebar ? "wide" : "mini"} ${mobile ? "mobile" : ""}`}
      >
        <div className="sidehead">
          <div className="brand">
            <div className="brandmark">
              <Sparkles size={17} />
            </div>
            {sidebar && <b>NovaChat</b>}
          </div>
          <button
            className="ghost mobileclose"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
          <button
            className="ghost desktopcollapse"
            onClick={() => setSidebar((x) => !x)}
          >
            {sidebar ? <PanelLeftClose /> : <PanelLeftOpen />}
          </button>
        </div>
        <button className={`new ${!sidebar ? "only" : ""}`} onClick={newChat}>
          <Plus size={18} />
          {sidebar && "New chat"}
        </button>
        {sidebar && (
          <div className="search">
            <Search size={14} />
            <input
              placeholder="Search conversations"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
        {sidebar && (
          <div className="list">
            <div className="label">RECENT</div>
            {loadingChats ? (
              <SkeletonList />
            ) : filtered.length ? (
              filtered.map((c) => (
                <ChatRow
                  key={c._id}
                  chat={c}
                  active={String(c._id) === String(chatId)}
                  onClick={() => {
                    nav(`/chat/${c._id}`);
                    setMobile(false);
                  }}
                  onDelete={() => del(c._id)}
                />
              ))
            ) : (
              <div className="empty">
                <MessageCircle size={18} />
                No conversations yet
              </div>
            )}
          </div>
        )}
        <div className="footer">
          {sidebar && <Usage usage={user.usage} />}
          <button className="account" onClick={() => setSettings(true)}>
            <div className="avatar">{(user.name || "U")[0]}</div>
            {sidebar && (
              <>
                <div>
                  <b>{user.name}</b>
                  <span>{user.email}</span>
                </div>
                <MoreHorizontal size={16} />
              </>
            )}
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="top">
          <button className="ghost mobilemenu" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <div className="title">
            <i />{" "}
            <div>
              <b>{active?.topic || "New chat"}</b>
              <span>{active?.model || model}</span>
            </div>
          </div>
          <div className="topright">
            <div className="model">
              <Zap size={12} />
              {active?.model || model}
              <ChevronDown size={12} />
            </div>
            <button className="ghost" onClick={() => setSettings(true)}>
              <Settings />
            </button>
          </div>
        </header>
        <div className="scroll">
          {error && (
            <div className="floating">
              <CircleAlert size={14} />
              {error}
              <button onClick={() => setError("")}>
                <X size={13} />
              </button>
            </div>
          )}
          {!chatId ? (
            <Welcome model={model} onSend={send} />
          ) : (
            <div className="messages">
              {loadingMessages ? (
                <MessageSkeleton />
              ) : (
                messages.map((m) => <Message key={m._id} message={m} />)
              )}
              <div ref={bottom} />
            </div>
          )}
        </div>
        <Composer
          disabled={sending}
          onSend={send}
          onStop={() => abort?.abort()}
        />
        <div className="hint">
          <Command size={10} />
          {sending
            ? "Generating live response…"
            : "Enter to send · Shift + Enter for new line"}
        </div>
      </main>
      {settings && (
        <SettingsDrawer
          user={user}
          theme={theme}
          setTheme={setTheme}
          model={model}
          setModel={setModel}
          onClose={() => setSettings(false)}
          onLogout={async () => {
            await api.logout();
            onLogout();
          }}
        />
      )}
    </div>
  );
}
function ChatRow({ chat, active, onClick, onDelete }) {
  return (
    <div className={`chatrow ${active ? "active" : ""}`} onClick={onClick}>
      <MessageCircle size={15} />
      <span>{chat.topic || "New Chat"}</span>
      <button
        className="del"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
function SkeletonList() {
  return (
    <>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div className="skchat" key={i}>
          <i />
          <span />
        </div>
      ))}
    </>
  );
}
function Usage({ usage }) {
  const u = usage?.tokenUsed || 0,
    l = usage?.tokenLimit || 1;
  return (
    <div className="usage">
      <div>
        <span>Token usage</span>
        <b>
          {u.toLocaleString()} / {l.toLocaleString()}
        </b>
      </div>
      <i>
        <em style={{ width: `${Math.min(100, (u / l) * 100)}%` }} />
      </i>
    </div>
  );
}
function Welcome({ model, onSend }) {
  const [v, setV] = useState("");
  const cards = [
    ["Explain something", "Explain a difficult concept simply"],
    ["Debug code", "Help me find a bug in my code"],
    ["Build an API", "Design a clean backend endpoint"],
    ["Learn something", "Teach me step by step"],
  ];
  return (
    <div className="welcome">
      <div className="welcomeicon">
        <Sparkles size={25} />
      </div>
      <small>YOUR AI WORKSPACE</small>
      <h1>
        What are we<span> building today?</span>
      </h1>
      <p>
        Ask questions, write code, explore ideas and keep every conversation in
        your own backend.
      </p>
      <div className="cards">
        {cards.map(([a, b]) => (
          <button key={a} onClick={() => setV(b)}>
            <b>{a}</b>
            <span>{b}</span>
            <ArrowUp size={14} />
          </button>
        ))}
      </div>
      <div className="modelnote">
        <Zap size={12} />
        {model}
      </div>
      {v && (
        <button
          className="quick"
          onClick={() => {
            onSend(v);
            setV("");
          }}
        >
          Send prompt <ArrowUp size={14} />
        </button>
      )}
    </div>
  );
}
function Composer({ disabled, onSend, onStop }) {
  const [v, setV] = useState("");
  const ref = useRef(null);
  function resize() {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = Math.min(ref.current.scrollHeight, 180) + "px";
    }
  }
  function submit() {
    if (!v.trim() || disabled) return;
    onSend(v);
    setV("");
    setTimeout(() => {
      if (ref.current) ref.current.style.height = "auto";
    }, 0);
  }
  return (
    <div className="composerwrap">
      <div className="composer">
        <textarea
          ref={ref}
          rows="1"
          disabled={disabled}
          value={v}
          placeholder={disabled ? "Generating…" : "Message NovaChat…"}
          onChange={(e) => {
            setV(e.target.value);
            resize();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="composerbottom">
          <span>{disabled ? "Nova is responding live" : "AI assistant"}</span>
          <button
            className="send"
            disabled={!disabled && !v.trim()}
            onClick={disabled ? onStop : submit}
          >
            {disabled ? (
              <RefreshCw className="spin" size={15} />
            ) : (
              <ArrowUp size={17} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
function Message({ message }) {
  const user = message.role === "user";
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {}
  }
  return (
    <article className="message">
      <div className={`mavatar ${user ? "u" : "ai"}`}>
        {user ? <User size={15} /> : <Sparkles size={15} />}
      </div>
      <div className="mbody">
        <div className="mhead">
          <b>{user ? "You" : "Nova"}</b>
          {message.streaming && (
            <span className="generating">
              <i /> generating
            </span>
          )}
        </div>
        <div className={`content ${message.error ? "bad" : ""}`}>
          {message.content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          ) : message.streaming ? (
            <Typing />
          ) : null}
          {message.streaming && message.content && <span className="caret" />}
        </div>
        {!user && message.content && !message.error && (
          <button className="copy" onClick={copy}>
            {copied ? <Check size={12} /> : <Copy size={12} />}{" "}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </article>
  );
}
function Typing() {
  return (
    <span className="typing">
      <i />
      <i />
      <i />
    </span>
  );
}
function MessageSkeleton() {
  return (
    <div className="msgsk">
      <i />
      <div>
        <b />
        <span />
        <span />
        <em />
      </div>
    </div>
  );
}
function SettingsDrawer({
  user,
  theme,
  setTheme,
  model,
  setModel,
  onClose,
  onLogout,
}) {
  return (
    <div className="drawerback" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawerhead">
          <div>
            <small>PREFERENCES</small>
            <h2>Settings</h2>
          </div>
          <button className="ghost" onClick={onClose}>
            <X />
          </button>
        </div>
        <section>
          <label>Appearance</label>
          <div className="themes">
            {THEMES.map(([id, name, Icon]) => (
              <button
                key={id}
                className={theme === id ? "selected" : ""}
                onClick={() => setTheme(id)}
              >
                <Icon size={16} />
                {name}
                {theme === id && <Check size={13} />}
              </button>
            ))}
          </div>
        </section>
        <section>
          <label>Model</label>
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            {MODELS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </section>
        <section className="acct">
          <div className="avatar">{(user.name || "U")[0]}</div>
          <div>
            <b>{user.name}</b>
            <span>{user.email}</span>
          </div>
        </section>
        <button className="logout" onClick={onLogout}>
          <LogOut size={15} />
          Sign out
        </button>
      </aside>
    </div>
  );
}
