import { rollup } from "rollup";
import type { OutputOptions } from "rollup";
import { replace } from "./rollup-plugins/rollup-plugin-replace-file.js";
import { prep, transformPlugin, injectWorkers } from "./rollup-plugins/rollup-plugin-prep-source.js";
import { writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from 'url';
import { minify } from "terser";
import { nodeResolve } from '@rollup/plugin-node-resolve';

const workerOptions: OutputOptions = {
    banner: "self.module = self.module || {};",
    format: "cjs",
    exports: "auto"
};

const mainOptions: OutputOptions = {
    format: "esm"
};

const bootstrapper = readFileSync(
    join(
        dirname(fileURLToPath(import.meta.url)),
        "./templates/cesiumWorkerBootstrapper.js"),
    "utf8");

const bundleWorkers = await rollup({
    input: "./cesium/Source/Workers/cesiumWorkers.js",
    onwarn(warning, warn) {
        if (warning.code === 'THIS_IS_UNDEFINED') return;
        warn(warning);
    },
    plugins: [
        prep(),
        replace("./cesium/Source", "./src/source-files/Source", false),
        transformPlugin()
    ]
});

let workerSrc = `
${(await bundleWorkers.generate(workerOptions)).output[0].code}
${bootstrapper}
`;

const bundleMain = await rollup({
    input: "./cesium/Source/Cesium.js",
    onwarn(warning, warn) {
        if (warning.code === 'THIS_IS_UNDEFINED') return;
        warn(warning);
    },
    plugins: [
        nodeResolve(),
        prep(),
        replace("./cesium/Source", "./src/source-files/Source", false),
        transformPlugin(),
        injectWorkers((await minify(workerSrc, {

        })).code?.toString() as string)
    ]

});

let mainSrc =
    (await bundleMain.generate(mainOptions)).output[0].code;

let lisc = readFileSync('./cesium/Source/copyrightHeader.js');


let mainSrcMin = `${lisc}
    ${(await minify(mainSrc)).code as string}`;

writeFileSync(`./dist/c137.mjs`, `${lisc}
${mainSrc as string}`);
writeFileSync(`./dist/c137.min.mjs`, mainSrcMin);
