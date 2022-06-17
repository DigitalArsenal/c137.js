import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import UglifyJS from "uglify-js";
import glslStripComments from 'glsl-strip-comments';

export function transformPlugin() {
    return {
        name: "transformPlugin",
        resolveId(source: string) {
            if (source === "TaskProcessor") {
                return source;
            }
            return null;
        },
        renderError: (...args: any[]) => {
            console.log(args)
        },
        async transform(code: string, id: string) {
            let shaderFile = id.slice(0, id.lastIndexOf('.')) + ".glsl";
            if (id.indexOf('Shaders') > -1 && existsSync(shaderFile)) {
                let _shaderCode = glslStripComments(readFileSync(shaderFile, { encoding: 'utf8' }), { version: '300 es' });
                code = `export default \`${_shaderCode}\`;`;
            }
            return code;
        }
    };
}

export function injectWorkers(workerString: string) {
    return {
        name: "injectWorkers",
        async transform(code: string, id: string) {
            let replacements = [];
            if (id.indexOf("TaskProcessor.js") > -1) {
                replacements.push({
                    match: /new Worker\(getBootstrapperUrl\(\)\)/g,
                    replacement: `(function(){
            let _blob;
            let _workerBlob = ${JSON.stringify(workerString)};
            try {
              _blob = new Blob([_workerBlob], {
                  type: 'application/javascript'
              });
          } catch (e) {
              var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
              var blobBuilder = new BlobBuilder();
              blobBuilder.append(_workerBlob);
              _blob = blobBuilder.getBlob('application/javascript');
          }
          return new Worker(URL.createObjectURL(_blob));})()`
                });
            }

            replacements.push({
                match: /import zip from .*zip.js.*/g,
                replacement: `import * as zip from "@zip.js/zip.js/lib/zip-full.js";`
            });
             replacements.push({
                match: /const zWorkerUrl = buildModuleUrl\("ThirdParty\/Workers\/z-worker-pako.js"\);/g,
                replacement: ``
            });
           replacements.push({
                match: /zip.configure\({[\s\S.]*;/g,
                replacement: ""
            })/**/
            replacements.forEach(function (_swap) {
                let _match = code.match(_swap.match);
                if (_match) {
                    for (let _m = 0; _m < _match.length; _m++) {
                        code = code.replace(_match[_m], _swap.replacement);
                    }
                }
            });
            return code;
        }
    };
}

type MatchOption = {
    readonly match: RegExp;
    readonly replacement: string;
}

export function prep() {
    let transferTypedArrayTestSrc = UglifyJS.minify(
        readFileSync(resolve(process.cwd(), "./src/templates/transferTypedArrayTest.js"), "utf8")
    ).code;
    return {
        name: "prepFiles",
        transform(code: string, id: string) {
            if (!id.match(/.(jpeg|jpg|png|gif)$/)) {
                [
                    {
                        match: /WorkersES6/g,
                        replacement: `Workers`,
                    },
                    {
                        match: /getWorkerUrl\((['"`])Workers\/transferTypedArrayTest.js\1\)/g,
                        replacement: `URL.createObjectURL(new Blob(['${transferTypedArrayTestSrc}'], { type: 'application/javascript' }))`,
                    },
                    {
                        match: /bootstrapMessage\s+=\s+\{/g,
                        replacement: `
                  bootstrapMessage = {
                    CESIUM_BASE_URL:globalThis.CESIUM_BASE_URL,
                    `,
                    }
                ].forEach(function (_swap: MatchOption) {
                    let _match = code.match(_swap.match);
                    if (_match) {
                        for (let _m = 0; _m < _match.length; _m++) {
                            code = code.replace(_match[_m], _swap.replacement);
                        }
                    }
                });
            }
            return code;
        }
    }
}