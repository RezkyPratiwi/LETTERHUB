const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = (req.query && req.query.action) || 'all';
  const dbHost = process.env.DB_HOST;

  // Jika belum ada Environment Variable DB_HOST di Vercel, gunakan mode penyimpanan browser otomatis
  if (!dbHost) {
    if (action === 'all' || action === 'list') {
      return res.status(200).json({
        ok: true,
        mode: 'local_storage',
        pihakPertama: null,
        users: [],
        suratList: []
      });
    }
    if (action === 'save_user') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const isUpdate = body.id && Number(body.id) > 0;
      const id = isUpdate ? Number(body.id) : Math.floor(Date.now() / 1000);
      return res.status(200).json({ ok: true, id, mode: isUpdate ? 'updated' : 'created', localOnly: true });
    }
    if (action === 'delete_user') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      return res.status(200).json({ ok: true, deletedId: Number(body.id || 0), localOnly: true });
    }
    return res.status(200).json({ ok: true, localOnly: true });
  }

  // Jika DB_HOST dikonfigurasi di Vercel (Cloud MySQL)
  let conn;
  try {
    conn = await mysql.createConnection({
      host: dbHost,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'db_bast_pjlp',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

    if (action === 'all' || action === 'list') {
      const [p1Rows] = await conn.query(
        'SELECT id, nama, jabatan, alamat, ttd_base64 AS ttd FROM pihak_pertama ORDER BY id ASC LIMIT 1'
      );
      const [users] = await conn.query(
        `SELECT id, nama, nik, alamat, jabatan, honor, terbilang,
                no_spk AS noSpk, tgl_spk AS tglSpk,
                no_bast_default AS noBastDefault, ttd_base64 AS ttd
         FROM users_pihak_kedua ORDER BY id ASC`
      );
      const [suratList] = await conn.query(
        `SELECT s.id, s.user_id AS userId, s.no_bast AS noBast,
                s.hari, s.tanggal_teks AS tanggalTeks, s.bulan_kerja AS bulanKerja
         FROM surat_bast s ORDER BY s.id ASC`
      );
      return res.status(200).json({
        ok: true,
        pihakPertama: p1Rows[0] || null,
        users,
        suratList
      });
    }

    if (action === 'save_user') {
      const id = Number(body.id || 0);
      const nama = String(body.nama || '').trim();
      const nik = String(body.nik || '').trim();
      const alamat = String(body.alamat || '').trim();
      const jabatan = String(body.jabatan || 'Petugas Kebersihan').trim();
      const honor = Number(body.honor || 0);
      const terbilang = String(body.terbilang || '').trim();
      const noSpk = String(body.noSpk || '').trim();
      const tglSpk = String(body.tglSpk || '').trim();
      const noBastDefault = String(body.noBastDefault || '').trim();
      const ttd = body.ttd || null;

      if (id > 0) {
        await conn.execute(
          `UPDATE users_pihak_kedua
           SET nama=?, nik=?, alamat=?, jabatan=?, honor=?, terbilang=?,
               no_spk=?, tgl_spk=?, no_bast_default=?, ttd_base64=?
           WHERE id=?`,
          [nama, nik, alamat, jabatan, honor, terbilang, noSpk, tglSpk, noBastDefault, ttd, id]
        );
        return res.status(200).json({ ok: true, mode: 'updated', id });
      } else {
        const [result] = await conn.execute(
          `INSERT INTO users_pihak_kedua
           (nama, nik, alamat, jabatan, honor, terbilang, no_spk, tgl_spk, no_bast_default, ttd_base64)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [nama, nik, alamat, jabatan, honor, terbilang, noSpk, tglSpk, noBastDefault, ttd]
        );
        return res.status(200).json({ ok: true, mode: 'created', id: result.insertId });
      }
    }

    if (action === 'delete_user') {
      const id = Number(body.id || 0);
      await conn.execute('DELETE FROM users_pihak_kedua WHERE id=?', [id]);
      return res.status(200).json({ ok: true, deletedId: id });
    }

    if (action === 'save_p1') {
      const nama = String(body.nama || '').trim();
      const jabatan = String(body.jabatan || '').trim();
      const alamat = String(body.alamat || '').trim();
      const ttd = body.ttd || null;
      await conn.execute(
        'UPDATE pihak_pertama SET nama=?, jabatan=?, alamat=?, ttd_base64=? WHERE id=1',
        [nama, jabatan, alamat, ttd]
      );
      return res.status(200).json({ ok: true });
    }

    if (action === 'save_surat') {
      const hari = String(body.hari || 'Senin').trim();
      const tanggalTeks = String(body.tanggalTeks || '').trim();
      const bulanKerja = String(body.bulanKerja || '').trim();
      const items = Array.isArray(body.items) ? body.items : [];
      await conn.query('DELETE FROM surat_bast');
      for (const item of items) {
        const uid = Number(item.userId || 0);
        const noBast = String(item.noBast || '').trim();
        if (uid > 0) {
          await conn.execute(
            'INSERT INTO surat_bast (user_id, no_bast, hari, tanggal_teks, bulan_kerja) VALUES (?, ?, ?, ?, ?)',
            [uid, noBast, hari, tanggalTeks, bulanKerja]
          );
          if (noBast) {
            await conn.execute('UPDATE users_pihak_kedua SET no_bast_default=? WHERE id=?', [noBast, uid]);
          }
        }
      }
      return res.status(200).json({ ok: true, count: items.length });
    }

    return res.status(400).json({ ok: false, error: 'Action tidak dikenali' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
};
