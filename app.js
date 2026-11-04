// ============================================================================
// Sistem Otomatis BAST PJLP - Full CRUD MySQL (phpMyAdmin: db_bast_pjlp)
// Tabel MySQL:
// 1. users_pihak_kedua (CRUD Biodata, SPK, Honorarium, dan TTD Pihak Kedua)
// 2. pihak_pertama     (Default Biodata & TTD Pihak Pertama / PPK)
// 3. surat_bast        (Daftar Surat BAST: Input Tanggal 1x & Nomor Surat Manual)
// ============================================================================

const STORAGE_KEY_GLOBAL = 'bast_pjlp_global_v5';
const STORAGE_KEY_FULL_BACKUP = 'bast_pjlp_full_backup_v6';
let autoSaveTimer = null;
let isInitialLoading = true;

const DEFAULT_MASTER_P1 = {
  id: 1,
  nama: 'Rahmawati Umasugi',
  jabatan: 'Pejabat Pembuat Komitmen',
  alamat: 'Jl. Dr. Leimena Desa Rumah Tiga Ambon',
  ttd: ''
};

const DEFAULT_MASTER_USERS = [
  {
    id: 1,
    nama: 'Putra Alwali Kaimudin',
    nik: '81710022510960001',
    alamat: 'Jl.Kesatrian Asmil,RT.002/RW.006,Kota Ambon',
    jabatan: 'Petugas Keamanan',
    honor: 3381225,
    terbilang: 'Tiga Juta Tiga Ratus Delapan Puluh Satu Ribu Dua Ratus Dua Puluh Lima Rupiah',
    noSpk: 'SPK.123/BPPP.AMB/PL.450/I/2026',
    tglSpk: '5 Januari 2026',
    noBastDefault: 'B.1691.10/BPPP.AMB/PL.450/VIII/2026',
    ttd: ''
  },
  {
    id: 2,
    nama: 'Amirudin Rumalean',
    nik: '8105040601010005',
    alamat: 'Poka BTN, RT. 01 / RW. 06 Teluk Ambon',
    jabatan: 'Petugas Kebersihan',
    honor: 3381225,
    terbilang: 'Tiga Juta Tiga Ratus Delapan Puluh Satu Ribu Dua Ratus Dua Puluh Lima Rupiah',
    noSpk: 'SPK.118/BPPP.AMB/PL.450/I/2026',
    tglSpk: '5 Januari 2026',
    noBastDefault: 'B.1690/BPPP.AMB/PL.450/VIII/2026',
    ttd: ''
  }
];

// State Aplikasi
let masterP1 = { ...DEFAULT_MASTER_P1 };
let masterUsers = [];
let suratQueue = []; // [{ userId, noBast }]
let activeQueueIndex = 0;

let selectedMasterUserId = 1; // angka ID atau 'new'
let currentEditTtdP2 = '';
let currentEditTtdP1 = '';
let isDbConnected = false;

// Elemen DOM
const el = {
  dbStatusBadge: document.getElementById('dbStatusBadge'),
  tabBtnBuatSurat: document.getElementById('tabBtnBuatSurat'),
  tabBtnMasterData: document.getElementById('tabBtnMasterData'),
  viewBuatSurat: document.getElementById('viewBuatSurat'),
  viewMasterData: document.getElementById('viewMasterData'),
  headerPrintActions: document.getElementById('headerPrintActions'),
  countMasterPegawai: document.getElementById('countMasterPegawai'),

  btnPrevSurat: document.getElementById('btnPrevSurat'),
  btnNextSurat: document.getElementById('btnNextSurat'),
  activeSuratIndicator: document.getElementById('activeSuratIndicator'),
  btnPrintSingle: document.getElementById('btnPrintSingle'),
  btnExportWord: document.getElementById('btnExportWord'),

  // Tab 1
  bastDatePicker: document.getElementById('bastDatePicker'),
  bastBulanKerja: document.getElementById('bastBulanKerja'),
  bastHari: document.getElementById('bastHari'),
  bastTanggalTeks: document.getElementById('bastTanggalTeks'),

  badgeJumlahSurat: document.getElementById('badgeJumlahSurat'),
  btnAddRowSurat: document.getElementById('btnAddRowSurat'),
  btnLoadAllMaster: document.getElementById('btnLoadAllMaster'),
  btnResetSuratQueue: document.getElementById('btnResetSuratQueue'),
  suratQueueContainer: document.getElementById('suratQueueContainer'),
  btnApplyAllSurat: document.getElementById('btnApplyAllSurat'),

  previewBannerText: document.getElementById('previewBannerText'),
  bastPageSingle: document.getElementById('bastPageSingle'),

  // Tab 2: Tabel CRUD & Form User
  crudUserTableBody: document.getElementById('crudUserTableBody'),
  btnRefreshDb: document.getElementById('btnRefreshDb'),
  formUserCard: document.getElementById('formUserCard'),
  formUserTitle: document.getElementById('formUserTitle'),
  formUserModeBadge: document.getElementById('formUserModeBadge'),

  masterSelectUser: document.getElementById('masterSelectUser'),
  btnMasterNewUser: document.getElementById('btnMasterNewUser'),
  mP2Nama: document.getElementById('mP2Nama'),
  mP2Nik: document.getElementById('mP2Nik'),
  mP2Alamat: document.getElementById('mP2Alamat'),
  mP2Jabatan: document.getElementById('mP2Jabatan'),
  mP2Honor: document.getElementById('mP2Honor'),
  mP2Terbilang: document.getElementById('mP2Terbilang'),
  mP2NoSpk: document.getElementById('mP2NoSpk'),
  mP2TglSpk: document.getElementById('mP2TglSpk'),
  mP2NoBastDefault: document.getElementById('mP2NoBastDefault'),

  previewFrameTtdP2: document.getElementById('previewFrameTtdP2'),
  uploadTtdP2: document.getElementById('uploadTtdP2'),
  btnClearTtdP2: document.getElementById('btnClearTtdP2'),
  canvasTtdP2: document.getElementById('canvasTtdP2'),
  btnUseCanvasP2: document.getElementById('btnUseCanvasP2'),
  btnResetCanvasP2: document.getElementById('btnResetCanvasP2'),
  btnSaveMasterUser: document.getElementById('btnSaveMasterUser'),
  btnDeleteMasterUser: document.getElementById('btnDeleteMasterUser'),

  // Tab 2: Pihak Pertama (PPK) & Tata Letak
  mP1Nama: document.getElementById('mP1Nama'),
  mP1Jabatan: document.getElementById('mP1Jabatan'),
  mP1Alamat: document.getElementById('mP1Alamat'),
  previewFrameTtdP1: document.getElementById('previewFrameTtdP1'),
  uploadTtdP1: document.getElementById('uploadTtdP1'),
  btnClearTtdP1: document.getElementById('btnClearTtdP1'),
  canvasTtdP1: document.getElementById('canvasTtdP1'),
  btnUseCanvasP1: document.getElementById('btnUseCanvasP1'),
  btnResetCanvasP1: document.getElementById('btnResetCanvasP1'),
  btnSaveMasterP1: document.getElementById('btnSaveMasterP1'),

  layoutIndentLeft: document.getElementById('layoutIndentLeft'),
  layoutIndentRight: document.getElementById('layoutIndentRight'),
  layoutSpaceBefore: document.getElementById('layoutSpaceBefore'),
  layoutSpaceAfter: document.getElementById('layoutSpaceAfter'),
  docFontFamily: document.getElementById('docFontFamily'),
  ttdHeightPx: document.getElementById('ttdHeightPx'),

  toast: document.getElementById('toast')
};

// ============================================================================
// Fungsi Utilitas: Terbilang, Format Rupiah, Escape HTML
// ============================================================================
function konversiTerbilang(nilai) {
  nilai = Math.abs(Math.floor(Number(nilai) || 0));
  if (nilai === 0) return 'Nol';

  const satuan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima',
    'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];

  function sebut(n) {
    if (n < 12) return satuan[n];
    if (n < 20) return sebut(n - 10) + ' Belas';
    if (n < 100) return (sebut(Math.floor(n / 10)) + ' Puluh ' + sebut(n % 10)).trim();
    if (n < 200) return ('Seratus ' + sebut(n - 100)).trim();
    if (n < 1000) return (sebut(Math.floor(n / 100)) + ' Ratus ' + sebut(n % 100)).trim();
    if (n < 2000) return ('Seribu ' + sebut(n - 1000)).trim();
    if (n < 1000000) return (sebut(Math.floor(n / 1000)) + ' Ribu ' + sebut(n % 1000)).trim();
    if (n < 1000000000) return (sebut(Math.floor(n / 1000000)) + ' Juta ' + sebut(n % 1000000)).trim();
    if (n < 1000000000000) return (sebut(Math.floor(n / 1000000000)) + ' Miliar ' + sebut(n % 1000000000)).trim();
    return '';
  }

  return sebut(nilai).replace(/\s+/g, ' ').trim() + ' Rupiah';
}

