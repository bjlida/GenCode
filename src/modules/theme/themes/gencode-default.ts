import type { Theme } from "../types";

export const gencodeDefault: Theme = {
  id: "gencode-default",
  name: "GenCode Default",
  description: "经典黑白高对比 — 纯黑底色配白色文字，干净利落。",
  editorTheme: { dark: "gencode-dark", light: "xcode-light" },
  variants: {
    light: {},
    dark: {},
  },
};
