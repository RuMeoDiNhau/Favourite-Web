import React, { useEffect, useRef, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import * as api from '../../services/api';
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

// Translation keys for the small label that appears when a recent
// activity item has no `title` field (e.g. a removed article). Used
// as the fallback so we never render a raw `content_type` enum.
const TYPE_LABEL_KEY = {
  knowledge: 'home.typeLabel.knowledge',
  music: 'home.typeLabel.music',
  game: 'home.typeLabel.game',
  post: 'home.typeLabel.post',
};

// Translation keys for the "Bạn X · time ago" small line under each
// recent activity entry. Using dedicated keys (instead of the <T>
// hash-of-template approach) because the {time} placeholder is
// resolved per event_type at render time.
const EVENT_KEY = {
  view: 'home.event.view',
  play: 'home.event.play',
  like: 'home.event.like',
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
        setError(t('home.loadFail'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadRef.current = load;
    load();
    return () => { cancelled = true; };
  }, [days, t]);

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
          <h1 className="home-title">🏠 {t('home.title')}</h1>
          <p className="home-subtitle">
            {loading ? (
              t('common.loading')
            ) : hasActivity ? (
              <span>
                {t('home.streak', { n: insights.streak_days })}
              </span>
            ) : (
              t('home.noActivity')
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
              {d} {t('home.daysLabel')}
            </button>
          ))}
        </div>
        <div className="home-export-actions">
          <button
            type="button"
            className="home-export-btn"
            onClick={() => onExport('csv')}
            disabled={exporting}
            title={t('home.exportCsv')}
          >
            ⬇️ CSV
          </button>
          <button
            type="button"
            className="home-export-btn"
            onClick={() => onExport('json')}
            disabled={exporting}
            title={t('home.exportJson')}
          >
            ⬇️ JSON
          </button>
        </div>
      </header>

      {error && <p className="home-error">⚠️ {error}</p>}

      {/* 4 stat cards. Skeleton placeholders during initial load so
          the layout doesn't jump when data arrives. */}
      <section className="home-stats">
        <StatCard icon="📚" label={t('home.statArticles')} value={insights.totals.knowledge_views} loading={loading} />
        <StatCard icon="🎵" label={t('home.statSongs')} value={insights.totals.music_plays} loading={loading} />
        <StatCard icon="🎮" label={t('home.statGames')} value={insights.totals.game_views} loading={loading} />
        <StatCard icon="❤️" label={t('home.statPosts')} value={insights.totals.posts_liked} loading={loading} />
      </section>

      {/* Line chart of activity over the period. Render the chart
          container unconditionally so Recharts has a stable parent
          to measure — we just feed it empty data when loading. */}
      <section className="home-chart-card">
        <h2>{t('home.daysActivity', { days })}</h2>
        <div className="home-chart-wrapper">
          {chartData.length === 0 ? (
            <div className="home-chart-empty">{t('home.chartEmpty')}</div>
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
                <Line type="monotone" dataKey="knowledge" name={t('home.legend.knowledge')} stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="music" name={t('home.legend.music')} stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="game" name={t('home.legend.game')} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="home-bottom-grid">
        {/* Left: recent articles the user has touched */}
        <div className="home-card">
          <h2>{t('home.recentlyRead')}</h2>
          {loading ? (
            <Skeleton lines={3} />
          ) : insights.recent_articles.length === 0 ? (
            <p className="home-empty-text">
              {t('home.noRecentArticles')}
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate?.('knowledge'); }}>{t('nav.knowledge')}</a>
              {t('home.noRecentArticlesAfter')}
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
          <h2>{t('home.recentActivity')}</h2>
          {loading ? (
            <Skeleton lines={4} />
          ) : recent.length === 0 ? (
            <p className="home-empty-text">{t('home.noActivity')}</p>
          ) : (
            <ul className="home-recent-list">
              {recent.map((r) => (
                <li key={r.id}>
                  <span className="home-recent-icon">{EMOJI_FOR_TYPE[r.content_type] || '•'}</span>
                  <div className="home-recent-meta">
                    <strong>{r.title || (TYPE_LABEL_KEY[r.content_type] ? t(TYPE_LABEL_KEY[r.content_type]) : r.content_type)}</strong>
                    <small>
                      {t(EVENT_KEY[r.event_type] || 'home.event.unknown', {
                        time: formatRelative(r.created_at, t),
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
          <h2>{t('home.topCategories')}</h2>
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
          <h2>{t('home.whereToStart')}</h2>
          <div className="home-quick-grid">
            <button onClick={() => onNavigate?.('knowledge')}>📚 {t('home.quickRead')}</button>
            <button onClick={() => onNavigate?.('music')}>🎵 {t('home.quickListen')}</button>
            <button onClick={() => onNavigate?.('games')}>🎮 {t('home.quickPlay')}</button>
            <button onClick={() => onNavigate?.('feed')}>📰 {t('home.quickFeed')}</button>
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

function formatRelative(iso, t) {
  // Best-effort relative time. The server gives us ISO with no Z;
  // we treat it as local-naive (the rest of the app also writes
  // datetime.utcnow without TZ). For an MVP this is good enough —
  // production should switch to timezone-aware datetimes server-side.
  try {
    const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'));
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return t('time.justNow');
    if (diff < 3600) return t('time.minutesAgo', { n: Math.floor(diff / 60) });
    if (diff < 86400) return t('time.hoursAgo', { n: Math.floor(diff / 3600) });
    return t('time.daysAgo', { n: Math.floor(diff / 86400) });
  } catch {
    return iso;
  }
}

export default Home;