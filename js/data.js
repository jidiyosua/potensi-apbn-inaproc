/* ═══════════════════════════════════════════════════════════════
   DATA LAYER — Turso HTTP API + JSON Local Cache
   Telkomsel Enterprise | INAPROC Dashboard v4.0
   ═══════════════════════════════════════════════════════════════ */

const TURSO_URL = "https://datamart-jidiyosua.aws-eu-west-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzUwMjMyOTMsImlkIjoiMDE5ZDQ3MWMtM2EwMS03N2FiLTk1ZGItM2QzMzJjNzkxZDViIiwicmlkIjoiZmY0NjljZDMtY2ZlMy00YjUzLWI1NjMtYWY5NmVhZTJiOTg2In0.smf3CuGes3WLws8Dz3KbQu3CJQijntU8NdVcBOIVdpYEXgIHO6D1SZoX24ozbHLsxltQdI46TC-IZbCQ0WRdBQ";
const DB_NAME = "Datamart_Final_Report.db";
const CHUNK_SIZE = 100000;

// ═══ WILAYAH MAP ═══
const WILAYAH_MAP = {
  "Aceh": "Sumatera", "Sumatera Utara": "Sumatera", "Sumatera Barat": "Sumatera",
  "Riau": "Sumatera", "Kepulauan Riau": "Sumatera", "Jambi": "Sumatera",
  "Sumatera Selatan": "Sumatera", "Bangka Belitung": "Sumatera",
  "Bengkulu": "Sumatera", "Lampung": "Sumatera",
  "DKI Jakarta": "Jawa", "Jawa Barat": "Jawa", "Jawa Tengah": "Jawa",
  "DI Yogyakarta": "Jawa", "Jawa Timur": "Jawa", "Banten": "Jawa",
  "Kalimantan Barat": "Kalimantan", "Kalimantan Tengah": "Kalimantan",
  "Kalimantan Selatan": "Kalimantan", "Kalimantan Timur": "Kalimantan",
  "Kalimantan Utara": "Kalimantan",
  "Sulawesi Utara": "Sulawesi", "Gorontalo": "Sulawesi", "Sulawesi Tengah": "Sulawesi",
  "Sulawesi Selatan": "Sulawesi", "Sulawesi Barat": "Sulawesi", "Sulawesi Tenggara": "Sulawesi",
  "Bali": "Bali NusRa", "Nusa Tenggara Barat": "Bali NusRa", "Nusa Tenggara Timur": "Bali NusRa",
  "Papua": "Papua Maluku", "Papua Barat": "Papua Maluku", "Papua Selatan": "Papua Maluku",
  "Papua Tengah": "Papua Maluku", "Papua Pegunungan": "Papua Maluku",
  "Papua Barat Daya": "Papua Maluku", "Maluku": "Papua Maluku", "Maluku Utara": "Papua Maluku",
};
const WILAYAH_LIST = ["Sumatera", "Jawa", "Kalimantan", "Sulawesi", "Bali NusRa", "Papua Maluku"];

const W_CFG = {
  "Sumatera": { c: "#DC2626", bg: "#FEF2F2", i: "🔴" },
  "Jawa": { c: "#1D4ED8", bg: "#EFF6FF", i: "🔵" },
  "Kalimantan": { c: "#D97706", bg: "#FFFBEB", i: "🟡" },
  "Sulawesi": { c: "#059669", bg: "#ECFDF5", i: "🟢" },
  "Bali NusRa": { c: "#EA580C", bg: "#FFF7ED", i: "🟠" },
  "Papua Maluku": { c: "#7C3AED", bg: "#F5F3FF", i: "🟣" },
};

