import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseVerbatimOutputs } from '../../../src/config/core/lock-verbatim.js';
import { readLock, writeLock } from '../../../src/config/core/lock.js';

const TEST_DIR = join(tmpdir(), `agentsmesh-lock-verbatim-${process.pid}`);

beforeEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });
});
afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

describe('parseVerbatimOutputs', () => {
  it('returns undefined for non-arrays', () => {
    expect(parseVerbatimOutputs(undefined)).toBeUndefined();
    expect(parseVerbatimOutputs(null)).toBeUndefined();
    expect(parseVerbatimOutputs({ a: 1 })).toBeUndefined();
    expect(parseVerbatimOutputs('mise.toml')).toBeUndefined();
  });

  it('keeps non-empty strings and normalizes backslashes', () => {
    expect(parseVerbatimOutputs(['mise.toml', '', 12, 'bin\\tool.sh', null] as unknown[])).toEqual([
      'mise.toml',
      'bin/tool.sh',
    ]);
  });
});

describe('lock verbatim_outputs round-trip', () => {
  it('writeLock then readLock preserves verbatimOutputs', async () => {
    const abDir = join(TEST_DIR, '.agentsmesh');
    mkdirSync(abDir, { recursive: true });
    await writeLock(abDir, {
      generatedAt: '2026-11-24T10:00:00Z',
      generatedBy: 'me',
      libVersion: '0.1.0',
      checksums: {},
      extends: {},
      packs: {},
      verbatimOutputs: ['.gitignore', 'mise.toml'],
    });
    const lock = await readLock(abDir);
    expect(lock?.verbatimOutputs).toEqual(['.gitignore', 'mise.toml']);
  });
});
