import pc from "picocolors";

export const log = {
  bold: (msg: string) => console.log(pc.bold(msg)),
  dim: (msg: string) => console.log(pc.dim(msg)),
  error: (msg: string) => console.error(pc.red("✖"), msg),
  info: (msg: string) => console.log(pc.blue("ℹ"), msg),
  line: () => console.log(),
  success: (msg: string) => console.log(pc.green("✔"), msg),
  warn: (msg: string) => console.log(pc.yellow("⚠"), msg),
};