function formatRupiahTitik(nominal) {
  const num = Math.floor(Number(nominal) || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  setTimeout(() => {
    el.toast.classList.remove('show');
  }, 2800);
}

// Custom Executive Modal Dialog (Menggantikan alert/confirm bawaan browser)
function showConfirmModal({
  title = 'Konfirmasi Tindakan',
  message = 'Apakah Anda yakin ingin melanjutkan?',
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  isDanger = false
}) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('lhModalOverlay');
    const iconEl = document.getElementById('lhModalIcon');
    const titleEl = document.getElementById('lhModalTitle');
    const msgEl = document.getElementById('lhModalMessage');
    const cancelBtn = document.getElementById('lhModalCancelBtn');
    const confirmBtn = document.getElementById('lhModalConfirmBtn');

    if (!overlay) {
      resolve(window.confirm(message));
      return;
    }

    titleEl.textContent = title;
    msgEl.textContent = message;
    cancelBtn.textContent = cancelText;
    cancelBtn.classList.remove('hidden');
    confirmBtn.textContent = confirmText;

    iconEl.className = isDanger
      ? 'lh-modal-icon lh-modal-icon-warn'
      : 'lh-modal-icon lh-modal-icon-info';
    iconEl.textContent = isDanger ? '!' : 'i';

    confirmBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';
    overlay.classList.remove('hidden');

    function cleanup(result) {
      overlay.classList.add('hidden');
      cancelBtn.removeEventListener('click', onCancel);
      confirmBtn.removeEventListener('click', onConfirm);
      overlay.removeEventListener('click', onBackdrop);
      resolve(result);
    }

    function onCancel() {
      cleanup(false);
    }
    function onConfirm() {
      cleanup(true);
    }
    function onBackdrop(e) {
      if (e.target === overlay) cleanup(false);
    }

    cancelBtn.addEventListener('click', onCancel);
    confirmBtn.addEventListener('click', onConfirm);
    overlay.addEventListener('click', onBackdrop);
  });
}

function showAlertModal(title, message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('lhModalOverlay');
    const iconEl = document.getElementById('lhModalIcon');
    const titleEl = document.getElementById('lhModalTitle');
    const msgEl = document.getElementById('lhModalMessage');
    const cancelBtn = document.getElementById('lhModalCancelBtn');
    const confirmBtn = document.getElementById('lhModalConfirmBtn');

    if (!overlay) {
      window.alert(message);
      resolve();
      return;
    }

    titleEl.textContent = title || 'Informasi';
    msgEl.textContent = message;
    cancelBtn.classList.add('hidden');
    confirmBtn.textContent = 'Mengerti';
    confirmBtn.className = 'btn btn-primary';
    iconEl.className = 'lh-modal-icon lh-modal-icon-info';
    iconEl.textContent = 'i';
    overlay.classList.remove('hidden');

    function cleanup() {
      overlay.classList.add('hidden');
      confirmBtn.removeEventListener('click', cleanup);
      overlay.removeEventListener('click', onBackdrop);
      resolve();
    }

    function onBackdrop(e) {
      if (e.target === overlay) cleanup();
    }

    confirmBtn.addEventListener('click', cleanup);
    overlay.addEventListener('click', onBackdrop);
  });
}

// ============================================================================
// Komunikasi API ke MySQL (api.php -> db_bast_pjlp)
// ============================================================================
async function apiRequest(action, payload = null) {
  const opts = {
    method: payload ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  if (payload) {
    opts.body = JSON.stringify(payload);
  }
  const res = await fetch(`/api.php?action=${encodeURIComponent(action)}`, opts);
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Gagal berkomunikasi dengan database MySQL');
  }
  return data;
}

// Simpan snapshot lengkap ke LocalStorage, Disk (backup.json), dan MySQL
function buildFullSnapshot() {
  return {
    updatedAt: Date.now(),
    masterP1,
    masterUsers,
    suratQueue,
    activeQueueIndex,
    selectedMasterUserId,
    activeTab: el.tabBtnMasterData.classList.contains('active') ? 'master' : 'surat',
    bastDatePicker: el.bastDatePicker.value,
    bastBulanKerja: el.bastBulanKerja.value,
    bastHari: el.bastHari.value,
    bastTanggalTeks: el.bastTanggalTeks.value,
    indentLeft: el.layoutIndentLeft.value,
    indentRight: el.layoutIndentRight.value,
    spaceBefore: el.layoutSpaceBefore.value,
    spaceAfter: el.layoutSpaceAfter.value,
    fontFamily: el.docFontFamily.value,
    ttdHeightPx: el.ttdHeightPx.value,
    formDraft: {
      selectedId: selectedMasterUserId,
      nama: el.mP2Nama.value,
      nik: el.mP2Nik.value,
      alamat: el.mP2Alamat.value,
      jabatan: el.mP2Jabatan.value,
      honor: el.mP2Honor.value,
      terbilang: el.mP2Terbilang.value,
      noSpk: el.mP2NoSpk.value,
      tglSpk: el.mP2TglSpk.value,
      noBastDefault: el.mP2NoBastDefault.value,
      ttd: currentEditTtdP2
    }
  };
}

function saveSnapshotImmediate() {
  if (isInitialLoading) return;
  try {
    const snap = buildFullSnapshot();
    localStorage.setItem(STORAGE_KEY_FULL_BACKUP, JSON.stringify(snap));
    fetch('/backup.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snap)
    }).catch(() => {});
  } catch (e) {}
}

function scheduleAutoSaveSurat() {
  if (isInitialLoading) return;
  saveSnapshotImmediate();
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    try {
      await apiRequest('save_surat', {
        hari: el.bastHari.value.trim(),
        tanggalTeks: el.bastTanggalTeks.value.trim(),
        bulanKerja: el.bastBulanKerja.value.trim(),
        items: suratQueue
      });
    } catch (e) {}
  }, 350);
}

async function loadSavedSnapshotFallback() {
  let localSnap = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FULL_BACKUP);
    if (raw) localSnap = JSON.parse(raw);
  } catch (e) {}

  let diskSnap = null;
  try {
    const res = await fetch('/backup.json');
    if (res.ok) {
      const parsed = await res.json();
      if (parsed && parsed.updatedAt) diskSnap = parsed;
    }
  } catch (e) {}

  if (localSnap && diskSnap) {
    return (localSnap.updatedAt || 0) >= (diskSnap.updatedAt || 0) ? localSnap : diskSnap;
  }
  return localSnap || diskSnap;
}

