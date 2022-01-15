import { readFileSync, writeFileSync } from "fs";
const cPJ = JSON.parse(readFileSync("./cesium/package.json", "utf-8"));
const packageJSON = JSON.parse(readFileSync("./package.json", "utf-8"));

packageJSON.version = cPJ.version;
writeFileSync("package.json", JSON.stringify(packageJSON, null, 4));