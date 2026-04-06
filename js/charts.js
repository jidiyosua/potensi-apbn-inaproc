/* ═══════════════════════════════════════════════════════════════
   CHART FUNCTIONS — Chart.js Enterprise Grade
   ═══════════════════════════════════════════════════════════════ */

// Track all chart instances for cleanup
const chartRegistry = {};

function destroyChart(id) {
  if (chartRegistry[id]) { chartRegistry[id].destroy(); delete chartRegistry[id]; }
}

function getCanvas(containerId, height = 500) {
  const container = document.getElementById(containerId);
  if (!container) return null;
  container.innerHTML = "";
  const canvas = document.createElement("canvas");
  canvas.style.maxHeight = height + "px";
  container.appendChild(canvas);
  return canvas;
}

// ═══ GRADIENT PALETTE ═══
function gradientPalette(baseHex, count) {
  const r0 = parseInt(baseHex.slice(1,3),16);
  const g0 = parseInt(baseHex.slice(3,5),16);
  const b0 = parseInt(baseHex.slice(5,7),16);
  const colors = [];
  for (let i = 0; i < count; i++) {
    const f = 1.0 - (i * 0.028);
    const r = Math.max(0, Math.min(255, Math.round(r0*f)));
    const g = Math.max(0, Math.min(255, Math.round(g0*f)));
    const b = Math.max(0, Math.min(255, Math.round(b0*f)));
    colors.push(`rgb(${r},${g},${b})`);
  }
  return colors;
}

// ═══ HORIZONTAL BAR — TOP 20 RANKING ═══
function chartTop20(containerId, aggData, title, subtitle, accentColor, semesta, height) {
  destroyChart(containerId);
  const canvas = getCanvas(containerId, height || 600);
  if (!canvas || !aggData.length) return;

  const labels = aggData.map(d => {
    const n = d.nama || "";
    return n.length > 35 ? n.substring(0,35)+"…" : n;
  });
  const values = aggData.map(d => d.pagu);
  const colors = gradientPalette(accentColor, aggData.length);

  const chart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels.reverse(),
      datasets: [{
        data: [...values].reverse(),
        backgroundColor: [...colors].reverse(),
        borderColor: "rgba(255,255,255,0.8)",
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.85,
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 220, top: 10, bottom: 10 } },
      plugins: {
        legend: { display: false },
        title: {
          display: true, text: title,
          font: { size: 16, weight: "bold", family: "'Plus Jakarta Sans'" },
          color: "#111", align: "start", padding: { bottom: 4 }
        },
        subtitle: {
          display: !!subtitle, text: subtitle,
          font: { size: 12, family: "'Plus Jakarta Sans'" },
          color: "#6B7280", align: "start", padding: { bottom: 16 }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const idx = aggData.length - 1 - ctx.dataIndex;
              const d = aggData[idx];
              const pct = semesta ? ` (${(d.pagu/semesta*100).toFixed(1)}%)` : "";
              return `${fmtRp(d.pagu)}${pct} | ${d.paket} paket | ${d.instansi_n || 0} instansi`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: "rgba(0,0,0,0.04)" },
          ticks: {
            callback: v => fmtS(v),
            font: { size: 10, family: "'Plus Jakarta Sans'" }, color: "#AAA"
          }
        },
        y: {
          grid: { display: false },
          ticks: {
            font: { size: 11, weight: "bold", family: "'Plus Jakarta Sans'" },
            color: "#222"
          }
        }
      },
      animation: {
        onComplete: function() {
          const chartInstance = this;
          const ctx = chartInstance.ctx;
          const meta = chartInstance.getDatasetMeta(0);
          ctx.save();
          meta.data.forEach((bar, i) => {
            const origIdx = aggData.length - 1 - i;
            const d = aggData[origIdx];
            const val = d.pagu;
            const pct = semesta ? ` (${(val/semesta*100).toFixed(1)}%)` : "";

            // Value label
            ctx.fillStyle = "#111";
            ctx.font = "bold 11px 'Plus Jakarta Sans'";
            ctx.textAlign = "left";
            ctx.fillText(fmtRp(val) + pct, bar.x + 8, bar.y - 3);

            // Detail label
            const parts = [];
            if (d.paket) parts.push(`${d.paket} paket`);
            if (d.instansi_n) parts.push(`${d.instansi_n} instansi`);
            if (d.satker_n) parts.push(`${d.satker_n} satker`);
            ctx.fillStyle = "#888";
            ctx.font = "600 9px 'Plus Jakarta Sans'";
            ctx.fillText(parts.join("  •  "), bar.x + 8, bar.y + 12);
          });
          ctx.restore();
        }
      }
    }
  });
  chartRegistry[containerId] = chart;

  // Semesta badge
  if (semesta) {
    const wrapper = canvas.parentElement;
    let badge = wrapper.querySelector(".semesta-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "semesta-badge";
      badge.style.cssText = "text-align:right;margin-top:8px;font-size:12px;font-weight:700;color:#DC2626;background:#FEF2F2;display:inline-block;float:right;padding:4px 12px;border-radius:6px;border:1px solid #DC2626;";
      wrapper.appendChild(badge);
    }
    badge.textContent = `SEMESTA: ${fmtRp(semesta)}`;
  }
}

