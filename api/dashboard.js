// api/dashboard.js
// Serves the analytics dashboard HTML
// Accessible at: https://illumine-tracker-uzls.vercel.app/api/dashboard

export const config = { runtime: 'edge' };

export default async function handler(req) {
  // Basic auth check
  const authHeader = req.headers.get('authorization');
  
  const DASHBOARD_USER = process.env.DASHBOARD_USER;
  const DASHBOARD_PASS = process.env.DASHBOARD_PASS;

  let authorized = false;

  if (authHeader && authHeader.startsWith('Basic ')) {
    const base64 = authHeader.slice(6);
    const decoded = atob(base64);
    const [user, pass] = decoded.split(':');
    if (user === DASHBOARD_USER && pass === DASHBOARD_PASS) {
      authorized = true;
    }
  }

  if (!authorized) {
    return new Response('Unauthorised', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Illumine Analytics"',
        'Content-Type': 'text/plain',
      },
    });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

  // Inject credentials server-side — never exposed in source
  const html = getDashboardHTML(SUPABASE_URL, SUPABASE_KEY);

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function getDashboardHTML(supabaseUrl, supabaseKey) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Analytics — Illumine Ads + Veritas Hire</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300&display=swap" rel="stylesheet">
<style>
  :root {
    --bg:#0a0a08; --surface:#111110; --border:#1e1e1b;
    --gold:#c9a84c; --gold-dim:#7a6330; --text:#e8e4d9;
    --muted:#6b6860; --green:#4caf7a; --red:#c96060;
    --blue:#6090c9; --illumine:#c9a84c; --veritas:#6090c9;
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--bg); color:var(--text); font-family:'DM Mono',monospace; font-size:13px; min-height:100vh; }
  header { border-bottom:1px solid var(--border); padding:20px 32px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; background:var(--bg); z-index:100; }
  .logo { font-family:'Fraunces',serif; font-size:18px; font-weight:300; color:var(--gold); letter-spacing:0.02em; }
  .logo span { color:var(--muted); font-size:12px; font-family:'DM Mono',monospace; margin-left:12px; }
  .header-right { display:flex; align-items:center; gap:16px; }
  .site-toggle { display:flex; border:1px solid var(--border); border-radius:4px; overflow:hidden; }
  .site-btn { background:none; border:none; color:var(--muted); padding:6px 14px; cursor:pointer; font-family:'DM Mono',monospace; font-size:11px; letter-spacing:0.05em; transition:all 0.15s; }
  .site-btn.active-illumine { background:rgba(201,168,76,0.12); color:var(--illumine); }
  .site-btn.active-veritas { background:rgba(96,144,201,0.12); color:var(--veritas); }
  .site-btn.active-both { background:rgba(201,168,76,0.08); color:var(--text); }
  .refresh-btn { background:none; border:1px solid var(--border); color:var(--muted); padding:6px 12px; border-radius:4px; cursor:pointer; font-family:'DM Mono',monospace; font-size:11px; transition:all 0.15s; }
  .refresh-btn:hover { border-color:var(--gold-dim); color:var(--gold); }
  .main { padding:28px 32px; max-width:1400px; }
  .tabs { display:flex; gap:0; border-bottom:1px solid var(--border); margin-bottom:28px; }
  .tab { background:none; border:none; border-bottom:2px solid transparent; color:var(--muted); padding:10px 20px; cursor:pointer; font-family:'DM Mono',monospace; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; transition:all 0.15s; margin-bottom:-1px; }
  .tab:hover { color:var(--text); }
  .tab.active { color:var(--gold); border-bottom-color:var(--gold); }
  .stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin-bottom:28px; }
  .stat-card { background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:18px 20px; }
  .stat-label { color:var(--muted); font-size:10px; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:8px; }
  .stat-value { font-family:'Fraunces',serif; font-size:28px; font-weight:300; color:var(--text); line-height:1; margin-bottom:4px; }
  .stat-sub { color:var(--muted); font-size:10px; }
  .section-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
  .section-grid.wide { grid-template-columns:2fr 1fr; }
  .panel { background:var(--surface); border:1px solid var(--border); border-radius:6px; overflow:hidden; }
  .panel-header { padding:14px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
  .panel-title { font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); }
  .panel-body { padding:0; }
  table { width:100%; border-collapse:collapse; }
  thead th { padding:10px 20px; text-align:left; font-size:9px; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); border-bottom:1px solid var(--border); font-weight:400; }
  tbody tr { border-bottom:1px solid var(--border); transition:background 0.1s; }
  tbody tr:last-child { border-bottom:none; }
  tbody tr:hover { background:rgba(255,255,255,0.02); }
  tbody td { padding:10px 20px; font-size:12px; }
  .site-pill { display:inline-block; padding:2px 7px; border-radius:3px; font-size:9px; letter-spacing:0.05em; text-transform:uppercase; }
  .pill-illumine { background:rgba(201,168,76,0.12); color:var(--illumine); }
  .pill-veritas { background:rgba(96,144,201,0.12); color:var(--veritas); }
  .bar-row { display:flex; align-items:center; padding:9px 20px; gap:12px; border-bottom:1px solid var(--border); }
  .bar-row:last-child { border-bottom:none; }
  .bar-label { width:110px; font-size:11px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex-shrink:0; }
  .bar-track { flex:1; height:4px; background:var(--border); border-radius:2px; }
  .bar-fill { height:4px; border-radius:2px; background:var(--gold); transition:width 0.6s ease; }
  .bar-fill.blue { background:var(--blue); }
  .bar-val { width:44px; text-align:right; font-size:11px; color:var(--muted); flex-shrink:0; }
  .funnel-row { padding:14px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:16px; }
  .funnel-row:last-child { border-bottom:none; }
  .funnel-step { color:var(--muted); font-size:10px; letter-spacing:0.08em; text-transform:uppercase; width:140px; flex-shrink:0; }
  .funnel-bar-wrap { flex:1; }
  .funnel-bar { height:20px; border-radius:3px; background:var(--gold); opacity:0.7; transition:width 0.7s ease; display:flex; align-items:center; padding-left:8px; }
  .funnel-bar span { font-size:10px; color:var(--bg); font-weight:500; white-space:nowrap; }
  .funnel-pct { width:44px; text-align:right; font-size:11px; color:var(--muted); flex-shrink:0; }
  .utm-builder { padding:20px; }
  .utm-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px; }
  label { display:block; font-size:9px; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); margin-bottom:5px; }
  input, select { width:100%; background:var(--bg); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:'DM Mono',monospace; font-size:12px; padding:8px 12px; outline:none; transition:border-color 0.15s; }
  input:focus, select:focus { border-color:var(--gold-dim); }
  select option { background:var(--surface); }
  .utm-output { background:var(--bg); border:1px solid var(--border); border-radius:4px; padding:12px; font-size:11px; color:var(--gold); word-break:break-all; margin-top:10px; min-height:44px; line-height:1.6; cursor:pointer; transition:border-color 0.15s; }
  .utm-output:hover { border-color:var(--gold-dim); }
  .copy-hint { font-size:9px; color:var(--muted); margin-top:6px; }
  .copy-hint.copied { color:var(--green); }
  .btn-generate { width:100%; background:rgba(201,168,76,0.1); border:1px solid var(--gold-dim); color:var(--gold); padding:10px; border-radius:4px; cursor:pointer; font-family:'DM Mono',monospace; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; transition:all 0.15s; margin-top:10px; }
  .btn-generate:hover { background:rgba(201,168,76,0.18); }
  .clarity-btn { display:flex; align-items:center; gap:8px; background:var(--bg); border:1px solid var(--border); border-radius:4px; color:var(--text); padding:10px 14px; font-family:'DM Mono',monospace; font-size:11px; text-decoration:none; letter-spacing:0.05em; transition:all 0.15s; }
  .clarity-btn:hover { border-color:var(--gold-dim); color:var(--gold); }
  .clarity-btn-icon { color:var(--gold); font-size:13px; flex-shrink:0; }
  .code-block { background:var(--bg); border:1px solid var(--border); border-radius:4px; padding:16px; font-size:11px; line-height:1.7; color:var(--text); white-space:pre-wrap; word-break:break-word; margin:0; }
  .code-block .comment { color:var(--muted); }
  .code-block .key { color:var(--blue); }
  .code-block .val { color:var(--gold); }
  .loading { padding:32px; text-align:center; color:var(--muted); font-size:11px; }
  .empty { padding:24px 20px; color:var(--muted); font-size:11px; font-style:italic; }
  .hidden { display:none !important; }
  @media(max-width:900px){.section-grid,.section-grid.wide{grid-template-columns:1fr}.main{padding:20px 16px}header{padding:16px}}
