/* ═══════════════════════════════════════════════════════════════
   APP.JS — Main Application Logic v4.0
   Telkomsel Enterprise | INAPROC Dashboard
   ═══════════════════════════════════════════════════════════════ */

let currentPage   = "ringkasan";
let currentSektor = "Semua";

// ═══ LOGIN ═══
const PW_HASH = "d04cce006c43628f403e07ec44da66dd12a0a6d38883291ddb406be55a942a9f";

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function doLogin() {
  const pw = document.getElementById("loginPw").value;
  const hash = await sha256(pw);
  if (hash === PW_HASH) {
    sessionStorage.setItem("auth", "1");
    document.getElementById("loginPage").style.display = "none";
    await initApp();
  } else {
    document.getElementById("loginErr").style.display = "block";
    document.getElementById("loginPw").value = "";
  }
}

function doLogout() {
  sessionStorage.removeItem("auth");
  location.reload();
}

function rebuildCache() {
  if (confirm("Rebuild cache? Data akan dimuat ulang dari Turso (menghabiskan jatah rows read).")) {
    clearCache().then(() => location.reload());
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("loginPw").addEventListener("keypress", e => { if (e.key === "Enter") doLogin(); });
  if (sessionStorage.getItem("auth") === "1") {
    document.getElementById("loginPage").style.display = "none";
    await initApp();
  }
});

async function initApp() {
  const ok = await loadData();
  if (!ok) return;
  document.getElementById("mainApp").style.display = "block";
  document.getElementById("dbBadge").textContent = DB_SOURCE;
  document.getElementById("dbBadge").className = DB_SOURCE.includes("Turso") ? "db-badge online" : "db-badge local";
  document.getElementById("sidebarDate").textContent = new Date().toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" });
  document.getElementById("footerStats").textContent = `📊 ${fmtN(DATA_ALL.length)} total paket (${fmtN(DATA.length)} aktif) dari ${fmtN(TOTAL_ROWS)} records | Sumber: ${DB_SOURCE} | Generated: ${new Date().toLocaleString("id-ID")}`;
  renderPage("ringkasan");
}

