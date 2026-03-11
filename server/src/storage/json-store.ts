import fs from 'node:fs';
import path from 'node:path';

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

    // 2. 若目标文件已存在，复制为 .bak
    try {
      await fs.promises.access(filePath);
      await fs.promises.copyFile(filePath, bakPath);
    } catch {
      // 目标文件不存在，跳过备份
    }

    // 3. 原子 rename
    await fs.promises.rename(tmpPath, filePath);
  },

  /**
   * 读取 JSON 文件，主文件损坏时自动从 .bak 恢复。
   */
  async read<T>(filePath: string): Promise<T | null> {
    // 尝试读取主文件
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      // 主文件不存在或损坏
    }

    // 尝试从 .bak 恢复
    const bakPath = filePath + '.bak';
    try {
      const content = await fs.promises.readFile(bakPath, 'utf-8');
      const data = JSON.parse(content) as T;

      // 恢复成功，将 .bak 复制回主文件
      await fs.promises.copyFile(bakPath, filePath);
      return data;
    } catch {
      // .bak 也不存在或损坏
    }

    return null;
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