</style>
</head>
<body>
<header>
  <div class="logo">Analytics <span>Illumine Ads + Veritas Hire</span></div>
  <div class="header-right">
    <div class="site-toggle">
      <button class="site-btn active-both" onclick="setSite('both')">Both</button>
      <button class="site-btn" onclick="setSite('illumineads')">Illumine</button>
      <button class="site-btn" onclick="setSite('veritashire')">Veritas</button>
    </div>
    <button class="refresh-btn" onclick="loadData()">↻ Refresh</button>
  </div>
</header>
<div class="main">
  <div class="tabs">
    <button class="tab active" onclick="showTab('overview')">Overview</button>
    <button class="tab" onclick="showTab('sources')">Sources</button>
    <button class="tab" onclick="showTab('funnel')">Funnel</button>
    <button class="tab" onclick="showTab('pages')">Pages</button>
    <button class="tab" onclick="showTab('posts')">Posts</button>
    <button class="tab" onclick="showTab('clarity')">Heatmaps</button>
    <button class="tab" onclick="showTab('utm')">UTM Builder</button>
    <button class="tab" onclick="showTab('agent')">Agent Snippet</button>
  </div>

  <!-- OVERVIEW -->
  <div id="tab-overview">
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total Pageviews</div><div class="stat-value" id="stat-pageviews">—</div><div class="stat-sub">all time</div></div>
      <div class="stat-card"><div class="stat-label">Unique Sessions</div><div class="stat-value" id="stat-sessions">—</div><div class="stat-sub">all time</div></div>
      <div class="stat-card"><div class="stat-label">New Visitors</div><div class="stat-value" id="stat-new">—</div><div class="stat-sub">first visit</div></div>
      <div class="stat-card"><div class="stat-label">CTA Clicks</div><div class="stat-value" id="stat-cta">—</div><div class="stat-sub">all sites</div></div>
      <div class="stat-card"><div class="stat-label">Avg Scroll Depth</div><div class="stat-value" id="stat-scroll">—</div><div class="stat-sub">% of page</div></div>
      <div class="stat-card"><div class="stat-label">Avg Time on Page</div><div class="stat-value" id="stat-time">—</div><div class="stat-sub">seconds</div></div>
    </div>
    <div class="section-grid wide">
      <div class="panel">
        <div class="panel-header"><span class="panel-title">Recent Activity</span></div>
        <div class="panel-body"><table><thead><tr><th>Page</th><th>Site</th><th>Source</th><th>Device</th><th>Country</th><th>Time</th></tr></thead><tbody id="recent-table"><tr><td colspan="6" class="empty">Loading...</td></tr></tbody></table></div>
      </div>
      <div class="panel">
        <div class="panel-header"><span class="panel-title">Top Countries</span></div>
        <div class="panel-body" id="country-bars"><div class="loading">Loading...</div></div>
      </div>
    </div>
  </div>

  <!-- SOURCES -->
  <div id="tab-sources" class="hidden">
    <div class="section-grid">
      <div class="panel">
        <div class="panel-header"><span class="panel-title">Traffic by Source</span></div>
        <div class="panel-body" id="source-bars"><div class="loading">Loading...</div></div>
      </div>
      <div class="panel">
        <div class="panel-header"><span class="panel-title">Campaign Performance</span></div>
        <div class="panel-body"><table><thead><tr><th>Campaign</th><th>Source</th><th>Sessions</th><th>Avg Scroll</th></tr></thead><tbody id="campaign-table"><tr><td colspan="4" class="empty">Loading...</td></tr></tbody></table></div>
      </div>
    </div>
    <div class="panel" style="margin-top:16px">
      <div class="panel-header"><span class="panel-title">UTM Source × Medium Breakdown</span></div>
      <div class="panel-body"><table><thead><tr><th>Source</th><th>Medium</th><th>Campaign</th><th>Pageviews</th><th>Sessions</th><th>Avg Time (s)</th><th>Avg Scroll %</th></tr></thead><tbody id="utm-table"><tr><td colspan="7" class="empty">Loading...</td></tr></tbody></table></div>
    </div>
  </div>

  <!-- FUNNEL -->
  <div id="tab-funnel" class="hidden">
    <div class="section-grid">
      <div class="panel"><div class="panel-header"><span class="panel-title">Illumine Ads — Conversion Funnel</span></div><div class="panel-body" id="funnel-illumine"><div class="loading">Loading...</div></div></div>
      <div class="panel"><div class="panel-header"><span class="panel-title">Veritas Hire — Conversion Funnel</span></div><div class="panel-body" id="funnel-veritas"><div class="loading">Loading...</div></div></div>
    </div>
    <div class="panel" style="margin-top:16px">
      <div class="panel-header"><span class="panel-title">All CTA Clicks</span></div>
      <div class="panel-body"><table><thead><tr><th>CTA</th><th>Site</th><th>Location</th><th>Source</th><th>Campaign</th><th>Clicks</th></tr></thead><tbody id="cta-table"><tr><td colspan="6" class="empty">Loading...</td></tr></tbody></table></div>
    </div>
  </div>

  <!-- PAGES -->
  <div id="tab-pages" class="hidden">
    <div class="panel">
      <div class="panel-header"><span class="panel-title">Top Pages</span></div>
      <div class="panel-body"><table><thead><tr><th>Path</th><th>Site</th><th>Pageviews</th><th>Sessions</th><th>Avg Scroll %</th><th>Avg Time (s)</th></tr></thead><tbody id="pages-table"><tr><td colspan="6" class="empty">Loading...</td></tr></tbody></table></div>
    </div>
  </div>

  <!-- POSTS -->
  <div id="tab-posts" class="hidden">
    <div class="stats-grid" style="margin-bottom:28px">
      <div class="stat-card"><div class="stat-label">Total Post Clicks</div><div class="stat-value" id="stat-post-clicks">—</div><div class="stat-sub">via UTM links</div></div>
      <div class="stat-card"><div class="stat-label">LinkedIn Sessions</div><div class="stat-value" id="stat-li-sessions">—</div><div class="stat-sub">utm_source=linkedin</div></div>
      <div class="stat-card"><div class="stat-label">Instagram Sessions</div><div class="stat-value" id="stat-ig-sessions">—</div><div class="stat-sub">utm_source=instagram</div></div>
      <div class="stat-card"><div class="stat-label">Top Campaign</div><div class="stat-value" id="stat-top-campaign" style="font-size:16px;margin-top:4px">—</div><div class="stat-sub">most sessions</div></div>
    </div>
    <div class="section-grid wide" style="margin-bottom:16px">
      <div class="panel">
        <div class="panel-header"><span class="panel-title">Posts Performance — All Campaigns</span></div>
        <div class="panel-body"><table><thead><tr><th>Campaign</th><th>Platform</th><th>Week</th><th>Type</th><th>Sessions</th><th>Avg Scroll</th><th>CTA Clicks</th></tr></thead><tbody id="posts-table"><tr><td colspan="7" class="empty">Loading...</td></tr></tbody></table></div>
      </div>
      <div class="panel"><div class="panel-header"><span class="panel-title">Platform Breakdown</span></div><div class="panel-body" id="platform-bars"><div class="loading">Loading...</div></div></div>
    </div>
    <div class="section-grid" style="margin-bottom:16px">
      <div class="panel">
        <div class="panel-header"><span class="panel-title">Week Over Week</span></div>
        <div class="panel-body"><table><thead><tr><th>Week</th><th>Sessions</th><th>LinkedIn</th><th>Instagram</th><th>Top Campaign</th></tr></thead><tbody id="wow-table"><tr><td colspan="5" class="empty">Loading...</td></tr></tbody></table></div>
      </div>
      <div class="panel"><div class="panel-header"><span class="panel-title">Content Type Performance</span></div><div class="panel-body" id="content-type-bars"><div class="loading">Loading...</div></div></div>
    </div>
  </div>

  <!-- HEATMAPS -->
  <div id="tab-clarity" class="hidden">
    <div class="section-grid" style="margin-bottom:16px">
      <div class="panel">
        <div class="panel-header"><span class="panel-title">Illumine Ads — Clarity</span><span class="site-pill pill-illumine">x0pt7xa2q7</span></div>
        <div class="utm-builder">
          <p style="color:var(--muted);font-size:11px;line-height:1.7;margin-bottom:20px">Heatmaps, scroll maps, rage clicks, and session replays for illumineads.com.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
            <a href="https://clarity.microsoft.com/projects/view/x0pt7xa2q7/dashboard" target="_blank" class="clarity-btn"><span class="clarity-btn-icon">◈</span>Dashboard</a>
            <a href="https://clarity.microsoft.com/projects/view/x0pt7xa2q7/heatmaps" target="_blank" class="clarity-btn"><span class="clarity-btn-icon">▦</span>Heatmaps</a>
            <a href="https://clarity.microsoft.com/projects/view/x0pt7xa2q7/recordings" target="_blank" class="clarity-btn"><span class="clarity-btn-icon">▶</span>Recordings</a>
            <a href="https://clarity.microsoft.com/projects/view/x0pt7xa2q7/insights" target="_blank" class="clarity-btn"><span class="clarity-btn-icon">◎</span>Insights</a>
          </div>
          <div style="background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:14px">
            <div style="font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">What to look at first</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <div style="font-size:11px;color:var(--text);line-height:1.6"><span style="color:var(--gold)">Heatmaps →</span> Scroll depth on homepage. Are people reaching the ROAS table?</div>
              <div style="font-size:11px;color:var(--text);line-height:1.6"><span style="color:var(--gold)">Heatmaps →</span> Vault page click map. Which resources get attention but not conversions?</div>
              <div style="font-size:11px;color:var(--text);line-height:1.6"><span style="color:var(--gold)">Recordings →</span> Filter by Rage clicks to find friction on the apply form.</div>
            </div>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><span class="panel-title">Veritas Hire — Clarity</span><span class="site-pill pill-veritas">x0pv00x592</span></div>
        <div class="utm-builder">
          <p style="color:var(--muted);font-size:11px;line-height:1.7;margin-bottom:20px">Heatmaps, scroll maps, rage clicks, and session replays for veritashire.com.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
            <a href="https://clarity.microsoft.com/projects/view/x0pv00x592/dashboard" target="_blank" class="clarity-btn"><span class="clarity-btn-icon">◈</span>Dashboard</a>
            <a href="https://clarity.microsoft.com/projects/view/x0pv00x592/heatmaps" target="_blank" class="clarity-btn"><span class="clarity-btn-icon">▦</span>Heatmaps</a>
            <a href="https://clarity.microsoft.com/projects/view/x0pv00x592/recordings" target="_blank" class="clarity-btn"><span class="clarity-btn-icon">▶</span>Recordings</a>
            <a href="https://clarity.microsoft.com/projects/view/x0pv00x592/insights" target="_blank" class="clarity-btn"><span class="clarity-btn-icon">◎</span>Insights</a>
          </div>
          <div style="background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:14px">
            <div style="font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">What to look at first</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <div style="font-size:11px;color:var(--text);line-height:1.6"><span style="color:var(--blue)">Heatmaps →</span> Scroll map. Are people reaching pricing and the CTA?</div>
              <div style="font-size:11px;color:var(--text);line-height:1.6"><span style="color:var(--blue)">Recordings →</span> Filter by sessions that reached pricing but didn't click CTA.</div>
              <div style="font-size:11px;color:var(--text);line-height:1.6"><span style="color:var(--blue)">Insights →</span> Check if FAQ is being engaged or skipped.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- UTM BUILDER -->
  <div id="tab-utm" class="hidden">
    <div class="section-grid">
      <div class="panel">
        <div class="panel-header"><span class="panel-title">UTM Link Builder</span></div>
        <div class="utm-builder">
          <div class="utm-row">
            <div><label>Destination</label><select id="utm-site" onchange="buildUTM()"><option value="https://illumineads.com">illumineads.com</option><option value="https://illumineads.com/vault/">illumineads.com/vault/</option><option value="https://illumineads.com/apply/">illumineads.com/apply/</option><option value="https://veritashire.com">veritashire.com</option></select></div>
            <div><label>Platform (utm_source)</label><select id="utm-source" onchange="buildUTM()"><option value="linkedin">LinkedIn</option><option value="instagram">Instagram</option><option value="google">Google</option><option value="meta">Meta Ads</option><option value="email">Email</option></select></div>
          </div>
          <div class="utm-row">
            <div><label>Medium</label><select id="utm-medium" onchange="buildUTM()"><option value="social">social</option><option value="cpc">cpc</option><option value="email">email</option><option value="organic">organic</option></select></div>
            <div><label>Campaign Name</label><input type="text" id="utm-campaign" placeholder="e.g. vault-launch-june" oninput="buildUTM()"></div>
          </div>
          <div class="utm-row">
            <div><label>Content Type</label><select id="utm-content" onchange="buildUTM()"><option value="">— none —</option><option value="text">text</option><option value="carousel">carousel</option><option value="video">video</option><option value="reel">reel</option><option value="story">story</option><option value="document">document</option></select></div>
          </div>
          <div class="utm-output" id="utm-output" onclick="copyUTM()">Your tagged URL will appear here</div>
          <div class="copy-hint" id="copy-hint">Click URL to copy</div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><span class="panel-title">Quick Presets</span></div>
        <div class="utm-builder">
          <p style="color:var(--muted);font-size:11px;margin-bottom:16px;line-height:1.6">Common tagged links — click to load.</p>
          <div id="presets"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- AGENT SNIPPET -->
  <div id="tab-agent" class="hidden">
    <div class="section-grid">
      <div class="panel">
        <div class="panel-header"><span class="panel-title">Buffer Agent — System Prompt Addition</span></div>
        <div class="utm-builder">
          <p style="color:var(--muted);font-size:11px;margin-bottom:16px;line-height:1.6">Add this block to your Buffer Claude agent's system prompt.</p>
          <pre class="code-block"><span class="comment">## UTM Tagging — Required for every post</span>

