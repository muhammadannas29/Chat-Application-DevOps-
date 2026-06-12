import {
  isAllowed,
  ALLOWED_TYPES,
  generateKey,
  createPresignedUploadUrl,
  createPresignedGetUrl,
} from '../config/s3.js'

// POST /api/upload/presigned-url
// Body:    { fileName, fileType, fileSize }
// Returns: { uploadUrl, fileKey, fileUrl }
//
// Flow:
//   1. Validate file type and size
//   2. Generate a unique S3 key
//   3. Return a presigned PUT URL  → frontend uploads directly to S3 (no file touches backend)
//   4. Return a presigned GET URL  → stored in DB and used to display/download the file
//      (GET URL expires in 1 hour — bucket stays fully private)

export async function getPresignedUrl(req, res, next) {
  try {
    const { fileName, fileType, fileSize } = req.body

    // ── 1. Presence check ─────────────────────────────────────────────────
    if (!fileName || !fileType || !fileSize) {
      return res.status(400).json({
        message: 'fileName, fileType and fileSize are all required',
      })
    }

    // ── 2. Type check ─────────────────────────────────────────────────────
    if (!isAllowed(fileType)) {
      return res.status(400).json({
        message: 'File type not allowed',
        allowed: Object.keys(ALLOWED_TYPES),
      })
    }

    // ── 3. Size check ─────────────────────────────────────────────────────
    const { maxSize } = ALLOWED_TYPES[fileType]
    if (fileSize > maxSize) {
      const mb = Math.round(maxSize / 1024 / 1024)
      return res.status(400).json({
        message: `File too large. Maximum size for ${fileType} is ${mb}MB`,
      })
    }

    // ── 4. Generate S3 key ────────────────────────────────────────────────
    // Example key: uploads/abc-user-id/1718123456789-f3a9b2c5.jpg
    const fileKey = generateKey(req.user.id, fileType)

    // ── 5. Presigned PUT URL (5 min) — client uploads directly to S3 ─────
    const uploadUrl = await createPresignedUploadUrl({
      key:      fileKey,
      mimeType: fileType,
      fileSize,
    })

    // ── 6. Presigned GET URL (1 hour) — used to view / download the file ─
    // Bucket remains fully private. No public access needed.
    const fileUrl = await createPresignedGetUrl(fileKey)

    res.json({
      uploadUrl,   // PUT here to upload the file
      fileKey,     // store in DB — needed to regenerate GET URL later
      fileUrl,     // GET here to view/download (expires in 1 hour)
    })
  } catch (err) {
    next(err)
  }
}