import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  emitCopiedFiles,
  FILES_TARGET_ID,
  verbatimPathsFromResults,
} from '../../../../../src/canonical/features/files/emit.js';
import type { GenerateResult } from '../../../../../src/core/result-types.js';

const ROOT = join(tmpdir(), `agentsmesh-files-emit-${process.pid}`);

beforeEach(() => {
  rmSync(ROOT, { recursive: true, force: true });
  mkdirSync(ROOT, { recursive: true });
});
afterEach(() => rmSync(ROOT, { recursive: true, force: true }));

describe('emitCopiedFiles', () => {
  it('emits created status for missing files with target files', async () => {
    const results = await emitCopiedFiles([{ path: '.gitignore', content: 'dist\n' }], ROOT);
    expect(results).toEqual([
      {
        target: FILES_TARGET_ID,
        path: '.gitignore',
        content: 'dist\n',
        currentContent: undefined,
        status: 'created',
      },
    ]);
  });

  it('reports unchanged when on-disk bytes already match', async () => {
    writeFileSync(join(ROOT, '.gitignore'), 'dist\n');
    const results = await emitCopiedFiles([{ path: '.gitignore', content: 'dist\n' }], ROOT);
    expect(results[0]?.status).toBe('unchanged');
  });

  it('reports updated when on-disk content differs', async () => {
    writeFileSync(join(ROOT, '.gitignore'), 'old\n');
    const results = await emitCopiedFiles([{ path: '.gitignore', content: 'new\n' }], ROOT);
    expect(results[0]?.status).toBe('updated');
    expect(results[0]?.currentContent).toBe('old\n');
  });

  it('forwards an explicit mode and normalizes backslashes in the path', async () => {
    const results = await emitCopiedFiles(
      [{ path: 'bin\\tool.sh', content: '#!/bin/sh\n', mode: 0o755 }],
      ROOT,
    );
    expect(results[0]?.path).toBe('bin/tool.sh');
    expect(results[0]?.mode).toBe(0o755);
  });

  it('normalizes CRLF text the same way writeFileAtomic will', async () => {
    const results = await emitCopiedFiles([{ path: 'mise.toml', content: 'x = 1\r\n' }], ROOT);
    expect(results[0]?.content).toBe('x = 1\n');
  });
});

describe('verbatimPathsFromResults', () => {
  it('keeps created/updated/unchanged files paths, drops skipped and other targets', () => {
    const results: GenerateResult[] = [
      { target: FILES_TARGET_ID, path: 'b.toml', content: '', status: 'updated' },
      { target: FILES_TARGET_ID, path: 'a.toml', content: '', status: 'created' },
      { target: FILES_TARGET_ID, path: 'skip.toml', content: '', status: 'skipped' },
      { target: 'cursor', path: 'AGENTS.md', content: '', status: 'created' },
      { target: FILES_TARGET_ID, path: 'c\\d.toml', content: '', status: 'unchanged' },
    ];
    expect(verbatimPathsFromResults(results)).toEqual(['a.toml', 'b.toml', 'c/d.toml']);
  });
});
