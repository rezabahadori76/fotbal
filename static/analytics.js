/**
 * PitchIQ Analytics Suite — coach & player dashboards
 */
(function () {
  'use strict';

  const fmtTime = (sec) => {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  };

  const esc = (s) => {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  };

  const maxGrid = (grid) => {
    let m = 1;
    grid.forEach((row) => row.forEach((v) => { if (v > m) m = v; }));
    return m;
  };

  function heatmapHtml(grid, teamClass) {
    if (!grid || !grid.length) return '<p class="empty-msg">No position data</p>';
    const m = maxGrid(grid);
    const cells = grid.flatMap((row, ri) =>
      row.map((v, ci) => {
        const t = v / m;
        const alpha = 0.15 + t * 0.85;
        const color = teamClass === 't2'
          ? `rgba(34,197,94,${alpha})`
          : `rgba(248,250,252,${alpha})`;
        return `<div class="ax-heatmap-cell" style="background:${color}" title="${v}"></div>`;
      })
    ).join('');
    return `<div class="ax-heatmap" style="grid-template-columns:repeat(${grid[0].length},1fr);grid-template-rows:repeat(${grid.length},1fr)">${cells}</div>`;
  }

  function barThirdsHtml(values, labels, color) {
    const max = Math.max(...values, 0.1);
    return `<div class="ax-bar-chart">${labels.map((lb, i) => `
      <div class="ax-bar-col">
        <div class="ax-bar" style="height:${Math.round(100 * values[i] / max)}%;background:${color}"></div>
        <span>${lb}<br>${fmtTime(values[i])}</span>
      </div>`).join('')}</div>`;
  }

  function compareBar(label, playerVal, teamAvg, maxVal, unit) {
    const pct = maxVal > 0 ? Math.min(100, (playerVal / maxVal) * 100) : 0;
    const avgPct = maxVal > 0 ? Math.min(100, (teamAvg / maxVal) * 100) : 0;
    return `<div class="ax-compare-row">
      <div class="ax-compare-label"><span>${esc(label)}</span><span>${playerVal}${unit} · team avg ${teamAvg}${unit}</span></div>
      <div class="ax-compare-track">
        <div class="ax-compare-fill" style="width:${pct}%"></div>
        <div class="ax-compare-avg" style="left:${avgPct}%"></div>
      </div>
    </div>`;
  }

  function possessionTimelineHtml(timeline) {
    if (!timeline || !timeline.length) return '';
    return `<div class="ax-timeline">${timeline.map((pt) => {
      const p1 = pt.team1_pct || 0;
      const p2 = pt.team2_pct || 50;
      return `<div class="ax-timeline-seg" style="height:100%;background:linear-gradient(to top, var(--team1) ${p1}%, var(--team2) ${p2}%)" title="${fmtTime(pt.time)} — ${p1}% / ${p2}%"></div>`;
    }).join('')}</div>`;
  }

  function playerListLabel(p) {
    if (p.name) return '#' + p.jersey_number + ' ' + esc(p.name);
    return '#' + p.jersey_number;
  }

  function leaderboardRows(list, valueKey, fmt) {
    if (!list || !list.length) return '<p class="empty-msg">No data</p>';
    const max = Math.max(...list.map((x) => x[valueKey] || 0), 0.1);
    return list.map((p, i) => {
      const v = p[valueKey] || 0;
      const w = Math.round(100 * v / max);
      const tc = p.team_id === 1 ? 't1' : 't2';
      return `<div class="ax-compare-row" data-team="${p.team_id}" data-jersey="${p.jersey_number}" style="cursor:pointer">
        <div class="ax-compare-label"><span>${i + 1}. ${playerListLabel(p)}</span><span>${fmt(v)}</span></div>
        <div class="ax-compare-track"><div class="ax-compare-fill" style="width:${w}%;background:var(--${tc === 't1' ? 'team1' : 'team2'})"></div></div>
      </div>`;
    }).join('');
  }

  let coachAnalyticsCache = null;
  let coachAnalyticsTeamId = 1;

  function teamNameFromData(data, teamId) {
    const t = (data.teams || []).find((x) => x.team_id === teamId);
    return t?.team_name || (teamId === 1 ? 'Team 1' : 'Team 2');
  }

  function teamFilterBarHtml(data, activeId) {
    return `<div class="ax-team-filter" id="axTeamFilter">
      <span class="filter-label">Team</span>
      <button type="button" class="pill t1${activeId === 1 ? ' active' : ''}" data-team="1" title="${esc(teamNameFromData(data, 1))}">${esc(teamNameFromData(data, 1))}</button>
      <button type="button" class="pill t2${activeId === 2 ? ' active' : ''}" data-team="2" title="${esc(teamNameFromData(data, 2))}">${esc(teamNameFromData(data, 2))}</button>
    </div>`;
  }

  function bindTeamFilter(root, data, onPlayerClick, rerender) {
    root.querySelectorAll('#axTeamFilter .pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        coachAnalyticsTeamId = parseInt(btn.dataset.team, 10);
        if (window.setCoachTeamFilter) window.setCoachTeamFilter(coachAnalyticsTeamId);
        rerender();
      });
    });
  }

  function renderCoachTeamContent(data, root, onPlayerClick, teamId) {
    const m = data.match || {};
    const team = (data.teams || []).find((t) => t.team_id === teamId) || {};
    const squad = (data.squad_by_team && data.squad_by_team[teamId])
      ? data.squad_by_team[teamId]
      : (data.squad_table || []).filter((p) => p.team_id === teamId);
    const squadTitle = squad[0]?.team_name || team.team_name || 'Team';
    const insights = (data.team_insights || {})[teamId] || [];
    const lb = (data.leaderboards_by_team || {})[teamId] || data.leaderboards || {};
    const tc = teamId === 1 ? 't1' : 't2';
    const color = teamId === 1 ? 'var(--team1)' : 'var(--team2)';

    root.innerHTML = `
      ${teamFilterBarHtml(data, teamId)}
      <div class="ax-kpi-row">
        <div class="ax-kpi accent"><div class="label">Game length</div><div class="value">${esc(m.duration_fmt || '—')}</div></div>
        <div class="ax-kpi"><div class="label">Squad tracked</div><div class="value">${team.players_detected || 0}<span style="font-size:0.9rem;color:var(--muted)"> / ${team.squad_registered || 0}</span></div></div>
        <div class="ax-kpi"><div class="label">Team ball touches</div><div class="value">${team.ball_touches || 0}</div><div class="sub">${fmtTime(team.ball_touch_sec || 0)}</div></div>
        <div class="ax-kpi"><div class="label">Possession</div><div class="value">${team.possession_pct != null ? team.possession_pct + '%' : '—'}</div></div>
      </div>

      ${insights.length ? `<div class="ax-card"><h3>💡 ${esc(team.team_name || 'Team')} insights</h3>${insights.map((ins) => `
        <div class="ax-insight"><span class="icon">${ins.icon || '•'}</span><div><div class="title">${esc(ins.title)}</div><div class="body">${esc(ins.body)}</div></div></div>`).join('')}</div>` : ''}

      <div class="ax-card">
        <h3>📈 Game possession (both teams)</h3>
        ${possessionTimelineHtml(data.possession_timeline)}
      </div>

      <div class="ax-card">
        <div class="ax-team-card ${tc}">
          <h4>${esc(team.team_name || 'Team')}</h4>
          <div class="ax-team-stat"><span>Detection rate</span><strong>${team.detection_rate_pct || 0}%</strong></div>
          <div class="ax-team-stat"><span>Avg pitch time</span><strong>${fmtTime(team.avg_pitch_time_sec || 0)}</strong></div>
          <div class="ax-team-stat"><span>Avg touches / player</span><strong>${team.avg_ball_touches || 0}</strong></div>
          <h3 style="margin-top:14px">Ball by period</h3>
          ${barThirdsHtml(team.ball_touch_by_third || [0, 0, 0], ['1st', '2nd', '3rd'], color)}
          <h3 style="margin-top:14px">Activity heatmap</h3>
          ${heatmapHtml(team.heatmap_grid, tc)}
        </div>
      </div>

      <div class="ax-card">
        <h3>🏆 Leaderboards — ${esc(team.team_name || 'Team')}</h3>
        <div class="ax-tabs" id="axLbTabs">
          <button type="button" class="ax-tab active" data-lb="pitch">Pitch time</button>
          <button type="button" class="ax-tab" data-lb="ball">Ball touches</button>
          <button type="button" class="ax-tab" data-lb="inv">Involvement</button>
        </div>
        <div id="axLbBody"></div>
      </div>

      <div class="ax-card">
        <h3>👥 Squad — ${esc(squadTitle)}</h3>
        <p style="font-size:0.78rem;color:var(--dim);margin:-8px 0 12px">${squad.length} players from official roster</p>
        <div class="ax-table-wrap">
          <table class="ax-table" id="axSquadTable">
            <thead><tr>
              <th>#</th><th>Player</th><th>Pos</th><th>Pitch</th><th>On pitch</th><th>Touches</th><th>Ball time</th><th>Score</th><th></th>
            </tr></thead>
            <tbody>${squad.map((p) => `
              <tr class="clickable" data-team="${p.team_id}" data-jersey="${p.jersey_number}">
                <td class="jersey">${p.jersey_number}</td>
                <td>${esc(p.name || '—')}</td>
                <td>${esc(p.position || '—')}</td>
                <td>${fmtTime(p.pitch_time_sec || 0)}</td>
                <td>${p.on_pitch_pct || 0}%</td>
                <td>${p.ball_touches || 0}</td>
                <td>${fmtTime(p.ball_touch_sec || 0)}</td>
                <td>${p.involvement_score || 0}</td>
                <td class="${p.detected ? 'badge-ok' : 'badge-warn'}" title="${p.detected ? 'Seen in video' : 'Not in tracking'}">${p.detected ? '✓' : '—'}</td>
              </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`;

    const lbBody = root.querySelector('#axLbBody');
    const tabs = root.querySelectorAll('#axLbTabs .ax-tab');
    const showLb = (key) => {
      tabs.forEach((t) => t.classList.toggle('active', t.dataset.lb === key));
      if (key === 'pitch') lbBody.innerHTML = leaderboardRows(lb.pitch_time || [], 'pitch_time_sec', fmtTime);
      else if (key === 'ball') lbBody.innerHTML = leaderboardRows(lb.ball_touches || [], 'ball_touch_sec', fmtTime);
      else lbBody.innerHTML = leaderboardRows(lb.involvement || [], 'involvement_score', (v) => v + '/100');
      lbBody.querySelectorAll('.ax-compare-row').forEach((row) => {
        row.addEventListener('click', () => onPlayerClick(
          parseInt(row.dataset.team, 10),
          parseInt(row.dataset.jersey, 10)
        ));
      });
    };
    tabs.forEach((t) => t.addEventListener('click', () => showLb(t.dataset.lb)));
    showLb('pitch');

    root.querySelectorAll('#axSquadTable tr.clickable').forEach((tr) => {
      tr.addEventListener('click', () => onPlayerClick(
        parseInt(tr.dataset.team, 10),
        parseInt(tr.dataset.jersey, 10)
      ));
    });
  }

  function renderCoach(data, root, onPlayerClick, initialTeamId) {
    coachAnalyticsCache = data;
    coachAnalyticsTeamId = initialTeamId
      || (typeof window.getCoachTeamFilter === 'function' ? window.getCoachTeamFilter() : null)
      || 1;
    const content = document.createElement('div');
    root.innerHTML = '';
    root.appendChild(content);
    const rerender = () => {
      renderCoachTeamContent(coachAnalyticsCache, content, onPlayerClick, coachAnalyticsTeamId);
      bindTeamFilter(content, data, onPlayerClick, rerender);
    };
    rerender();
  }

  function renderPlayer(data, root) {
    const p = data.player || {};
    const c = data.comparison || {};
    const act = data.activity || {};
    const tc = p.team_id === 1 ? 't1' : 't2';

    root.innerHTML = `
      <div class="ax-player-hero">
        <div class="big-jersey jersey-badge ${tc}">${p.jersey_number}</div>
        <h2 style="font-size:1.3rem;margin-bottom:4px">${esc(p.name || 'Player')}</h2>
        <p style="color:var(--muted)">${esc(p.position || '')} · ${esc(p.team_name || '')}</p>
        <div class="ax-rank-pills">
          <span class="ax-rank-pill">Pitch rank #${p.rank_pitch || '—'} / ${p.team_size_tracked || 0}</span>
          <span class="ax-rank-pill">Ball rank #${p.rank_touches || '—'}</span>
          <span class="ax-rank-pill">Involvement ${p.involvement_score || 0}/100</span>
        </div>
      </div>

      <div class="ax-kpi-row">
        <div class="ax-kpi accent"><div class="label">Pitch time</div><div class="value">${fmtTime(p.pitch_time_sec || 0)}</div><div class="sub">${p.on_pitch_pct || 0}% of game</div></div>
        <div class="ax-kpi"><div class="label">Ball touches</div><div class="value">${p.ball_touches || 0}</div></div>
        <div class="ax-kpi"><div class="label">On ball</div><div class="value">${fmtTime(p.ball_touch_sec || 0)}</div></div>
        <div class="ax-kpi"><div class="label">Appearances</div><div class="value">${p.pitch_segments || 0}</div></div>
      </div>

      <div class="ax-card">
        <h3>📊 vs team average</h3>
        ${compareBar('Pitch time', p.pitch_time_sec || 0, c.team_avg_pitch_sec || 0, Math.max(p.pitch_time_sec || 0, c.team_avg_pitch_sec || 0, 1), 's')}
        ${compareBar('Ball time', p.ball_touch_sec || 0, c.team_avg_touch_sec || 0, Math.max(p.ball_touch_sec || 0, c.team_avg_touch_sec || 0, 1), 's')}
        ${compareBar('Touches', p.ball_touches || 0, c.team_avg_touches || 0, Math.max(p.ball_touches || 0, c.team_avg_touches || 0, 1), '')}
        <p style="font-size:0.78rem;color:var(--dim);margin-top:10px">Percentile on team: pitch ${c.pitch_percentile || 0}% · ball ${c.touch_percentile || 0}%</p>
      </div>

      <div class="ax-grid-2">
        <div class="ax-card">
          <h3>⏱ Pitch by period</h3>
          ${barThirdsHtml(act.pitch_by_third || [0, 0, 0], ['1st third', '2nd third', '3rd third'], 'var(--accent)')}
        </div>
        <div class="ax-card">
          <h3>⚽ Ball by period</h3>
          ${barThirdsHtml(act.touch_by_third || [0, 0, 0], ['1st third', '2nd third', '3rd third'], 'var(--ball)')}
        </div>
      </div>

      <div class="ax-card">
        <h3>🗺 Your movement heatmap</h3>
        ${heatmapHtml(data.heatmap_grid, tc)}
      </div>

      <div class="ax-card">
        <h3>📝 Performance report</h3>
        <ul class="ax-report">${(data.report_bullets || []).map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
      </div>`;
  }

  window.PitchIQAnalytics = {
    async open(opts) {
      const overlay = document.getElementById('analyticsOverlay');
      const body = document.getElementById('analyticsBody');
      const title = document.getElementById('analyticsTitle');
      const subtitle = document.getElementById('analyticsSubtitle');
      if (!overlay || !body) return;

      body.innerHTML = '<div class="loading-spinner" style="margin:40px auto"></div>';
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';

      try {
        let data;
        if (opts.playerDetail) {
          title.textContent = `#${opts.playerDetail.jersey} Player Report`;
          subtitle.textContent = 'Individual analysis';
          const r = await fetch(`/api/analytics/player/${opts.playerDetail.team}/${opts.playerDetail.jersey}`);
          data = await r.json();
          body.innerHTML = '';
          const back = document.createElement('button');
          back.type = 'button';
          back.className = 'btn btn-ghost';
          back.style.marginBottom = '12px';
          back.textContent = '← Back to game report';
          back.addEventListener('click', () => window.PitchIQAnalytics.open({
            isCoach: true,
            teamId: coachAnalyticsTeamId,
            onPlayerClick: opts.onPlayerClick,
          }));
          body.appendChild(back);
          const inner = document.createElement('div');
          body.appendChild(inner);
          renderPlayer(data, inner);
          return;
        }

        const r = await fetch('/api/analytics');
        data = await r.json();

        if (data.scope === 'coach') {
          title.textContent = 'Game Analytics';
          subtitle.textContent = 'Select a team to view separated reports';
          body.innerHTML = '';
          renderCoach(data, body, (team, jersey) => {
            window.PitchIQAnalytics.open({
              isCoach: true,
              playerDetail: { team, jersey },
              onPlayerClick: opts.onPlayerClick,
            });
          }, opts.teamId);
        } else {
          title.textContent = 'My Analytics';
          subtitle.textContent = data.player?.team_name || '';
          body.innerHTML = '';
          renderPlayer(data, body);
        }
      } catch (e) {
        body.innerHTML = '<div class="empty-msg">Failed to load analytics.</div>';
      }
    },

    close() {
      const overlay = document.getElementById('analyticsOverlay');
      if (overlay) overlay.classList.remove('open');
      document.body.style.overflow = '';
    },
  };
})();
