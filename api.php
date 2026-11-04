<?php
// ============================================================================
// REST API CRUD MySQL (phpMyAdmin) - Sistem Otomatis BAST PJLP
// Database: db_bast_pjlp
// Tabel: users_pihak_kedua, pihak_pertama, surat_bast
// ============================================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$host = '127.0.0.1';
$user = 'root';
$pass = '';
$dbName = 'db_bast_pjlp';

mysqli_report(MYSQLI_REPORT_OFF);
$conn = @new mysqli($host, $user, $pass);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Gagal terhubung ke MySQL (XAMPP): ' . $conn->connect_error
    ]);
    exit;
}

$conn->set_charset('utf8mb4');

// Pastikan database dan tabel tersedia
$conn->query("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$conn->select_db($dbName);

$action = isset($_GET['action']) ? $_GET['action'] : '';
if (!$action && isset($argv[1])) {
    parse_str($argv[1], $cliQuery);
    if (isset($cliQuery['action'])) {
        $action = $cliQuery['action'];
    }
}

$rawInput = file_get_contents('php://input');
if (($rawInput === false || $rawInput === '') && defined('STDIN')) {
    $rawInput = stream_get_contents(STDIN);
}
$body = $rawInput ? json_decode($rawInput, true) : [];
if (!is_array($body)) {
    $body = [];
}

// ============================================================================
// 1. READ ALL DATA (Users Pihak Kedua, Pihak Pertama, dan Daftar Surat BAST)
// ============================================================================
if ($action === 'all' || $action === '') {
    // Ambil Pihak Pertama
    $resP1 = $conn->query("SELECT * FROM `pihak_pertama` ORDER BY `id` ASC LIMIT 1");
    $pihakPertama = $resP1 && $resP1->num_rows > 0 ? $resP1->fetch_assoc() : [
        'id' => 1,
        'nama' => 'Rahmawati Umasugi',
        'jabatan' => 'Pejabat Pembuat Komitmen',
        'alamat' => 'Jl. Dr. Leimena Desa Rumah Tiga Ambon',
        'ttd' => null
    ];

    // Ambil Semua User Pihak Kedua
    $users = [];
    $resUsers = $conn->query("SELECT * FROM `users_pihak_kedua` ORDER BY `id` ASC");
    if ($resUsers) {
        while ($row = $resUsers->fetch_assoc()) {
            $users[] = [
                'id' => (int)$row['id'],
                'nama' => $row['nama'],
                'nik' => $row['nik'],
                'alamat' => $row['alamat'],
                'jabatan' => $row['jabatan'],
                'honor' => (int)$row['honor'],
                'terbilang' => $row['terbilang'],
                'noSpk' => $row['no_spk'],
                'tglSpk' => $row['tgl_spk'],
                'noBastDefault' => $row['no_bast_default'],
                'ttd' => $row['ttd']
            ];
        }
    }

    // Ambil Daftar Surat BAST
    $suratList = [];
    $resSurat = $conn->query("SELECT * FROM `surat_bast` ORDER BY `id` ASC");
    if ($resSurat) {
        while ($row = $resSurat->fetch_assoc()) {
            $suratList[] = [
                'id' => (int)$row['id'],
                'userId' => (int)$row['user_id'],
                'noBast' => $row['no_bast'],
                'hari' => $row['hari'],
                'tanggalTeks' => $row['tanggal_teks'],
                'bulanKerja' => $row['bulan_kerja']
            ];
        }
    }

    echo json_encode([
        'ok' => true,
        'pihakPertama' => $pihakPertama,
        'users' => $users,
        'suratList' => $suratList
    ]);
    exit;
}

// ============================================================================
// 2. CREATE / UPDATE USER PIHAK KEDUA (Tabel: users_pihak_kedua)
// ============================================================================
if ($action === 'save_user') {
    $id = isset($body['id']) && is_numeric($body['id']) ? (int)$body['id'] : 0;
    $nama = trim($body['nama'] ?? '');
    $nik = trim($body['nik'] ?? '');
    $alamat = trim($body['alamat'] ?? '');
    $jabatan = trim($body['jabatan'] ?? 'Petugas Kebersihan');
    $honor = isset($body['honor']) ? (int)$body['honor'] : 3381225;
    $terbilang = trim($body['terbilang'] ?? '');
    $noSpk = trim($body['noSpk'] ?? '');
    $tglSpk = trim($body['tglSpk'] ?? '');
    $noBastDefault = trim($body['noBastDefault'] ?? '');
    $ttd = $body['ttd'] ?? null;

    if ($nama === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Nama Lengkap Pihak Kedua wajib diisi.']);
        exit;
    }

    if ($id > 0) {
        $stmt = $conn->prepare("UPDATE `users_pihak_kedua`
            SET `nama`=?, `nik`=?, `alamat`=?, `jabatan`=?, `honor`=?, `terbilang`=?, `no_spk`=?, `tgl_spk`=?, `no_bast_default`=?, `ttd`=?
            WHERE `id`=?");
        $stmt->bind_param('ssssisssssi', $nama, $nik, $alamat, $jabatan, $honor, $terbilang, $noSpk, $tglSpk, $noBastDefault, $ttd, $id);
        $stmt->execute();
        $stmt->close();
        $savedId = $id;
        $mode = 'updated';
    } else {
        $stmt = $conn->prepare("INSERT INTO `users_pihak_kedua`
            (`nama`, `nik`, `alamat`, `jabatan`, `honor`, `terbilang`, `no_spk`, `tgl_spk`, `no_bast_default`, `ttd`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param('ssssisssss', $nama, $nik, $alamat, $jabatan, $honor, $terbilang, $noSpk, $tglSpk, $noBastDefault, $ttd);
        $stmt->execute();
        $savedId = (int)$conn->insert_id;
        $stmt->close();
        $mode = 'created';

        // Otomatis tambahkan juga baris surat default untuk user baru ini
        $stmtS = $conn->prepare("INSERT INTO `surat_bast` (`user_id`, `no_bast`, `hari`, `tanggal_teks`, `bulan_kerja`) VALUES (?, ?, 'Senin', '31 Agustus 2026', 'Agustus')");
        $stmtS->bind_param('is', $savedId, $noBastDefault);
        $stmtS->execute();
        $stmtS->close();
    }

    echo json_encode([
        'ok' => true,
        'mode' => $mode,
        'id' => $savedId
    ]);
    exit;
}

// ============================================================================
// 3. DELETE USER PIHAK KEDUA (Tabel: users_pihak_kedua)
// ============================================================================
if ($action === 'delete_user') {
    $id = isset($body['id']) ? (int)$body['id'] : 0;
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'ID User tidak valid.']);
        exit;
    }

    $stmt = $conn->prepare("DELETE FROM `users_pihak_kedua` WHERE `id`=?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close();

    echo json_encode(['ok' => true, 'deletedId' => $id]);
    exit;
}

// ============================================================================
// 4. UPDATE DEFAULT PIHAK PERTAMA / PPK (Tabel: pihak_pertama)
// ============================================================================
if ($action === 'save_p1') {
    $nama = trim($body['nama'] ?? 'Rahmawati Umasugi');
    $jabatan = trim($body['jabatan'] ?? 'Pejabat Pembuat Komitmen');
    $alamat = trim($body['alamat'] ?? 'Jl. Dr. Leimena Desa Rumah Tiga Ambon');
    $ttd = $body['ttd'] ?? null;

    $resCheck = $conn->query("SELECT `id` FROM `pihak_pertama` LIMIT 1");
    if ($resCheck && $resCheck->num_rows > 0) {
        $row = $resCheck->fetch_assoc();
        $p1Id = (int)$row['id'];
        $stmt = $conn->prepare("UPDATE `pihak_pertama` SET `nama`=?, `jabatan`=?, `alamat`=?, `ttd`=? WHERE `id`=?");
        $stmt->bind_param('ssssi', $nama, $jabatan, $alamat, $ttd, $p1Id);
        $stmt->execute();
        $stmt->close();
    } else {
        $stmt = $conn->prepare("INSERT INTO `pihak_pertama` (`nama`, `jabatan`, `alamat`, `ttd`) VALUES (?, ?, ?, ?)");
        $stmt->bind_param('ssss', $nama, $jabatan, $alamat, $ttd);
        $stmt->execute();
        $stmt->close();
    }

    echo json_encode(['ok' => true]);
    exit;
}

// ============================================================================
// 5. SIMPAN DAFTAR SURAT BAST & TANGGAL (Tabel: surat_bast)
// ============================================================================
if ($action === 'save_surat') {
    $hari = trim($body['hari'] ?? 'Senin');
    $tanggalTeks = trim($body['tanggalTeks'] ?? '31 Agustus 2026');
    $bulanKerja = trim($body['bulanKerja'] ?? 'Agustus');
    $items = isset($body['items']) && is_array($body['items']) ? $body['items'] : [];

    $conn->query("DELETE FROM `surat_bast`");

    $stmt = $conn->prepare("INSERT INTO `surat_bast` (`user_id`, `no_bast`, `hari`, `tanggal_teks`, `bulan_kerja`) VALUES (?, ?, ?, ?, ?)");
    foreach ($items as $it) {
        $uid = isset($it['userId']) ? (int)$it['userId'] : 0;
        $noBast = trim($it['noBast'] ?? '');
        if ($uid > 0) {
            $stmt->bind_param('issss', $uid, $noBast, $hari, $tanggalTeks, $bulanKerja);
            $stmt->execute();
        }
    }
    $stmt->close();

    echo json_encode(['ok' => true, 'savedCount' => count($items)]);
    exit;
}

http_response_code(400);
echo json_encode(['ok' => false, 'error' => 'Action tidak dikenali: ' . $action]);