// ═══════════════════════════════════════════════════════════════
// 6 BIDANG STRATEGIS K/L — Strict Filtering + Blacklist
// ═══════════════════════════════════════════════════════════════
const TEMA_KL = {

  "🎓 Pendidikan": {
    kw_inst: [
      /kementerian\s*(pendidikan|kebudayaan|riset|teknologi|dikti|dikbud|dikbudristek)/i,
      /kementerian\s*pan\b|kemen\s*pan[\s-]*rb\b|pendayagunaan\s*aparatur\s*negara/i,
      /lembaga\s*administrasi\s*negara\b/i,
      /kementerian\s*agama\b|kemenag\b/i,
      /bappenas\b|badan\s*perencanaan\s*pembangunan\s*nasional/i,
    ],
    kw_satker: [
      /pendidikan|universitas|politeknik|sekolah|pelatihan|diklat|perguruan\s*tinggi|pesantren|madrasah/i,
    ],
    kw_excl_inst: [
      /polri\b|kepolisian/i,
      /kementerian\s*(hukum|pertahanan|kesehatan|keuangan)/i,
      /tni\b|angkatan\s*(darat|laut|udara)\b/i,
      /kementerian\s*(energi|esdm|perhubungan|perdagangan|perindustrian)/i,
      /kementerian\s*komunikasi|komdigi\b|kominfo\b/i,
    ],
    color: "#1D4ED8", icon: "🎓",
    desc: "Kemendikti · KemenPANRB · LAN · Kemenag · BAPPENAS",
    apbn_context: "Bidang APBN: Penguatan Pendidikan & SDM"
  },

  "🏥 Kesehatan": {
    kw_inst: [
      /kementerian\s*kesehatan\b|kemenkes\b/i,
      /bpjs\b|badan\s*penyelenggara\s*jaminan\s*sosial/i,
      /badan\s*riset\s*dan\s*inovasi\s*nasional\b|brin\b/i,
      /kementerian\s*sosial\b|kemensos\b/i,
      /kemenko\s*(pmk|pembangunan\s*manusia)\b|kementerian\s*koordinator\s*(bidang\s*)?(pmk|pembangunan\s*manusia)/i,
      /badan\s*gizi\s*nasional\b|bgn\b/i,
    ],
    kw_satker: [
      /kesehatan|rumah\s*sakit\b|rsud\b|puskesmas|farmasi|alat\s*kesehatan|gizi|kesehatan\s*masyarakat/i,
    ],
    kw_excl_inst: [
      /polri\b|kepolisian/i,
      /kementerian\s*(hukum|pertahanan|keuangan)/i,
      /tni\b|angkatan\s*(darat|laut|udara)\b/i,
      /kementerian\s*(energi|esdm|perhubungan|perdagangan|perindustrian)/i,
      /kementerian\s*komunikasi|komdigi\b|kominfo\b/i,
    ],
    color: "#BE185D", icon: "🏥",
    desc: "Kemenkes · BPJS · BRIN · Kemensos · KemenkoPMK",
    apbn_context: "Bidang APBN: Kesehatan & Perlindungan Sosial"
  },

  "🛡️ Pertahanan & Keamanan": {
    kw_inst: [
      /kementerian\s*pertahanan\b|kemenhan\b/i,
      /tentara\s*nasional\s*indonesia\b|tni\b|angkatan\s*(darat|laut|udara)\b/i,
      /kepolisian\s*(negara\s*)?republik\s*indonesia\b|polri\b|polda\b|polres\b|polsek\b/i,
      /badan\s*nasional\s*penanggulangan\s*terorisme\b|bnpt\b/i,
      /badan\s*siber\s*dan\s*sandi\s*negara\b|bssn\b/i,
      /badan\s*keamanan\s*laut\b|bakamla\b/i,
      /kementerian\s*hukum\b|kemenkumham\b|kementerian\s*(hukum\s*dan\s*)?hak\s*asasi\s*manusia/i,
    ],
    kw_satker: [
      /pertahanan|militer|keamanan\s*nasional|intelijen|siber\s*sandi|imigrasi|pemasyarakatan|lapas\b|rutan\b/i,
    ],
    kw_excl_inst: [
      /kementerian\s*(pendidikan|kesehatan|pertanian|perdagangan|perindustrian)/i,
      /kementerian\s*komunikasi|komdigi\b|kominfo\b/i,
      /kementerian\s*(energi|esdm|perhubungan|keuangan|agama|sosial|koperasi|desa|pariwisata)/i,
    ],
    color: "#374151", icon: "🛡️",
    desc: "Kemenhan · TNI · Polri · BNPT · BSSN · Bakamla · Kemenkumham",
    apbn_context: "Bidang APBN: Pertahanan & Keamanan Nasional"
  },

  "📡 KOMDIGI": {
    kw_inst: [
      /kementerian\s*komunikasi\s*(dan\s*)?(digital\b|informatika\b)/i,
      /\bkomdigi\b/i,
      /\bkominfo\b/i,
      /badan\s*aksesibilitas\s*telekomunikasi\s*dan\s*informasi\b/i,
      /\bbakti\b/i,
    ],
    kw_satker: [
      /komunikasi\s*(dan\s*)?digital|informatika|telekomunikasi|penyiaran|digital\s*nasional/i,
    ],
    kw_excl_inst: [
      // Hanya boleh Kementerian Komunikasi dan Digital
      /kementerian\s*(pendidikan|kesehatan|pertanian|perdagangan|perindustrian|energi|esdm|perhubungan|keuangan|agama|sosial|koperasi|desa|pariwisata|hukum|pertahanan)/i,
      /polri\b|kepolisian/i,
      /tni\b|angkatan\s*(darat|laut|udara)\b/i,
      /\bbssn\b/i,
      /diskominfo\b|dinas\s*komunikasi/i, // exclude pemda kominfo satker
    ],
    color: "#7C3AED", icon: "📡",
    desc: "HANYA: Kementerian Komunikasi dan Digital (KOMDIGI) & BAKTI",
    apbn_context: "Digitalisasi Layanan Publik & Smart Government"
  },

  "⚡ Subsidi Energi & Hilirisasi": {
    kw_inst: [
      /kementerian\s*energi\s*(dan\s*)?sumber\s*daya\s*mineral\b/i,
      /\bkemen\s*esdm\b/i,
      /kementerian\s*hilirisasi\b/i,
      /kementerian\s*investasi\b/i,
      /\bbkpm\b|badan\s*koordinasi\s*penanaman\s*modal\b/i,
    ],
    kw_satker: [
      /energi|hilirisasi|esdm\b|minyak\s*(dan\s*)?gas|gas\s*bumi|pertambangan|mineral\b|nikel|bauksit|batubara|kilang|pembangkit\s*listrik|investasi\s*modal/i,
    ],
    kw_excl_inst: [
      /kementerian\s*(pendidikan|kesehatan|pertanian|perdagangan|perindustrian)/i,
      /kementerian\s*komunikasi|komdigi\b|kominfo\b/i,
      /kementerian\s*(perhubungan|keuangan|agama|sosial|koperasi|desa|pariwisata|hukum|pertahanan)/i,
      /polri\b|kepolisian/i,
      /tni\b|angkatan\s*(darat|laut|udara)\b/i,
    ],
    color: "#B45309", icon: "⚡",
    desc: "Kementerian ESDM · Kementerian Hilirisasi · Kementerian Investasi/BKPM",
    apbn_context: "Bidang APBN: Subsidi Energi & Non-Energi, Hilirisasi"
  },

  "🏗️ Pembangunan Ekonomi & Infrastruktur": {
    kw_inst: [
      /kementerian\s*perhubungan\b|kemenhub\b/i,
      /kementerian\s*keuangan\b|kemenkeu\b/i,
      /bendahara\s*(umum\s*)?negara\b/i,
      /direktorat\s*jenderal\s*(pajak|bea\s*cukai|perbendaharaan|anggaran|kekayaan\s*negara)/i,
      /kementerian\s*perdagangan\b|kemendag\b/i,
    ],
    kw_satker: [
      /perhubungan|transportasi|bandara|pelabuhan|perkeretaapian|lalu\s*lintas\s*jalan|pajak|bea\s*cukai|perdagangan|ekspor|impor|perbendaharaan\s*negara|kekayaan\s*negara/i,
    ],
    kw_excl_inst: [
      /kementerian\s*(pendidikan|kesehatan|pertanian|perindustrian)/i,
      /kementerian\s*komunikasi|komdigi\b|kominfo\b/i,
      /kementerian\s*(energi|esdm|agama|sosial|koperasi|desa|pariwisata|hukum|pertahanan)/i,
      /polri\b|kepolisian/i,
      /tni\b|angkatan\s*(darat|laut|udara)\b/i,
    ],
    color: "#6366F1", icon: "🏗️",
    desc: "Kementerian Perhubungan · Kemenkeu / Bendahara Negara · Kementerian Perdagangan",
    apbn_context: "Bidang APBN: Pembangunan Ekonomi & Infrastruktur"
  },
};

