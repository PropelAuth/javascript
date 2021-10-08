import babel from '@rollup/plugin-babel';
import commonjs from "@rollup/plugin-commonjs";
import {nodeResolve} from '@rollup/plugin-node-resolve';
import {terser} from 'rollup-plugin-terser';
import pkg from './package.json';

const extensions = [
    '.js', '.jsx', '.ts', '.tsx',
];

const name = 'PropelAuth';
const input = './src/index.ts'

export default [
    // UMD
    {
        input,
        plugins: [
            nodeResolve({
                extensions,
            }),
            babel({
                extensions,
                babelHelpers: 'bundled',
                include: ['src/**/*'],
                exclude: ['src/**/*.test.*']
            }),
            terser(),
        ],

        output: {
            file: pkg.browser,
            format: 'umd',
            name,
            esModule: false,
            exports: "named",
            sourcemap: true,
        },
    },

    // ESM & CJS
    {
        input,
        plugins: [
            nodeResolve({
                extensions,
            }),
            commonjs(),
            babel({
                extensions,
                babelHelpers: 'bundled',
                include: ['src/**/*'],
                exclude: ['src/**/*.test.*']
            }),
        ],
        output: [{
            dir: "dist/esm",
            format: "esm",
            exports: "named",
            sourcemap: true,
        }, {
            dir: "dist/cjs",
            format: "cjs",
            sourcemap: true,
        }]
    },
]