async function fetchAllFromDatabase(preserveDraft = false) {
  isInitialLoading = true;
  const savedSnap = await loadSavedSnapshotFallback();

  try {
    const data = await apiRequest('all');
    isDbConnected = true;
    el.dbStatusBadge.textContent = '🟢 Terhubung ke MySQL (db_bast_pjlp) • Auto-Save Aktif';
    el.dbStatusBadge.style.color = '#86efac';

    if (data.pihakPertama) {
      masterP1 = {
        id: data.pihakPertama.id || 1,
        nama: data.pihakPertama.nama || DEFAULT_MASTER_P1.nama,
        jabatan: data.pihakPertama.jabatan || DEFAULT_MASTER_P1.jabatan,
        alamat: data.pihakPertama.alamat || DEFAULT_MASTER_P1.alamat,
        ttd: data.pihakPertama.ttd || ''
      };
    }

    if (Array.isArray(data.users) && data.users.length > 0) {
      masterUsers = data.users.map((u) => ({
        ...u,
        id: Number(u.id),
        ttd: u.ttd || ''
      }));
    } else if (savedSnap && Array.isArray(savedSnap.masterUsers) && savedSnap.masterUsers.length > 0) {
      masterUsers = savedSnap.masterUsers;
    } else {
      masterUsers = [...DEFAULT_MASTER_USERS];
    }

    // Utamakan antrean surat & nomor surat terakhir yang diketik user
    if (savedSnap && Array.isArray(savedSnap.suratQueue) && savedSnap.suratQueue.length > 0) {
      // Pastikan hanya user yang masih ada di masterUsers yang dimuat
      const validQueue = savedSnap.suratQueue.filter((q) =>
        masterUsers.some((u) => Number(u.id) === Number(q.userId))
      );
      if (validQueue.length > 0) {
        suratQueue = validQueue;
      }
    }

    if (suratQueue.length === 0) {
      if (Array.isArray(data.suratList) && data.suratList.length > 0) {
        suratQueue = data.suratList.map((s) => ({
          userId: Number(s.userId),
          noBast: s.noBast || ''
        }));
        const firstS = data.suratList[0];
        if (firstS.hari) el.bastHari.value = firstS.hari;
        if (firstS.tanggalTeks) el.bastTanggalTeks.value = firstS.tanggalTeks;
        if (firstS.bulanKerja) el.bastBulanKerja.value = firstS.bulanKerja;
      } else {
        suratQueue = masterUsers.map((u) => ({
          userId: Number(u.id),
          noBast: u.noBastDefault || ''
        }));
      }
    }
  } catch (err) {
    isDbConnected = false;
    el.dbStatusBadge.textContent = '🟠 Mode Cadangan Lokal (Data Terakhir Tetap Aman)';
    el.dbStatusBadge.style.color = '#fde047';
    if (savedSnap) {
      if (savedSnap.masterP1) masterP1 = savedSnap.masterP1;
      if (Array.isArray(savedSnap.masterUsers) && savedSnap.masterUsers.length > 0) {
        masterUsers = savedSnap.masterUsers;
      }
      if (Array.isArray(savedSnap.suratQueue) && savedSnap.suratQueue.length > 0) {
        suratQueue = savedSnap.suratQueue;
      }
    }
    if (masterUsers.length === 0) {
      masterUsers = [...DEFAULT_MASTER_USERS];
    }
    if (suratQueue.length === 0) {
      suratQueue = masterUsers.map((u) => ({
        userId: Number(u.id),
        noBast: u.noBastDefault || ''
      }));
    }
  }

  // Pulihkan Tanggal, Hari, Bulan, Tata Letak & Posisi Terakhir dari Snapshot
  if (savedSnap) {
    if (savedSnap.bastDatePicker) el.bastDatePicker.value = savedSnap.bastDatePicker;
    if (savedSnap.bastBulanKerja) el.bastBulanKerja.value = savedSnap.bastBulanKerja;
    if (savedSnap.bastHari) el.bastHari.value = savedSnap.bastHari;
    if (savedSnap.bastTanggalTeks) el.bastTanggalTeks.value = savedSnap.bastTanggalTeks;
    if (savedSnap.indentLeft !== undefined) el.layoutIndentLeft.value = savedSnap.indentLeft;
    if (savedSnap.indentRight !== undefined) el.layoutIndentRight.value = savedSnap.indentRight;
    if (savedSnap.spaceBefore !== undefined) el.layoutSpaceBefore.value = savedSnap.spaceBefore;
    if (savedSnap.spaceAfter !== undefined) el.layoutSpaceAfter.value = savedSnap.spaceAfter;
    if (savedSnap.fontFamily) el.docFontFamily.value = savedSnap.fontFamily;
    if (savedSnap.ttdHeightPx) el.ttdHeightPx.value = savedSnap.ttdHeightPx;
    if (typeof savedSnap.activeQueueIndex === 'number' && savedSnap.activeQueueIndex < suratQueue.length) {
      activeQueueIndex = savedSnap.activeQueueIndex;
    }
  } else {
    loadLocalLayoutSettings();
  }

  if (masterUsers.length > 0 && selectedMasterUserId !== 'new') {
    const found = masterUsers.find((u) => Number(u.id) === Number(selectedMasterUserId)) || masterUsers[0];
    selectedMasterUserId = found.id;
    if (!preserveDraft) {
      fillMasterUserForm(found);
    }
  }
  fillMasterP1Form();
  renderCrudUserTable();
  renderMasterSelectUser();
  renderSuratQueue();
  isInitialLoading = false;
  updatePreview();
}

// ============================================================================
// Render HTML Dokumen BAST (Tahoma 12pt, Justify, Biodata + SPK + TTD Default)
// ============================================================================
function buildBastHtmlForQueueItem(queueItem) {
  const user =
    masterUsers.find((u) => Number(u.id) === Number(queueItem.userId)) ||
    masterUsers[0] ||
    DEFAULT_MASTER_USERS[0];
  const noBast = (queueItem.noBast || user.noBastDefault || '').trim();
  const hari = el.bastHari.value.trim();
  const tanggalTeks = el.bastTanggalTeks.value.trim();
  const bulanKerja = el.bastBulanKerja.value.trim();

  const nominalFormatted = formatRupiahTitik(user.honor);
  const p2NamaUpper = escapeHtml(user.nama).toUpperCase();
  const p1NamaUpper = escapeHtml(masterP1.nama).toUpperCase();

  const ttdP2Html = user.ttd
    ? `<img src="${user.ttd}" alt="TTD Pihak Kedua" class="bast-sig-img" />`
    : `&nbsp;`;

  const ttdP1Html = masterP1.ttd
    ? `<img src="${masterP1.ttd}" alt="TTD Pihak Pertama" class="bast-sig-img" />`
    : `&nbsp;`;

  const logoSrc = window.LOGO_KKP_BASE64 || 'logo_kkp_hd.png';

  return `
    <!-- KOP SURAT SESUAI TEMPLATE KOP BP3 2024.pdf -->
    <div class="bast-kop-wrapper">
      <table class="bast-kop-table">
        <tr>
          <td class="bast-kop-logo-cell">
            <img src="${logoSrc}" alt="Logo KKP" />
          </td>
          <td class="bast-kop-text-cell">
            <div class="kop-line-1">KEMENTERIAN KELAUTAN DAN PERIKANAN</div>
            <div class="kop-line-2">BADAN PENYULUHAN DAN PENGEMBANGAN</div>
            <div class="kop-line-3">SUMBER DAYA MANUSIA KELAUTAN DAN PERIKANAN</div>
            <div class="kop-line-4">BALAI PELATIHAN DAN PENYULUHAN PERIKANAN AMBON</div>
            <div class="kop-line-5">JL. DR. J. LEIMENA, RUMAH TIGA, KEC. TLK. AMBON, KOTA AMBON, MALUKU KODE POS 97233</div>
            <div class="kop-line-6">TELEPON (0911) 322710 (LACAK), FAKSIMILE (0911) 322711)</div>
            <div class="kop-line-7">LAMAN <span class="kop-link">www.kkp.go.id</span> SUREL <span class="kop-link">bppp_ambon@kkp.go.id</span></div>
          </td>
        </tr>
      </table>
      <div class="bast-kop-double-line"></div>
    </div>

    <div class="bast-header">
      <div>BERITA ACARA SERAH TERIMA PEKERJAAN</div>
      <div>Pengadaan Jasa Lainnya Perorangan (PJLP)</div>
      <div>${escapeHtml(user.jabatan)}</div>
    </div>

    <div class="bast-nomor">
      Nomor: ${escapeHtml(noBast)}
    </div>

    <p class="bast-paragraph">
      Pada hari ini ${escapeHtml(hari)} tanggal ${escapeHtml(tanggalTeks)}, kami yang bertanda tangan di bawah ini:
    </p>

    <div class="bast-parties">
      <!-- PIHAK PERTAMA (DEFAULT) -->
      <div class="bast-party-item">
        <div class="bast-party-num">1.</div>
        <div class="bast-party-content">
          <table class="bast-party-table">
            <tr>
              <td class="label-col">Nama</td>
              <td class="colon-col">:</td>
              <td class="val-col">${escapeHtml(masterP1.nama)}</td>
            </tr>
            <tr>
              <td class="label-col">Jabatan</td>
              <td class="colon-col">:</td>
              <td class="val-col">${escapeHtml(masterP1.jabatan)}</td>
            </tr>
            <tr>
              <td class="label-col">Alamat</td>
              <td class="colon-col">:</td>
              <td class="val-col">${escapeHtml(masterP1.alamat)}</td>
            </tr>
          </table>
          <div class="bast-party-alias">
            (Selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong>)
          </div>
        </div>
      </div>

      <!-- PIHAK KEDUA (DEFAULT DARI DATABASE MYSQL) -->
      <div class="bast-party-item">
        <div class="bast-party-num">2.</div>
        <div class="bast-party-content">
          <table class="bast-party-table">
            <tr>
              <td class="label-col">Nama</td>
              <td class="colon-col">:</td>
              <td class="val-col">${escapeHtml(user.nama)}</td>
            </tr>
            <tr>
              <td class="label-col">NIK</td>
              <td class="colon-col">:</td>
              <td class="val-col">${escapeHtml(user.nik)}</td>
            </tr>
            <tr>
              <td class="label-col">Alamat</td>
              <td class="colon-col">:</td>
              <td class="val-col">${escapeHtml(user.alamat)}</td>
            </tr>
          </table>
          <div class="bast-party-alias">
            (Selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong>)
          </div>
        </div>
      </div>
    </div>

    <p class="bast-paragraph">
      Menyatakan bahwa:
    </p>

    <p class="bast-paragraph">
      Berdasarkan Surat Perintah Kerja (SPK) / Surat Perjanjian Kerja Nomor:
      ${escapeHtml(user.noSpk)} tanggal ${escapeHtml(user.tglSpk)} tentang <strong>Pengadaan Jasa Lainnya Perorangan untuk ${escapeHtml(user.jabatan)}</strong>, kedua belah pihak menyatakan hal-hal sebagai berikut:
    </p>

    <div class="bast-points">
      <div class="bast-point-row">
        <div class="bast-point-num">1.</div>
        <div class="bast-point-text">
          <strong>PIHAK KEDUA</strong> telah menyerahkan hasil pelaksanaan pekerjaan jasa lainnya perorangan bulan ${escapeHtml(bulanKerja)} kepada <strong>PIHAK PERTAMA</strong> dengan kondisi baik dan telah selesai 100% (seratus persen) sesuai dengan ketentuan dalam surat perjanjian/SPK.
        </div>
      </div>

      <div class="bast-point-row">
        <div class="bast-point-num">2.</div>
        <div class="bast-point-text">
          <strong>PIHAK PERTAMA</strong> telah menerima hasil pekerjaan tersebut dari <strong>PIHAK KEDUA</strong>.
        </div>
      </div>

      <div class="bast-point-row">
        <div class="bast-point-num">3.</div>
        <div class="bast-point-text">
          Berita Acara Serah Terima ini dibuat sebagai dasar administrasi untuk melakukan proses pembayaran hak/honorarium <strong>PIHAK KEDUA</strong> sesuai dengan nilai kontrak sebesar <strong>Rp.${nominalFormatted},-</strong> (<em>${escapeHtml(user.terbilang)}</em>).
        </div>
      </div>
    </div>

    <p class="bast-paragraph">
      Demikian Berita Acara Serah Terima ini dibuat untuk dipergunakan sebagaimana mestinya.
    </p>

    <!-- Tabel Tanda Tangan Tanpa Garis + TTD Default Pihak Kedua & Pihak Pertama -->
    <table class="bast-signatures">
      <tr>
        <td>PIHAK KEDUA,</td>
        <td>PIHAK PERTAMA,</td>
      </tr>
      <tr>
        <td class="bast-sig-img-cell">${ttdP2Html}</td>
        <td class="bast-sig-img-cell">${ttdP1Html}</td>
      </tr>
      <tr>
        <td class="bast-sig-name">${p2NamaUpper}</td>
        <td class="bast-sig-name">${p1NamaUpper}</td>
      </tr>
    </table>
  `;
}

