import { S3Client }                              from '@aws-sdk/client-s3'
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl }                          from '@aws-sdk/s3-request-presigner'
import crypto                                    from 'crypto'

export const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

export const BUCKET = process.env.AWS_S3_BUCKET

export const ALLOWED_TYPES = {
  'image/jpeg':      { ext: 'jpg',  maxSize: 10 * 1024 * 1024 },
  'image/png':       { ext: 'png',  maxSize: 10 * 1024 * 1024 },
  'image/gif':       { ext: 'gif',  maxSize: 10 * 1024 * 1024 },
  'image/webp':      { ext: 'webp', maxSize: 10 * 1024 * 1024 },
  'application/pdf': { ext: 'pdf',  maxSize: 25 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                     { ext: 'docx', maxSize: 25 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                     { ext: 'xlsx', maxSize: 25 * 1024 * 1024 },
  'text/plain':      { ext: 'txt',  maxSize:  5 * 1024 * 1024 },
}

export const isAllowed = (mimeType) =>
  Object.prototype.hasOwnProperty.call(ALLOWED_TYPES, mimeType)

export const isImage = (mimeType) => mimeType?.startsWith('image/')

export function generateKey(userId, mimeType) {
  const { ext }    = ALLOWED_TYPES[mimeType]
  const randomPart = crypto.randomBytes(8).toString('hex')
  return `uploads/${userId}/${Date.now()}-${randomPart}.${ext}`
}

export async function createPresignedUploadUrl({ key, mimeType, fileSize }) {
  const command = new PutObjectCommand({
    Bucket:        BUCKET,
    Key:           key,
    ContentType:   mimeType,
    ContentLength: fileSize,
  })
  return getSignedUrl(s3, command, { expiresIn: 300 })
}

export async function createPresignedGetUrl(key) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(s3, command, { expiresIn: 3600 })
}

export async function deleteObject(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}