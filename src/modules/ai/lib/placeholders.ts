const PLACEHOLDERS = [
  "解释这个错误…",
  "总结上一条命令的输出",
  "写一个 bash 一行命令…",
  "重构选中的代码",
  "为此项目生成 .gitignore",
  "这个堆栈跟踪是什么意思？",
  "为暂存的更改起草提交信息",
  "查找大于 50MB 的文件",
  "将此 JSON 转换为 TypeScript 类型",
  "为什么我的构建失败了？",
];

export function pickPlaceholder(): string {
  return PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)];
}