Before scheduling any post to Buffer, construct a UTM-tagged URL:

<span class="key">Base URLs:</span>
<span class="val">- Illumine Ads: https://illumineads.com</span>
<span class="val">- Vault page:   https://illumineads.com/vault/</span>
<span class="val">- Apply page:   https://illumineads.com/apply/</span>
<span class="val">- Veritas Hire: https://veritashire.com</span>

<span class="key">UTM Parameters:</span>
<span class="val">utm_source</span>   = linkedin | instagram | twitter
<span class="val">utm_medium</span>   = social
<span class="val">utm_campaign</span> = [slug of post topic, lowercase, hyphens]
<span class="val">utm_content</span>  = text | carousel | video | reel | story | document
<span class="val">utm_term</span>     = week-[ISO week number]-[year]

<span class="key">Format:</span>
{base}?utm_source={source}&utm_medium=social
&utm_campaign={slug}&utm_content={type}&utm_term=week-{nn}-{yyyy}

<span class="key">Instagram:</span>
Output tagged URL as: "Bio link to update: {url}"</pre>
        </div>
      </div>
    </div>
  </div>

</div>

<script>
var SUPABASE_URL = '${supabaseUrl}';
var SUPABASE_KEY = '${supabaseKey}';
var currentSite = 'both';
var currentTab  = 'overview';
var TABS = ['overview','sources','funnel','pages','posts','clarity','utm','agent'];