// ═══ DONUT CHART — ICT vs Non-ICT ═══
function chartDonut(containerId, valICT, valNon, cntICT, cntNon, label) {
  destroyChart(containerId);
  const canvas = getCanvas(containerId, 240);
  if (!canvas) return;
  const total = valICT + valNon;
  if (total === 0) { canvas.parentElement.innerHTML = '<div class="empty-state"><p>Tidak ada data</p></div>'; return; }

  const pctICT = (valICT/total*100).toFixed(1);
  const pctNon = (100 - parseFloat(pctICT)).toFixed(1);

  const chart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: [`ICT — ${fmtRp(valICT)} (${pctICT}%)`, `Non-ICT — ${fmtRp(valNon)} (${pctNon}%)`],
      datasets: [{
        data: [valICT, valNon],
        backgroundColor: ["#1D4ED8", "#059669"],
        borderColor: "#FFF",
        borderWidth: 3,
        cutout: "65%",
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: { size: 10, weight: "bold", family: "'Plus Jakarta Sans'" },
            color: "#333", padding: 12, usePointStyle: true, pointStyleWidth: 12,
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.raw;
              const cnt = ctx.dataIndex === 0 ? cntICT : cntNon;
              return ` ${fmtRp(v)} | ${fmtN(cnt)} pemenang`;
            }
          }
        }
      }
    },
    plugins: [{
      id: "centerText",
      afterDraw(chart) {
        const { ctx, chartArea: { top, bottom, left, right } } = chart;
        const cx = (left + right) / 2;
        const cy = (top + bottom) / 2;
        ctx.save();
        ctx.fillStyle = "#111";
        ctx.font = "bold 13px 'Plus Jakarta Sans'";
        ctx.textAlign = "center";
        ctx.fillText(fmtRp(total), cx, cy - 2);
        ctx.fillStyle = "#666";
        ctx.font = "bold 9px 'Plus Jakarta Sans'";
        ctx.fillText(label, cx, cy + 14);
        ctx.restore();
      }
    }]
  });
  chartRegistry[containerId] = chart;
}

// ═══ HEATMAP — as styled table ═══
function renderHeatmap(containerId, data, title) {
  const el = document.getElementById(containerId);
  if (!el) return;

  // Group by pemenang × wilayah
  const map = {};
  const totals = {};
  data.forEach(r => {
    if (!WILAYAH_LIST.includes(r.wilayah)) return;
    const key = r.nama_display;
    if (!map[key]) map[key] = {};
    if (!map[key][r.wilayah]) map[key][r.wilayah] = 0;
    map[key][r.wilayah] += r.pagu;
    if (!totals[key]) totals[key] = 0;
    totals[key] += r.pagu;
  });

  // Top 15
  const top = Object.entries(totals).sort((a,b) => b[1]-a[1]).slice(0, 15).map(e => e[0]);
  if (!top.length) { el.innerHTML = '<div class="empty-state"><p>Tidak ada data</p></div>'; return; }

  // Find max for color scale
  let maxVal = 0;
  top.forEach(p => WILAYAH_LIST.forEach(w => { maxVal = Math.max(maxVal, (map[p]||{})[w] || 0); }));

  let html = `<table class="heatmap-table"><thead><tr><th style="text-align:left">Pemenang</th>`;
  WILAYAH_LIST.forEach(w => { html += `<th>${W_CFG[w].i} ${w}</th>`; });
  html += `<th>Total</th></tr></thead><tbody>`;

  top.forEach(p => {
    html += `<tr><td style="text-align:left;font-weight:700;font-size:11px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p}</td>`;
    let rowTotal = 0;
    WILAYAH_LIST.forEach(w => {
      const v = (map[p] || {})[w] || 0;
      rowTotal += v;
      const intensity = maxVal > 0 ? v / maxVal : 0;
      const r = Math.round(255 - intensity * 35);
      const g = Math.round(255 - intensity * 80);
      const b = Math.round(255 - intensity * 80);
      const textColor = intensity > 0.6 ? "#FFF" : "#333";
      const bg = v > 0 ? `rgb(${r},${g},${b})` : "#FAFAFA";
      html += `<td style="background:${bg};color:${textColor}">${v > 0 ? fmtS(v) : "—"}</td>`;
    });
    html += `<td style="background:#1A1A2E;color:#FFF;font-weight:800">${fmtS(rowTotal)}</td></tr>`;
  });
  html += `</tbody></table>`;
  el.innerHTML = html;
}