// ============================================================================
// Update Pratinjau Kertas A4
// ============================================================================
function applyLayoutVariables() {
  const indentLeft = parseFloat(el.layoutIndentLeft.value);
  const indentRight = parseFloat(el.layoutIndentRight.value);
  const spaceBefore = parseFloat(el.layoutSpaceBefore.value);
  const spaceAfter = parseFloat(el.layoutSpaceAfter.value);
  const ttdHeight = parseInt(el.ttdHeightPx.value, 10) || 68;

  document.documentElement.style.setProperty('--doc-font', el.docFontFamily.value);
  document.documentElement.style.setProperty('--indent-left', `${isNaN(indentLeft) ? 0.05 : indentLeft}cm`);
  document.documentElement.style.setProperty('--indent-right', `${isNaN(indentRight) ? 0 : indentRight}cm`);
  document.documentElement.style.setProperty('--space-before', `${isNaN(spaceBefore) ? 7.8 : spaceBefore}pt`);
  document.documentElement.style.setProperty('--space-after', `${isNaN(spaceAfter) ? 0 : spaceAfter}pt`);
  document.documentElement.style.setProperty('--ttd-height', `${ttdHeight}px`);
}

function updatePreview() {
  applyLayoutVariables();

  if (suratQueue.length === 0) {
    el.bastPageSingle.innerHTML = `<p style="text-align:center; color:#64748b; margin-top:4cm;">Belum ada user di daftar surat. Klik <strong>➕ Tambah User ke Surat</strong> di sebelah kiri.</p>`;
    el.activeSuratIndicator.textContent = '0 / 0';
    return;
  }

  if (activeQueueIndex < 0 || activeQueueIndex >= suratQueue.length) {
    activeQueueIndex = 0;
  }

  const currentItem = suratQueue[activeQueueIndex];
  const user = masterUsers.find((u) => Number(u.id) === Number(currentItem.userId)) || masterUsers[0];

  el.bastPageSingle.innerHTML = buildBastHtmlForQueueItem(currentItem);
  el.activeSuratIndicator.textContent = `User ${activeQueueIndex + 1} / ${suratQueue.length}`;

  if (user) {
    document.title = 'LetterHub';
    el.previewBannerText.innerHTML = `📄 Menampilkan Surat #${activeQueueIndex + 1}: <strong>${escapeHtml(user.nama)}</strong> (${escapeHtml(user.jabatan)}) — Nomor: <strong>${escapeHtml(currentItem.noBast)}</strong>`;
  }

  saveLocalLayoutSettings();
  scheduleAutoSaveSurat();
}

// ============================================================================
// Render Daftar Baris Surat (Tab 1: Tambah User & Input Nomor Surat Manual)
// ============================================================================
function renderSuratQueue() {
  el.suratQueueContainer.innerHTML = '';
  el.badgeJumlahSurat.textContent = `${suratQueue.length} Surat`;

  suratQueue.forEach((item, idx) => {
    const user = masterUsers.find((u) => Number(u.id) === Number(item.userId)) || masterUsers[0];
    const card = document.createElement('div');
    card.className = 'surat-row-card' + (idx === activeQueueIndex ? ' active' : '');

    const optionsHtml = masterUsers
      .map(
        (u) =>
          `<option value="${u.id}" ${Number(u.id) === Number(item.userId) ? 'selected' : ''}>${escapeHtml(u.nama)} (${escapeHtml(u.jabatan)})</option>`
      )
      .join('');

    card.innerHTML = `
      <div class="surat-row-top">
        <span class="surat-row-num">Surat #${idx + 1}</span>
        <select class="surat-row-select" data-idx="${idx}">
          ${optionsHtml}
        </select>
        <button type="button" class="btn btn-danger btn-xs btn-remove-row" data-idx="${idx}" title="Hapus baris surat ini">
          ✕
        </button>
      </div>

      <div class="surat-row-middle">
        <label>Nomor Surat BAST (Input Manual):</label>
        <input type="text" class="surat-row-nobast" data-idx="${idx}" value="${escapeHtml(item.noBast)}" placeholder="Masukkan Nomor Surat BAST..." />
      </div>

      <div class="surat-row-bottom">
        <div class="surat-row-meta">
          ${user ? `SPK: ${escapeHtml(user.noSpk)} • Rp.${formatRupiahTitik(user.honor)},-` : ''}
        </div>
        <div class="surat-row-actions">
          <button type="button" class="btn btn-outline btn-xs btn-view-row" data-idx="${idx}" title="Lihat pratinjau surat ini">
            👁️ Lihat
          </button>
          <button type="button" class="btn btn-primary btn-xs btn-print-row" data-idx="${idx}" title="Cetak / Simpan PDF 1 Halaman untuk user ini">
            🖨️ Cetak
          </button>
          <button type="button" class="btn btn-secondary btn-xs btn-word-row" data-idx="${idx}" title="Unduh Word (.doc) untuk user ini">
            📝 Word
          </button>
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('select') || e.target.closest('input')) return;
      activeQueueIndex = idx;
      renderSuratQueue();
      updatePreview();
    });

    el.suratQueueContainer.appendChild(card);
  });

  // Event ganti User pada dropdown baris
  el.suratQueueContainer.querySelectorAll('.surat-row-select').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const idx = Number(sel.getAttribute('data-idx'));
      const newUserId = Number(e.target.value);
      const foundUser = masterUsers.find((u) => Number(u.id) === newUserId);
      suratQueue[idx].userId = newUserId;
      if (foundUser && foundUser.noBastDefault) {
        suratQueue[idx].noBast = foundUser.noBastDefault;
      }
      activeQueueIndex = idx;
      renderSuratQueue();
      updatePreview();
    });
  });

  // Event ketik Nomor Surat manual
  el.suratQueueContainer.querySelectorAll('.surat-row-nobast').forEach((inp) => {
    inp.addEventListener('focus', () => {
      const idx = Number(inp.getAttribute('data-idx'));
      if (activeQueueIndex !== idx) {
        activeQueueIndex = idx;
        el.suratQueueContainer.querySelectorAll('.surat-row-card').forEach((c, i) => {
          c.classList.toggle('active', i === idx);
        });
        updatePreview();
      }
    });

    inp.addEventListener('input', (e) => {
      const idx = Number(inp.getAttribute('data-idx'));
      suratQueue[idx].noBast = e.target.value;
      activeQueueIndex = idx;
      updatePreview();
    });
  });

  // Event Lihat, Cetak, Word, Hapus Baris
  el.suratQueueContainer.querySelectorAll('.btn-view-row').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeQueueIndex = Number(btn.getAttribute('data-idx'));
      renderSuratQueue();
      updatePreview();
    });
  });

  el.suratQueueContainer.querySelectorAll('.btn-print-row').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeQueueIndex = Number(btn.getAttribute('data-idx'));
      renderSuratQueue();
      updatePreview();
      setTimeout(() => {
        window.print();
      }, 80);
    });
  });

  el.suratQueueContainer.querySelectorAll('.btn-word-row').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeQueueIndex = Number(btn.getAttribute('data-idx'));
      renderSuratQueue();
      updatePreview();
      exportCurrentToWord();
    });
  });

  el.suratQueueContainer.querySelectorAll('.btn-remove-row').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (suratQueue.length <= 1) {
        await showAlertModal('Tidak Dapat Menghapus Baris', 'Minimal harus ada 1 baris pegawai di dalam daftar surat.');
        return;
      }
      const idx = Number(btn.getAttribute('data-idx'));
      suratQueue.splice(idx, 1);
      if (activeQueueIndex >= suratQueue.length) {
        activeQueueIndex = suratQueue.length - 1;
      }
      renderSuratQueue();
      updatePreview();
    });
  });
}

// ============================================================================
// Render Tabel CRUD User MySQL & Form (Tab 2)
// ============================================================================
function renderCrudUserTable() {
  el.crudUserTableBody.innerHTML = '';
  el.countMasterPegawai.textContent = masterUsers.length;

  masterUsers.forEach((u) => {
    const tr = document.createElement('tr');
    if (selectedMasterUserId !== 'new' && Number(u.id) === Number(selectedMasterUserId)) {
      tr.className = 'active-row';
    }

    const ttdCellHtml = u.ttd
      ? `<img src="${u.ttd}" alt="TTD" class="crud-ttd-thumb" />`
      : `<span style="color:#94a3b8; font-size:0.75rem;">Kosong</span>`;

    tr.innerHTML = `
      <td><strong>#${u.id}</strong></td>
      <td><strong>${escapeHtml(u.nama)}</strong></td>
      <td><code>${escapeHtml(u.nik)}</code></td>
      <td><span class="badge">${escapeHtml(u.jabatan)}</span></td>
      <td>${escapeHtml(u.alamat)}</td>
      <td>
        <div><strong>${escapeHtml(u.noSpk)}</strong></div>
        <div style="font-size:0.73rem; color:#64748b;">Tgl: ${escapeHtml(u.tglSpk)}</div>
      </td>
      <td><strong>Rp.${formatRupiahTitik(u.honor)},-</strong></td>
      <td>${ttdCellHtml}</td>
      <td style="text-align:center;">
        <div style="display:inline-flex; gap:0.35rem;">
          <button type="button" class="btn btn-primary btn-xs btn-crud-edit" data-id="${u.id}">
            ✏️ Edit
          </button>
          <button type="button" class="btn btn-danger btn-xs btn-crud-delete" data-id="${u.id}">
            🗑️ Hapus
          </button>
        </div>
      </td>
    `;

    el.crudUserTableBody.appendChild(tr);
  });

  // Event tombol Edit pada tabel CRUD
  el.crudUserTableBody.querySelectorAll('.btn-crud-edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-id'));
      const found = masterUsers.find((u) => Number(u.id) === id);
      if (found) {
        selectedMasterUserId = found.id;
        fillMasterUserForm(found);
        renderCrudUserTable();
        renderMasterSelectUser();
        el.formUserCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        showToast(`Mengedit User ID #${found.id}: ${found.nama}`);
      }
    });
  });

  // Event tombol Hapus pada tabel CRUD
  el.crudUserTableBody.querySelectorAll('.btn-crud-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.getAttribute('data-id'));
      await deleteUserById(id);
    });
  });
}

