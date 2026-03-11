import fs from 'node:fs';
import path from 'node:path';
import type { SkillMeta } from '@assistant/shared';
import { PROJECT_ROOT, SKILLS_DIR } from '../storage/paths.js';
import { logger } from '../utils/logger.js';

interface ParsedFrontMatter {
  metadata: Record<string, string | string[]>;
  body: string;
}

let cachedSkillMetas: SkillMeta[] = [];
const cachedSkillContents = new Map<string, string>();

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

function stripQuotes(value: string): string {
  return value.replace(/^['"]/, '').replace(/['"]$/, '').trim();
}

function parseInlineList(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((entry) => stripQuotes(entry.trim()))
      .filter(Boolean);
  }

  return [stripQuotes(trimmed)].filter(Boolean);
}

function parseSimpleYaml(raw: string): Record<string, string | string[]> {
  const lines = raw.split('\n');
  const metadata: Record<string, string | string[]> = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) {
      throw new Error(`无法解析 front matter 行：${line}`);
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();

    if (key === 'match') {
      if (rawValue) {
        metadata.match = parseInlineList(rawValue);
        continue;
      }

      const items: string[] = [];
      let nextIndex = index + 1;
      while (nextIndex < lines.length) {
        const itemLine = lines[nextIndex];
        const itemMatch = itemLine.match(/^\s*-\s+(.+)$/);
        if (!itemMatch) {
          if (itemLine.trim()) {
            break;
          }
          nextIndex += 1;
          continue;
        }

        items.push(stripQuotes(itemMatch[1]));
        nextIndex += 1;
      }

      metadata.match = items;
      index = nextIndex - 1;
      continue;
    }

    if (!rawValue) {
      throw new Error(`front matter 字段 ${key} 缺少值`);
    }

    metadata[key] = stripQuotes(rawValue);
  }

  return metadata;
}

function parseSkillMarkdown(content: string): ParsedFrontMatter {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

  if (!normalized.startsWith('---\n')) {
    throw new Error('SKILL.md 缺少 YAML front matter');
  }

  const endMarkerIndex = normalized.indexOf('\n---\n', 4);
  if (endMarkerIndex < 0) {
    throw new Error('SKILL.md front matter 未正确闭合');
  }

  return {
    metadata: parseSimpleYaml(normalized.slice(4, endMarkerIndex)),
    body: normalized.slice(endMarkerIndex + 5).trim(),
  };
}

function buildSkillMeta(
  skillDirectoryPath: string,
  skillFilePath: string,
  metadata: Record<string, string | string[]>,
): SkillMeta {
  const name = metadata.name;
  const description = metadata.description;
  const match = metadata.match;

  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('front matter 缺少有效的 name');
  }

  if (typeof description !== 'string' || !description.trim()) {
    throw new Error('front matter 缺少有效的 description');
  }

  if (!Array.isArray(match)) {
    throw new Error('front matter 缺少有效的 match 列表');
  }

  return {
    name: name.trim(),
    description: description.trim(),
    match: match.map((entry) => entry.trim()).filter(Boolean),
    path: toPosixPath(path.relative(PROJECT_ROOT, skillDirectoryPath)),
    contentPath: toPosixPath(path.relative(PROJECT_ROOT, skillFilePath)),
  };
}

export const skillLoader = {
  async loadSkills(): Promise<SkillMeta[]> {
    await fs.promises.mkdir(SKILLS_DIR, { recursive: true });

    const entries = await fs.promises.readdir(SKILLS_DIR, { withFileTypes: true });
    const nextMetas: SkillMeta[] = [];
    const nextContents = new Map<string, string>();
    const seenNames = new Set<string>();

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const skillDirectoryPath = path.join(SKILLS_DIR, entry.name);
      const skillFilePath = path.join(skillDirectoryPath, 'SKILL.md');

      try {
        const fileContent = await fs.promises.readFile(skillFilePath, 'utf8');
        const parsed = parseSkillMarkdown(fileContent);
        const meta = buildSkillMeta(skillDirectoryPath, skillFilePath, parsed.metadata);

        if (seenNames.has(meta.name)) {
          throw new Error(`重复的 skill name：${meta.name}`);
        }

        seenNames.add(meta.name);
        nextMetas.push(meta);
        nextContents.set(meta.name, parsed.body);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        logger.warn(`[skills] 跳过 ${entry.name}：${detail}`);
      }
    }

    nextMetas.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));

    cachedSkillMetas = nextMetas;
    cachedSkillContents.clear();
    for (const [name, body] of nextContents.entries()) {
      cachedSkillContents.set(name, body);
    }

    logger.info(`[skills] Loaded ${cachedSkillMetas.length} skills`);
    return this.getAllSkillMetas();
  },

  async getSkillContent(skillName: string): Promise<string | null> {
    const cached = cachedSkillContents.get(skillName);
    if (cached) {
      return cached;
    }

    const meta = cachedSkillMetas.find((entry) => entry.name === skillName);
    if (!meta) {
      return null;
    }

    const fileContent = await fs.promises.readFile(path.join(PROJECT_ROOT, meta.contentPath), 'utf8');
    const parsed = parseSkillMarkdown(fileContent);
    cachedSkillContents.set(skillName, parsed.body);
    return parsed.body;
  },

  getAllSkillMetas(): SkillMeta[] {
    return [...cachedSkillMetas];
  },
};
