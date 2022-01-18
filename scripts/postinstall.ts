import { existsSync, mkdirSync } from "fs";
var dir = './dist';

if (!existsSync(dir)) {
    mkdirSync(dir);
}