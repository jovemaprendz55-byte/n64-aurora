import { readFileSync } from "node:fs";

const reportPath = process.argv[2];
if (!reportPath) throw new Error("Informe o caminho para o relatório de autolinking.");

const report = JSON.parse(readFileSync(reportPath, "utf8"));
const n64Module = Object.values(report).find((candidate) =>
  typeof candidate?.path === "string" && candidate.path.endsWith("/modules/n64-core"),
);

if (!n64Module) throw new Error("O módulo local n64-core não foi encontrado pelo autolinking.");
if (!n64Module.config?.android?.modules?.includes("expo.modules.n64core.N64CoreModule")) {
  throw new Error("A classe Kotlin N64CoreModule não está registrada na configuração Android.");
}

console.log(`Módulo local autolinkado: ${n64Module.path}`);
console.log(`Classe Android: ${n64Module.config.android.modules[0]}`);