// Allowed prefixes for K/L drill-down (EXCLUDE pemda)
const KL_INST_PREFIXES = [
  "Kementerian", "Badan", "Lembaga", "Komisi", "Majelis", "Dewan", "Sekretariat",
  "Kejaksaan", "Kepolisian", "Tentara", "Mahkamah", "Bawaslu", "KPU", "BPJS", "BNPT",
  "BSSN", "BAKAMLA", "BRIN", "BKKBN", "BAKTI", "BKPM", "Direktorat"
];

// ═══ WILAYAH STRATEGY ═══
const WILAYAH_STRATEGY = {
  "Sumatera": {
    tkd: "TKD diarahkan ke revitalisasi sekolah, irigasi, dan koperasi lokal.",
    dinas: ["Dinas Pendidikan", "Dinas PUPR", "Dinas Pertanian", "Dinas Koperasi"],
    produk: "IoT Smart Farming, Fleet Management, Telkomsel Learning Platform, IoT Smart Water Meter"
  },
  "Jawa": {
    tkd: "Didorong menjadi megalopolis nasional — pusat industri teknologi dan ekonomi kreatif.",
    dinas: ["Diskominfo", "Dinas Perindustrian", "Dinas Perdagangan", "Bappenda"],
    produk: "Omnichannel, Msight, Tsurvey, IoT Monitoring Management"
  },
  "Kalimantan": {
    tkd: "TKD diarahkan untuk infrastruktur dasar, energi, dan transportasi pendukung IKN.",
    dinas: ["Dinas PUPR", "Dinas Perhubungan", "Dinas ESDM"],
    produk: "IoT Smart City, Industrial IoT, IoT Smart Energy Meter"
  },
  "Sulawesi": {
    tkd: "TKD diarahkan untuk sekolah rakyat, irigasi pertanian, dan smart tourism infrastructure.",
    dinas: ["Dinas Pendidikan", "Dinas PUPR", "Dinas Pariwisata"],
    produk: "IoT FleetSight, IoT Smart Connectivity, Msight/TSurvey, IoT Smart Water Meter"
  },
  "Bali NusRa": {
    tkd: "TKD diarahkan untuk peningkatan kualitas pendidikan, gizi dan koperasi pariwisata lokal.",
    dinas: ["Dinas Pendidikan", "Dinas Kesehatan", "Dinas Pariwisata", "Dinas Koperasi"],
    produk: "DigiAds, Msight, Tsurvey, IoT Smart Connectivity, Omnichannel"
  },
  "Papua Maluku": {
    tkd: "TKD diarahkan ke pendidikan & kesehatan dasar, pengembangan perikanan & energi terbarukan.",
    dinas: ["Dinas Pendidikan", "Dinas Kesehatan", "Dinas Perikanan", "Dinas ESDM"],
    produk: "Basic Connectivity, IoT Smart Connectivity, OmniChannel, IoT Smart Water Meter"
  },
};