function showTab(tab) {
  TABS.forEach(function(t) {
    document.getElementById('tab-' + t).classList.toggle('hidden', t !== tab);
  });
  document.querySelectorAll('.tab').forEach(function(btn, i) {
    btn.classList.toggle('active', TABS[i] === tab);
  });
  currentTab = tab;
}

function setSite(site) {
  currentSite = site;
  document.querySelectorAll('.site-btn').forEach(function(btn) { btn.className = 'site-btn'; });
  var idx = ['both','illumineads','veritashire'].indexOf(site);
  var cls = ['active-both','active-illumine','active-veritas'][idx];
  document.querySelectorAll('.site-btn')[idx].classList.add(cls);
  loadData();
}

async function query(table, select, filters) {
  var url = SUPABASE_URL + '/rest/v1/' + table + '?select=' + encodeURIComponent(select);
  if (filters) url += '&' + filters;
  url += '&limit=500&order=created_at.desc';
  var res = await fetch(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } });
  if (!res.ok) throw new Error('Supabase error: ' + res.status);
  return res.json();
}

function siteFilter() { return currentSite === 'both' ? '' : 'site=eq.' + currentSite; }

function avg(arr) { return arr.reduce(function(a,b){return a+b;},0)/arr.length; }
function countBy(arr, key) { var out={}; arr.forEach(function(item){var v=item[key]||'Unknown';out[v]=(out[v]||0)+1;}); return Object.fromEntries(Object.entries(out).sort(function(a,b){return b[1]-a[1];})); }
function timeAgo(ts) { var s=Math.floor((Date.now()-new Date(ts))/1000); if(s<60) return s+'s ago'; if(s<3600) return Math.floor(s/60)+'m ago'; if(s<86400) return Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago'; }

async function loadData() {
  try {
    var filter = siteFilter();
    var events = await query('page_events','id,created_at,site,page_path,utm_source,utm_medium,utm_campaign,utm_content,utm_term,device_type,country,time_on_page,scroll_depth,session_id,is_new_visitor,referrer',filter);
    var ctas   = await query('cta_clicks','id,created_at,site,page_path,cta_label,cta_location,utm_source,utm_campaign,session_id',filter);
    renderOverview(events, ctas);
    renderSources(events);
    renderFunnel(events, ctas);
    renderPages(events);
    renderPosts(events, ctas);
  } catch(e) { console.error('Load error:', e); }
}

function renderOverview(events, ctas) {
  var sessions=new Set(events.map(function(e){return e.session_id;}));
  var newV=events.filter(function(e){return e.is_new_visitor;}).length;
  var scrolls=events.filter(function(e){return e.scroll_depth;}).map(function(e){return e.scroll_depth;});
  var times=events.filter(function(e){return e.time_on_page;}).map(function(e){return e.time_on_page;});
  document.getElementById('stat-pageviews').textContent=events.length.toLocaleString();
  document.getElementById('stat-sessions').textContent=sessions.size.toLocaleString();
  document.getElementById('stat-new').textContent=newV.toLocaleString();
  document.getElementById('stat-cta').textContent=ctas.length.toLocaleString();
  document.getElementById('stat-scroll').textContent=scrolls.length?Math.round(avg(scrolls))+'%':'—';
  document.getElementById('stat-time').textContent=times.length?Math.round(avg(times))+'s':'—';
  var recent=events.slice(0,20);
  document.getElementById('recent-table').innerHTML=recent.length?recent.map(function(e){
    return '<tr><td>'+(e.page_path||'/')+'</td><td><span class="site-pill '+(e.site==='illumineads'?'pill-illumine':'pill-veritas')+'">'+e.site+'</span></td><td>'+(e.utm_source||'direct')+'</td><td>'+(e.device_type||'—')+'</td><td>'+(e.country||'—')+'</td><td>'+timeAgo(e.created_at)+'</td></tr>';
  }).join(''):'<tr><td colspan="6" class="empty">No data yet</td></tr>';
  var countries=countBy(events,'country');
  var maxC=Math.max.apply(null,Object.values(countries))||1;
  document.getElementById('country-bars').innerHTML=Object.entries(countries).slice(0,10).map(function(p){
    return '<div class="bar-row"><div class="bar-label">'+(p[0]||'Unknown')+'</div><div class="bar-track"><div class="bar-fill" style="width:'+Math.round(p[1]/maxC*100)+'%"></div></div><div class="bar-val">'+p[1]+'</div></div>';
  }).join('')||'<div class="empty">No geo data yet</div>';
}

function renderSources(events) {
  var sources=countBy(events.map(function(e){return{key:e.utm_source||'direct'};}), 'key');
  var maxS=Math.max.apply(null,Object.values(sources))||1;
  document.getElementById('source-bars').innerHTML=Object.entries(sources).map(function(p){
    return '<div class="bar-row"><div class="bar-label">'+p[0]+'</div><div class="bar-track"><div class="bar-fill blue" style="width:'+Math.round(p[1]/maxS*100)+'%"></div></div><div class="bar-val">'+p[1]+'</div></div>';
  }).join('')||'<div class="empty">No data yet</div>';
  var campaigns={};
  events.forEach(function(e){var k=(e.utm_campaign||'—')+'|'+(e.utm_source||'direct');if(!campaigns[k])campaigns[k]={sessions:new Set(),scrolls:[]};campaigns[k].sessions.add(e.session_id);if(e.scroll_depth)campaigns[k].scrolls.push(e.scroll_depth);});
  document.getElementById('campaign-table').innerHTML=Object.entries(campaigns).sort(function(a,b){return b[1].sessions.size-a[1].sessions.size;}).map(function(p){var parts=p[0].split('|');var d=p[1];return '<tr><td>'+parts[0]+'</td><td>'+parts[1]+'</td><td>'+d.sessions.size+'</td><td>'+(d.scrolls.length?Math.round(avg(d.scrolls))+'%':'—')+'</td></tr>';}).join('')||'<tr><td colspan="4" class="empty">No campaign data</td></tr>';
  var utm={};
  events.forEach(function(e){var k=[(e.utm_source||'direct'),(e.utm_medium||'none'),(e.utm_campaign||'—')].join('|');if(!utm[k])utm[k]={views:0,sessions:new Set(),times:[],scrolls:[]};utm[k].views++;utm[k].sessions.add(e.session_id);if(e.time_on_page)utm[k].times.push(e.time_on_page);if(e.scroll_depth)utm[k].scrolls.push(e.scroll_depth);});
  document.getElementById('utm-table').innerHTML=Object.entries(utm).sort(function(a,b){return b[1].sessions.size-a[1].sessions.size;}).map(function(p){var k=p[0].split('|');var d=p[1];return '<tr><td>'+k[0]+'</td><td>'+k[1]+'</td><td>'+k[2]+'</td><td>'+d.views+'</td><td>'+d.sessions.size+'</td><td>'+(d.times.length?Math.round(avg(d.times)):'—')+'</td><td>'+(d.scrolls.length?Math.round(avg(d.scrolls))+'%':'—')+'</td></tr>';}).join('')||'<tr><td colspan="7" class="empty">No UTM data</td></tr>';
}

function renderFunnel(events, ctas) {
  function funnelFor(site, steps) {
    var se=events.filter(function(e){return e.site===site;}); var sc=ctas.filter(function(c){return c.site===site;});
    var sessions=new Set(se.map(function(e){return e.session_id;})).size;
    var counts=steps.map(function(s){return s.type==='sessions'?sessions:sc.filter(function(c){return c.cta_label===s.label;}).length;});
    var max=counts[0]||1;
    return steps.map(function(s,i){var pct=Math.round(counts[i]/max*100);return '<div class="funnel-row"><div class="funnel-step">'+s.name+'</div><div class="funnel-bar-wrap"><div class="funnel-bar" style="width:'+Math.max(pct,4)+'%"><span>'+counts[i]+'</span></div></div><div class="funnel-pct">'+pct+'%</div></div>';}).join('');
  }
  document.getElementById('funnel-illumine').innerHTML=funnelFor('illumineads',[{name:'Total Sessions',type:'sessions'},{name:'Vault Page',label:'vault_page'},{name:'Buy Vault',label:'buy_vault'},{name:'Checkout',label:'checkout_entry'},{name:'Apply Now',label:'apply_now'},{name:'Book Session',label:'book_session'}])||'<div class="empty">No data</div>';
  document.getElementById('funnel-veritas').innerHTML=funnelFor('veritashire',[{name:'Total Sessions',type:'sessions'},{name:'Get Started',label:'get_started'},{name:'Apply Now',label:'apply_now'},{name:'Book a Call',label:'book_call'},{name:'Calendly Click',label:'calendly_click'}])||'<div class="empty">No data</div>';
  var ctaGroups={};
  ctas.forEach(function(c){var k=[c.site,c.cta_label,c.cta_location,c.utm_source||'direct',c.utm_campaign||'—'].join('|');ctaGroups[k]=(ctaGroups[k]||0)+1;});
  document.getElementById('cta-table').innerHTML=Object.entries(ctaGroups).sort(function(a,b){return b[1]-a[1];}).map(function(p){var k=p[0].split('|');return '<tr><td>'+k[1]+'</td><td><span class="site-pill '+(k[0]==='illumineads'?'pill-illumine':'pill-veritas')+'">'+k[0]+'</span></td><td>'+k[2]+'</td><td>'+k[3]+'</td><td>'+k[4]+'</td><td>'+p[1]+'</td></tr>';}).join('')||'<tr><td colspan="6" class="empty">No CTA clicks yet</td></tr>';
}

function renderPages(events) {
  var pages={};
  events.forEach(function(e){var k=e.site+'|'+(e.page_path||'/');if(!pages[k])pages[k]={site:e.site,path:e.page_path,views:0,sessions:new Set(),scrolls:[],times:[]};pages[k].views++;pages[k].sessions.add(e.session_id);if(e.scroll_depth)pages[k].scrolls.push(e.scroll_depth);if(e.time_on_page)pages[k].times.push(e.time_on_page);});
  document.getElementById('pages-table').innerHTML=Object.values(pages).sort(function(a,b){return b.views-a.views;}).map(function(p){return '<tr><td>'+p.path+'</td><td><span class="site-pill '+(p.site==='illumineads'?'pill-illumine':'pill-veritas')+'">'+p.site+'</span></td><td>'+p.views+'</td><td>'+p.sessions.size+'</td><td>'+(p.scrolls.length?Math.round(avg(p.scrolls))+'%':'—')+'</td><td>'+(p.times.length?Math.round(avg(p.times))+'s':'—')+'</td></tr>';}).join('')||'<tr><td colspan="6" class="empty">No page data</td></tr>';
}

function renderPosts(events, ctas) {
  var se=events.filter(function(e){return e.utm_source==='linkedin'||e.utm_source==='instagram';});
  var sc=ctas.filter(function(c){return c.utm_source==='linkedin'||c.utm_source==='instagram';});
  var li=new Set(se.filter(function(e){return e.utm_source==='linkedin';}).map(function(e){return e.session_id;}));
  var ig=new Set(se.filter(function(e){return e.utm_source==='instagram';}).map(function(e){return e.session_id;}));
  document.getElementById('stat-post-clicks').textContent=se.length;
  document.getElementById('stat-li-sessions').textContent=li.size;
  document.getElementById('stat-ig-sessions').textContent=ig.size;
  var camps={};
  se.forEach(function(e){var k=[e.utm_campaign||'—',e.utm_source||'—',e.utm_term||'—',e.utm_content||'—'].join('|');if(!camps[k])camps[k]={campaign:e.utm_campaign||'—',source:e.utm_source||'—',week:e.utm_term||'—',type:e.utm_content||'—',sessions:new Set(),scrolls:[],ctas:0};camps[k].sessions.add(e.session_id);if(e.scroll_depth)camps[k].scrolls.push(e.scroll_depth);});
  var rows=Object.values(camps).sort(function(a,b){return b.sessions.size-a.sessions.size;});
  if(rows.length)document.getElementById('stat-top-campaign').textContent=rows[0].campaign;
  document.getElementById('posts-table').innerHTML=rows.length?rows.map(function(r){var pill=r.source==='linkedin'?'pill-illumine':'pill-veritas';return '<tr><td>'+r.campaign+'</td><td><span class="site-pill '+pill+'">'+r.source+'</span></td><td>'+r.week+'</td><td>'+r.type+'</td><td>'+r.sessions.size+'</td><td>'+(r.scrolls.length?Math.round(avg(r.scrolls))+'%':'—')+'</td><td>'+r.ctas+'</td></tr>';}).join(''):'<tr><td colspan="7" class="empty">No social post traffic yet</td></tr>';
  var maxP=Math.max(li.size,ig.size)||1;
  document.getElementById('platform-bars').innerHTML=[{label:'linkedin',val:li.size,cls:''},{label:'instagram',val:ig.size,cls:'blue'}].map(function(p){return '<div class="bar-row"><div class="bar-label">'+p.label+'</div><div class="bar-track"><div class="bar-fill '+p.cls+'" style="width:'+Math.round(p.val/maxP*100)+'%"></div></div><div class="bar-val">'+p.val+'</div></div>';}).join('');
  var weeks={};
  se.forEach(function(e){var w=e.utm_term||'unknown';if(!weeks[w])weeks[w]={week:w,sessions:new Set(),li:new Set(),ig:new Set(),camps:{}};weeks[w].sessions.add(e.session_id);if(e.utm_source==='linkedin')weeks[w].li.add(e.session_id);if(e.utm_source==='instagram')weeks[w].ig.add(e.session_id);if(e.utm_campaign)weeks[w].camps[e.utm_campaign]=(weeks[w].camps[e.utm_campaign]||0)+1;});
  document.getElementById('wow-table').innerHTML=Object.values(weeks).sort(function(a,b){return b.sessions.size-a.sessions.size;}).map(function(w){var top=Object.entries(w.camps).sort(function(a,b){return b[1]-a[1];})[0];return '<tr><td>'+w.week+'</td><td>'+w.sessions.size+'</td><td>'+w.li.size+'</td><td>'+w.ig.size+'</td><td>'+(top?top[0]:'—')+'</td></tr>';}).join('')||'<tr><td colspan="5" class="empty">No weekly data yet</td></tr>';
  var types={};
  se.forEach(function(e){var t=e.utm_content||'unknown';types[t]=(types[t]||0)+1;});
  var maxT=Math.max.apply(null,Object.values(types).concat([1]));
  document.getElementById('content-type-bars').innerHTML=Object.entries(types).sort(function(a,b){return b[1]-a[1];}).map(function(p){return '<div class="bar-row"><div class="bar-label">'+p[0]+'</div><div class="bar-track"><div class="bar-fill" style="width:'+Math.round(p[1]/maxT*100)+'%"></div></div><div class="bar-val">'+p[1]+'</div></div>';}).join('')||'<div class="empty">No content type data yet</div>';
}

function buildUTM() {
  var base=document.getElementById('utm-site').value;
  var source=document.getElementById('utm-source').value;
  var medium=document.getElementById('utm-medium').value;
  var campaign=document.getElementById('utm-campaign').value.trim().toLowerCase().replace(/\\s+/g,'-');
  var content=document.getElementById('utm-content').value;
  if(!campaign){document.getElementById('utm-output').textContent='Enter a campaign name to generate URL';return;}
  var params='utm_source='+source+'&utm_medium='+medium+'&utm_campaign='+encodeURIComponent(campaign);
  if(content)params+='&utm_content='+content;
  var url=base+(base.includes('?')?'&':'?')+params;
  document.getElementById('utm-output').textContent=url;
  document.getElementById('copy-hint').textContent='Click URL to copy';
  document.getElementById('copy-hint').classList.remove('copied');
}

function copyUTM() {
  var text=document.getElementById('utm-output').textContent;
  if(text==='Your tagged URL will appear here'||text==='Enter a campaign name to generate URL')return;
  navigator.clipboard.writeText(text).then(function(){document.getElementById('copy-hint').textContent='✓ Copied';document.getElementById('copy-hint').classList.add('copied');setTimeout(function(){document.getElementById('copy-hint').textContent='Click URL to copy';document.getElementById('copy-hint').classList.remove('copied');},2000);});
}

var PRESETS=[
  {label:'Illumine — LinkedIn text',site:'https://illumineads.com',source:'linkedin',medium:'social',campaign:'illumine-post',content:'text'},
  {label:'Illumine — LinkedIn carousel',site:'https://illumineads.com/vault/',source:'linkedin',medium:'social',campaign:'vault-promo',content:'carousel'},
  {label:'Illumine — IG bio link',site:'https://illumineads.com',source:'instagram',medium:'social',campaign:'bio',content:'bio-link'},
  {label:'Veritas — LinkedIn text',site:'https://veritashire.com',source:'linkedin',medium:'social',campaign:'va-placement',content:'text'},
  {label:'Veritas — IG bio link',site:'https://veritashire.com',source:'instagram',medium:'social',campaign:'bio',content:'bio-link'},
];
document.getElementById('presets').innerHTML=PRESETS.map(function(p,i){return '<button class="btn-generate" onclick="loadPreset('+i+')" style="margin-bottom:6px;text-align:left">'+p.label+'</button>';}).join('');
function loadPreset(i){var p=PRESETS[i];document.getElementById('utm-site').value=p.site;document.getElementById('utm-source').value=p.source;document.getElementById('utm-medium').value=p.medium;document.getElementById('utm-campaign').value=p.campaign;document.getElementById('utm-content').value=p.content;buildUTM();showTab('utm');}

loadData();
setInterval(loadData, 60000);
</script>
</body>
</html>`;
}
