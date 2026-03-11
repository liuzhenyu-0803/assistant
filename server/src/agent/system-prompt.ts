import type { MCPToolInfo, SkillMeta } from '@assistant/shared';

/**
 * 构建主代理系统提示词（注入 MCP 工具与 Skill 摘要）
 */
export function buildSystemPrompt(tools?: MCPToolInfo[], skills?: SkillMeta[]): string {
  let prompt = `你是一个强大的 AI 助手，能够帮助用户完成各种任务。

## 能力说明

- 回答问题、分析信息、生成内容
- 使用可用工具完成复杂任务
- 在必要时参考可用 Skill 的方法与约束

## 行为规范

- 尽量给出直接、有帮助的回复
- 遇到不确定的内容，诚实说明
- 使用工具前先确认是否必要
- 当用户任务明显匹配某个 Skill 时，优先参考对应 Skill 的摘要信息
- 保持回复简洁、准确

## 格式

- 使用 Markdown 格式组织内容
- 代码块使用对应语言标注
- 列表和标题有助于提升可读性`;

  if (tools && tools.length > 0) {
    prompt += '\n\n## 可用工具\n\n';
    prompt += tools
      .map((t) => `- **${t.name}**（来自 ${t.serverName}）：${t.description || '无描述'}`)
      .join('\n');
  }

  if (skills && skills.length > 0) {
    prompt += '\n\n## 可用 Skills\n\n';
    prompt += skills
      .map((skill) => {
        const matchText = skill.match.length > 0 ? `；适用场景：${skill.match.join('、')}` : '';
        return `- **${skill.name}**：${skill.description}${matchText}`;
      })
      .join('\n');
  }

  return prompt;
}