function renderMasterSelectUser() {
  el.masterSelectUser.innerHTML = '';

  if (selectedMasterUserId === 'new') {
    const optNew = document.createElement('option');
    optNew.value = 'new';
    optNew.textContent = '-- Tambah Pegawai Baru --';
    optNew.selected = true;
    el.masterSelectUser.appendChild(optNew);
    el.formUserTitle.textContent = 'Tambah Data Pegawai Baru (Pihak Kedua)';
    el.formUserModeBadge.textContent = 'Pegawai Baru';
    el.formUserModeBadge.className = 'badge badge-green';
  } else {
    el.formUserTitle.textContent = `Edit Data Pegawai #${selectedMasterUserId}`;
    el.formUserModeBadge.textContent = `Mode Edit (#${selectedMasterUserId})`;
    el.formUserModeBadge.className = 'badge';
  }

  masterUsers.forEach((u) => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = `#${u.id} — ${u.nama} (${u.jabatan})`;
    if (selectedMasterUserId !== 'new' && Number(u.id) === Number(selectedMasterUserId)) {
      opt.selected = true;
    }
    el.masterSelectUser.appendChild(opt);
  });
}

function renderTtdPreview(frameEl, dataUrl) {
  if (dataUrl) {
    frameEl.innerHTML = `<img src="${dataUrl}" alt="Pratinjau TTD" />`;
  } else {
    frameEl.innerHTML = `<span class="ttd-empty-text">Kosong (Tanpa Gambar TTD / TTD Basah)</span>`;
  }
}

function fillMasterUserForm(user) {
  el.mP2Nama.value = user.nama || '';
  el.mP2Nik.value = user.nik || '';
  el.mP2Alamat.value = user.alamat || '';
  el.mP2Jabatan.value = user.jabatan || 'Petugas Keamanan';
  el.mP2Honor.value = user.honor || 3381225;
  el.mP2Terbilang.value = user.terbilang || konversiTerbilang(user.honor || 3381225);
  el.mP2NoSpk.value = user.noSpk || '';
  el.mP2TglSpk.value = user.tglSpk || '5 Januari 2026';
  el.mP2NoBastDefault.value = user.noBastDefault || '';
  currentEditTtdP2 = user.ttd || '';
  renderTtdPreview(el.previewFrameTtdP2, currentEditTtdP2);
}

function fillMasterP1Form() {
  el.mP1Nama.value = masterP1.nama || '';
  el.mP1Jabatan.value = masterP1.jabatan || '';
  el.mP1Alamat.value = masterP1.alamat || '';
  currentEditTtdP1 = masterP1.ttd || '';
  renderTtdPreview(el.previewFrameTtdP1, currentEditTtdP1);
}

// ============================================================================
// Kanvas Gambar Tanda Tangan Interaktif (Pihak 2 & Pihak 1)
// ============================================================================
function setupSignatureCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let drawing = false;
  let hasDrawn = false;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  }

  function start(e) {
    e.preventDefault();
    drawing = true;
    hasDrawn = true;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function end() {
    drawing = false;
  }

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);

  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('touchend', end);

  return {
    clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasDrawn = false;
    },
    getDataUrl() {
      if (!hasDrawn) return null;
      return canvas.toDataURL('image/png');
    }
  };
}

const padP2 = setupSignatureCanvas(el.canvasTtdP2);
const padP1 = setupSignatureCanvas(el.canvasTtdP1);

function handleFileUpload(inputEl, callback) {
  inputEl.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      callback(ev.target.result);
    };
    reader.readAsDataURL(file);
    inputEl.value = '';
  });
}

handleFileUpload(el.uploadTtdP2, (dataUrl) => {
  currentEditTtdP2 = dataUrl;
  renderTtdPreview(el.previewFrameTtdP2, currentEditTtdP2);
  showToast('Gambar TTD Pihak Kedua dimuat. Klik Simpan Data Pegawai.');
});

handleFileUpload(el.uploadTtdP1, (dataUrl) => {
  currentEditTtdP1 = dataUrl;
  renderTtdPreview(el.previewFrameTtdP1, currentEditTtdP1);
  showToast('Gambar TTD Pihak Pertama dimuat. Klik Simpan Data PPK.');
});

el.btnUseCanvasP2.addEventListener('click', async () => {
  const url = padP2.getDataUrl();
  if (!url) {
    await showAlertModal('Kanvas Tanda Tangan Kosong', 'Silakan goreskan tanda tangan di kotak kanvas terlebih dahulu.');
    return;
  }
  currentEditTtdP2 = url;
  renderTtdPreview(el.previewFrameTtdP2, currentEditTtdP2);
  showToast('Tanda tangan siap digunakan. Klik Simpan Data Pegawai.');
});

el.btnResetCanvasP2.addEventListener('click', () => padP2.clear());
el.btnClearTtdP2.addEventListener('click', () => {
  currentEditTtdP2 = '';
  renderTtdPreview(el.previewFrameTtdP2, '');
});