const DINAS_PATTERNS = {
  "Dinas Pendidikan": /dinas\s*pendidikan|disdik/i,
  "Dinas PUPR": /dinas\s*(pupr|pekerjaan\s*umum|pu\b|cipta\s*karya)/i,
  "Dinas Pertanian": /dinas\s*pertanian|distan|ketahanan\s*pangan/i,
  "Dinas Koperasi": /dinas\s*koperasi|dinkop/i,
  "Dinas Kesehatan": /dinas\s*kesehatan|dinkes/i,
  "Dinas Pariwisata": /dinas\s*pariwisata|dispar/i,
  "Dinas Perhubungan": /dinas\s*perhubungan|dishub/i,
  "Dinas ESDM": /dinas\s*(esdm|energi)/i,
  "Dinas Perindustrian": /dinas\s*perindustrian|disperindag/i,
  "Dinas Perdagangan": /dinas\s*perdagangan/i,
  "Bappenda": /bappenda|pendapatan\s*daerah/i,
  "Diskominfo": /diskominfo|dinas\s*komunikasi|kominfo\b|informatika/i,
  "Dinas Perikanan": /dinas\s*(perikanan|kelautan)/i,
};

// ═══ ICT CLASSIFICATION ═══
const ICT_WL = [
  /\binternet\b/i, /\bbandwidth\b/i, /\bfiber\s*optik?\b/i, /\bjaringan\b/i,
  /\bwifi\b/i, /\bwi-fi\b/i, /\bhotspot\b/i, /\bmpls\b/i, /\bvpn\b/i, /\bsd-wan\b/i,
  /\bbroadband\b/i, /\btelekomunikasi\b/i, /\bfttx?\b/i, /\bdata\s*center\b/i,
  /\bserver\b(?!.*makanan)/i, /\bkomputer\b/i, /\blaptop\b/i, /\bnotebook\b/i,
  /\bprinter\b/i, /\bscanner\b/i, /\bups\b/i,
  /\bswitch\b(?!.*listrik)/i, /\brouter\b/i, /\bfirewall\b/i, /\baccess\s*point\b/i,
  /\bstorage\b/i, /\brack\b(?!.*sepeda)/i, /\bcctv\b/i, /\bip\s*camera\b/i,
  /\bnetwork\b/i, /\binfrastruktur\s*(it|ti|ict|teknologi)\b/i,
  /\baplikasi\b/i, /\bsoftware\b/i, /\bperangkat\s*lunak\b/i, /\blisens[i]?\b/i,
  /\bsistem\s*informasi\b/i, /\be-gov\w*\b/i, /\bwebsite\b/i, /\bportal\b/i,
  /\bcloud\b/i, /\bsaas\b/i, /\berp\b/i, /\bdatabase\b/i, /\bbig\s*data\b/i,
  /\bmachine\s*learning\b/i, /\bcyber\s*security\b/i, /\bkeamanan\s*siber\b/i,
  /\biot\b/i, /\bsmart\s*(city|village|building|farming|meter)\b/i,
  /\bsensor\b(?!.*gas\s*lpg)/i, /\btelemetri\b/i, /\bsurveillance\b/i,
  /\bsim\s*card\b/i, /\bpulsa\b/i, /\bpaket\s*data\b/i, /\bsms\s*(gateway|blast)\b/i,
  /\bvoip\b/i, /\bip\s*phone\b/i, /\bpabx\b/i, /\bvideo\s*conference\b/i,
  /\bdigital\s*(signage|marketing|transform)\b/i, /\bomnichannel\b/i,
];
const ICT_BL = [
  /\bgaji\b/i, /\bhonor\w*\b/i, /\btunjangan\b/i, /\bmakanan\b/i, /\bminuman\b/i,
  /\bjas\s*hujan\b/i, /\bseragam\b/i, /\bbaju\b/i, /\bsepatu\b/i,
  /\bkonstruksi\b(?!.*(smart|iot|sensor))/i, /\bjalan\b(?!.*(smart|monitoring))/i,
  /\bjembatan\b/i, /\birigasi\b(?!.*(smart|iot))/i,
  /\bpengolah\w*\s*sampah\b/i, /\bpetugas\b/i, /\bnormalisasi\b/i,
];

