import React, { useEffect, useRef, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import * as api from '../../services/api';
import T from '../../i18n/T';
import './Home.css';

const DAYS_OPTIONS = [7, 30];

const EMPTY_TOTALS = {
  knowledge_views: 0,
  music_plays: 0,
  game_views: 0,
  posts_liked: 0,
};

const EMOJI_FOR_TYPE = {
  knowledge: '📚',
  music: '🎵',
  game: '🎮',
  post: '📝',
};

const TYPE_LABEL = {
  knowledge: 'bài viết',
  music: 'bài hát',
  game: 'trò chơi',
  post: 'bài đăng',
};

const EVENT_LABEL = {
  view: 'đã đọc',
  play: 'đã nghe',
  like: 'đã thích',
};

// Translation keys for the "Bạn X · time ago" small line under each
// recent activity entry. Using dedicated keys (instead of the <T>
// hash-of-template approach) because the {action} placeholder is
// resolved per event_type at render time.
const EVENT_KEY = {
  view: 'home.event.view',  // "Bạn đã đọc · {time}"
  play: 'home.event.play',  // "Bạn đã nghe · {time}"
  like: 'home.event.like',  // "Bạn đã thích · {time}"
};

function Home({ onNavigate }) {
  const { t } = useTranslation();
  const [days, setDays] = useState(7);
  const [insights, setInsights] = useState({
    totals: EMPTY_TOTALS,
    daily: [],
    top_categories: [],
    recent_articles: [],
    streak_days: 0,
  });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Stash the load function in a ref so the focus/visibility listener
  // can call the latest version (with current `days`) without needing
  // to be re-bound each render.
  const loadRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Two cheap parallel calls; both endpoints read from the same
        // user_activity table so there's no point in joining.
        const [ins, act] = await Promise.all([
          api.fetchMyInsights(days),
          api.fetchRecentActivity(6),
        ]);
        if (cancelled) return;
        setInsights(ins || { totals: EMPTY_TOTALS, daily: [], top_categories: [], recent_articles: [], streak_days: 0 });
        setRecent(Array.isArray(act) ? act : []);
      } catch (err) {
        if (cancelled) return;
        console.error('Error loading dashboard:', err);
        setError('Không tải được dữ liệu. Vui lòng thử lại.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadRef.current = load;
    load();
    return () => { cancelled = true; };
  }, [days]);

  // Re-fetch when the user comes back to this tab after reacting
  // or commenting in another (Knowledge/Feed) tab. Without this, the
  // stat cards and "Bạn đã đọc gần đây" list stay stale until the
  // user manually switches the days-toggle. We listen on:
  //   - window 'focus'  → tab switch back
  //   - document 'visibilitychange' → unmounted tab coming back
  //     (Safari fires this rather than focus)
  //   - 'pageshow' with persisted=true → bfcache restore
  // The fetch is best-effort; failures fall through silently and the
  // existing state stays visible.
  useEffect(() => {
    const refetch = () => {
      loadRef.current?.();
    };
    window.addEventListener('focus', refetch);
    document.addEventListener('visibilitychange', refetch);
    window.addEventListener('pageshow', refetch);
    return () => {
      window.removeEventListener('focus', refetch);
      document.removeEventListener('visibilitychange', refetch);
      window.removeEventListener('pageshow', refetch);
    };
  }, []);

  // Trigger a file download for the user's insights in `fmt`
  // ('csv' or 'json'). We disable both export buttons while in
  // flight so a double-click doesn't fire two downloads. The BE
  // sets Content-Disposition so the browser saves straight to disk;
  // we just unwrap the blob and click a synthesized <a>.
  const onExport = async (fmt) => {
    if (exporting) return;
    setExporting(true);
    try {
      await api.exportMyInsights(days, fmt);
    } catch (err) {
      console.warn('[Home] export failed', err);
    } finally {
      setExporting(false);
    }
  };

  // Daily chart data — the BE already zero-fills missing days, so
  // the only transform needed is shortening the date label for the
  // x-axis to "07/10" so 7 points fit on mobile without rotation.
  const chartData = insights.daily.map((d) => ({
    ...d,
    label: d.date.slice(5),  // "07-10"
  }));

  // Decide between "empty" and "has-data" — empty = all zeros AND
  // no recent activity. The two render differently because the
  // empty case wants quick-link buttons to content, while the
  // populated case wants the stat cards front and center.
  const hasActivity =
    Object.values(insights.totals).some((v) => v > 0) ||
    insights.recent_articles.length > 0 ||
    insights.streak_days > 0;

  return (
    <div className="home-page">
      <header className="home-header">
        <div>
          <h1 className="home-title">🏠 <T>Trang chủ</T></h1>
          <p className="home-subtitle">
            {loading ? (
              <T>Đang tải...</T>
            ) : hasActivity ? (
              // Interpolation: t() renders the {n} placeholder from
              // the English template "You're on a {n}-day streak!
              // Keep going." `<T>` would re-hash the resolved string
              // each render, which never matches a single JSON entry,
              // so we bypass the hash for this one and let i18next
              // interpolate directly.
              <span>
                {t('home.streak', {
                  n: insights.streak_days,
                  defaultValue: `Bạn đang có chuỗi ${insights.streak_days} ngày liên tiếp! Hãy tiếp tục nhé.`,
                })}
              </span>
            ) : (
              <T>Khám phá nội dung để bắt đầu ghi dấu hoạt động của bạn.</T>
            )}
          </p>
        </div>
        <div className="home-days-toggle" role="tablist">
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              role="tab"
              aria-selected={days === d}
              className={days === d ? 'active' : ''}
              onClick={() => setDays(d)}
            >
              {d} <T>ngày</T>
            </button>
          ))}
        </div>
        <div className="home-export-actions">
          <button
            type="button"
            className="home-export-btn"
            onClick={() => onExport('csv')}
            disabled={exporting}
            title={<T>Tải file CSV</T>}
          >
            ⬇️ CSV
          </button>
          <button
            type="button"
            className="home-export-btn"
            onClick={() => onExport('json')}
            disabled={exporting}
            title={<T>Tải file JSON</T>}
          >
            ⬇️ JSON
          </button>
        </div>
      </header>

      {error && <p className="home-error">⚠️ {error}</p>}

      {/* 4 stat cards. Skeleton placeholders during initial load so
          the layout doesn't jump when data arrives. */}
      <section className="home-stats">
        <StatCard icon="📚" label={<T>Bài viết đã đọc</T>} value={insights.totals.knowledge_views} loading={loading} />
        <StatCard icon="🎵" label={<T>Bài hát đã nghe</T>} value={insights.totals.music_plays} loading={loading} />
        <StatCard icon="🎮" label={<T>Trò chơi đã xem</T>} value={insights.totals.game_views} loading={loading} />
        <StatCard icon="❤️" label={<T>Bài đăng đã thích</T>} value={insights.totals.posts_liked} loading={loading} />
      </section>

      {/* Line chart of activity over the period. Render the chart
          container unconditionally so Recharts has a stable parent
          to measure — we just feed it empty data when loading. */}
      <section className="home-chart-card">
        <h2><T>Hoạt động {days} ngày gần nhất</T></h2>
        <div className="home-chart-wrapper">
          {chartData.length === 0 ? (
            <div className="home-chart-empty"><T>Chưa có dữ liệu</T></div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="knowledge" name={t('legend.knowledge', { defaultValue: 'Bài viết' })} stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="music" name={t('legend.music', { defaultValue: 'Nhạc' })} stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="game" name={t('legend.game', { defaultValue: 'Game' })} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="home-bottom-grid">
        {/* Left: recent articles the user has touched */}
        <div className="home-card">
          <h2><T>Bạn đã đọc gần đây</T></h2>
          {loading ? (
            <Skeleton lines={3} />
          ) : insights.recent_articles.length === 0 ? (
            <p className="home-empty-text">
              <T>Chưa có bài viết nào. Hãy mở </T>
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate?.('knowledge'); }}><T>Knowledge</T></a>
              <T> để bắt đầu.</T>
            </p>
          ) : (
            <ul className="home-recent-list">
              {insights.recent_articles.map((art) => (
                <li key={art.id}>
                  <span className="home-recent-icon">📝</span>
                  <div className="home-recent-meta">
                    <strong>{art.title}</strong>
                    <small>{art.category} · {art.author}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right: recent raw activity events (mixed types) */}
        <div className="home-card">
          <h2><T>Hoạt động gần đây</T></h2>
          {loading ? (
            <Skeleton lines={4} />
          ) : recent.length === 0 ? (
            <p className="home-empty-text"><T>Chưa có hoạt động nào.</T></p>
          ) : (
            <ul className="home-recent-list">
              {recent.map((r) => (
                <li key={r.id}>
                  <span className="home-recent-icon">{EMOJI_FOR_TYPE[r.content_type] || '•'}</span>
                  <div className="home-recent-meta">
                    <strong>{r.title || TYPE_LABEL[r.content_type] || r.content_type}</strong>
                    <small>
                      {t(EVENT_KEY[r.event_type] || 'home.event.unknown', {
                        time: formatRelative(r.created_at),
                        defaultValue: `Bạn ${EVENT_LABEL[r.event_type] || r.event_type} · ${formatRelative(r.created_at)}`,
                      })}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Top categories chips — only show if there are any. Empty
          users don't need a "no categories" section cluttering the UI. */}
      {!loading && insights.top_categories.length > 0 && (
        <section className="home-card home-top-cats">
          <h2><T>Chủ đề bạn quan tâm</T></h2>
          <div className="home-cat-chips">
            {insights.top_categories.map(([cat, count]) => (
              <span key={cat} className="home-chip">
                {cat} <small>· {count}</small>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Quick links for empty state. Visible only when the user has
          done nothing yet — the four stat cards above already
          guide the populated case. */}
      {!loading && !hasActivity && (
        <section className="home-quick-links">
          <h2><T>Bắt đầu từ đâu?</T></h2>
          <div className="home-quick-grid">
            <button onClick={() => onNavigate?.('knowledge')}>📚 <T>Đọc bài</T></button>
            <button onClick={() => onNavigate?.('music')}>🎵 <T>Nghe nhạc</T></button>
            <button onClick={() => onNavigate?.('games')}>🎮 <T>Chơi game</T></button>
            <button onClick={() => onNavigate?.('feed')}>📰 <T>Xem bảng tin</T></button>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, loading }) {
  return (
    <div className="home-stat-card">
      <span className="home-stat-icon">{icon}</span>
      <div>
        {loading ? (
          <div className="home-stat-skel" />
        ) : (
          <div className="home-stat-value">{value}</div>
        )}
        <div className="home-stat-label">{label}</div>
      </div>
    </div>
  );
}

function Skeleton({ lines }) {
  return (
    <div className="home-skel-list">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="home-skel-line" />
      ))}
    </div>
  );
}

function formatRelative(iso) {
  // Best-effort relative time. The server gives us ISO with no Z;
  // we treat it as local-naive (the rest of the app also writes
  // datetime.utcnow without TZ). For an MVP this is good enough —
  // production should switch to timezone-aware datetimes server-side.
  // Returns a Vietnamese-formatted string directly because the only
  // caller composes it into another translation key's {time} slot.
  try {
    const t = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'));
    const diff = Math.floor((Date.now() - t.getTime()) / 1000);
    if (diff < 60) return 'vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  } catch {
    return iso;
  }
}

export default Home;