el.btnUseCanvasP1.addEventListener('click', async () => {
  const url = padP1.getDataUrl();
  if (!url) {
    await showAlertModal('Kanvas Tanda Tangan Kosong', 'Silakan goreskan tanda tangan di kotak kanvas terlebih dahulu.');
    return;
  }
  currentEditTtdP1 = url;
  renderTtdPreview(el.previewFrameTtdP1, currentEditTtdP1);
  showToast('Tanda tangan PPK siap digunakan. Klik Simpan Data PPK.');
});

el.btnResetCanvasP1.addEventListener('click', () => padP1.clear());
el.btnClearTtdP1.addEventListener('click', () => {
  currentEditTtdP1 = '';
  renderTtdPreview(el.previewFrameTtdP1, '');
});

// ============================================================================
// Pengaturan Tata Letak Lokal
// ============================================================================
function saveLocalLayoutSettings() {
  const g = {
    bastDatePicker: el.bastDatePicker.value,
    indentLeft: el.layoutIndentLeft.value,
    indentRight: el.layoutIndentRight.value,
    spaceBefore: el.layoutSpaceBefore.value,
    spaceAfter: el.layoutSpaceAfter.value,
    fontFamily: el.docFontFamily.value,
    ttdHeightPx: el.ttdHeightPx.value
  };
  localStorage.setItem(STORAGE_KEY_GLOBAL, JSON.stringify(g));
}

function loadLocalLayoutSettings() {
  try {
    const rawGlobal = localStorage.getItem(STORAGE_KEY_GLOBAL);
    if (rawGlobal) {
      const g = JSON.parse(rawGlobal);
      if (g.bastDatePicker) el.bastDatePicker.value = g.bastDatePicker;
      if (g.indentLeft !== undefined) el.layoutIndentLeft.value = g.indentLeft;
      if (g.indentRight !== undefined) el.layoutIndentRight.value = g.indentRight;
      if (g.spaceBefore !== undefined) el.layoutSpaceBefore.value = g.spaceBefore;
      if (g.spaceAfter !== undefined) el.layoutSpaceAfter.value = g.spaceAfter;
      if (g.fontFamily) el.docFontFamily.value = g.fontFamily;
      if (g.ttdHeightPx) el.ttdHeightPx.value = g.ttdHeightPx;
    }
  } catch (e) {}
}

// ============================================================================
// Operasi CRUD ke MySQL (Create, Read, Update, Delete)
// ============================================================================
el.btnRefreshDb.addEventListener('click', async () => {
  await fetchAllFromDatabase();
  showToast('Data pegawai berhasil dimuat ulang!');
});

el.masterSelectUser.addEventListener('change', (e) => {
  const val = e.target.value;
  if (val === 'new') {
    startNewUserMode();
    return;
  }
  selectedMasterUserId = Number(val);
  const found = masterUsers.find((u) => Number(u.id) === selectedMasterUserId);
  if (found) {
    fillMasterUserForm(found);
    renderCrudUserTable();
    renderMasterSelectUser();
  }
});

function startNewUserMode() {
  selectedMasterUserId = 'new';
  renderMasterSelectUser();
  renderCrudUserTable();
  el.mP2Nama.value = '';
  el.mP2Nik.value = '';
  el.mP2Alamat.value = '';
  el.mP2Jabatan.value = 'Petugas Kebersihan';
  el.mP2Honor.value = 3381225;
  el.mP2Terbilang.value = konversiTerbilang(3381225);
  el.mP2NoSpk.value = 'SPK.118/BPPP.AMB/PL.450/I/2026';
  el.mP2TglSpk.value = '5 Januari 2026';
  el.mP2NoBastDefault.value = 'B.1690/BPPP.AMB/PL.450/VIII/2026';
  currentEditTtdP2 = '';
  renderTtdPreview(el.previewFrameTtdP2, '');
  padP2.clear();
  el.mP2Nama.focus();
  showToast('Mode CREATE: Silakan isi biodata, SPK & TTD user baru.');
}

el.btnMasterNewUser.addEventListener('click', startNewUserMode);

el.mP2Honor.addEventListener('input', () => {
  el.mP2Terbilang.value = konversiTerbilang(el.mP2Honor.value);
});

// Simpan Pegawai
el.btnSaveMasterUser.addEventListener('click', async () => {
  const nama = el.mP2Nama.value.trim();
  if (!nama) {
    await showAlertModal('Data Belum Lengkap', 'Nama Lengkap Pihak Kedua wajib diisi terlebih dahulu.');
    el.mP2Nama.focus();
    return;
  }

  const isNew = selectedMasterUserId === 'new' || !selectedMasterUserId;
  const payload = {
    id: isNew ? 0 : Number(selectedMasterUserId),
    nama,
    nik: el.mP2Nik.value.trim(),
    alamat: el.mP2Alamat.value.trim(),
    jabatan: el.mP2Jabatan.value.trim() || 'Petugas Kebersihan',
    honor: Number(el.mP2Honor.value) || 0,
    terbilang: el.mP2Terbilang.value.trim() || konversiTerbilang(el.mP2Honor.value),
    noSpk: el.mP2NoSpk.value.trim(),
    tglSpk: el.mP2TglSpk.value.trim(),
    noBastDefault: el.mP2NoBastDefault.value.trim(),
    ttd: currentEditTtdP2
  };

  let savedId = isNew ? 0 : Number(selectedMasterUserId);
  let mode = isNew ? 'created' : 'updated';

  try {
    const res = await apiRequest('save_user', payload);
    if (res && res.id) savedId = Number(res.id);
    if (res && res.mode) mode = res.mode;
  } catch (_) {
    // Mode Cloud Statis (Vercel): simpan langsung ke penyimpanan lokal browser
    if (isNew) {
      const maxId = masterUsers.reduce((m, u) => Math.max(m, Number(u.id) || 0), 0);
      savedId = maxId + 1;
      mode = 'created';
    }
  }

  selectedMasterUserId = Number(savedId);
  if (mode === 'created') {
    const newUserObj = { ...payload, id: Number(savedId) };
    masterUsers.push(newUserObj);
    suratQueue.push({
      userId: Number(savedId),
      noBast: payload.noBastDefault || ''
    });
    activeQueueIndex = suratQueue.length - 1;
  } else {
    const idx = masterUsers.findIndex((u) => Number(u.id) === Number(savedId));
    if (idx !== -1) {
      masterUsers[idx] = { ...masterUsers[idx], ...payload, id: Number(savedId) };
    }
  }
  saveSnapshotImmediate();
  await fetchAllFromDatabase();
  saveSnapshotImmediate();
  showToast(
    mode === 'created'
      ? `Pegawai baru "${nama}" berhasil ditambahkan!`
      : `Data pegawai "${nama}" berhasil diperbarui!`
  );
});

// Hapus Pegawai
async function deleteUserById(id) {
  if (masterUsers.length <= 1) {
    await showAlertModal('Tidak Dapat Menghapus', 'Minimal harus ada 1 pegawai tersimpan di dalam sistem.');
    return;
  }
  const target = masterUsers.find((u) => Number(u.id) === Number(id));
  if (!target) return;

  const ok = await showConfirmModal({
    title: 'Hapus Data Pegawai',
    message: `Apakah Anda yakin ingin menghapus data pegawai "${target.nama}" dari daftar master pegawai?`,
    confirmText: 'Ya, Hapus Pegawai',
    isDanger: true
  });
  if (!ok) {
    return;
  }

  try {
    await apiRequest('delete_user', { id: Number(id) });
  } catch (_) {
    // Mode Cloud Statis (Vercel): hapus langsung dari penyimpanan lokal browser
  }

  masterUsers = masterUsers.filter((u) => Number(u.id) !== Number(id));
  suratQueue = suratQueue.filter((q) => Number(q.userId) !== Number(id));
  if (suratQueue.length === 0 && masterUsers.length > 0) {
    suratQueue = [{ userId: Number(masterUsers[0].id), noBast: masterUsers[0].noBastDefault || '' }];
  }
  selectedMasterUserId = masterUsers[0].id;
  saveSnapshotImmediate();
  await fetchAllFromDatabase();
  saveSnapshotImmediate();
  showToast(`Data pegawai "${target.nama}" telah dihapus.`);
}

el.btnDeleteMasterUser.addEventListener('click', async () => {
  if (selectedMasterUserId === 'new') {
    if (masterUsers.length > 0) {
      selectedMasterUserId = masterUsers[0].id;
      fillMasterUserForm(masterUsers[0]);
      renderCrudUserTable();
      renderMasterSelectUser();
    }
    return;
  }
  await deleteUserById(Number(selectedMasterUserId));
});

