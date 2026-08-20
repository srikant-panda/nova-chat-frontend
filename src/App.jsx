import { useEffect, useMemo, useRef, useState } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useParams,
  Navigate,
} from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Highlight, themes } from "prism-react-renderer";
import {
  ArrowUp,
  ArrowDown,
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  LogOut,
  LogIn,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
  Search,
  Settings,
  Sun,
  Trash2,
  User,
  X,
  Zap,
  RefreshCw,
  Palette,
  Command,
  Monitor,
  Clock3,
  Pencil,
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
  ["aurora", "Aurora", Palette],
];
const ACCENTS = [
  ["blue", "Blue", "#4f8cff"],
  ["cyan", "Cyan", "#22c7d9"],
  ["violet", "Violet", "#8b5cf6"],
  ["amber", "Amber", "#d99a20"],
  ["rose", "Rose", "#e45676"],
];

function isInvalidChatRouteError(error) {
  return (
    error?.status === 404 ||
    (error?.status === 400 && /chatid.*valid/i.test(error?.message || ""))
  );
}

const CODE_LANGUAGE_ALIASES = {
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  py: "python",
  python3: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  md: "markdown",
  plaintext: "text",
  txt: "text",
};

function codeLanguage(language = "text") {
  const normalized = String(language || "text").trim().toLowerCase();
  return CODE_LANGUAGE_ALIASES[normalized] || normalized || "text";
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authOpen, setAuthOpen] = useState(false);
  const requestAuth = (mode = "login") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };
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
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <ChatShell
              user={user}
              setUser={setUser}
              onLogout={() => setUser(null)}
              requestAuth={requestAuth}
            />
          }
        />
        <Route path="/chat" element={<Navigate to="/" replace />} />
        <Route path="/chat/:chatId" element={<LegacyChatRedirect />} />
        <Route
          path="/:chatId"
          element={
            <ChatShell
              user={user}
              setUser={setUser}
              onLogout={() => setUser(null)}
              requestAuth={requestAuth}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {authOpen && (
        <AuthModal
          mode={authMode}
          setMode={setAuthMode}
          onClose={() => setAuthOpen(false)}
          onSuccess={(me) => {
            setUser(me);
            setAuthOpen(false);
          }}
        />
      )}
    </>
  );
}
function LegacyChatRedirect() {
  const { chatId } = useParams();
  return <Navigate to={`/${chatId}`} replace />;
}
function Loading() {
  return (
    <div className="loading">
      <div className="logo">
        <BrandGlyph size={24} />
      </div>
      <b>NovaChat</b>
      <div className="loadbar">
        <i />
      </div>
    </div>
  );
}
function AuthModal({ mode, setMode, onSuccess, onClose }) {
  return (
    <div className="authmodal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <Auth mode={mode} setMode={setMode} onSuccess={onSuccess} onClose={onClose} />
    </div>
  );
}
function Auth({ mode, setMode, onSuccess, onClose }) {
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
      <form className="authcard" onSubmit={submit}>
        <button className="authclose" type="button" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="authlogo">
          <BrandGlyph size={22} />
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
  );
}
function BrandGlyph({ size = 18 }) {
  const stroke = Math.max(1.5, size / 12);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="19" fill="currentColor" opacity=".18" />
      <ellipse
        cx="32"
        cy="32"
        rx="28"
        ry="8"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        transform="rotate(-17 32 32)"
      />
      <circle cx="32" cy="32" r="16" fill="currentColor" />
      <path
        d="M18 31c7 4 20 4 28-1M20 38c7 3 16 3 25 0"
        fill="none"
        stroke="var(--logo-line,#fff)"
        strokeWidth={stroke}
        strokeLinecap="round"
        opacity=".72"
      />
    </svg>
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
function ChatShell({ user, setUser, onLogout, requestAuth }) {
  const nav = useNavigate();
  const { chatId } = useParams();
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(Boolean(user));
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState(false);
  const [theme, setTheme] = useState(
    localStorage.getItem("novachat.theme") || "dark",
  );
  const [accent, setAccent] = useState(
    localStorage.getItem("novachat.accent") || "blue",
  );
  const [fontSize, setFontSize] = useState(
    Number(localStorage.getItem("novachat.fontSize") || 18),
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
  const activeStreamRef = useRef(null);
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
    document.documentElement.dataset.accent = accent;
    localStorage.setItem("novachat.accent", accent);
  }, [accent]);
  useEffect(() => {
    document.documentElement.style.setProperty("--chat-font-size", `${fontSize}px`);
    localStorage.setItem("novachat.fontSize", String(fontSize));
  }, [fontSize]);
  useEffect(() => {
    if (user) loadChats();
    else {
      setChats([]);
      setMessages([]);
      setLoadingChats(false);
      if (chatId) nav("/", { replace: true });
    }
  }, [user?.id]);
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }
    if (chatId) {
      if (String(skipLoadRef.current) === String(chatId)) {
        skipLoadRef.current = null;
        return;
      }
      loadMessages(chatId);
    } else setMessages([]);
  }, [chatId, user?.id]);
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
  function stopStreaming() {
    const active = activeStreamRef.current;
    if (!active) return;
    active.stopped = true;
    active.controller?.abort();
    setSending(false);
    setAbort(null);
    setMessages((x) =>
      x.map((m) => {
        if (
          active.sourceUserMessageId &&
          String(m._id) === String(active.sourceUserMessageId) &&
          active.editIndex > 0
        ) {
          const edits = Array.isArray(m.edits) ? [...m.edits] : [];
          const edit = edits[active.editIndex - 1];
          if (edit) {
            edits[active.editIndex - 1] = {
              ...edit,
              response: edit.response || "Stopped.",
              streaming: false,
              stopped: true,
            };
          }
          return { ...m, edits };
        }
        return m._id === active.assistantId
          ? {
              ...m,
              streaming: false,
              stopped: true,
              content: m.content || "Stopped.",
            }
          : m;
      }),
    );
  }
  async function loadChats() {
    if (!user) return;
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
    if (!user) return;
    setLoadingMessages(true);
    setError("");
    try {
      setMessages(await api.getMessages(id));
    } catch (e) {
      if (isInvalidChatRouteError(e)) {
        setMessages([]);
        setError("Chat not found.");
        nav("/", { replace: true });
      } else {
        setError(e.message);
      }
    } finally {
      setLoadingMessages(false);
    }
  }
  function newChat() {
    if (sending) return;
    nav("/");
    setMobile(false);
    setError("");
  }
  function del(id) {
    if (!user) return;
    const target = chats.find((c) => String(c._id) === String(id));
    if (target) setDeleteTarget(target);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget._id;
    try {
      await api.deleteChat(id);
      setChats((x) => x.filter((c) => String(c._id) !== String(id)));
      if (String(chatId) === String(id)) nav("/");
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleteTarget(null);
    }
  }
  async function send(content, opts = {}) {
    content = content.trim();
    if (!content || sending) return;
    if (!user) {
      requestAuth("login");
      return false;
    }
    setError("");
    setSending(true);
    const isEdit = Boolean(opts.sourceUserMessageId);
    const uid = `u-${Date.now()}`;
    const aid = opts.pairedAssistantId || `a-${Date.now()}`;
    const assistantDraft = {
      _id: aid,
      role: "assistant",
      content: "",
      streaming: true,
      createdAt: new Date().toISOString(),
    };
    let editIndex = 0;
    if (isEdit) {
      editIndex = (opts.currentEditCount || 0) + 1;
      setMessages((x) => {
        const next = [];
        let assistantFound = false;
        for (const m of x) {
          if (String(m._id) === String(opts.sourceUserMessageId) && m.role === "user") {
            const edits = Array.isArray(m.edits) ? m.edits : [];
            next.push({
              ...m,
              originalAssistantContent:
                m.originalAssistantContent ?? opts.originalAssistantContent ?? "",
              activeEditIndex: editIndex,
              edits: edits.concat([
                {
                  content,
                  response: "",
                  assistantId: aid,
                  createdAt: new Date().toISOString(),
                  streaming: true,
                },
              ]),
            });
            continue;
          }
          if (String(m._id) === String(aid) && m.role === "assistant") {
            assistantFound = true;
            next.push({
              ...m,
              content: "",
              streaming: true,
              error: false,
              stopped: false,
              usage: undefined,
            });
            continue;
          }
          next.push(m);
        }
        return assistantFound ? next : next.concat(assistantDraft);
      });
    } else {
      setMessages((x) => [
        ...x,
        { _id: uid, role: "user", content, edits: [], createdAt: new Date().toISOString() },
        assistantDraft,
      ]);
    }
    const controller = new AbortController();
    const streamId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    activeStreamRef.current = {
      id: streamId,
      controller,
      assistantId: aid,
      sourceUserMessageId: opts.sourceUserMessageId,
      editIndex,
      stopped: false,
    };
    setAbort(controller);
    let resolvedChatId = chatId;
    let full = "";
    const streamIsActive = () =>
      activeStreamRef.current?.id === streamId && !activeStreamRef.current?.stopped;
    try {
      await api.streamMessage({
        content,
        chatId,
        model,
        signal: controller.signal,
        onEvent: (event, data) => {
          if (!streamIsActive()) return;
          if (event === "chat") {
            resolvedChatId = data.chatId;
            if (!chatId) {
              skipLoadRef.current = data.chatId;
              nav(`/${data.chatId}`, { replace: true });
            }
            setChats((x) => {
              const nextChat = {
                _id: data.chatId,
                topic: data.topic || content.slice(0, 40),
                model: data.model || model,
                messageCount: 0,
              };
              const rest = x.filter(
                (c) => String(c._id) !== String(data.chatId),
              );
              return [nextChat, ...rest];
            });
          } else if (event === "token") {
            full += data.text || "";
            setMessages((x) =>
              x.map((m) => {
                if (
                  isEdit &&
                  String(m._id) === String(opts.sourceUserMessageId) &&
                  m.role === "user"
                ) {
                  const edits = Array.isArray(m.edits) ? [...m.edits] : [];
                  const edit = edits[editIndex - 1];
                  if (edit) edits[editIndex - 1] = { ...edit, response: full, streaming: true };
                  return { ...m, edits, activeEditIndex: editIndex };
                }
                return m._id === aid ? { ...m, content: full } : m;
              }),
            );
          } else if (event === "done") {
            if (!streamIsActive()) return;
            const finalReply = data.reply || full;
            setMessages((x) =>
              x.map((m) => {
                if (
                  isEdit &&
                  String(m._id) === String(opts.sourceUserMessageId) &&
                  m.role === "user"
                ) {
                  const edits = Array.isArray(m.edits) ? [...m.edits] : [];
                  const edit = edits[editIndex - 1];
                  if (edit) {
                    edits[editIndex - 1] = {
                      ...edit,
                      response: finalReply,
                      usage: data.usage,
                      streaming: false,
                    };
                  }
                  return { ...m, edits, activeEditIndex: editIndex };
                }
                return m._id === aid
                  ? { ...m, content: finalReply, usage: data.usage, streaming: false }
                  : m;
              }),
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
              x
                .map((c) =>
                  String(c._id) === String(resolvedChatId)
                    ? {
                        ...c,
                        topic: data.topic || c.topic,
                        messageCount: data.messageCount || c.messageCount,
                      }
                    : c,
                )
                .sort((a, b) =>
                  String(a._id) === String(resolvedChatId)
                    ? -1
                    : String(b._id) === String(resolvedChatId)
                      ? 1
                      : 0,
                ),
            );
            if (resolvedChatId && !isEdit) {
              loadMessages(resolvedChatId);
            }
          } else if (event === "error") {
            throw new Error(data.message || "Streaming failed");
          }
        },
      });
    } catch (e) {
      if (e.name !== "AbortError" && streamIsActive()) {
        setMessages((x) =>
          x.map((m) => {
            if (
              isEdit &&
              String(m._id) === String(opts.sourceUserMessageId) &&
              m.role === "user"
            ) {
              const edits = Array.isArray(m.edits) ? [...m.edits] : [];
              const edit = edits[editIndex - 1];
              if (edit) {
                edits[editIndex - 1] = {
                  ...edit,
                  response: `**Request failed:** ${e.message}`,
                  streaming: false,
                  error: true,
                };
              }
              return { ...m, edits, activeEditIndex: editIndex };
            }
            return m._id === aid
              ? {
                  ...m,
                  streaming: false,
                  error: true,
                  content: `**Request failed:** ${e.message}`,
                }
              : m;
          }),
        );
        setError(e.message);
      }
    } finally {
      if (activeStreamRef.current?.id === streamId) {
        const stopped = activeStreamRef.current.stopped;
        activeStreamRef.current = null;
        setSending(false);
        setAbort(null);
        if (!stopped) await loadChats();
      }
    }
    return true;
  }
  async function editUserMessage(id, content) {
    const next = content.trim();
    if (!next || sending) return false;
    const targetIndex = messages.findIndex((m) => String(m._id) === String(id) && m.role === "user");
    const target = messages[targetIndex];
    const pairedAssistant =
      targetIndex >= 0 && messages[targetIndex + 1]?.role === "assistant"
        ? messages[targetIndex + 1]
        : null;
    const currentEdits = Array.isArray(target?.edits) ? target.edits : [];
    if (!target || currentEdits.length >= 2) return false;
    return send(next, {
      sourceUserMessageId: id,
      pairedAssistantId: pairedAssistant?._id,
      originalAssistantContent:
        target.originalAssistantContent ?? pairedAssistant?.content ?? "",
      currentEditCount: currentEdits.length,
    });
  }
  function selectUserVariant(id, index) {
    if (sending) return;
    setMessages((x) =>
      x.map((m, i) => {
        if (String(m._id) === String(id) && m.role === "user") {
          return { ...m, activeEditIndex: index };
        }
        const previous = x[i - 1];
        if (previous?.role === "user" && String(previous._id) === String(id) && m.role === "assistant") {
          const edits = Array.isArray(previous.edits) ? previous.edits : [];
          const selectedEdit = index > 0 ? edits[index - 1] : null;
          return {
            ...m,
            content: index === 0 ? previous.originalAssistantContent ?? m.content : selectedEdit?.response ?? "",
            usage: index === 0 ? m.usage : selectedEdit?.usage,
            streaming: Boolean(selectedEdit?.streaming),
            error: Boolean(selectedEdit?.error),
            stopped: Boolean(selectedEdit?.stopped),
          };
        }
        return m;
      }),
    );
  }
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q
      ? chats.filter((c) => (c.topic || "New Chat").toLowerCase().includes(q))
      : chats;
  }, [chats, search]);
  const active = chats.find((c) => String(c._id) === String(chatId));
  const sidebarOpen = sidebar || mobile;
  return (
    <div className="app">
      <div
        className={`backdrop ${mobile ? "show" : ""}`}
        onClick={() => setMobile(false)}
      />
      <aside
        className={`sidebar ${sidebarOpen ? "wide" : "mini"} ${mobile ? "mobile" : ""}`}
      >
        <div className="sidehead">
          <div className="brand">
            <div className="brandmark">
              <BrandGlyph size={18} />
            </div>
            {sidebarOpen && <b>NovaChat</b>}
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
        <button className={`new ${!sidebarOpen ? "only" : ""}`} onClick={newChat} title="New chat" aria-label="New chat">
          <SquarePen size={18} />
          {sidebarOpen && "New chat"}
        </button>
        {sidebarOpen && (
          <div className="search">
            <Search size={14} />
            <input
              placeholder="Search conversations"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
        {sidebarOpen && (
          <div className="list">
            <div className="label">RECENT</div>
            {!user ? (
              <div className="guest-empty">
                <MessageCircle size={18} />
                <b>Guest mode</b>
                <span>Sign in to save conversations.</span>
              </div>
            ) : loadingChats ? (
              <SkeletonList />
            ) : filtered.length ? (
              filtered.map((c) => (
                <ChatRow
                  key={c._id}
                  chat={c}
                  active={String(c._id) === String(chatId)}
                  onClick={() => {
                    nav(`/${c._id}`);
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
          {user && sidebarOpen && <Usage usage={user.usage} />}
          <button className="account" onClick={() => user ? setSettings(true) : requestAuth("login")}>
            <div className="avatar">{user ? (user.name || "U")[0] : <LogIn size={16} />}</div>
            {sidebarOpen && (
              <>
                <div>
                  <b>{user ? user.name : "Guest"}</b>
                  <span>{user ? user.email : "Sign in to sync chats"}</span>
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
            {user ? (
              <button className="ghost" onClick={() => setSettings(true)} title="Settings">
                <Settings />
              </button>
            ) : (
              <div className="auth-actions">
                <button onClick={() => requestAuth("login")}>Log in</button>
                <button className="join" onClick={() => requestAuth("signup")}>Sign up</button>
              </div>
            )}
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
          {!chatId || !user ? (
            <Welcome model={model} onSend={send} guest={!user} />
          ) : (
            <div className="messages">
              {loadingMessages ? (
                <MessageSkeleton />
              ) : (
                messages.map((m) => (
                  <Message
                    key={m._id}
                    message={m}
                    user={user}
                    onEdit={editUserMessage}
                    onSelectVariant={selectUserVariant}
                    disabled={sending}
                  />
                ))
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
        {sending && (
          <button className="stream-status" onClick={scrollToBottom} type="button">
            <Typing />
            <span>Nova is responding</span>
          </button>
        )}
        <Composer
          disabled={sending}
          onSend={send}
          onStop={stopStreaming}
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
      {settings && user && (
        <SettingsDrawer
          user={user}
          theme={theme}
          setTheme={setTheme}
          accent={accent}
          setAccent={setAccent}
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
function Welcome({ model, onSend, guest }) {
  const [v, setV] = useState("");
  const cards = [
    ["Code", "Write a clean React component"],
    ["Study", "Explain quantum computing simply"],
    ["Create", "Draft a launch post for NovaChat"],
    ["Plan", "Break my project into next steps"],
  ];
  return (
    <div className="welcome">
      <div className="welcome-watermark" aria-hidden="true">
        <BrandGlyph size={360} />
      </div>
      <small>YOUR AI WORKSPACE</small>
      <h1>
        Start a new<span> conversation</span>
      </h1>
      <p>
        Ask, build, learn, or explore. Your chat stays clean and focused
        {guest ? " after you sign in." : "."}
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
          onClick={async () => {
            const sent = await onSend(v);
            if (sent !== false) setV("");
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
    Promise.resolve(onSend(v)).then((sent) => {
      if (sent === false) return;
      setV("");
      setTimeout(() => {
        if (ref.current) ref.current.style.height = "auto";
      }, 0);
    });
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
function Message({ message, user, onEdit, onSelectVariant, disabled }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const created = message.createdAt ? new Date(message.createdAt) : new Date();
  const time = created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const variants = isUser
    ? [message.content, ...(Array.isArray(message.edits) ? message.edits.map((x) => x.content) : [])]
    : [];
  const activeVariant = isUser ? message.activeEditIndex || 0 : 0;
  const activeContent = isUser ? variants[activeVariant] || message.content || "" : message.content || "";
  const canEdit = isUser && !message.error && !message.streaming && variants.length < 3;
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
      await navigator.clipboard.writeText(activeContent || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }
  async function saveEdit(e) {
    e.preventDefault();
    const ok = await onEdit?.(message._id, draft);
    if (ok !== false) {
      setEditing(false);
      setDraft("");
    }
  }
  const markdown = (content) => (
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
      {content}
    </ReactMarkdown>
  );

  return (
    <article className={`message ${isUser ? "user-message" : "assistant-message"}`}>
      <div className={`mavatar ${isUser ? "u" : "ai"}`}>
        {isUser ? <User size={15} /> : <BrandGlyph size={15} />}
      </div>
      <div className="mbody">
        <div className="mhead">
          <b>{isUser ? "You" : "Nova"}</b>
          {message.streaming && (
            <span className="generating"><i /> generating</span>
          )}
        </div>
        <div className={`content ${message.error ? "bad" : ""}`}>
          {isUser && activeContent ? (
            <div className="message-variant">
              {variants.length > 1 && <span className="variant-index">{activeVariant + 1}</span>}
              <div>{markdown(activeContent)}</div>
            </div>
          ) : activeContent ? (
            markdown(activeContent)
          ) : message.streaming ? (
            <Typing />
          ) : null}
          {message.streaming && message.content && <span className="caret" />}
        </div>
        {editing && (
          <form className="editbox" onSubmit={saveEdit}>
            <textarea
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
            />
            <div>
              <button type="button" onClick={() => setEditing(false)}>Cancel</button>
              <button type="submit" disabled={!draft.trim() || disabled}>Send edit</button>
            </div>
          </form>
        )}

        {message.content && !message.error && (
          <div className="message-meta">
            <span><Clock3 size={11} /> {time}</span>
            {!isUser && messageTokens > 0 && <span>{messageTokens.toLocaleString()} tokens</span>}
            {!isUser && totalAvailable > 0 && <span>{totalAvailable.toLocaleString()} left</span>}
            {isUser && variants.length > 1 && <span>{variants.length - 1} edit{variants.length > 2 ? "s" : ""}</span>}
          </div>
        )}

        {message.content && !message.error && !message.streaming && (
          <div className="message-actions">
            <button className="action-icon" onClick={copy} title="Copy message" aria-label="Copy message">
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            {canEdit && (
              <button
                className="action-icon"
                onClick={() => {
                  setDraft(activeContent || variants[variants.length - 1] || message.content || "");
                  setEditing(true);
                }}
                title="Edit message"
                aria-label="Edit message"
              >
                <Pencil size={14} />
              </button>
            )}
            {isUser && variants.length > 1 && (
              <div className="variant-switch" aria-label="Question versions">
                {variants.map((_, index) => (
                  <button
                    key={`${message._id}-switch-${index}`}
                    className={index === activeVariant ? "active" : ""}
                    type="button"
                    onClick={() => onSelectVariant?.(message._id, index)}
                    title={`Show version ${index + 1}`}
                    aria-label={`Show version ${index + 1}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            )}
            {!isUser && (
              <button className="action-icon" onClick={() => setShareOpen(true)} title="Share" aria-label="Share message">
                <Zap size={14} />
              </button>
            )}
          </div>
        )}

        {!isUser && shareOpen && (
          <div className="share-popover">
            <BrandGlyph size={15} />
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
  const prismLanguage = codeLanguage(language);
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
        <span>{prismLanguage}</span>
        <button onClick={copyCode} aria-label="Copy code">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <Highlight theme={themes.oneDark} code={code} language={prismLanguage}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={className} style={style}>
            <code>
              {tokens.map((line, lineIndex) => (
                <span
                  key={lineIndex}
                  {...getLineProps({ line })}
                  className="code-line"
                >
                  {line.map((token, tokenIndex) => (
                    <span
                      key={tokenIndex}
                      {...getTokenProps({ token })}
                    />
                  ))}
                </span>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
}

function ModelPicker({ model, setModel }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!pickerRef.current?.contains(e.target)) setOpen(false);
    };
    const key = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  const short = model.split("/").pop().replace(/:free$/i, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <div className={`composer-model ${open ? "open" : ""}`} ref={pickerRef}>
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
  accent,
  setAccent,
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
        <section>
          <label>Accent color</label>
          <div className="accents">
            {ACCENTS.map(([id, name, color]) => (
              <button
                key={id}
                className={accent === id ? "selected" : ""}
                onClick={() => setAccent(id)}
                title={name}
                aria-label={name}
              >
                <i style={{ background: color }} />
                <span>{name}</span>
                {accent === id && <Check size={13} />}
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
