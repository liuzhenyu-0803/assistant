import fs from 'node:fs';
import path from 'node:path';

function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

async function readAndParseJson<T>(filePath: string): Promise<T> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * 原子 JSON 文件读写。
 *
 * 写入流程：写入 tmp → fsync → 备份为 .bak → rename 替换目标文件
 * 读取流程：主文件 → 失败则回退 .bak
 */
export const jsonStore = {
  /**
   * 原子写入 JSON 文件。
   */
  async write<T>(filePath: string, data: T): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });

    const tmpPath = filePath + '.tmp';
    const bakPath = filePath + '.bak';
    const content = JSON.stringify(data, null, 2);

    // 1. 写入临时文件
    const fd = await fs.promises.open(tmpPath, 'w');
    try {
      await fd.writeFile(content, 'utf-8');
      await fd.sync(); // fsync 确保数据落盘
    } finally {
      await fd.close();
    }

    // 2. 生成 .bak：已有主文件时备份主文件；首次写入时备份 tmp 内容
    try {
      await fs.promises.copyFile(filePath, bakPath);
    } catch (error) {
      if (!isFileNotFoundError(error)) {
        throw error;
      }
      await fs.promises.copyFile(tmpPath, bakPath);
    }

    // 3. 原子 rename
    await fs.promises.rename(tmpPath, filePath);
  },

  /**
   * 读取 JSON 文件，主文件损坏时自动从 .bak 恢复。
   */
  async read<T>(filePath: string): Promise<T | null> {
    try {
      return await readAndParseJson<T>(filePath);
    } catch (mainError) {
      if (isFileNotFoundError(mainError)) {
        return null;
      }

      const bakPath = filePath + '.bak';
      try {
        const data = await readAndParseJson<T>(bakPath);
        await fs.promises.copyFile(bakPath, filePath);
        return data;
      } catch (bakError) {
        if (isFileNotFoundError(bakError)) {
          throw new Error(`JSON 文件损坏且缺少备份：${filePath}`);
        }

        throw new Error(`JSON 文件与备份文件均已损坏：${filePath}`);
      }
    }
  },

  /**
   * 检查文件是否存在。
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  },
};
