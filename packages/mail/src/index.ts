/**
 * File: index.ts
 * Role: Provides secure attachment, MIME, filesystem, and ClamAV helpers.
 * Service: Shared mail package.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { simpleParser, type ParsedMail } from 'mailparser';

export interface IncomingAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

const allowedExtensions = new Set(['pdf', 'png', 'jpg', 'jpeg', 'gif', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip']);
const allowedMimeTypes = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip']);

// Validates one attachment against size, extension, declared type, and magic bytes.
export function validateAttachment(attachment: IncomingAttachment, maxBytes: number): void {
  const extension = path.extname(attachment.filename).slice(1).toLowerCase();
  if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(attachment.contentType.toLowerCase())) throw new Error(`Attachment type is not allowed: ${attachment.filename}`);
  if (attachment.content.length > maxBytes) throw new Error(`Attachment exceeds ${maxBytes} byte limit: ${attachment.filename}`);
  if (!hasValidMagicBytes(extension, attachment.content)) throw new Error(`Attachment content does not match its declared type: ${attachment.filename}`);
}

// Checks common signatures for the allowed attachment families.
function hasValidMagicBytes(extension: string, content: Buffer): boolean {
  if (extension === 'txt') return true;
  if (extension === 'pdf') return content.subarray(0, 5).toString() === '%PDF-';
  if (['png'].includes(extension)) return content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (['jpg', 'jpeg'].includes(extension)) return content.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  if (extension === 'gif') return ['GIF87a', 'GIF89a'].includes(content.subarray(0, 6).toString());
  if (extension === 'zip' || ['docx', 'xlsx', 'pptx'].includes(extension)) return content.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4]));
  if (['doc', 'xls', 'ppt'].includes(extension)) return content.subarray(0, 8).equals(Buffer.from([208, 207, 17, 224, 161, 177, 26, 225]));
  return false;
}

// Writes content under a generated key without ever using a user filename as a path.
export async function writeGeneratedFile(root: string, content: Buffer, extension = 'bin'): Promise<string> {
  const storageKey = `${crypto.randomUUID()}.${extension}`;
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(path.join(root, storageKey), content, { flag: 'wx' });
  return storageKey;
}

// Removes a generated storage file and ignores only an already-removed file.
export async function removeGeneratedFile(root: string, storageKey: string): Promise<void> {
  try {
    await fs.unlink(path.join(root, storageKey));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

// Parses a complete MIME message defensively.
export async function parseMime(raw: Buffer): Promise<ParsedMail> {
  return simpleParser(raw, { skipHtmlToText: false });
}

// Scans a buffer through ClamAV's INSTREAM protocol and rejects unavailable scanners.
export async function scanWithClamAv(host: string, port: number, content: Buffer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let response = '';
    const fail = (error: Error): void => { socket.destroy(); reject(error); };
    socket.setTimeout(10000, () => fail(new Error('ClamAV scan timed out')));
    socket.on('error', (error) => reject(new Error(`ClamAV unavailable: ${error.message}`)));
    socket.on('data', (chunk: Buffer) => { response += chunk.toString(); });
    socket.on('end', () => {
      if (response.includes('FOUND')) reject(new Error('Malware detected by ClamAV'));
      else if (!response.includes('OK')) reject(new Error(`ClamAV rejected scan: ${response.trim()}`));
      else resolve();
    });
    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      for (let offset = 0; offset < content.length; offset += 1024 * 1024) {
        const chunk = content.subarray(offset, offset + 1024 * 1024);
        const length = Buffer.alloc(4);
        length.writeUInt32BE(chunk.length);
        socket.write(length);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4));
      socket.end();
    });
  });
}