// Simpan Default Pihak Pertama (PPK)
el.btnSaveMasterP1.addEventListener('click', async () => {
  const payload = {
    nama: el.mP1Nama.value.trim() || 'Rahmawati Umasugi',
    jabatan: el.mP1Jabatan.value.trim() || 'Pejabat Pembuat Komitmen',
    alamat: el.mP1Alamat.value.trim() || 'Jl. Dr. Leimena Desa Rumah Tiga Ambon',
    ttd: currentEditTtdP1
  };

  try {
    await apiRequest('save_p1', payload);
  } catch (_) {
    // Mode Cloud Statis (Vercel)
  }
  masterP1 = { ...masterP1, ...payload };
  saveSnapshotImmediate();
  await fetchAllFromDatabase();
  saveSnapshotImmediate();
  showToast('Data Pihak Pertama (PPK) berhasil disimpan!');
});

// ============================================================================
// Event Listeners Tab 1 (Buat Surat & Simpan Antrean ke MySQL)
// ============================================================================
el.tabBtnBuatSurat.addEventListener('click', () => {
  el.tabBtnBuatSurat.classList.add('active');
  el.tabBtnMasterData.classList.remove('active');
  el.viewBuatSurat.classList.remove('hidden');
  el.viewMasterData.classList.add('hidden');
  el.headerPrintActions.classList.remove('hidden');
  renderSuratQueue();
  updatePreview();
});

el.tabBtnMasterData.addEventListener('click', () => {
  el.tabBtnMasterData.classList.add('active');
  el.tabBtnBuatSurat.classList.remove('active');
  el.viewMasterData.classList.remove('hidden');
  el.viewBuatSurat.classList.add('hidden');
  el.headerPrintActions.classList.add('hidden');
  renderCrudUserTable();
});

el.btnPrevSurat.addEventListener('click', () => {
  if (suratQueue.length === 0) return;
  activeQueueIndex = activeQueueIndex > 0 ? activeQueueIndex - 1 : suratQueue.length - 1;
  renderSuratQueue();
  updatePreview();
});

el.btnNextSurat.addEventListener('click', () => {
  if (suratQueue.length === 0) return;
  activeQueueIndex = activeQueueIndex < suratQueue.length - 1 ? activeQueueIndex + 1 : 0;
  renderSuratQueue();
  updatePreview();
});

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

el.bastDatePicker.addEventListener('change', () => {
  const val = el.bastDatePicker.value;
  if (!val) return;
  const [yyyy, mm, dd] = val.split('-').map(Number);
  const dateObj = new Date(yyyy, mm - 1, dd);
  el.bastHari.value = NAMA_HARI[dateObj.getDay()];
  el.bastTanggalTeks.value = `${dd} ${NAMA_BULAN[mm - 1]} ${yyyy}`;
  el.bastBulanKerja.value = NAMA_BULAN[mm - 1];
  updatePreview();
  showToast('Tanggal diperbarui otomatis untuk seluruh user!');
});

[el.bastHari, el.bastTanggalTeks, el.bastBulanKerja].forEach((inp) => {
  inp.addEventListener('input', updatePreview);
  inp.addEventListener('change', updatePreview);
});

el.btnAddRowSurat.addEventListener('click', () => {
  const defaultUser = masterUsers[0];
  if (!defaultUser) return;
  suratQueue.push({
    userId: Number(defaultUser.id),
    noBast: defaultUser.noBastDefault || ''
  });
  activeQueueIndex = suratQueue.length - 1;
  renderSuratQueue();
  updatePreview();
  showToast('Baris user baru ditambahkan. Silakan pilih user & isi Nomor Surat.');
});

el.btnLoadAllMaster.addEventListener('click', () => {
  suratQueue = masterUsers.map((u) => {
    const existing = suratQueue.find((q) => Number(q.userId) === Number(u.id));
    return {
      userId: Number(u.id),
      noBast: existing ? existing.noBast : u.noBastDefault || ''
    };
  });
  activeQueueIndex = 0;
  renderSuratQueue();
  updatePreview();
  showToast(`Seluruh ${masterUsers.length} pegawai telah dimasukkan ke daftar surat!`);
});

if (el.btnResetSuratQueue) {
  el.btnResetSuratQueue.addEventListener('click', async () => {
    const ok = await showConfirmModal({
      title: 'Reset Daftar Pembuatan Surat',
      message: 'Kembalikan daftar surat menjadi 1 baris awal? (Data pegawai di Master Data tetap tersimpan dengan aman)',
      confirmText: 'Ya, Reset Daftar',
      cancelText: 'Batal',
      isDanger: true
    });
    if (!ok) {
      return;
    }
    const firstUser = masterUsers[0] || DEFAULT_MASTER_USERS[0];
    suratQueue = [
      {
        userId: Number(firstUser.id),
        noBast: firstUser.noBastDefault || ''
      }
    ];
    activeQueueIndex = 0;
    renderSuratQueue();
    updatePreview();
    saveSnapshotImmediate();
    try {
      await apiRequest('save_surat', {
        hari: el.bastHari.value.trim(),
        tanggalTeks: el.bastTanggalTeks.value.trim(),
        bulanKerja: el.bastBulanKerja.value.trim(),
        items: suratQueue
      });
    } catch (_) {
      // Tetap tersimpan di backup lokal
    }
    showToast('Daftar pembuatan surat berhasil di-reset ke 1 baris awal!');
  });
}

el.btnApplyAllSurat.addEventListener('click', async () => {
  try {
    await apiRequest('save_surat', {
      hari: el.bastHari.value.trim(),
      tanggalTeks: el.bastTanggalTeks.value.trim(),
      bulanKerja: el.bastBulanKerja.value.trim(),
      items: suratQueue
    });
    updatePreview();
    showToast(`Berhasil! Seluruh ${suratQueue.length} dokumen BAST telah disimpan.`);
  } catch (err) {
    updatePreview();
    showToast('Diterapkan ke seluruh dokumen!');
  }
});

[
  el.layoutIndentLeft,
  el.layoutIndentRight,
  el.layoutSpaceBefore,
  el.layoutSpaceAfter,
  el.docFontFamily,
  el.ttdHeightPx
].forEach((inp) => {
  inp.addEventListener('input', updatePreview);
  inp.addEventListener('change', updatePreview);
});

// ============================================================================
// Cetak 1 per 1 & Unduh Word (.doc) 1 per 1
// ============================================================================
el.btnPrintSingle.addEventListener('click', () => {
  window.print();
});