function classifyICT(nama) {
  if (!nama) return "Non-ICT";
  const t = nama.toLowerCase();
  const bl = ICT_BL.some(r => r.test(t));
  const wl = ICT_WL.some(r => r.test(t));
  return (wl && !bl) ? "ICT" : "Non-ICT";
}

function isPemda(inst) {
  if (!inst) return false;
  const s = inst.trim();
  return s.startsWith("Kab.") || s.startsWith("Kota ") || s.startsWith("Provinsi ");
}

function isKLInstitution(inst) {
  if (!inst) return false;
  const s = inst.trim();
  if (isPemda(s)) return false;
  const provinces = Object.keys(WILAYAH_MAP);
  if (provinces.includes(s)) return false;
  return KL_INST_PREFIXES.some(p => s.startsWith(p));
}

function getWilayah(lokasi) {
  if (!lokasi) return "Lainnya";
  const prov = lokasi.split(",")[0].trim();
  return WILAYAH_MAP[prov] || "Lainnya";
}

// ═══ FORMAT HELPERS ═══
function fmtRp(v) {
  if (!v || v === 0) return "Rp 0";
  const a = Math.abs(v);
  if (a >= 1e12) return `Rp ${(v / 1e12).toFixed(2)} T`;
  if (a >= 1e9) return `Rp ${(v / 1e9).toFixed(2)} M`;
  if (a >= 1e6) return `Rp ${(v / 1e6).toFixed(1)} Jt`;
  return `Rp ${v.toLocaleString("id-ID")}`;
}
function fmtS(v) {
  if (!v || v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
  if (a >= 1e9) return `${(v / 1e9).toFixed(1)}M`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(0)}Jt`;
  return v.toLocaleString("id-ID");
}
function fmtN(v) {
  if (!v) return "0";
  return Math.round(v).toLocaleString("id-ID");
}

// ═══ TURSO HTTP FETCH ═══
async function tursoPost(sql, timeout = 60000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(`${TURSO_URL}/v2/pipeline`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${TURSO_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ type: "execute", stmt: { sql } }, { type: "close" }] }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const result = (data.results || [{}])[0];
    if (result.type === "error") throw new Error(result.error?.message || "SQL error");
    const resp = result.response?.result || {};
    const cols = (resp.cols || []).map(c => c.name);
    const rows = (resp.rows || []).map(row => {
      const obj = {};
      row.forEach((cell, i) => { obj[cols[i]] = cell?.value ?? cell; });
      return obj;
    });
    return { cols, rows };
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function tursoFetchChunked(sql, totalHint, onProgress) {
  let all = [];
  let offset = 0;
  while (true) {
    const chunk = await tursoPost(`${sql} LIMIT ${CHUNK_SIZE} OFFSET ${offset}`, 300000);
    all = all.concat(chunk.rows);
    if (onProgress) {
      const pct = totalHint > 0 ? Math.min(100, all.length / totalHint * 100) : 0;
      onProgress(all.length, totalHint, pct);
    }
    if (chunk.rows.length < CHUNK_SIZE) break;
    offset += CHUNK_SIZE;
  }
  return all;
}

// ═══ DATA STORE ═══
let DATA = [];
let DB_SOURCE = "";
let TOTAL_ROWS = 0;

function setLoading(title, msg, pct) {
  const el = (id) => document.getElementById(id);
  if (title) el("loadingTitle").textContent = title;
  if (msg) el("loadingMsg").textContent = msg;
  if (pct !== undefined) {
    el("loadingBar").style.width = pct + "%";
    el("loadingPct").textContent = Math.round(pct) + "%";
  }
}

async function loadData() {
  document.getElementById("loadingOverlay").style.display = "flex";
  let tursoErr = null;

  // ── 1) Try local JSON ──
  try {
    setLoading("Mencari data.json...", "File hasil preprocess.py", 5);
    const resp = await fetch("data.json");
    if (resp.ok) {
      const contentLength = resp.headers.get("Content-Length");
      const totalMB = contentLength ? (parseInt(contentLength) / 1e6).toFixed(0) : "?";
      setLoading("Mengunduh data.json...", `~${totalMB} MB`, 10);

      let raw;
      if (contentLength && resp.body) {
        const reader = resp.body.getReader();
        const chunks = []; let received = 0; const total = parseInt(contentLength);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value); received += value.length;
          setLoading("Mengunduh data.json...", `${(received / 1e6).toFixed(1)} / ${totalMB} MB`, 10 + (received / total) * 30);
        }
        const decoder = new TextDecoder();
        raw = chunks.map(c => decoder.decode(c, { stream: true })).join("") + decoder.decode();
      } else {
        raw = await resp.text();
      }

      setLoading("Parsing JSON...", "Mohon tunggu", 45);
      const json = JSON.parse(raw);
      raw = null;

      setLoading("Memproses data...", `${fmtN(json.rows.length)} baris`, 55);
      DATA = json.rows.map(r => ({
        nama_paket: r[0],
        pagu: r[1],
        instansi: r[2],
        satker: r[3],
        lokasi: r[4],
        pemenang: r[5],
        nama_display: r[6],
        realisasi: r[7],
        metode: r[8],
        sektor: r[9],
        wilayah: r[10],
        is_pemda: r[11] === 1,
      }));
      TOTAL_ROWS = json.total_db || DATA.length;
      DB_SOURCE = `JSON (${json.db_name || "data.json"})`;
      setLoading("Selesai!", `${fmtN(DATA.length)} paket aktif dimuat`, 100);
      await new Promise(r => setTimeout(r, 500));
      document.getElementById("loadingOverlay").style.display = "none";
      return true;
    }
  } catch (jsonErr) {
    console.warn("[DB] JSON load failed:", jsonErr.message);
  }

  // ── 2) Try Turso HTTP API ──
  try {
    setLoading("Menghubungkan ke Turso...", TURSO_URL, 30);
    await tursoPost("SELECT 1");
    setLoading("Turso terhubung!", "Mendeteksi tabel...", 35);

    const tables = await tursoPost("SELECT name FROM sqlite_master WHERE type='table'");
    if (!tables.rows.length) throw new Error("Database kosong");
    const tbl = tables.rows[0].name;

    const countRes = await tursoPost(`SELECT COUNT(*) as cnt FROM [${tbl}]`);
    TOTAL_ROWS = parseInt(countRes.rows[0].cnt) || 0;
    setLoading("Memuat data...", `${fmtN(TOTAL_ROWS)} records ditemukan`, 40);

    const sql = `SELECT Nama_Paket, Pagu_Rp, Instansi_Pembeli, Satuan_Kerja, Lokasi, Nama_Pemenang, Total_Pelaksanaan_Rp, Metode_Pemilihan, Jenis_Pengadaan, Prediksi_Nama FROM [${tbl}] WHERE Nama_Pemenang IS NOT NULL AND TRIM(Nama_Pemenang) != '' AND CAST(Pagu_Rp AS REAL) > 0`;

    const rows = await tursoFetchChunked(sql, TOTAL_ROWS, (loaded, total, pct) => {
      setLoading("Memuat data dari Turso...", `${fmtN(loaded)} / ${fmtN(total)} baris`, 40 + pct * 0.5);
    });
    DATA = processRows(rows);
    DB_SOURCE = "Turso (HTTP)";
    setLoading("Selesai!", `${fmtN(DATA.length)} paket aktif dimuat`, 100);
    await new Promise(r => setTimeout(r, 500));
    document.getElementById("loadingOverlay").style.display = "none";
    return true;
  } catch (e) {
    tursoErr = e;
    console.warn("[DB] Turso failed:", e.message);
  }

  // ── 3) All failed ──
  setLoading(
    "❌ Gagal memuat database",
    "Jalankan dulu: python preprocess.py untuk buat data.json",
    0
  );
  return false;
}

function processRows(rows) {
  return rows.map(r => {
    const pagu = parseFloat(r.Pagu_Rp) || 0;
    if (pagu <= 0) return null;
    const pred = (r.Prediksi_Nama || "").trim();
    const nama = (r.Nama_Pemenang || "").trim();
    const hasStar = nama.includes("*");
    const namaDisplay = (hasStar && pred && pred !== "nan") ? pred : nama;
    return {
      nama_paket: r.Nama_Paket || "",
      pagu,
      instansi: (r.Instansi_Pembeli || "").trim(),
      satker: (r.Satuan_Kerja || "").trim(),
      lokasi: r.Lokasi || "",
      pemenang: nama,
      prediksi: pred,
      nama_display: namaDisplay,
      realisasi: parseFloat(r.Total_Pelaksanaan_Rp) || 0,
      metode: r.Metode_Pemilihan || "",
      jenis: r.Jenis_Pengadaan || "",
      sektor: classifyICT(r.Nama_Paket),
      provinsi: (r.Lokasi || "").split(",")[0].trim(),
      wilayah: getWilayah(r.Lokasi),
      is_pemda: isPemda(r.Instansi_Pembeli),
    };
  }).filter(Boolean);
}

// ═══ AGGREGATION HELPERS ═══
function aggTopPemenang(data, sektor, n = 20) {
  const d = sektor ? data.filter(r => r.sektor === sektor) : data;
  const map = {};
  d.forEach(r => {
    const key = r.nama_display || r.pemenang;
    if (!map[key]) map[key] = { nama: key, pagu: 0, paket: 0, instansi: new Set(), satker: new Set() };
    map[key].pagu += r.pagu;
    map[key].paket++;
    if (r.instansi) map[key].instansi.add(r.instansi);
    if (r.satker) map[key].satker.add(r.satker);
  });
  return Object.values(map)
    .map(m => ({ ...m, instansi_n: m.instansi.size, satker_n: m.satker.size }))
    .sort((a, b) => b.pagu - a.pagu)
    .slice(0, n);
}

function aggTopInstansi(data, n = 15) {
  const map = {};
  data.forEach(r => {
    const key = r.instansi;
    if (!key) return;
    if (!map[key]) map[key] = { nama: key, pagu: 0, paket: 0, pemenang: new Set(), satker: new Set() };
    map[key].pagu += r.pagu;
    map[key].paket++;
    if (r.pemenang) map[key].pemenang.add(r.pemenang);
    if (r.satker) map[key].satker.add(r.satker);
  });
  return Object.values(map)
    .map(m => ({ ...m, pemenang_n: m.pemenang.size, satker_n: m.satker.size }))
    .sort((a, b) => b.pagu - a.pagu)
    .slice(0, n);
}

function filterByTema(data, tema) {
  const cfg = TEMA_KL[tema];
  if (!cfg) return [];
  return data.filter(r => {
    if (r.is_pemda) return false;
    // Apply exclusion blacklist first — if instansi matches blacklist, reject
    if (cfg.kw_excl_inst && cfg.kw_excl_inst.some(p => p.test(r.instansi))) return false;
    const instMatch = cfg.kw_inst.some(p => p.test(r.instansi));
    const satkerMatch = cfg.kw_satker.some(p => p.test(r.satker));
    // For satker match: also ensure instansi is not clearly another ministry
    if (satkerMatch && !instMatch) {
      // Extra guard: satker match only accepted if instansi looks like a K/L
      if (!isKLInstitution(r.instansi)) return false;
    }
    return instMatch || satkerMatch;
  });
}

function filterPemdaWilayah(data, wilayah) {
  return data.filter(r => r.is_pemda && r.wilayah === wilayah);
}

function filterByDinas(data, dinasName) {
  const pat = DINAS_PATTERNS[dinasName];
  if (!pat) return [];
  return data.filter(r => pat.test(r.satker));
}

function getKLInstansiList(data) {
  const map = {};
  data.forEach(r => {
    if (!isKLInstitution(r.instansi)) return;
    if (!map[r.instansi]) map[r.instansi] = 0;
    map[r.instansi] += r.pagu;
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([name]) => name);
}

// ═══ EXCEL / CSV EXPORT ═══
function exportExcel(data, filename, sheetName = "Data") {
  if (!data || !data.length) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) {
      ws[addr].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "C41920" } },
        alignment: { horizontal: "center" }
      };
    }
  }
  XLSX.writeFile(wb, filename);
}

function exportCSV(data, filename) {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(r => headers.map(h => {
    const v = String(r[h] ?? "").replace(/"/g, '""');
    return `"${v}"`;
  }).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function exportSection(data, cols, filename) {
  const exportData = data.map(r => {
    const obj = {};
    cols.forEach(c => { obj[c.label || c.key] = c.fmt ? c.fmt(r[c.key]) : r[c.key]; });
    return obj;
  });
  exportExcel(exportData, filename);
}

// Convenience: export raw data array (with formatted pagu)
function exportRawRows(data, filename, limit = 5000) {
  const exp = data.slice(0, limit).map(r => ({
    "Nama Pemenang": r.pemenang,
    "Prediksi Nama": r.prediksi || "",
    "Nama Display": r.nama_display,
    "Pagu (Rp)": r.pagu,
    "Pagu Format": fmtRp(r.pagu),
    "Instansi Pembeli": r.instansi,
    "Satuan Kerja": r.satker,
    "Lokasi": r.lokasi,
    "Wilayah": r.wilayah,
    "Sektor": r.sektor,
    "Metode Pemilihan": r.metode,
    "Nama Paket": r.nama_paket,
  }));
  exportExcel(exp, filename);
}

function exportAggRows(data, filename) {
  exportExcel(data.map(g => ({
    "Pemenang": g.nama,
    "Total Pagu (Rp)": g.pagu,
    "Total Pagu Format": fmtRp(g.pagu),
    "Jumlah Paket": g.paket,
    "Instansi Unik": g.instansi_n,
    "Satker Unik": g.satker_n,
  })), filename);
}
