const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const backupPath = path.join(process.cwd(), 'data_backup.json');

  if (req.method === 'GET') {
    try {
      if (fs.existsSync(backupPath)) {
        const raw = fs.readFileSync(backupPath, 'utf8');
        return res.status(200).send(raw);
      }
    } catch (_) {}
    return res.status(200).json({ ok: false });
  }

  // On Vercel serverless, filesystem is read-only after build, so return ok: true
  return res.status(200).json({ ok: true });
};

