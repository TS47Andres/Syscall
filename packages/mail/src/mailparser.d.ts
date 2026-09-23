/**
 * File: mailparser.d.ts
 * Role: Supplies the minimal type surface for the mailparser package.
 * Service: Shared mail package.
 */
declare module 'mailparser' {
  export type ParsedMail = any;
  export function simpleParser(raw: Buffer, options?: Record<string, unknown>): Promise<ParsedMail>;
}
