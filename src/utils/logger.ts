import pc from "picocolors";

export const log = {
  info: (msg: string) => console.log(pc.blue("ℹ"), msg),
  success: (msg: string) => console.log(pc.green("✔"), msg),
  warn: (msg: string) => console.log(pc.yellow("⚠"), msg),
  error: (msg: string) => console.error(pc.red("✖"), msg),
  dim: (msg: string) => console.log(pc.dim(msg)),
  bold: (msg: string) => console.log(pc.bold(msg)),
  line: () => console.log(),
};
