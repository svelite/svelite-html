import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
// import { terser } from 'rollup-plugin-terser';

/** @type {import('rollup').Config} */
export default {
    input: 'app.config.js',
    output: {
        file: 'dist/app.js',
        format: 'cjs', // Output format (CommonJS)
    },
    plugins: [
        resolve({
            preferBuiltins: true, // Ensure that Node.js built-in modules are resolved
            browser: false, // Do not try to resolve node_modules dependencies to their browser equivalents
        }),
        json(),
        commonjs(), // Convert CommonJS modules to ES6, so they can be included in a Rollup bundle
        // terser(), // Minify the bundle
    ],
    external: ['fsevents', '../pkg']

};
