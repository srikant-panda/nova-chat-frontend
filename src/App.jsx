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
  ArrowDown,
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
  Monitor,
  Share2,
  Clock3,
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
  const [fontSize, setFontSize] = useState(
    Number(localStorage.getItem("novachat.fontSize") || 16),
  );
  const [model, setModel] = useState(
    localStorage.getItem("novachat.model") || DEFAULT_MODEL,
  );
  const [error, setError] = useState("");
  const [abort, setAbort] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const bottom = useRef(null);
  const scrollRef = useRef(null);
  const skipLoadRef = useRef(null);
  const nearBottomRef = useRef(true);
  const [showBottomButton, setShowBottomButton] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const resolved =
        theme === "system"
          ? window.matchMedia("(prefers-color-scheme: light)").matches
            ? "light"
            : "dark"
          : theme;
      root.dataset.theme = resolved;
    };
    apply();
    localStorage.setItem("novachat.theme", theme);
    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: light)");
      media.addEventListener?.("change", apply);
      return () => media.removeEventListener?.("change", apply);
    }
  }, [theme]);
  useEffect(() => {
    localStorage.setItem("novachat.model", model);
  }, [model]);
  useEffect(() => {
    document.documentElement.style.setProperty("--chat-font-size", `${fontSize}px`);
    localStorage.setItem("novachat.fontSize", String(fontSize));
  }, [fontSize]);
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
    if (!nearBottomRef.current) return;
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, sending]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distance <= 72;
    nearBottomRef.current = near;
    setShowBottomButton(!near && sending);
  }

  function scrollToBottom() {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = true;
    setShowBottomButton(false);
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }
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
  function del(id) {
    const target = chats.find((c) => String(c._id) === String(id));
    if (target) setDeleteTarget(target);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget._id;
    try {
      await api.deleteChat(id);
      setChats((x) => x.filter((c) => String(c._id) !== String(id)));
      if (String(chatId) === String(id)) nav("/chat");
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleteTarget(null);
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
            <ThemeSwitcher theme={theme} setTheme={setTheme} />
            <button className="ghost" onClick={() => setSettings(true)} title="Settings">
              <Settings />
            </button>
          </div>
        </header>
        <div ref={scrollRef} className="scroll" onScroll={handleScroll}>
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
                messages.map((m) => <Message key={m._id} message={m} user={user} />)
              )}
              <div ref={bottom} />
            </div>
          )}
        </div>
        {showBottomButton && (
          <button className="to-bottom" onClick={scrollToBottom} aria-label="Scroll to latest message" title="Jump to latest">
            <ArrowDown size={16} />
          </button>
        )}
        <Composer
          disabled={sending}
          onSend={send}
          onStop={() => abort?.abort()}
          model={model}
          setModel={setModel}
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
          fontSize={fontSize}
          setFontSize={setFontSize}
          onClose={() => setSettings(false)}
          onLogout={async () => {
            await api.logout();
            onLogout();
          }}
        />
      )}
      {deleteTarget && (
        <div className="delete-modal" onMouseDown={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="delete-card">
            <div className="delete-icon"><Trash2 size={19} /></div>
            <h3>Delete conversation?</h3>
            <p>This will permanently delete <b>{deleteTarget.topic || "this conversation"}</b>.</p>
            <div className="delete-actions">
              <button className="cancel" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
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
function Composer({ disabled, onSend, onStop, model, setModel }) {
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
          <div className="composer-tools">
            <ModelPicker model={model} setModel={setModel} />
            <span className="composer-status">{disabled ? "Nova is responding live" : "AI assistant"}</span>
          </div>
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
function Message({ message, user }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const created = message.createdAt ? new Date(message.createdAt) : new Date();
  const time = created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  
const messageTokens =
  message?.usage?.totalTokens ??
  message?.tokens ??
  ((message?.usage?.promptTokens ?? 0) +
    (message?.usage?.completionTokens ?? 0));
  const totalAvailable = Math.max(
    0,
    (user?.usage?.tokenLimit || 0) - (user?.usage?.tokenUsed || 0),
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  return (
    <article className={`message ${isUser ? "user-message" : "assistant-message"}`}>
      <div className={`mavatar ${isUser ? "u" : "ai"}`}>
        {isUser ? <User size={15} /> : <Sparkles size={15} />}
      </div>
      <div className="mbody">
        <div className="mhead">
          <b>{isUser ? "You" : "Nova"}</b>
          {message.streaming && (
            <span className="generating"><i /> generating</span>
          )}
        </div>
        <div className={`content ${message.error ? "bad" : ""}`}>
          {message.content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <div className="md-table-wrap">
                    <table className="md-table">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead>{children}</thead>,
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => <tr>{children}</tr>,
                th: ({ children }) => <th>{children}</th>,
                td: ({ children }) => <td>{children}</td>,
                h1: ({ children }) => <h1 className="md-section-title">{children}</h1>,
                h2: ({ children }) => <h2 className="md-section-title">{children}</h2>,
                h3: ({ children }) => <h3 className="md-section-title">{children}</h3>,
                blockquote: ({ children }) => <blockquote className="md-callout">{children}</blockquote>,
                code: ({ inline, className, children, ...props }) => {
                  const rawCode = String(children);
                  // react-markdown v9 can leave `inline` undefined for inlineCode.
                  // Treat backtick spans as inline unless the node is clearly a fenced
                  // block (language class or a trailing newline). This is especially
                  // important inside GFM tables, where inline code must stay inside
                  // the cell instead of becoming a full-width code card.
                  const isBlock = Boolean(className) || rawCode.endsWith("\n") || inline === false;
                  const code = rawCode.replace(/\n$/, "");
                  if (!isBlock) {
                    return <code className="inline-code" {...props}>{children}</code>;
                  }
                  const language = (className || "").replace("language-", "") || "text";
                  return <CodeBlock code={code} language={language} />;
                },
                pre: ({ children }) => <>{children}</>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : message.streaming ? (
            <Typing />
          ) : null}
          {message.streaming && message.content && <span className="caret" />}
        </div>

        {message.content && !message.error && (
          <div className="message-meta">
            <span><Clock3 size={11} /> {time}</span>
            {messageTokens > 0 && <span>{messageTokens.toLocaleString()} tokens</span>}
            {totalAvailable > 0 && <span>{totalAvailable.toLocaleString()} left</span>}
          </div>
        )}

        {message.content && !message.error && !message.streaming && (
          <div className="message-actions">
            <button className="action-icon" onClick={copy} title="Copy message" aria-label="Copy message">
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button className="action-icon" onClick={() => setShareOpen(true)} title="Share" aria-label="Share message">
              <Share2 size={14} />
            </button>
          </div>
        )}

        {shareOpen && (
          <div className="share-popover">
            <Sparkles size={15} />
            <span>Message sharing is coming soon.</span>
            <button onClick={() => setShareOpen(false)}><X size={13} /></button>
          </div>
        )}
      </div>
    </article>
  );
}

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }
  return (
    <div className="codeblock">
      <div className="codehead">
        <span>{language}</span>
        <button onClick={copyCode} aria-label="Copy code">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre><code dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }} /></pre>
    </div>
  );
}

function highlightCode(code) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let x = esc(code);
  x = x.replace(/(\/\/.*$|#.*$)/gm, '<span class="tok-com">$1</span>');
  x = x.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g, '<span class="tok-str">$1</span>');
  x = x.replace(/\b(const|let|var|function|return|if|else|for|while|class|new|async|await|import|from|export|default|try|catch|throw|true|false|null|undefined|def|in|is|and|or|not|None|True|False|public|private|protected|static|void|int|string|boolean|interface|extends|implements|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|DROP|TABLE)\b/g, '<span class="tok-kw">$1</span>');
  x = x.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
  return x;
}

function ModelPicker({ model, setModel }) {
  const [open, setOpen] = useState(false);
  const short = model.split("/").pop().replace(/:free$/i, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <div className={`composer-model ${open ? "open" : ""}`}>
      <button className="composer-model-trigger" onClick={() => setOpen((x) => !x)} type="button">
        <Zap size={12} />
        <span>{short}</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="model-popover">
          <div className="model-popover-title">Model</div>
          {MODELS.map((item) => (
            <button key={item} className={item === model ? "selected" : ""} onClick={() => { setModel(item); setOpen(false); }}>
              <span className="model-short">{item.split("/").pop().replace(/:free$/i, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
              <small>{item}</small>
              {item === model && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeSwitcher({ theme, setTheme }) {
  const items = [
    ["dark", Moon, "Dark"],
    ["system", Monitor, "System"],
    ["light", Sun, "Light"],
  ];
  return (
    <div className="theme-switcher" role="group" aria-label="Theme">
      <span className={`theme-knob ${theme}`} />
      {items.map(([id, Icon, label]) => (
        <button key={id} className={theme === id ? "active" : ""} onClick={() => setTheme(id)} title={label} aria-label={label}>
          <Icon size={15} />
        </button>
      ))}
    </div>
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
  fontSize,
  setFontSize,
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
        <section className="font-size-section">
          <label>Chat font size</label>
          <div className="font-size-row">
            <span className="font-small">A</span>
            <input type="range" min="14" max="20" step="1" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
            <span className="font-large">A</span>
            <b>{fontSize}px</b>
          </div>
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
