import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
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

function Home({ onNavigate }) {
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
    load();
    return () => { cancelled = true; };
  }, [days]);

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
          <h1 className="home-title">🏠 Trang chủ</h1>
          <p className="home-subtitle">
            {loading
              ? 'Đang tải...'
              : hasActivity
                ? `Bạn đang có chuỗi ${insights.streak_days} ngày liên tiếp! Hãy tiếp tục nhé.`
                : 'Khám phá nội dung để bắt đầu ghi dấu hoạt động của bạn.'}
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
              {d} ngày
            </button>
          ))}
        </div>
      </header>

      {error && <p className="home-error">⚠️ {error}</p>}

      {/* 4 stat cards. Skeleton placeholders during initial load so
          the layout doesn't jump when data arrives. */}
      <section className="home-stats">
        <StatCard
          icon="📚"
          label="Bài viết đã đọc"
          value={insights.totals.knowledge_views}
          loading={loading}
        />
        <StatCard
          icon="🎵"
          label="Bài hát đã nghe"
          value={insights.totals.music_plays}
          loading={loading}
        />
        <StatCard
          icon="🎮"
          label="Trò chơi đã xem"
          value={insights.totals.game_views}
          loading={loading}
        />
        <StatCard
          icon="❤️"
          label="Bài đăng đã thích"
          value={insights.totals.posts_liked}
          loading={loading}
        />
      </section>

      {/* Line chart of activity over the period. Render the chart
          container unconditionally so Recharts has a stable parent
          to measure — we just feed it empty data when loading. */}
      <section className="home-chart-card">
        <h2>Hoạt động {days} ngày gần nhất</h2>
        <div className="home-chart-wrapper">
          {chartData.length === 0 ? (
            <div className="home-chart-empty">Chưa có dữ liệu</div>
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
                <Line
                  type="monotone"
                  dataKey="knowledge"
                  name="Bài viết"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="music"
                  name="Nhạc"
                  stroke="#ec4899"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="game"
                  name="Game"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="home-bottom-grid">
        {/* Left: recent articles the user has touched */}
        <div className="home-card">
          <h2>Bạn đã đọc gần đây</h2>
          {loading ? (
            <Skeleton lines={3} />
          ) : insights.recent_articles.length === 0 ? (
            <p className="home-empty-text">
              Chưa có bài viết nào. Hãy mở <a href="#" onClick={(e) => { e.preventDefault(); onNavigate?.('knowledge'); }}>Knowledge</a> để bắt đầu.
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
          <h2>Hoạt động gần đây</h2>
          {loading ? (
            <Skeleton lines={4} />
          ) : recent.length === 0 ? (
            <p className="home-empty-text">Chưa có hoạt động nào.</p>
          ) : (
            <ul className="home-recent-list">
              {recent.map((r) => (
                <li key={r.id}>
                  <span className="home-recent-icon">{EMOJI_FOR_TYPE[r.content_type] || '•'}</span>
                  <div className="home-recent-meta">
                    <strong>{r.title || TYPE_LABEL[r.content_type] || r.content_type}</strong>
                    <small>
                      Bạn {EVENT_LABEL[r.event_type] || r.event_type}{' '}
                      · {formatRelative(r.created_at)}
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
          <h2>Chủ đề bạn quan tâm</h2>
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
          <h2>Bắt đầu từ đâu?</h2>
          <div className="home-quick-grid">
            <button onClick={() => onNavigate?.('knowledge')}>📚 Đọc bài</button>
            <button onClick={() => onNavigate?.('music')}>🎵 Nghe nhạc</button>
            <button onClick={() => onNavigate?.('games')}>🎮 Chơi game</button>
            <button onClick={() => onNavigate?.('feed')}>📰 Xem bảng tin</button>
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
  // Best-effort relative time in Vietnamese. The server gives us
  // ISO with no Z; we treat it as local-naive (the rest of the app
  // also writes datetime.utcnow without TZ). For an MVP this is
  // good enough — production should switch to timezone-aware
  // datetimes server-side.
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
