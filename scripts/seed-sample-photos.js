/*
  Seed sample photos for issues by registering existing files in the uploads directory.
  Usage: node scripts/seed-sample-photos.js [limit]
*/
const fs = require('fs')
const path = require('path')
const db = require('../config/database')

async function main() {
  const limitArg = Number.parseInt(process.argv[2] || '12', 10)
  const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, '..', 'uploads')
  const files = [
    'issue-photo-1-20251020154636.jpg',
    'sample-issue-photo-1-20251020154628.jpg',
  ]

  // Validate files exist
  const fileInfos = files.map((f) => {
    const abs = path.join(uploadDir, f)
    if (!fs.existsSync(abs)) {
      throw new Error(`Missing upload file: ${abs}`)
    }
    const stat = fs.statSync(abs)
    return { file_name: f, file_path: f, file_size: stat.size, mime_type: 'image/jpeg' }
  })

  console.log(`Seeding sample photos for up to ${limitArg} issues...`)

  const [issues] = await db.query('SELECT id FROM issues ORDER BY created_at DESC LIMIT ?', [limitArg])
  let inserted = 0
  for (const issue of issues) {
    for (const info of fileInfos) {
      const [rows] = await db.query('SELECT COUNT(*) as cnt FROM issue_photos WHERE issue_id=? AND file_path=?', [
        issue.id,
        info.file_path,
      ])
      if (rows[0].cnt > 0) continue

      await db.query(
        'INSERT INTO issue_photos (issue_id, file_name, file_path, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
        [issue.id, info.file_name, info.file_path, info.file_size, info.mime_type, 1],
      )
      inserted++
    }
  }

  console.log(`Done. Inserted ${inserted} photo records.`)
  await db.end?.()
  process.exit(0)
}

main().catch(async (err) => {
  console.error('Seed sample photos failed:', err.message || err)
  try { await db.end?.() } catch {}
  process.exit(1)
})
