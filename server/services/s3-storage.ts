import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

// Validate AWS credentials at startup
// For production on AWS (EC2/ECS/Lambda), use IAM roles instead of manual credentials
const awsRegion = process.env.AWS_REGION;
const awsBucketName = process.env.AWS_BUCKET_NAME;

if (!awsRegion) {
  throw new Error("AWS_REGION is not defined in environment variables");
}

if (!awsBucketName) {
  throw new Error("AWS_BUCKET_NAME is not defined in environment variables");
}

// S3 Configuration
// If AWS credentials are provided in env, use them; otherwise SDK will use IAM role
const s3Config: any = {
  region: awsRegion,
};

// Only add credentials if explicitly provided (for local development)
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
} else if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_SECRET_ACCESS_KEY) {
  console.log("Using IAM role for AWS credentials (production)");
}

const bucketName = awsBucketName;

// Maximum file size: 15MB
const MAX_FILE_SIZE = 15 * 1024 * 1024;

// Initialize S3 client
const s3Client = new S3Client(s3Config);

/**
 * Validate file size before upload
 */
function validateFileSize(buffer: Buffer): void {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }
}

// Default expiration time for presigned URLs (5 minutes for legal documents)
const DEFAULT_EXPIRATION = 300;

/**
 * Generate S3 key for a document based on the hierarchy:
 * bufete_id/cliente_id/proceso_id/filename
 */
export function generateS3Key(
  clienteId: string,
  procesoId: string,
  filename: string
): string {
  // Sanitize the filename and add UUID to prevent collisions
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueFilename = `${randomUUID()}-${sanitizedFilename}`;
  return `${clienteId}/${procesoId}/${uniqueFilename}`;
}

/**
 * Upload a document to S3 with encryption
 * Returns the S3 key (path) that can be used to reference the file
 */
export async function uploadDocumentToS3(
  buffer: Buffer,
  clienteId: string,
  procesoId: string,
  filename: string,
  contentType: string
): Promise<string> {
  // Validate file size before upload
  validateFileSize(buffer);
  
  const key = generateS3Key(clienteId, procesoId, filename);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ServerSideEncryption: "AES256", // Force encryption
  });

  await s3Client.send(command);

  return key;
}

/**
 * Upload a document from a local file path to S3
 */
export async function uploadFileToS3(
  localFilePath: string,
  bufeteId: string,
  clienteId: string,
  procesoId: string
): Promise<string> {
  const buffer = fs.readFileSync(localFilePath);
  const filename = path.basename(localFilePath);
  const contentType = getContentType(filename);

  return uploadDocumentToS3(
    buffer,
    clienteId,
    procesoId,
    filename,
    contentType
  );
}

/**
 * Delete a document from S3
 */
export async function deleteDocumentFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Get a presigned URL for downloading a document
 * Default expiration is 300 seconds (5 minutes) for legal documents
 * Forces download instead of inline rendering
 */
export async function getPresignedDownloadUrl(key: string, filename: string, expiresIn: number = DEFAULT_EXPIRATION): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Get S3 client for direct operations
 */
export function getS3Client(): S3Client {
  return s3Client;
}

/**
 * Get bucket name
 */
export function getBucketName(): string {
  return bucketName;
}

/**
 * Determine content type based on file extension
 */
function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();

  const contentTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".txt": "text/plain",
  };

  if (!contentTypes[ext]) {
    throw new Error("File type not allowed");
  }

  return contentTypes[ext];
}