function exportCurrentToWord() {
  if (suratQueue.length === 0) return;
  const currentItem = suratQueue[activeQueueIndex] || suratQueue[0];
  const user = masterUsers.find((u) => Number(u.id) === Number(currentItem.userId)) || masterUsers[0];

  const noBast = (currentItem.noBast || user.noBastDefault || '').trim();
  const hari = el.bastHari.value.trim();
  const tanggalTeks = el.bastTanggalTeks.value.trim();
  const bulanKerja = el.bastBulanKerja.value.trim();
  const nominalFormatted = formatRupiahTitik(user.honor);

  const p2NamaUpper = escapeHtml(user.nama).toUpperCase();
  const p1NamaUpper = escapeHtml(masterP1.nama).toUpperCase();

  const indentLeft = parseFloat(el.layoutIndentLeft.value) || 0.05;
  const indentRight = parseFloat(el.layoutIndentRight.value) || 0;
  const spaceBefore = parseFloat(el.layoutSpaceBefore.value) || 7.8;
  const spaceAfter = parseFloat(el.layoutSpaceAfter.value) || 0;
  const ttdHeight = parseInt(el.ttdHeightPx.value, 10) || 68;

  const fontName = el.docFontFamily.value.includes('Times')
    ? 'Times New Roman'
    : el.docFontFamily.value.includes('Arial')
      ? 'Arial'
      : 'Tahoma';

  const ttdP2Word = user.ttd
    ? `<img src="${user.ttd}" height="${ttdHeight}" style="height:${ttdHeight}px;" />`
    : `<br/><br/><br/>`;

  const ttdP1Word = masterP1.ttd
    ? `<img src="${masterP1.ttd}" height="${ttdHeight}" style="height:${ttdHeight}px;" />`
    : `<br/><br/><br/>`;

  const logoSrc = window.LOGO_KKP_BASE64 || '';
  const kopWordHtml = `
    <table style="width:100%; border-collapse:collapse; margin-bottom:2pt; border-bottom:3pt double #000000;">
      <tr>
        <td style="width:99pt; vertical-align:middle; text-align:center; padding-bottom:4pt;">
          ${logoSrc ? `<img src="${logoSrc}" width="115" height="115" style="width:86pt; height:86pt;" />` : ''}
        </td>
        <td style="text-align:center; vertical-align:top; font-family:Arial, sans-serif; padding-bottom:4pt;">
          <div style="font-family:Arial, sans-serif; font-size:14.0pt; font-weight:bold; color:#0000FF; line-height:112%;">KEMENTERIAN KELAUTAN DAN PERIKANAN</div>
          <div style="font-family:Arial, sans-serif; font-size:16.0pt; font-weight:normal; color:#0000FF; line-height:112%;">BADAN PENYULUHAN DAN PENGEMBANGAN</div>
          <div style="font-family:Arial, sans-serif; font-size:16.0pt; font-weight:normal; color:#0000FF; line-height:112%;">SUMBER DAYA MANUSIA KELAUTAN DAN PERIKANAN</div>
          <div style="font-family:Arial, sans-serif; font-size:14.0pt; font-weight:bold; color:#0000FF; line-height:114%;">BALAI PELATIHAN DAN PENYULUHAN PERIKANAN AMBON</div>
          <div style="font-family:Arial, sans-serif; font-size:9.0pt; font-weight:normal; color:#000000; line-height:120%;">JL. DR. J. LEIMENA, RUMAH TIGA, KEC. TLK. AMBON, KOTA AMBON, MALUKU KODE POS 97233</div>
          <div style="font-family:Arial, sans-serif; font-size:10.0pt; font-weight:normal; color:#000000; line-height:115%;">TELEPON (0911) 322710 (LACAK), FAKSIMILE (0911) 322711)</div>
          <div style="font-family:Arial, sans-serif; font-size:10.0pt; font-weight:normal; color:#000000; line-height:115%;">LAMAN <span style="color:#0000FF; font-style:italic; text-decoration:underline;">www.kkp.go.id</span> SUREL <span style="color:#0000FF; font-style:italic; text-decoration:underline;">bppp_ambon@kkp.go.id</span></div>
        </td>
      </tr>
    </table>
    <br/>
  `;

  const wordHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>BAST - ${escapeHtml(user.nama)}</title>
      <style>
        @page Section1 {
          size: 21.0cm 29.7cm;
          margin: 1.25cm 2.25cm 1.5cm 2.25cm;
        }
        div.Section1 { page: Section1; }
        body, p, td, div {
          font-family: '${fontName}', sans-serif;
          font-size: 12.0pt;
          line-height: 115%;
          color: #000000;
        }
        p.bast-p {
          text-align: justify;
          text-justify: inter-ideograph;
          margin-left: ${indentLeft}cm;
          margin-right: ${indentRight}cm;
          margin-top: ${spaceBefore}pt;
          margin-bottom: ${spaceAfter}pt;
          font-size: 12.0pt;
        }
        table {
          border-collapse: collapse;
          font-size: 12.0pt;
        }
        td {
          vertical-align: top;
          font-size: 12.0pt;
          padding: 0.5pt 0pt;
          border: none;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        ${kopWordHtml}
        <p style="text-align:center; font-weight:bold; margin-left:${indentLeft}cm; margin-right:${indentRight}cm; margin-top:0pt; margin-bottom:0pt; font-size:12.0pt;">
          BERITA ACARA SERAH TERIMA PEKERJAAN<br/>
          Pengadaan Jasa Lainnya Perorangan (PJLP)<br/>
          ${escapeHtml(user.jabatan)}
        </p>

        <p style="text-align:center; font-weight:bold; margin-left:${indentLeft}cm; margin-right:${indentRight}cm; margin-top:12pt; margin-bottom:14pt; font-size:12.0pt;">
          Nomor: ${escapeHtml(noBast)}
        </p>

        <p class="bast-p">
          Pada hari ini ${escapeHtml(hari)} tanggal ${escapeHtml(tanggalTeks)}, kami yang bertanda tangan di bawah ini:
        </p>

        <table style="margin-left:0.68cm; margin-top:${spaceBefore}pt; margin-bottom:${spaceAfter}pt; width:96%;">
          <tr>
            <td style="width:0.45cm;">1.</td>
            <td style="width:2.15cm; font-weight:bold;">Nama</td>
            <td style="width:0.35cm;">:</td>
            <td style="text-align:justify;">${escapeHtml(masterP1.nama)}</td>
          </tr>
          <tr>
            <td></td>
            <td style="font-weight:bold;">Jabatan</td>
            <td>:</td>
            <td style="text-align:justify;">${escapeHtml(masterP1.jabatan)}</td>
          </tr>
          <tr>
            <td></td>
            <td style="font-weight:bold;">Alamat</td>
            <td>:</td>
            <td style="text-align:justify;">${escapeHtml(masterP1.alamat)}</td>
          </tr>
          <tr>
            <td></td>
            <td colspan="3" style="font-style:italic; padding-bottom:${spaceBefore}pt;">
              (Selanjutnya disebut sebagai <b>PIHAK PERTAMA</b>)
            </td>
          </tr>

          <tr>
            <td style="width:0.45cm;">2.</td>
            <td style="width:2.15cm; font-weight:bold;">Nama</td>
            <td style="width:0.35cm;">:</td>
            <td style="text-align:justify;">${escapeHtml(user.nama)}</td>
          </tr>
          <tr>
            <td></td>
            <td style="font-weight:bold;">NIK</td>
            <td>:</td>
            <td style="text-align:justify;">${escapeHtml(user.nik)}</td>
          </tr>
          <tr>
            <td></td>
            <td style="font-weight:bold;">Alamat</td>
            <td>:</td>
            <td style="text-align:justify;">${escapeHtml(user.alamat)}</td>
          </tr>
          <tr>
            <td></td>
            <td colspan="3" style="font-style:italic;">
              (Selanjutnya disebut sebagai <b>PIHAK KEDUA</b>)
            </td>
          </tr>
        </table>

        <p class="bast-p">Menyatakan bahwa:</p>

        <p class="bast-p">
          Berdasarkan Surat Perintah Kerja (SPK) / Surat Perjanjian Kerja Nomor:
          ${escapeHtml(user.noSpk)} tanggal ${escapeHtml(user.tglSpk)} tentang <b>Pengadaan Jasa Lainnya Perorangan untuk ${escapeHtml(user.jabatan)}</b>, kedua belah pihak menyatakan hal-hal sebagai berikut:
        </p>

        <table style="margin-left:0.68cm; margin-top:0pt; margin-bottom:0pt; width:96%;">
          <tr>
            <td style="width:0.63cm; padding-top:${spaceBefore}pt;">1.</td>
            <td style="text-align:justify; padding-top:${spaceBefore}pt;">
              <b>PIHAK KEDUA</b> telah menyerahkan hasil pelaksanaan pekerjaan jasa lainnya perorangan bulan ${escapeHtml(bulanKerja)} kepada <b>PIHAK PERTAMA</b> dengan kondisi baik dan telah selesai 100% (seratus persen) sesuai dengan ketentuan dalam surat perjanjian/SPK.
            </td>
          </tr>
          <tr>
            <td style="width:0.63cm; padding-top:${spaceBefore}pt;">2.</td>
            <td style="text-align:justify; padding-top:${spaceBefore}pt;">
              <b>PIHAK PERTAMA</b> telah menerima hasil pekerjaan tersebut dari <b>PIHAK KEDUA</b>.
            </td>
          </tr>
          <tr>
            <td style="width:0.63cm; padding-top:${spaceBefore}pt;">3.</td>
            <td style="text-align:justify; padding-top:${spaceBefore}pt;">
              Berita Acara Serah Terima ini dibuat sebagai dasar administrasi untuk melakukan proses pembayaran hak/honorarium <b>PIHAK KEDUA</b> sesuai dengan nilai kontrak sebesar <b>Rp.${nominalFormatted},-</b> (<i>${escapeHtml(user.terbilang)}</i>).
            </td>
          </tr>
        </table>

        <p class="bast-p">
          Demikian Berita Acara Serah Terima ini dibuat untuk dipergunakan sebagaimana mestinya.
        </p>

        <table style="width:100%; margin-top:14pt; margin-left:${indentLeft}cm; border-collapse:collapse;">
          <tr>
            <td style="width:50%; text-align:center; font-weight:bold;">PIHAK KEDUA,</td>
            <td style="width:50%; text-align:center; font-weight:bold;">PIHAK PERTAMA,</td>
          </tr>
          <tr>
            <td style="text-align:center; vertical-align:middle; height:64pt;">${ttdP2Word}</td>
            <td style="text-align:center; vertical-align:middle; height:64pt;">${ttdP1Word}</td>
          </tr>
          <tr>
            <td style="width:50%; text-align:center; font-weight:bold;">${p2NamaUpper}</td>
            <td style="width:50%; text-align:center; font-weight:bold;">${p1NamaUpper}</td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = (user.nama || 'Pihak_Kedua').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.href = url;
  link.download = `BAST_${safeName}_${bulanKerja}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast(`Dokumen Word untuk "${user.nama}" berhasil diunduh!`);
}

el.btnExportWord.addEventListener('click', exportCurrentToWord);

// Jalankan aplikasi & muat semua data dari MySQL
fetchAllFromDatabase();
