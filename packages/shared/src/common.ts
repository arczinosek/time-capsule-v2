import { z } from 'zod';
import { messages } from './messages.js';

// Building blocks shared by the feature schemas.

/** A database id: MySQL `serial` (BIGINT UNSIGNED) read in number mode. */
export const idSchema = z.number().int().positive();

/** A calendar date as `YYYY-MM-DD` (MySQL `DATE`, read in string mode). */
export const isoDateSchema = z.iso.date(messages.dateInvalid);

/** Capacity of a MySQL TEXT column in bytes (utf8mb4 stores 1–4 bytes per character). */
export const TEXT_MAX_BYTES = 65_535;

/**
 * UTF-8 byte length, the same as Buffer.byteLength / TextEncoder: a lone surrogate counts as
 * U+FFFD (3 bytes). Plain code because shared has neither DOM nor Node types.
 */
export function utf8ByteLength(value: string): number {
  let bytes = 0;

  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;
    bytes +=
      codePoint < 0x80 ? 1 : codePoint < 0x800 ? 2 : codePoint < 0x10000 ? 3 : 4;
  }

  return bytes;
}

/** A Markdown description stored in a TEXT column. */
export const descriptionSchema = z
  .string()
  .refine((value) => utf8ByteLength(value) <= TEXT_MAX_BYTES, {
    error: messages.descriptionTooLong,
  });