// ═══ NAVIGATION ═══
function navigate(page) {
  currentPage = page;
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  renderPage(page);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function onSektorChange() {
  currentSektor = document.getElementById("sektorFilter").value;
  renderPage(currentPage);
}

function getFilteredData() {
  if (currentSektor === "Semua") return DATA;
  return DATA.filter(r => r.sektor === currentSektor);
}

function renderPage(page) {
  const map = { ringkasan:"pageRingkasan", kl:"pageKl", wilayah:"pageWilayah", cari:"pageCari" };
  const el  = document.getElementById(map[page]);
  if (!el) return;
  el.classList.add("active");
  switch(page) {
    case "ringkasan": renderRingkasan(el); break;
    case "kl":        renderKL(el);        break;
    case "wilayah":   renderWilayah(el);   break;
    case "cari":      renderCari(el);      break;
  }
}

// ═══ HELPERS ═══
function kpiHTML(label, value, sub) {
  return `<div class="kpi-card">
    <div class="kpi-label">${label}</div>
    <div class="kpi-value">${value}</div>
    ${sub ? `<div class="kpi-sub">${sub}</div>` : ""}
  </div>`;
}

function uniqueCount(data, key) {
  return new Set(data.map(r => r[key]).filter(Boolean)).size;
}

let _uid = 0;
function uid(prefix) { return `${prefix}_${++_uid}`; }

function dlBtn(label, onclick, variant = "download") {
  return `<button class="btn btn-${variant}" onclick="${onclick}">${label}</button>`;
}

// ═══════════════════════════════════════════════════════════════
// PAGE 1: RINGKASAN EKSEKUTIF — ALWAYS ALL DATA (no filter)
// ═══════════════════════════════════════════════════════════════
function renderRingkasan(el) {
  // ═══ STATS MODE (instant) vs RAW MODE (from DATA) ═══
  let nPaketAll, totalPaguAll, totalRealAll, nPemAll, nInstAll, nSatkerAll;
  let nICTAll, nNonAll, paguICTAll, paguNonAll;
  let totalPagu, nPem, paguICT, paguNon, nICT, nNon;
  let top20ICT, top20Non;

  if (STATS) {
    const r = STATS.ringkasan;
    nPaketAll = r.total_paket; totalPaguAll = r.total_pagu; totalRealAll = r.total_realisasi;
    nPemAll = r.pemenang_unik; nInstAll = r.instansi_unik; nSatkerAll = r.satker_unik;
    nICTAll = r.n_ict; nNonAll = r.n_non; paguICTAll = r.pagu_ict; paguNonAll = r.pagu_non;
    totalPagu = r.pagu_active || r.total_pagu;
    nPem = r.pemenang_unik; paguICT = r.pagu_ict; paguNon = r.pagu_non;
    nICT = r.n_ict; nNon = r.n_non;
    top20ICT = r.top20_ict; top20Non = r.top20_non;
  } else {
    const a = DATA_ALL;
    totalPaguAll = a.reduce((s,r) => s + r.pagu, 0);
    totalRealAll = a.reduce((s,r) => s + r.realisasi, 0);
    nPaketAll = a.length;
    nPemAll = uniqueCount(a, "pemenang"); nInstAll = uniqueCount(a, "instansi"); nSatkerAll = uniqueCount(a, "satker");
    nICTAll = a.filter(r => r.sektor === "ICT").length; nNonAll = a.filter(r => r.sektor === "Non-ICT").length;
    paguICTAll = a.filter(r => r.sektor === "ICT").reduce((s,r)=>s+r.pagu,0);
    paguNonAll = a.filter(r => r.sektor === "Non-ICT").reduce((s,r)=>s+r.pagu,0);
    const d = DATA;
    totalPagu = d.reduce((s,r) => s + r.pagu, 0);
    nPem = uniqueCount(d, "pemenang");
    paguICT = d.filter(r => r.sektor === "ICT").reduce((s,r)=>s+r.pagu,0);
    paguNon = d.filter(r => r.sektor === "Non-ICT").reduce((s,r)=>s+r.pagu,0);
    nICT = d.filter(r => r.sektor === "ICT").length;
    nNon = d.filter(r => r.sektor === "Non-ICT").length;
    top20ICT = null; top20Non = null;
  }

  const grandId = uid("grandTop20");
  const heatId  = uid("heatmap");
  const donutIds = WILAYAH_LIST.map(w => uid(`donut_${w.replace(/\s/g,"")}`));
  const grandNonId = uid("grandTop20Non");

  el.innerHTML = `
    <div class="section-card-red">
      <div class="flex-between">
        <div>
          <p class="sec-title">📌 RINGKASAN EKSEKUTIF — REALISASI PENGADAAN PEMERINTAH 2025</p>
          <p class="sec-subtitle">Rangkuman <strong>SELURUH DATA</strong> realisasi (semua sektor, semua wilayah, semua instansi)</p>
        </div>
        <span class="badge-all-data">Semua Data</span>
      </div>
    </div>

    <div class="kpi-grid kpi-grid-6">
      ${kpiHTML("Total Paket", fmtN(nPaketAll), `ICT: ${fmtN(nICTAll)} | Non-ICT: ${fmtN(nNonAll)}`)}
      ${kpiHTML("Total Pagu", fmtRp(totalPaguAll), `ICT: ${fmtRp(paguICTAll)}`)}
      ${kpiHTML("Total Realisasi", fmtRp(totalRealAll))}
      ${kpiHTML("Pemenang Unik", fmtN(nPemAll))}
      ${kpiHTML("Instansi Pembeli", fmtN(nInstAll))}
      ${kpiHTML("Satuan Kerja", fmtN(nSatkerAll))}
    </div>

    <hr class="sep-red">

    <!-- Grand Top 20 ICT -->
    <div class="section-card">
      <p class="sec-title">🏆 Top 20 Pemenang ICT — Seluruh Indonesia</p>
      <p class="sec-subtitle">Ranking ICT berdasarkan total nilai Pagu dari ${fmtN(nPem)} pemenang unik | Semesta: ${fmtRp(totalPagu)}</p>
    </div>
    <div class="chart-card">
      <div class="chart-wrapper" id="${grandId}" style="height:650px"></div>
    </div>
    <div class="btn-group">
      ${dlBtn("⬇️ Download Excel: Grand Top 20 ICT", `dlGrandTop20ICT()`)}
      ${dlBtn("⬇️ Download CSV: Grand Top 20 ICT", `dlGrandTop20ICT_csv()`, "download-sec")}
    </div>

    <hr class="sep">

    <!-- Grand Top 20 Non-ICT -->
    <div class="section-card">
      <p class="sec-title">🏆 Top 20 Pemenang Non-ICT — Seluruh Indonesia</p>
      <p class="sec-subtitle">Ranking Non-ICT berdasarkan total nilai Pagu | Semesta: ${fmtRp(totalPagu)}</p>
    </div>
    <div class="chart-card">
      <div class="chart-wrapper" id="${grandNonId}" style="height:650px"></div>
    </div>
    <div class="btn-group">
      ${dlBtn("⬇️ Download Excel: Grand Top 20 Non-ICT", `dlGrandTop20NonICT()`)}
      ${dlBtn("⬇️ Download CSV: Grand Top 20 Non-ICT", `dlGrandTop20NonICT_csv()`, "download-sec")}
    </div>

    <hr class="sep-red">

    <div class="section-card">
      <p class="sec-title">🗺️ Komposisi ICT vs Non-ICT per 6 Wilayah Indonesia</p>
      <p class="sec-subtitle">Perbandingan proporsi nilai pengadaan ICT dan Non-ICT</p>
    </div>
    <div class="donut-grid">
      ${WILAYAH_LIST.map((w, i) => {
        const cfg = W_CFG[w];
        let wPagu, wPaket, wPem;
        if (STATS) {
          const wd = STATS.ringkasan.wilayah_donut[w] || {};
          wPagu = wd.pagu || 0; wPaket = wd.paket || 0; wPem = wd.pemenang || 0;
        } else {
          const dw = d.filter(r => r.wilayah === w);
          wPagu = dw.reduce((s,r)=>s+r.pagu,0); wPaket = dw.length; wPem = uniqueCount(dw,"pemenang");
        }
        return `<div class="donut-item" style="border-color:${cfg.c}">
          <h4 style="color:${cfg.c}">${cfg.i} ${w}</h4>
          <div class="donut-stats">${fmtRp(wPagu)} | ${fmtN(wPaket)} paket | ${fmtN(wPem)} pemenang</div>
          <div id="${donutIds[i]}" style="max-height:220px"></div>
        </div>`;
      }).join("")}
    </div>

    <hr class="sep-red">

    <div class="section-card">
      <p class="sec-title">🔥 Heatmap: 15 Pemenang Terbesar × 6 Wilayah</p>
      <p class="sec-subtitle">Sebaran nilai pengadaan top pemenang di setiap wilayah Indonesia</p>
    </div>
    <div class="chart-card" style="overflow-x:auto">
      <div id="${heatId}"></div>
    </div>
    <div class="btn-group">
      ${STATS ? "" : dlBtn("⬇️ Download Excel: Semua Data Ringkasan", `dlRingkasanAll()`)}
    </div>
  `;

  requestAnimationFrame(() => {
    const aggICT = top20ICT || aggTopPemenang(d, "ICT", 20);
    const aggNon = top20Non || aggTopPemenang(d, "Non-ICT", 20);

    chartTop20(grandId, aggICT,
      "RANKING: 20 Pemenang ICT Terbesar — Seluruh Indonesia",
      `n = ${fmtN(nICT)} paket ICT | Pagu ICT: ${fmtRp(paguICT)} | Semesta: ${fmtRp(totalPagu)}`,
      "#1D4ED8", totalPagu, 650);

    chartTop20(grandNonId, aggNon,
      "RANKING: 20 Pemenang Non-ICT Terbesar — Seluruh Indonesia",
      `n = ${fmtN(nNon)} paket Non-ICT | Pagu Non-ICT: ${fmtRp(paguNon)} | Semesta: ${fmtRp(totalPagu)}`,
      "#059669", totalPagu, 650);

    WILAYAH_LIST.forEach((w, i) => {
      if (STATS) {
        const wd = STATS.ringkasan.wilayah_donut[w] || {};
        chartDonut(donutIds[i], wd.pagu_ict||0, wd.pagu_non||0, wd.pem_ict||0, wd.pem_non||0, w);
      } else {
        const dw = d.filter(r => r.wilayah === w);
        const ict = dw.filter(r => r.sektor === "ICT");
        const non = dw.filter(r => r.sektor === "Non-ICT");
        chartDonut(donutIds[i], ict.reduce((s,r)=>s+r.pagu,0), non.reduce((s,r)=>s+r.pagu,0),
          uniqueCount(ict,"pemenang"), uniqueCount(non,"pemenang"), w);
      }
    });

    if (STATS && STATS.ringkasan.heatmap) {
      renderHeatmapFromStats(heatId, STATS.ringkasan.heatmap);
    } else {
      renderHeatmap(heatId, d, "Heatmap");
    }
  });

  window.dlGrandTop20ICT = () => {
    const agg = aggTopPemenang(DATA, "ICT", 20);
    exportAggRows(agg, `Grand_Top20_ICT_${_today()}.xlsx`);
  };
  window.dlGrandTop20ICT_csv = () => {
    const agg = aggTopPemenang(DATA, "ICT", 20);
    exportCSV(agg.map(g=>({Pemenang:g.nama,Total_Pagu:g.pagu,Jumlah_Paket:g.paket,Instansi_Unik:g.instansi_n,Satker_Unik:g.satker_n})), `Grand_Top20_ICT_${_today()}.csv`);
  };
  window.dlGrandTop20NonICT = () => {
    const agg = aggTopPemenang(DATA, "Non-ICT", 20);
    exportAggRows(agg, `Grand_Top20_NonICT_${_today()}.xlsx`);
  };
  window.dlGrandTop20NonICT_csv = () => {
    const agg = aggTopPemenang(DATA, "Non-ICT", 20);
    exportCSV(agg.map(g=>({Pemenang:g.nama,Total_Pagu:g.pagu,Jumlah_Paket:g.paket,Instansi_Unik:g.instansi_n,Satker_Unik:g.satker_n})), `Grand_Top20_NonICT_${_today()}.csv`);
  };
  window.dlRingkasanAll = () => exportRawRows(DATA, `Ringkasan_SemData_${_today()}.xlsx`, 10000);
}

function _today() { return new Date().toISOString().slice(0,10); }

// ═══════════════════════════════════════════════════════════════
// PAGE 2: KEMENTERIAN & LEMBAGA — 6 BIDANG STRATEGIS
// ═══════════════════════════════════════════════════════════════
function renderKL(el) {
  const d = STATS ? [] : getFilteredData();
  const temaNames = STATS ? Object.keys(STATS.kl) : Object.keys(TEMA_KL);

  el.innerHTML = `
    <div class="section-card-blue">
      <p class="sec-title">🏛️ ANALISIS PER KEMENTERIAN / LEMBAGA — 6 BIDANG STRATEGIS</p>
      <p class="sec-subtitle">Pemenang pengadaan per bidang K/L pusat (exclude Pemda Kab/Kota/Provinsi) — filter ketat per kementerian terkait</p>
    </div>
    <div class="tab-bar" id="klTabBar">
      ${temaNames.map((t,i) => `<button class="tab-btn ${i===0?"active":""}" data-tema="${t.replace(/"/g,"&quot;")}" onclick="switchKLTab(this.dataset.tema)">${t}</button>`).join("")}
    </div>
    <div id="klTabContent"></div>
  `;

  window.switchKLTab = (tema) => {
    document.querySelectorAll("#klTabBar .tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tema === tema));
    renderKLTema(document.getElementById("klTabContent"), d, tema);
  };

  renderKLTema(document.getElementById("klTabContent"), d, temaNames[0]);
}

function renderKLTema(container, allData, tema) {
  const cfg = TEMA_KL[tema];
  if (!cfg) return;

  // ═══ STATS MODE vs RAW MODE ═══
  let d, totalPagu, nPaket, instList;
  let sKL = null; // stats for this tema
  if (STATS && STATS.kl[tema]) {
    sKL = STATS.kl[tema];
    d = []; // empty, charts use sKL directly
    totalPagu = sKL.pagu;
    nPaket = sKL.paket;
    instList = sKL.instansi_list || [];
  } else {
    d = filterByTema(allData, tema);
    totalPagu = d.reduce((s,r) => s + r.pagu, 0);
    nPaket = d.length;
    instList = getKLInstansiList(d);
  }
  const id        = uid("kl");

  container.innerHTML = `
    <div class="region-card" style="background:#FAFAFA;border-color:${cfg.color}">
      <div class="flex-between">
        <div>
          <h3 style="color:${cfg.color}">${cfg.icon} ${tema}</h3>
          <p style="font-size:12px;color:#555;margin-top:4px">${cfg.desc}</p>
          <p style="font-weight:700;color:${cfg.color};margin-top:4px;font-size:12px">📈 ${cfg.apbn_context}</p>
          <p style="margin-top:6px"><strong>${fmtN(nPaket)} paket</strong> | <strong>${fmtRp(totalPagu)}</strong> | ${fmtN(sKL ? sKL.pemenang_unik : uniqueCount(d,"pemenang"))} pemenang unik | ${fmtN(sKL ? sKL.instansi_unik : uniqueCount(d,"instansi"))} instansi K/L</p>
        </div>
      </div>
    </div>
    ${nPaket === 0 ? '<div class="empty-state"><div class="empty-icon">📭</div><p>Tidak ada data matching untuk bidang ini dengan filter ketat.</p></div>' : `

    <div class="kpi-grid kpi-grid-5">
      ${kpiHTML("Total Paket", fmtN(nPaket))}
      ${kpiHTML("Total Pagu", fmtRp(totalPagu))}
      ${kpiHTML("Pemenang Unik", fmtN(sKL ? sKL.pemenang_unik : uniqueCount(d,"pemenang")))}
      ${kpiHTML("Instansi K/L", fmtN(sKL ? sKL.instansi_unik : uniqueCount(d,"instansi")))}
      ${kpiHTML("Satuan Kerja", fmtN(sKL ? sKL.satker_unik : uniqueCount(d,"satker")))}
    </div>

    <div class="tab-bar" id="klSub_tab_${id}">
      <button class="tab-btn active" onclick="switchKLSub('${id}','ict')">📊 Top 20 ICT</button>
      <button class="tab-btn" onclick="switchKLSub('${id}','non')">📊 Top 20 Non-ICT</button>
      <button class="tab-btn" onclick="switchKLSub('${id}','inst')">📊 Top 15 Instansi K/L</button>
      <button class="tab-btn" onclick="switchKLSub('${id}','detail')">📋 Tabel Detail Paket</button>
    </div>
    <div id="klSub_${id}_ict"    class="tab-content active"></div>
    <div id="klSub_${id}_non"    class="tab-content"></div>
    <div id="klSub_${id}_inst"   class="tab-content"></div>
    <div id="klSub_${id}_detail" class="tab-content"></div>

    <hr class="sep">
    <div class="section-card">
      <p class="sec-title">🔎 Drill-down: Pilih Instansi K/L — ${tema}</p>
      <p class="sec-subtitle">Hanya menampilkan Kementerian/Badan/Lembaga terkait bidang ini (exclude Pemda)</p>
    </div>
    <select class="form-select" style="max-width:640px;margin-bottom:20px" id="selInst_${id}" onchange="renderKLDrill_${id}()">
      <option value="">— Pilih Instansi K/L —</option>
      ${instList.map(i => `<option value="${i}">${i}</option>`).join("")}
    </select>
    <div id="drillKL_${id}"></div>
    `}
  `;

  if (nPaket === 0) return;

  window[`_klData_${id}`] = d;

  window.switchKLSub = (pid, tab) => {
    document.querySelectorAll(`#klSub_tab_${pid} .tab-btn`).forEach((b,i) => b.classList.toggle("active", ["ict","non","inst","detail"][i] === tab));
    ["ict","non","inst","detail"].forEach(t => {
      const e = document.getElementById(`klSub_${pid}_${t}`);
      if (e) e.classList.toggle("active", t === tab);
    });
  };

  window[`renderKLDrill_${id}`] = () => {
    const sel    = document.getElementById(`selInst_${id}`).value;
    const drillEl = document.getElementById(`drillKL_${id}`);
    if (!sel) { drillEl.innerHTML = ""; return; }
    const dd = window[`_klData_${id}`].filter(r => r.instansi === sel);
    renderDrilldown(drillEl, dd, sel, id);
  };

  requestAnimationFrame(() => {
    // ICT
    const aggICT  = sKL ? sKL.top20_ict : aggTopPemenang(d, "ICT");
    const ictEl   = document.getElementById(`klSub_${id}_ict`);
    const ictCId  = uid("klIct");
    ictEl.innerHTML = `
      <div class="chart-card"><div class="chart-wrapper" id="${ictCId}" style="height:600px"></div></div>
      <div class="btn-group">
        ${dlBtn(`⬇️ Download Excel: Top 20 ICT — ${tema}`, `dlKLICT_${id}()`)}
        ${dlBtn(`⬇️ Download CSV`,                         `dlKLICT_csv_${id}()`, "download-sec")}
      </div>`;
    chartTop20(ictCId, aggICT,
      `Top 20 Pemenang ICT — ${tema}`,
      `${cfg.apbn_context} | Pagu: ${fmtRp(totalPagu)}`,
      "#1D4ED8", totalPagu, 600);
    window[`dlKLICT_${id}`]     = () => exportAggRows(aggICT, `Top20_ICT_${tema.substring(0,15)}_${_today()}.xlsx`);
    window[`dlKLICT_csv_${id}`] = () => exportCSV(aggICT.map(g=>({Pemenang:g.nama,Total_Pagu:g.pagu,Paket:g.paket,Instansi:g.instansi_n})), `Top20_ICT_${tema.substring(0,10)}_${_today()}.csv`);

    // Non-ICT
    const aggNon  = sKL ? sKL.top20_non : aggTopPemenang(d, "Non-ICT");
    const nonEl   = document.getElementById(`klSub_${id}_non`);
    const nonCId  = uid("klNon");
    nonEl.innerHTML = `
      <div class="chart-card"><div class="chart-wrapper" id="${nonCId}" style="height:600px"></div></div>
      <div class="btn-group">
        ${dlBtn(`⬇️ Download Excel: Top 20 Non-ICT — ${tema}`, `dlKLNon_${id}()`)}
        ${dlBtn(`⬇️ Download CSV`, `dlKLNon_csv_${id}()`, "download-sec")}
      </div>`;
    chartTop20(nonCId, aggNon,
      `Top 20 Pemenang Non-ICT — ${tema}`,
      `Pagu Non-ICT: ${fmtRp(totalPagu)}`,
      "#059669", totalPagu, 600);
    window[`dlKLNon_${id}`]     = () => exportAggRows(aggNon, `Top20_NonICT_${tema.substring(0,15)}_${_today()}.xlsx`);
    window[`dlKLNon_csv_${id}`] = () => exportCSV(aggNon.map(g=>({Pemenang:g.nama,Total_Pagu:g.pagu,Paket:g.paket,Instansi:g.instansi_n})), `Top20_NonICT_${tema.substring(0,10)}_${_today()}.csv`);

    // Instansi
    const aggInst  = aggTopInstansi(d);
    const instEl   = document.getElementById(`klSub_${id}_inst`);
    const instCId  = uid("klInst");
    const instForChart = aggInst.map(g => ({ nama: g.nama, pagu: g.pagu, paket: g.paket, instansi_n: g.pemenang_n, satker_n: g.satker_n }));
    instEl.innerHTML = `
      <div class="chart-card"><div class="chart-wrapper" id="${instCId}" style="height:520px"></div></div>
      <div class="btn-group">
        ${dlBtn(`⬇️ Download Excel: Top 15 Instansi K/L`, `dlKLInst_${id}()`)}
        ${dlBtn(`⬇️ Download CSV`, `dlKLInst_csv_${id}()`, "download-sec")}
      </div>`;
    chartTop20(instCId, instForChart,
      `Top 15 Instansi K/L Pembeli — ${tema}`,
      `${fmtN(uniqueCount(d,"instansi"))} instansi total | Total Pagu: ${fmtRp(totalPagu)}`,
      "#EA580C", totalPagu, 520);
    window[`dlKLInst_${id}`]     = () => exportExcel(aggInst.map(g=>({Instansi:g.nama,Total_Pagu:g.pagu,Paket:g.paket,Pemenang_Unik:g.pemenang_n,Satker_Unik:g.satker_n})), `Top15_Instansi_${tema.substring(0,12)}_${_today()}.xlsx`);
    window[`dlKLInst_csv_${id}`] = () => exportCSV(aggInst.map(g=>({Instansi:g.nama,Total_Pagu:g.pagu,Paket:g.paket,Pemenang_Unik:g.pemenang_n})), `Top15_Instansi_${tema.substring(0,10)}_${_today()}.csv`);

    // Detail
    renderDetailTable(document.getElementById(`klSub_${id}_detail`), d, tema, id);
  });
}

