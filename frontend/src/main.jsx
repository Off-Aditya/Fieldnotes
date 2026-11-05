import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  Compass,
  FileText,
  FlaskConical,
  Globe2,
  Leaf,
  LockKeyhole,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Stars,
  X,
  CircleHelp,
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  LoaderCircle,
  Eye,
  History,
  Trash2,
  Sun,
  Moon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const HISTORY_KEY = "fieldnotes-research-history";

const topics = [
  {
    tag: "HISTORY",
    tone: "sage",
    title: "The many lives of the Silk Road",
    detail: "Trade, migration, and the exchange of ideas across centuries.",
    time: "12 min read",
  },
  {
    tag: "CULTURE",
    tone: "terracotta",
    title: "Why do cities become ghost towns?",
    detail:
      "A comparative look at abandoned places and the forces behind them.",
    time: "8 sources",
  },
  {
    tag: "SCIENCE",
    tone: "lavender",
    title: "What can ocean sediments tell us?",
    detail: "Reading the past through the quiet archive beneath the sea.",
    time: "6 sources",
  },
  {
    tag: "TECHNOLOGY",
    tone: "forest",
    title: "Can a city be designed for heat?",
    detail: "How shade, building materials, and street layouts shape urban temperatures.",
    time: "Urban studies",
  },
  {
    tag: "ENVIRONMENT",
    tone: "moss",
    title: "Where does a river begin to recover?",
    detail: "Following restoration efforts from headwaters to crowded coastlines.",
    time: "Ecology",
  },
  {
    tag: "LANGUAGE",
    tone: "sand",
    title: "How do new words become everyday language?",
    detail: "Tracing the social lives of expressions as they spread and change.",
    time: "Linguistics",
  },
  {
    tag: "ARCHITECTURE",
    tone: "clay",
    title: "What makes old buildings worth keeping?",
    detail: "Weighing cultural memory, practical reuse, and the cost of preservation.",
    time: "8 sources",
  },
  {
    tag: "PSYCHOLOGY",
    tone: "plum",
    title: "Why do some memories feel so vivid?",
    detail: "What research says about emotion, detail, and the way memory changes.",
    time: "Research review",
  },
  {
    tag: "FOOD SYSTEMS",
    tone: "sage",
    title: "How did fermentation shape food cultures?",
    detail: "A look at preservation, place, and the traditions carried by microbes.",
    time: "Food history",
  },
];

const topicTones = ["sage", "terracotta", "lavender", "forest", "moss", "sand", "clay", "plum"];

function getTopicTone(topic) {
  if (topic.tone && topicTones.includes(topic.tone)) return topic.tone;
  const title = topic.title || topic.tag || "fieldnotes-topic";
  const stableHash = [...title].reduce((hash, character) => hash + character.charCodeAt(0), 0);
  return topicTones[stableHash % topicTones.length];
}

const stages = [
  [
    "search",
    "Search agent",
    "Finding recent sources and useful starting points.",
  ],
  [
    "reader",
    "Reader agent",
    "Selecting relevant URLs and extracting readable content.",
  ],
  [
    "writer",
    "Writer chain",
    "Synthesizing the findings into a structured report.",
  ],
  ["critic", "Critic chain", "Reviewing the report for strengths and gaps."],
];

function readHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("fieldnotes-theme");
    return saved === "dark" ? "dark" : "light";
  });
  const [topic, setTopic] = useState("");
  const [depth, setDepth] = useState("Deep dive");
  const [anonymous, setAnonymous] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState(null);
  const [menu, setMenu] = useState(false);
  const [history, setHistory] = useState(readHistory);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [showProcess, setShowProcess] = useState(false);
  const [job, setJob] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState(true);
  const pollingRef = useRef(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("fieldnotes-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(
    () => () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    },
    [],
  );

  function updateHistory(entry) {
    setHistory((current) => {
      const next = [entry, ...current.filter((item) => item.id !== entry.id)];
      return next.slice(0, 100);
    });
  }

  function newResearch() {
    setTopic("");
    setResult(null);
    setNotice("");
    setJob(null);
    setActiveHistoryId(null);
    setShowProcess(false);
    if (pollingRef.current) clearTimeout(pollingRef.current);
    document.getElementById("research")?.scrollIntoView({ behavior: "smooth" });
  }

  function openHistory(item) {
    if (pollingRef.current) clearTimeout(pollingRef.current);
    setActiveHistoryId(item.id);
    setTopic(item.topic);
    setResult(item.result);
    setNotice("Loaded saved research from this browser.");
    setJob(null);
    setBusy(false);
    setShowProcess(false);
    document.getElementById("research")?.scrollIntoView({ behavior: "smooth" });
  }

  function deleteHistory(id) {
    setHistory((current) => current.filter((item) => item.id !== id));
    if (activeHistoryId === id) {
      setActiveHistoryId(null);
      setResult(null);
      setTopic("");
      setNotice("");
    }
  }

  async function pollJob(jobId, historyId, query) {
    if (!jobId) {
      setBusy(false);
      setNotice("The backend did not return a research job ID. Please try again.");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/research/${jobId}`);
      if (response.status === 404) {
        throw new Error("This research job is no longer available. Start a new search.");
      }
      if (!response.ok) throw new Error("Could not read research status.");
      const data = await response.json();
      setJob(data);

      if (data.status === "completed" && data.result) {
        pollingRef.current = null;
        setResult(data.result);
        setBusy(false);
        setNotice("Research completed.");
        updateHistory({
          id: historyId,
          topic: query,
          result: data.result,
          createdAt: new Date().toISOString(),
          status: "completed",
        });
        return;
      }

      if (data.status === "failed") {
        pollingRef.current = null;
        setBusy(false);
        setNotice(data.error || "Research failed. Check the backend logs.");
        updateHistory({
          id: historyId,
          topic: query,
          result: null,
          createdAt: new Date().toISOString(),
          status: "failed",
          error: data.error || "Research failed.",
        });
        return;
      }

      pollingRef.current = setTimeout(
        () => pollJob(jobId, historyId, query),
        900,
      );
    } catch (error) {
      pollingRef.current = null;
      setBusy(false);
      setJob((current) => ({ ...current, status: "connection_lost" }));
      setNotice(error.message || "Lost connection to the research API. Check that the backend is running.");
      updateHistory({
        id: historyId,
        topic: query,
        result: null,
        createdAt: new Date().toISOString(),
        status: "failed",
        error: error.message || "Could not read research status.",
      });
    }
  }

  async function research(value = topic) {
    if (submittingRef.current || busy) return;
    const query = value.trim();
    if (!query) {
      setNotice("Add a question or topic to begin your research.");
      return;
    }

    if (pollingRef.current) clearTimeout(pollingRef.current);
    submittingRef.current = true;
    setTopic(query);
    setNotice("");
    setBusy(true);
    setResult(null);
    setShowProcess(true);
    setJob({
      status: "pending",
      current_stage: null,
      events: [],
      stages: Object.fromEntries(
        stages.map(([id]) => [id, { status: "pending", message: "Waiting to start." }]),
      ),
    });

    const historyId = crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setActiveHistoryId(historyId);
    updateHistory({
      id: historyId,
      topic: query,
      result: null,
      createdAt: new Date().toISOString(),
      status: "running",
    });

    try {
      const response = await fetch(`${API_URL}/api/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: query, depth, anonymous }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Could not start research.");
      }

      const data = await response.json();
      if (!data.job_id) throw new Error("The backend did not return a research job ID.");
      submittingRef.current = false;
      setJob((current) => ({ ...current, ...data }));
      pollJob(data.job_id, historyId, query);
    } catch (error) {
      submittingRef.current = false;
      setBusy(false);
      setJob((current) => ({ ...current, status: "failed", error: error.message }));
      setNotice(
        error.message ||
          "Research API not connected. Start the FastAPI backend.",
      );
      updateHistory({
        id: historyId,
        topic: query,
        result: null,
        createdAt: new Date().toISOString(),
        status: "failed",
        error: error.message || "API connection failed.",
      });
    }
  }

  const processEvents = job?.events || [];
  return (
    <div
      className={sidebarOpen ? "app-layout" : "app-layout sidebar-collapsed"}
    >
      <aside className="history-sidebar">
        <div className="sidebar-brand">
          <a className="brand" href="#" onClick={newResearch}>
            <span className="brandmark">
              <Leaf size={18} />
            </span>
            fieldnotes<span className="dot">.</span>
          </a>
          <button
            className="sidebar-icon"
            onClick={() => setSidebarOpen(false)}
            aria-label="Collapse history sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
        <button className="new-research" onClick={newResearch}>
          <Plus size={17} /> New research
        </button>
        <button
          className="history-label"
          onClick={() => setExpandedHistory(!expandedHistory)}
        >
          <History size={15} /> Research history{" "}
          <ChevronDown className={expandedHistory ? "" : "rotated"} size={14} />
        </button>
        {expandedHistory && (
          <div className="history-list">
            {history.length === 0 ? (
              <div className="empty-history">
                <MessageSquare size={19} />
                <p>Your research history will appear here.</p>
                <span>Saved in this browser only.</span>
              </div>
            ) : (
              history.map((item) => (
                <div
                  className={
                    activeHistoryId === item.id
                      ? "history-item active"
                      : "history-item"
                  }
                  key={item.id}
                >
                  <button
                    className="history-open"
                    onClick={() => openHistory(item)}
                  >
                    <span className="history-topic">{item.topic}</span>
                    <span className="history-date">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                  <button
                    className="history-delete"
                    onClick={() => deleteHistory(item.id)}
                    aria-label={`Delete ${item.topic}`}
                    title="Delete history"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <LockKeyhole size={15} />
            <span>History is stored locally in this browser.</span>
          </div>
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)}>Open history</button>
          )}
        </div>
      </aside>

      {!sidebarOpen && (
        <button
          className="reopen-sidebar"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open history sidebar"
        >
          <PanelLeftOpen size={18} />
        </button>
      )}

      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-history-button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle history"
          >
            <Menu size={18} />
          </button>
          <nav className={menu ? "nav open" : "nav"}>
            <a href="#how">How it works</a>
            <a href="#principles">Principles</a>
            <a href="#discover">Explore</a>
          </nav>
          <div className="topright">
            <span className="private">
              <i /> Private workspace
            </span>
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <a className="toplink" href="#research">
              Start researching <ArrowUpRight size={15} />
            </a>
          </div>
        </header>

        <main>
          <section className="hero">
            <div>
              <div className="eyebrow">
                <span /> A CALMER WAY TO INVESTIGATE
              </div>
              <h1>
                Curiosity deserves
                <br />
                <em>room to wander.</em>
              </h1>
              <p className="lead">
                A thoughtful research workspace for questions that deserve more
                than a quick search. Follow the evidence, explore the context,
                and find your own conclusions.
              </p>
              <div className="proof">
                <div className="avatars">
                  <span>R</span>
                  <span>↗</span>
                  <span>∴</span>
                </div>
                Made for the relentlessly curious
              </div>
            </div>
            <div className="heroart">
              <div className="orbit o1" />
              <div className="orbit o2" />
              <div className="sun" />
              <div className="stem s1" />
              <div className="stem s2" />
              <div className="stem s3" />
              <div className="leaf l1" />
              <div className="leaf l2" />
              <div className="leaf l3" />
              <div className="leaf l4" />
              <div className="artcaption">
                <span>01 / OPEN INQUIRY</span>
                <span>Observe · Connect · Understand</span>
              </div>
            </div>
          </section>

          <section className="research" id="research">
            <div className="cardtop">
              <span>
                <Sparkles size={15} /> YOUR NEXT QUESTION
              </span>
              <small>FIELDNOTE Nº 001</small>
            </div>
            <h2>What are you curious about?</h2>
            <p className="sub">
              Start with a question, a contradiction, or a thread you want to
              follow.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                research();
              }}
            >
              <label className="sr" htmlFor="topic">
                Research question
              </label>
              <div className="inputwrap">
                <Search size={19} />
                <input
                  id="topic"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="e.g. What can the Mahabharata tell us about ancient society?"
                />
                {topic && (
                  <button
                    type="button"
                    onClick={() => setTopic("")}
                    aria-label="Clear topic"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="options">
                <label>
                  Research depth
                  <span className="selectwrap">
                    <select
                      value={depth}
                      onChange={(event) => setDepth(event.target.value)}
                    >
                      <option>Quick overview</option>
                      <option>Deep dive</option>
                      <option>Academic review</option>
                    </select>
                    <ChevronDown size={14} />
                  </span>
                </label>
                <button className="submit" disabled={busy}>
                  {busy ? (
                    <>
                      <LoaderCircle className="spin" size={16} /> Researching…
                    </>
                  ) : (
                    <>
                      Begin research <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </form>
            <div className="privacyrow">
              <button
                className={anonymous ? "toggle on" : "toggle"}
                role="switch"
                aria-checked={anonymous}
                onClick={() => setAnonymous(!anonymous)}
              >
                <span />
              </button>
              <div>
                <strong>Explore anonymously</strong>
                <p>
                  History stays in this browser. Backend and third-party data
                  handling depend on your deployment.
                </p>
              </div>
              <LockKeyhole className="lock" size={17} />
            </div>

            <div className="research-actions">
              <button
                className="process-button"
                onClick={() => setShowProcess(!showProcess)}
              >
                <Eye size={16} />{" "}
                {showProcess ? "Hide behind the process" : "Behind the process"}
                <ChevronDown
                  className={showProcess ? "rotated" : ""}
                  size={15}
                />
              </button>
              {busy && (
                <span className="running-label">
                  <LoaderCircle className="spin" size={13} /> Agents are working
                </span>
              )}
            </div>

            {showProcess && (
              <div className="process-panel">
                <div className="process-heading">
                  <div>
                    <span className="live-dot" /> LIVE PIPELINE
                  </div>
                  <span>
                    {job?.status === "completed"
                      ? "COMPLETE"
                      : job?.status === "failed"
                        ? "FAILED"
                        : job?.status === "connection_lost"
                          ? "CONNECTION LOST"
                          : busy
                            ? "IN PROGRESS"
                            : "READY"}
                  </span>
                </div>
                {job?.job_id && (
                  <p className="job-id">Research ID: <code>{job.job_id}</code></p>
                )}
                <p className="process-intro">
                  Follow each stage as your research agents work through the
                  question.
                </p>
                <div className="process-steps">
                  {stages.map(([id, label, detail], index) => {
                    const stageState = job?.stages?.[id];
                    const complete = stageState
                      ? stageState.status === "completed"
                      : job?.status === "completed";
                    const active = stageState?.status === "running";
                    const failed = stageState?.status === "failed";
                    const stageMessage = stageState?.message;
                    return (
                      <div
                        className={
                          failed
                            ? "process-step failed"
                            : complete
                            ? "process-step complete"
                            : active
                              ? "process-step active"
                              : "process-step"
                        }
                        key={id}
                      >
                        <span className="process-step-icon">
                          {complete ? (
                            <Check size={15} />
                          ) : failed ? (
                            <X size={15} />
                          ) : active ? (
                            <LoaderCircle className="spin" size={15} />
                          ) : (
                            index + 1
                          )}
                        </span>
                        <div>
                          <strong>{label}</strong>
                          <p>{detail}</p>
                          {stageMessage && stageState?.status !== "pending" && (
                            <small>
                              {stageMessage}
                            </small>
                          )}
                        </div>
                        <span className="step-status">
                          {complete ? "DONE" : failed ? "FAILED" : active ? "RUNNING" : "WAITING"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {processEvents.length > 0 && (
                  <details className="event-log">
                    <summary>
                      Show activity log ({processEvents.length})
                    </summary>
                    {processEvents.map((event, index) => (
                      <p key={`${event.timestamp}-${index}`}>
                        <time>
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </time>
                        {event.message}
                      </p>
                    ))}
                  </details>
                )}
                {job?.error && <div className="notice">{job.error}</div>}
              </div>
            )}

            {notice && (
              <div
                className={
                  notice === "Research completed." ? "notice success" : "notice"
                }
                role="status"
              >
                {notice}
              </div>
            )}

            {result && (
              <div className="result">
                <div className="result-title">
                  <div>
                    <Check size={16} /> <span>Research complete</span>
                  </div>
                  <span className="result-topic">{result.topic || topic}</span>
                </div>
                <section className="result-section">
                  <h2>Research report</h2>
                  <ReactMarkdown>
                    {result.report || "No research report was returned."}
                  </ReactMarkdown>
                </section>
                <section className="result-section">
                  <h2>Critic review</h2>
                  <ReactMarkdown>
                    {result.feedback || "No critic feedback was returned."}
                  </ReactMarkdown>
                </section>
                <details>
                  <summary>Search results</summary>
                  <pre>{result.search_results || "No search results."}</pre>
                </details>
                <details>
                  <summary>Scraped source content</summary>
                  <pre>{result.scraped_content || "No scraped content."}</pre>
                </details>
              </div>
            )}
          </section>

          <section className="principles" id="principles">
            <div className="sectionhead">
              <div>
                <div className="eyebrow">
                  <span /> THE FIELDNOTES APPROACH
                </div>
                <h2>Depth over noise.</h2>
              </div>
              <p>
                Designed to support serious inquiry without making the process
                feel complicated.
              </p>
            </div>
            <div className="principlegrid">
              <article>
                <span className="picon sage">
                  <Compass size={20} />
                </span>
                <small>01</small>
                <h3>Follow the thread</h3>
                <p>
                  Move from a broad question to the sources, details, and
                  connections that matter.
                </p>
              </article>
              <article>
                <span className="picon peach">
                  <BookOpen size={20} />
                </span>
                <small>02</small>
                <h3>Evidence, not noise</h3>
                <p>
                  Bring findings together in a structured report with source
                  links to revisit.
                </p>
              </article>
              <article>
                <span className="picon lilac">
                  <ShieldCheck size={20} />
                </span>
                <small>03</small>
                <h3>Room to think freely</h3>
                <p>
                  Explore unusual questions without needing to perform for a
                  public audience.
                </p>
              </article>
            </div>
          </section>

          <section className="workflow" id="how">
            <div className="workflowcopy">
              <div className="eyebrow">
                <span /> A SMALL TEAM OF THINKERS
              </div>
              <h2>
                One question.
                <br />
                <em>Multiple perspectives.</em>
              </h2>
              <p>
                Behind the calm interface, a coordinated research workflow
                searches, reads, synthesizes, and reviews. You get a starting
                point for thinking—not a substitute for your own judgment.
              </p>
              <a href="#research">
                Bring a question <ArrowRight size={15} />
              </a>
            </div>
            <div className="steps">
              <div>
                <span>
                  <Globe2 size={19} />
                </span>
                <section>
                  <h3>01 · Search</h3>
                  <p>Discover relevant sources and starting points.</p>
                </section>
                <small>DISCOVER</small>
              </div>
              <div>
                <span>
                  <FileText size={19} />
                </span>
                <section>
                  <h3>02 · Read</h3>
                  <p>Extract useful context from selected pages.</p>
                </section>
                <small>GATHER</small>
              </div>
              <div>
                <span>
                  <FlaskConical size={19} />
                </span>
                <section>
                  <h3>03 · Synthesize</h3>
                  <p>Organize findings into a readable report.</p>
                </section>
                <small>CONNECT</small>
              </div>
              <div>
                <span>
                  <CircleHelp size={19} />
                </span>
                <section>
                  <h3>04 · Critique</h3>
                  <p>Surface gaps, weak claims, and next questions.</p>
                </section>
                <small>REFINE</small>
              </div>
            </div>
          </section>

          <section className="discover" id="discover">
            <div className="sectionhead">
              <div>
                <div className="eyebrow">
                  <span /> A PLACE TO BEGIN
                </div>
                <h2>Questions worth following.</h2>
              </div>
              <span className="curated">
                <Stars size={15} /> A few starting points
              </span>
            </div>
            <div className="topicgrid">
              {topics.map((item, index) => (
                <article className="topiccard" key={item.title}>
                  <div className={`topicart tone-${getTopicTone(item)}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <ArrowUpRight size={18} />
                  </div>
                  <div className="topiccontent">
                    <small>{item.tag}</small>
                    <h3>{item.title}</h3>
                    <p>{item.detail}</p>
                    <div className="topicmeta">
                      <span>
                        <Clock3 size={13} />
                        {item.time}
                      </span>
                      <button
                        onClick={() => {
                          setTopic(item.title);
                          document
                            .getElementById("research")
                            ?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        Explore topic <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="cta">
            <span className="ctamark">
              <Leaf size={22} />
            </span>
            <div>
              <h2>Stay curious. Stay considered.</h2>
              <p>
                The best research begins with a question you can't quite leave
                alone.
              </p>
            </div>
            <a href="#research">
              Start a fieldnote <ArrowUpRight size={16} />
            </a>
          </section>
        </main>
        <footer>
          <a className="brand" href="#">
            <span className="brandmark">
              <Leaf size={16} />
            </span>
            fieldnotes<span className="dot">.</span>
          </a>
          <span>Made for thoughtful inquiry.</span>
          <span className="footright">A quiet corner of the internet ✳</span>
        </footer>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
