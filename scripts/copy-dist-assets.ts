import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve("dist");
const templateDir = resolve("template");
const distTemplateDir = resolve(distDir, "template");
const packageJsonPath = resolve("package.json");
const distPackageJsonPath = resolve(distDir, "package.json");

mkdirSync(distDir, { recursive: true });
mkdirSync(distTemplateDir, { recursive: true });

cpSync(templateDir, distTemplateDir, { recursive: true });
writeFileSync(distPackageJsonPath, readFileSync(packageJsonPath, "utf-8"));