// ═══════════════════════════════════════════════════════════════
// PAGE 3: WILAYAH & DINAS
// ═══════════════════════════════════════════════════════════════
function renderWilayah(el) {
  el.innerHTML = `
    <div class="section-card-red">
      <p class="sec-title">🗺️ ANALISIS PER WILAYAH & DINAS STRATEGIS — PEMDA</p>
      <p class="sec-subtitle">Pemenang pengadaan dari Pemda (Kab/Kota/Provinsi) per wilayah dan dinas</p>
    </div>
    <div class="subnav">
      <button class="subnav-btn active" id="swBtn_perwil" onclick="switchWilSub('perwil')">📍 Per Wilayah (6 Wilayah)</button>
      <button class="subnav-btn"        id="swBtn_dkom"   onclick="switchWilSub('dkom')">📡 Diskominfo se-Indonesia</button>
      <button class="subnav-btn"        id="swBtn_perdinas" onclick="switchWilSub('perdinas')">🏢 Per Dinas Strategis</button>
    </div>
    <div id="wilContent"></div>
  `;

  const allData = getFilteredData();

  window.switchWilSub = (sub) => {
    document.querySelectorAll(".subnav-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(`swBtn_${sub}`).classList.add("active");
    const c = document.getElementById("wilContent");
    switch(sub) {
      case "perwil":   renderPerWilayah(c, allData); break;
      case "dkom":     renderDiskominfo(c, allData);  break;
      case "perdinas": renderPerDinas(c, allData);    break;
    }
  };

  window.switchWilSub("perwil");
}

function renderPerWilayah(container, allData) {
  const semAll = WILAYAH_LIST.reduce((s,w) => s + filterPemdaWilayah(allData, w).reduce((a,r)=>a+r.pagu,0), 0);

  container.innerHTML = `
    <div class="tab-bar" id="wilTabBar">
      ${WILAYAH_LIST.map((w,i) => `<button class="tab-btn ${i===0?"active":""}" data-wil="${w}" onclick="switchWilTab('${w}')">${W_CFG[w].i} ${w}</button>`).join("")}
    </div>
    <div id="wilTabContent"></div>
  `;

  window.switchWilTab = (w) => {
    document.querySelectorAll("#wilTabBar .tab-btn").forEach(b => b.classList.toggle("active", b.dataset.wil === w));
    renderWilayahTab(document.getElementById("wilTabContent"), allData, w, semAll);
  };

  renderWilayahTab(document.getElementById("wilTabContent"), allData, WILAYAH_LIST[0], semAll);
}

function renderWilayahTab(container, allData, wilayah, semAll) {
  const d        = filterPemdaWilayah(allData, wilayah);
  const totalPagu = d.reduce((s,r) => s + r.pagu, 0);
  const cfg      = W_CFG[wilayah];
  const strategy = WILAYAH_STRATEGY[wilayah];
  const id       = uid("wil");

  container.innerHTML = `
    <div class="region-card" style="background:${cfg.bg};border-color:${cfg.c}">
      <h3 style="color:${cfg.c}">${cfg.i} Wilayah ${wilayah} — Pengadaan Pemda</h3>
      <p style="color:#374151;margin-top:4px;font-style:italic">${strategy.tkd}</p>
      <p style="margin-top:6px">${fmtN(d.length)} paket | ${fmtRp(totalPagu)} | ${fmtN(uniqueCount(d,"pemenang"))} pemenang | ${fmtN(uniqueCount(d,"instansi"))} instansi Pemda</p>
    </div>
    ${d.length === 0 ? '<div class="empty-state"><p>Tidak ada data Pemda di wilayah ini.</p></div>' : `
    <div class="kpi-grid kpi-grid-4">
      ${kpiHTML("Total Paket", fmtN(d.length))}
      ${kpiHTML("Total Pagu", fmtRp(totalPagu))}
      ${kpiHTML("Pemenang Unik", fmtN(uniqueCount(d,"pemenang")))}
      ${kpiHTML("Instansi Pemda", fmtN(uniqueCount(d,"instansi")))}
    </div>
    <div class="tab-bar" id="wSub_tab_${id}">
      <button class="tab-btn active" onclick="switchWSub('${id}','ict')">📊 Top 20 ICT</button>
      <button class="tab-btn" onclick="switchWSub('${id}','non')">📊 Top 20 Non-ICT</button>
      <button class="tab-btn" onclick="switchWSub('${id}','inst')">📊 Top 15 Instansi Pemda</button>
      <button class="tab-btn" onclick="switchWSub('${id}','detail')">📋 Tabel Detail</button>
    </div>
    <div id="wSub_${id}_ict"    class="tab-content active"></div>
    <div id="wSub_${id}_non"    class="tab-content"></div>
    <div id="wSub_${id}_inst"   class="tab-content"></div>
    <div id="wSub_${id}_detail" class="tab-content"></div>

    <hr class="sep">
    <div class="section-card">
      <p class="sec-title">🔎 Drill-down: Pilih Instansi Pemda — ${wilayah}</p>
    </div>
    <select class="form-select" style="max-width:640px;margin-bottom:20px" id="selWilInst_${id}" onchange="renderWilDrill_${id}()">
      <option value="">— Pilih Instansi Pemda —</option>
      ${getTopInstansi(d,25).map(i => `<option value="${i}">${i}</option>`).join("")}
    </select>
    <div id="drillWil_${id}"></div>
    `}
  `;

  if (d.length === 0) return;
  window[`_wilData_${id}`] = d;

  window.switchWSub = (pid, tab) => {
    document.querySelectorAll(`#wSub_tab_${pid} .tab-btn`).forEach((b,i) => b.classList.toggle("active", ["ict","non","inst","detail"][i] === tab));
    ["ict","non","inst","detail"].forEach(t => { const e = document.getElementById(`wSub_${pid}_${t}`); if(e) e.classList.toggle("active", t===tab); });
  };

  window[`renderWilDrill_${id}`] = () => {
    const sel    = document.getElementById(`selWilInst_${id}`).value;
    const drillEl = document.getElementById(`drillWil_${id}`);
    if (!sel) { drillEl.innerHTML=""; return; }
    const dd = window[`_wilData_${id}`].filter(r => r.instansi === sel);
    renderDrilldown(drillEl, dd, sel, id);
  };

  requestAnimationFrame(() => {
    const ictData = d.filter(r => r.sektor === "ICT");
    const aggICT  = aggTopPemenang(d, "ICT");
    const ictEl   = document.getElementById(`wSub_${id}_ict`);
    const ictCId  = uid("wIct");
    ictEl.innerHTML = `
      <div class="chart-card"><div class="chart-wrapper" id="${ictCId}" style="height:600px"></div></div>
      <div class="btn-group">
        ${dlBtn(`⬇️ Download Excel: Top 20 ICT Pemda ${wilayah}`, `dlWICT_${id}()`)}
        ${dlBtn(`⬇️ Download CSV`, `dlWICT_csv_${id}()`, "download-sec")}
      </div>`;
    chartTop20(ictCId, aggICT,
      `Top 20 Pemenang ICT — Pemda Wilayah ${wilayah}`,
      `n = ${fmtN(ictData.length)} paket ICT | Pagu ICT: ${fmtRp(ictData.reduce((s,r)=>s+r.pagu,0))} | Semesta Pemda: ${fmtRp(semAll)}`,
      "#1D4ED8", semAll, 600);
    window[`dlWICT_${id}`]     = () => exportAggRows(aggICT, `Top20_ICT_Pemda_${wilayah.replace(/\s/g,"")}_${_today()}.xlsx`);
    window[`dlWICT_csv_${id}`] = () => exportCSV(aggICT.map(g=>({Pemenang:g.nama,Total_Pagu:g.pagu,Paket:g.paket})), `Top20_ICT_Pemda_${wilayah.replace(/\s/g,"")}_${_today()}.csv`);

    const nonData = d.filter(r => r.sektor === "Non-ICT");
    const aggNon  = aggTopPemenang(d, "Non-ICT");
    const nonEl   = document.getElementById(`wSub_${id}_non`);
    const nonCId  = uid("wNon");
    nonEl.innerHTML = `
      <div class="chart-card"><div class="chart-wrapper" id="${nonCId}" style="height:600px"></div></div>
      <div class="btn-group">
        ${dlBtn(`⬇️ Download Excel: Top 20 Non-ICT Pemda ${wilayah}`, `dlWNon_${id}()`)}
        ${dlBtn(`⬇️ Download CSV`, `dlWNon_csv_${id}()`, "download-sec")}
      </div>`;
    chartTop20(nonCId, aggNon,
      `Top 20 Pemenang Non-ICT — Pemda Wilayah ${wilayah}`,
      `n = ${fmtN(nonData.length)} paket | Pagu Non-ICT: ${fmtRp(nonData.reduce((s,r)=>s+r.pagu,0))}`,
      "#059669", semAll, 600);
    window[`dlWNon_${id}`]     = () => exportAggRows(aggNon, `Top20_NonICT_Pemda_${wilayah.replace(/\s/g,"")}_${_today()}.xlsx`);
    window[`dlWNon_csv_${id}`] = () => exportCSV(aggNon.map(g=>({Pemenang:g.nama,Total_Pagu:g.pagu,Paket:g.paket})), `Top20_NonICT_Pemda_${wilayah.replace(/\s/g,"")}_${_today()}.csv`);

    const aggInst  = aggTopInstansi(d);
    const instEl   = document.getElementById(`wSub_${id}_inst`);
    const instCId  = uid("wInst");
    instEl.innerHTML = `
      <div class="chart-card"><div class="chart-wrapper" id="${instCId}" style="height:520px"></div></div>
      <div class="btn-group">
        ${dlBtn(`⬇️ Download Excel: Top 15 Instansi Pemda ${wilayah}`, `dlWInst_${id}()`)}
        ${dlBtn(`⬇️ Download CSV`, `dlWInst_csv_${id}()`, "download-sec")}
      </div>`;
    chartTop20(instCId, aggInst.map(g=>({nama:g.nama,pagu:g.pagu,paket:g.paket,instansi_n:g.pemenang_n,satker_n:g.satker_n})),
      `Top 15 Instansi Pemda Pembeli — Wilayah ${wilayah}`,
      `${fmtN(uniqueCount(d,"instansi"))} instansi Pemda | Total: ${fmtRp(totalPagu)}`,
      "#EA580C", totalPagu, 520);
    window[`dlWInst_${id}`]     = () => exportExcel(aggInst.map(g=>({Instansi:g.nama,Total_Pagu:g.pagu,Paket:g.paket,Pemenang_Unik:g.pemenang_n})), `Top15_Instansi_${wilayah.replace(/\s/g,"")}_${_today()}.xlsx`);
    window[`dlWInst_csv_${id}`] = () => exportCSV(aggInst.map(g=>({Instansi:g.nama,Total_Pagu:g.pagu,Paket:g.paket})), `Top15_Instansi_${wilayah.replace(/\s/g,"")}_${_today()}.csv`);

    renderDetailTable(document.getElementById(`wSub_${id}_detail`), d, `Pemda ${wilayah}`, id);
  });
}

function renderDiskominfo(container, allData) {
  const d        = allData.filter(r => r.is_pemda && DINAS_PATTERNS["Diskominfo"].test(r.satker));
  const totalPagu = d.reduce((s,r) => s + r.pagu, 0);
  const id       = uid("dkom");

  container.innerHTML = `
    <div class="section-card-blue">
      <p class="sec-title">📡 ANALISIS DISKOMINFO SE-INDONESIA — KHUSUS PEMDA</p>
      <p class="sec-subtitle">Satuan kerja Diskominfo / Komunikasi & Informatika dari seluruh Pemda Indonesia</p>
    </div>
    ${d.length === 0 ? '<div class="empty-state"><p>Tidak ada data DISKOMINFO Pemda.</p></div>' : `
    <div class="kpi-grid kpi-grid-4">
      ${kpiHTML("Total Paket", fmtN(d.length))}
      ${kpiHTML("Total Pagu", fmtRp(totalPagu))}
      ${kpiHTML("Instansi Pemda", fmtN(uniqueCount(d,"instansi")))}
      ${kpiHTML("Pemenang Unik", fmtN(uniqueCount(d,"pemenang")))}
    </div>
    <div class="chart-card"><div class="chart-wrapper" id="${id}_chart" style="height:600px"></div></div>
    <div class="btn-group">
      ${dlBtn("⬇️ Download Excel: Top 20 Pemenang Diskominfo", `dlDkom_${id}()`)}
      ${dlBtn("⬇️ Download Excel: Semua Data Diskominfo", `dlDkomAll_${id}()`, "download-sec")}
    </div>
    <hr class="sep">
    <div class="section-card">
      <p class="sec-title">🔎 Drill-down: Pilih Instansi Pemda (Diskominfo)</p>
    </div>
    <select class="form-select" style="max-width:640px;margin-bottom:20px" id="selDkom_${id}" onchange="renderDkomDrill_${id}()">
      <option value="">— Pilih Instansi Pemda —</option>
      ${getTopInstansi(d,30).map(i=>`<option value="${i}">${i}</option>`).join("")}
    </select>
    <div id="drillDkom_${id}"></div>
    `}
  `;

  if (d.length === 0) return;

  requestAnimationFrame(() => {
    const agg = aggTopPemenang(d, null, 20);
    chartTop20(`${id}_chart`, agg,
      "Top 20 Pemenang Pengadaan — Diskominfo Pemda se-Indonesia",
      `n = ${fmtN(d.length)} paket | Total: ${fmtRp(totalPagu)} | ${fmtN(uniqueCount(d,"instansi"))} Pemda`,
      "#7C3AED", totalPagu, 600);
    window[`dlDkom_${id}`]    = () => exportAggRows(agg, `Top20_Diskominfo_${_today()}.xlsx`);
    window[`dlDkomAll_${id}`] = () => exportRawRows(d, `SemuaData_Diskominfo_${_today()}.xlsx`);
  });

  window[`_dkomData_${id}`] = d;
  window[`renderDkomDrill_${id}`] = () => {
    const sel    = document.getElementById(`selDkom_${id}`).value;
    const drillEl = document.getElementById(`drillDkom_${id}`);
    if (!sel) { drillEl.innerHTML=""; return; }
    renderDrilldown(drillEl, d.filter(r=>r.instansi===sel), sel, id);
  };
}

function renderPerDinas(container, allData) {
  container.innerHTML = `
    <div class="section-card">
      <p class="sec-title">🏢 ANALISIS PER DINAS STRATEGIS — PEMDA</p>
      <p class="sec-subtitle">Pilih wilayah → pilih dinas → lihat pemenang per instansi Pemda</p>
    </div>
    <div class="form-group" style="max-width:400px;margin-bottom:20px">
      <label class="form-label">Pilih Wilayah:</label>
      <select class="form-select" id="dinasWilSel" onchange="renderDinasForWil()">
        ${WILAYAH_LIST.map(w => `<option value="${w}">${W_CFG[w].i} ${w}</option>`).join("")}
      </select>
    </div>
    <div id="dinasContent"></div>
  `;

  window.renderDinasForWil = () => {
    const w        = document.getElementById("dinasWilSel").value;
    const dw       = filterPemdaWilayah(allData, w);
    const strategy = WILAYAH_STRATEGY[w];
    const cfg      = W_CFG[w];
    const dc       = document.getElementById("dinasContent");

    dc.innerHTML = `
      <div class="tab-bar" id="dinasTabBar">
        ${strategy.dinas.map((d,i) => `<button class="tab-btn ${i===0?"active":""}" data-dinas="${d}" onclick="switchDinasTab('${d}')">${d}</button>`).join("")}
      </div>
      <div id="dinasTabContent"></div>
    `;

    window.switchDinasTab = (dinas) => {
      document.querySelectorAll("#dinasTabBar .tab-btn").forEach(b => b.classList.toggle("active", b.dataset.dinas === dinas));
      const dd = filterByDinas(dw, dinas);
      renderDinasTab(document.getElementById("dinasTabContent"), dd, dinas, w, cfg, strategy);
    };

    window.switchDinasTab(strategy.dinas[0]);
  };

  window.renderDinasForWil();
}

function renderDinasTab(container, d, dinas, wilayah, cfg, strategy) {
  const totalPagu = d.reduce((s,r) => s + r.pagu, 0);
  const id        = uid("dinas");

  if (d.length === 0) { container.innerHTML = `<div class="empty-state"><p>Tidak ada data ${dinas} di ${wilayah}.</p></div>`; return; }

  container.innerHTML = `
    <div class="region-card" style="background:${cfg.bg};border-color:${cfg.c}">
      <h3 style="color:${cfg.c}">${dinas} — Wilayah ${wilayah}</h3>
      <p style="color:#374151;font-style:italic">${strategy.tkd}</p>
      <p style="margin-top:4px">${fmtN(d.length)} paket | ${fmtRp(totalPagu)} | ${fmtN(uniqueCount(d,"pemenang"))} pemenang | ${fmtN(uniqueCount(d,"instansi"))} instansi</p>
    </div>
    <div class="kpi-grid kpi-grid-4">
      ${kpiHTML("Total Paket", fmtN(d.length))}
      ${kpiHTML("Total Pagu", fmtRp(totalPagu))}
      ${kpiHTML("Pemenang Unik", fmtN(uniqueCount(d,"pemenang")))}
      ${kpiHTML("Instansi Unik", fmtN(uniqueCount(d,"instansi")))}
    </div>
    <div class="chart-card"><div class="chart-wrapper" id="${id}_chart" style="height:600px"></div></div>
    <div class="btn-group">
      ${dlBtn(`⬇️ Download Excel: Top 20 Pemenang — ${dinas} ${wilayah}`, `dlDinas_${id}()`)}
      ${dlBtn(`⬇️ Download Excel: Semua Paket`, `dlDinasAll_${id}()`, "download-sec")}
      ${dlBtn(`⬇️ Download CSV`, `dlDinasCSV_${id}()`, "download-sec")}
    </div>
    <hr class="sep">
    <div class="section-card">
      <p class="sec-title">🔎 Drill-down: Pilih Instansi Pemda (${dinas} — ${wilayah})</p>
    </div>
    <select class="form-select" style="max-width:640px;margin-bottom:20px" id="selDinas_${id}" onchange="renderDinasDrill_${id}()">
      <option value="">— Pilih Instansi —</option>
      ${getTopInstansi(d,20).map(i=>`<option value="${i}">${i}</option>`).join("")}
    </select>
    <div id="drillDinas_${id}"></div>
  `;

  requestAnimationFrame(() => {
    const semAll = filterPemdaWilayah(getFilteredData(), wilayah).reduce((s,r)=>s+r.pagu,0);
    const agg    = aggTopPemenang(d, null, 20);
    chartTop20(`${id}_chart`, agg,
      `Top 20 Pemenang — ${dinas} Pemda Wilayah ${wilayah}`,
      `TKD: ${strategy.tkd} | n = ${fmtN(d.length)} paket | Total: ${fmtRp(totalPagu)}`,
      cfg.c, semAll, 600);
    window[`dlDinas_${id}`]    = () => exportAggRows(agg, `Top20_${dinas.replace(/\s/g,"")}_${wilayah.replace(/\s/g,"")}_${_today()}.xlsx`);
    window[`dlDinasAll_${id}`] = () => exportRawRows(d, `Paket_${dinas.replace(/\s/g,"")}_${wilayah.replace(/\s/g,"")}_${_today()}.xlsx`);
    window[`dlDinasCSV_${id}`] = () => exportCSV(d.slice(0,5000).map(r=>({Pemenang:r.pemenang,Pagu:r.pagu,Instansi:r.instansi,Satker:r.satker,Nama_Paket:r.nama_paket})), `Paket_${dinas.replace(/\s/g,"")}_${_today()}.csv`);
  });

  window[`_dinasData_${id}`] = d;
  window[`renderDinasDrill_${id}`] = () => {
    const sel    = document.getElementById(`selDinas_${id}`).value;
    const drillEl = document.getElementById(`drillDinas_${id}`);
    if (!sel) { drillEl.innerHTML=""; return; }
    renderDrilldown(drillEl, d.filter(r=>r.instansi===sel), sel, id);
  };
}

// ═══════════════════════════════════════════════════════════════
// PAGE 4: PENCARIAN & FILTER
// ═══════════════════════════════════════════════════════════════
function renderCari(el) {
  el.innerHTML = `
    <div class="section-card">
      <p class="sec-title">🔍 PENCARIAN & FILTER DATA PENGADAAN</p>
      <p class="sec-subtitle">Cari berdasarkan nama pemenang, instansi, wilayah, atau sektor</p>
    </div>
    <div class="filter-row">
      <div class="form-group">
        <label class="form-label">🔍 Cari Nama Pemenang</label>
        <input class="form-input" id="searchPem" placeholder="Ketik nama vendor..." oninput="debounceSearch()">
      </div>
      <div class="form-group">
        <label class="form-label">🏛️ Cari Instansi</label>
        <input class="form-input" id="searchInst" placeholder="Ketik instansi..." oninput="debounceSearch()">
      </div>
      <div class="form-group">
        <label class="form-label">🗺️ Wilayah</label>
        <select class="form-select" id="searchWil" onchange="doSearch()">
          <option value="">Semua</option>
          ${WILAYAH_LIST.map(w => `<option value="${w}">${w}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">🔍 Sektor</label>
        <select class="form-select" id="searchSek" onchange="doSearch()">
          <option value="">Semua</option>
          <option value="ICT">ICT</option>
          <option value="Non-ICT">Non-ICT</option>
        </select>
      </div>
    </div>
    <div id="searchResults"></div>
  `;

  let timer;
  window.debounceSearch = () => { clearTimeout(timer); timer = setTimeout(doSearch, 400); };
  window.doSearch = () => {
    const pem  = (document.getElementById("searchPem").value || "").toLowerCase().trim();
    const inst = (document.getElementById("searchInst").value || "").toLowerCase().trim();
    const wil  = document.getElementById("searchWil").value;
    const sek  = document.getElementById("searchSek").value;

    let d = DATA; // Search across ALL data
    if (pem)  d = d.filter(r => r.pemenang.toLowerCase().includes(pem) || (r.nama_display||"").toLowerCase().includes(pem));
    if (inst) d = d.filter(r => r.instansi.toLowerCase().includes(inst));
    if (wil)  d = d.filter(r => r.wilayah === wil);
    if (sek)  d = d.filter(r => r.sektor === sek);

    const resEl    = document.getElementById("searchResults");
    const totalPagu = d.reduce((s,r) => s + r.pagu, 0);
    const id       = uid("search");

    resEl.innerHTML = `
      <div class="section-card" style="margin-bottom:16px">
        <p class="sec-title" style="font-size:16px">Hasil Pencarian: ${fmtN(d.length)} paket | ${fmtRp(totalPagu)} | ${fmtN(uniqueCount(d,"pemenang"))} pemenang unik</p>
      </div>
      ${d.length > 0 ? `
        <div class="chart-card"><div class="chart-wrapper" id="${id}_chart" style="height:550px"></div></div>
        <div class="btn-group">
          ${dlBtn("⬇️ Download Excel: Top 20 Pemenang", `dlSearchTop_${id}()`)}
          ${dlBtn("⬇️ Download Excel: Semua Hasil (maks. 5.000)", `dlSearchAll_${id}()`)}
          ${dlBtn("⬇️ Download CSV: Semua Hasil", `dlSearchCSV_${id}()`, "download-sec")}
        </div>
        <hr class="sep">
        <div class="table-card">
          <div class="flex-between" style="margin-bottom:12px">
            <p class="table-title">📋 Data Mentah — Hasil Pencarian (maks. 500 baris)</p>
          </div>
          <div class="table-scroll" id="${id}_table"></div>
        </div>
      ` : '<div class="empty-state"><div class="empty-icon">🔍</div><p>Tidak ada data yang cocok dengan filter.</p></div>'}
    `;

    if (d.length > 0) {
      window[`dlSearchTop_${id}`] = () => exportAggRows(aggTopPemenang(d, null, 20), `SearchTop20_${_today()}.xlsx`);
      window[`dlSearchAll_${id}`] = () => exportRawRows(d, `SearchResult_${_today()}.xlsx`, 5000);
      window[`dlSearchCSV_${id}`] = () => exportCSV(d.slice(0,5000).map(r=>({Pemenang:r.pemenang,Pagu:r.pagu,Instansi:r.instansi,Satker:r.satker,Lokasi:r.lokasi,Wilayah:r.wilayah,Sektor:r.sektor,Nama_Paket:r.nama_paket})), `SearchResult_${_today()}.csv`);

      requestAnimationFrame(() => {
        const agg = aggTopPemenang(d, null, 20);
        chartTop20(`${id}_chart`, agg,
          "RANKING: Top 20 Pemenang — Hasil Pencarian",
          `n = ${fmtN(d.length)} paket | Total: ${fmtRp(totalPagu)}`,
          "#DC2626", totalPagu, 550);
        renderRawTable(document.getElementById(`${id}_table`), d.slice(0,500));
      });
    }
  };
}

// ═══ SHARED COMPONENTS ═══
function getTopInstansi(data, n) {
  const map = {};
  data.forEach(r => { if (r.instansi) map[r.instansi] = (map[r.instansi]||0) + r.pagu; });
  return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,n).map(e=>e[0]);
}

function renderDetailTable(container, data, label, prefix) {
  const sorted = [...data].sort((a,b) => b.pagu - a.pagu).slice(0, 500);
  const id     = uid("dtl");
  const safe   = label.replace(/[^a-zA-Z0-9]/g,"").substring(0,15);

  container.innerHTML = `
    <div class="flex-between" style="margin-bottom:8px">
      <p class="table-title">📋 TABEL: Daftar ${fmtN(Math.min(500,data.length))} Paket Terbesar — ${label}</p>
    </div>
    <div class="table-scroll" id="${id}"></div>
    <div class="btn-group" style="margin-top:16px">
      ${dlBtn(`⬇️ Download Excel: Detail Paket — ${label}`, `dlDtl_${id}()`)}
      ${dlBtn(`⬇️ Download CSV`, `dlDtlCSV_${id}()`, "download-sec")}
    </div>
  `;
  renderRawTable(document.getElementById(id), sorted);

  window[`dlDtl_${id}`]    = () => exportRawRows(data, `Detail_${safe}_${_today()}.xlsx`, 5000);
  window[`dlDtlCSV_${id}`] = () => exportCSV(data.slice(0,5000).map(r=>({Pemenang:r.pemenang,Pagu:r.pagu,Instansi:r.instansi,Satker:r.satker,Lokasi:r.lokasi,Sektor:r.sektor,Nama_Paket:r.nama_paket})), `Detail_${safe}_${_today()}.csv`);
}

function renderRawTable(container, rows) {
  if (!container || !rows.length) return;
  let html = `<table class="data-table"><thead><tr>
    <th>#</th><th>Pemenang</th><th>Pagu (Rp)</th><th>Instansi Pembeli</th><th>Satuan Kerja</th><th>Lokasi</th><th>Sektor</th><th>Metode</th><th>Nama Paket</th>
  </tr></thead><tbody>`;
  rows.forEach((r, i) => {
    const badge = r.sektor === "ICT"
      ? '<span class="sektor-badge ict">ICT</span>'
      : '<span class="sektor-badge non">Non-ICT</span>';
    html += `<tr>
      <td>${i+1}</td>
      <td class="td-ellipsis td-bold" title="${r.pemenang}">${r.nama_display || r.pemenang}</td>
      <td class="td-right td-bold td-nowrap">${fmtRp(r.pagu)}</td>
      <td class="td-ellipsis td-wide" title="${r.instansi}">${r.instansi}</td>
      <td class="td-ellipsis" title="${r.satker}">${r.satker}</td>
      <td class="td-nowrap">${r.lokasi}</td>
      <td>${badge}</td>
      <td class="td-nowrap">${r.metode}</td>
      <td class="td-ellipsis td-xl" title="${r.nama_paket}">${r.nama_paket}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}

function renderDrilldown(container, data, label, prefix) {
  if (!data.length) {
    container.innerHTML = `<div class="empty-state"><p>Tidak ada data untuk ${label}</p></div>`;
    return;
  }
  const totalPagu = data.reduce((s,r) => s + r.pagu, 0);
  const id        = uid("drill");
  const safe      = label.replace(/[^a-zA-Z0-9]/g,"").substring(0,15);

  const aggICT = aggTopPemenang(data, "ICT", 20);
  const aggNon = aggTopPemenang(data, "Non-ICT", 20);

  container.innerHTML = `
    <div class="kpi-grid kpi-grid-4">
      ${kpiHTML("Total Paket", fmtN(data.length))}
      ${kpiHTML("Total Pagu", fmtRp(totalPagu))}
      ${kpiHTML("Pemenang Unik", fmtN(uniqueCount(data,"pemenang")))}
      ${kpiHTML("Satker Unik", fmtN(uniqueCount(data,"satker")))}
    </div>
    <div class="grid-2">
      <div class="table-card">
        <p class="table-title">🔵 Top 20 Pemenang ICT — ${label}</p>
        <div id="${id}_ict"></div>
        <div class="btn-group" style="margin-top:12px">
          ${dlBtn("⬇️ Excel ICT", `dlDrillICT_${id}()`)}
          ${dlBtn("⬇️ CSV ICT", `dlDrillICT_csv_${id}()`, "download-sec")}
        </div>
      </div>
      <div class="table-card">
        <p class="table-title">🟢 Top 20 Pemenang Non-ICT — ${label}</p>
        <div id="${id}_non"></div>
        <div class="btn-group" style="margin-top:12px">
          ${dlBtn("⬇️ Excel Non-ICT", `dlDrillNon_${id}()`)}
          ${dlBtn("⬇️ CSV Non-ICT", `dlDrillNon_csv_${id}()`, "download-sec")}
        </div>
      </div>
    </div>
    <div class="table-card">
      <p class="table-title">📋 Daftar Paket — ${label} (${fmtN(Math.min(500,data.length))} baris)</p>
      <div class="table-scroll" id="${id}_raw"></div>
      <div class="btn-group" style="margin-top:12px">
        ${dlBtn(`⬇️ Download Excel: Daftar Paket ${label}`, `dlDrillAll_${id}()`)}
        ${dlBtn(`⬇️ Download CSV`, `dlDrillCSV_${id}()`, "download-sec")}
      </div>
    </div>
  `;

  const renderAggTable = (elId, agg) => {
    const el = document.getElementById(elId);
    if (!el || !agg.length) { if(el) el.innerHTML='<p style="color:#999;font-size:12px;padding:8px">Tidak ada data.</p>'; return; }
    let html = '<table class="data-table"><thead><tr><th>#</th><th>Pemenang</th><th>Total Pagu</th><th>Paket</th><th>Instansi</th></tr></thead><tbody>';
    agg.forEach((r,i) => {
      html += `<tr><td>${i+1}</td><td class="td-bold">${r.nama}</td><td class="td-right td-bold">${fmtRp(r.pagu)}</td><td>${r.paket}</td><td>${r.instansi_n}</td></tr>`;
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  };

  renderAggTable(`${id}_ict`, aggICT);
  renderAggTable(`${id}_non`, aggNon);
  renderRawTable(document.getElementById(`${id}_raw`), [...data].sort((a,b)=>b.pagu-a.pagu).slice(0,500));

  window[`dlDrillICT_${id}`]     = () => exportAggRows(aggICT, `DrillICT_${safe}_${_today()}.xlsx`);
  window[`dlDrillICT_csv_${id}`] = () => exportCSV(aggICT.map(g=>({Pemenang:g.nama,Total_Pagu:g.pagu,Paket:g.paket})), `DrillICT_${safe}_${_today()}.csv`);
  window[`dlDrillNon_${id}`]     = () => exportAggRows(aggNon, `DrillNon_${safe}_${_today()}.xlsx`);
  window[`dlDrillNon_csv_${id}`] = () => exportCSV(aggNon.map(g=>({Pemenang:g.nama,Total_Pagu:g.pagu,Paket:g.paket})), `DrillNon_${safe}_${_today()}.csv`);
  window[`dlDrillAll_${id}`]     = () => exportRawRows(data, `Drill_${safe}_${_today()}.xlsx`, 5000);
  window[`dlDrillCSV_${id}`]     = () => exportCSV(data.slice(0,5000).map(r=>({Pemenang:r.pemenang,Pagu:r.pagu,Instansi:r.instansi,Satker:r.satker,Nama_Paket:r.nama_paket})), `Drill_${safe}_${_today()}.csv`);
}