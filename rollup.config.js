import typescript from 'rollup-plugin-typescript2'
import external from 'rollup-plugin-peer-deps-external'
import url from '@rollup/plugin-url'
import { uglify } from 'rollup-plugin-uglify';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import nodePolyfills from 'rollup-plugin-node-polyfills';
import pkg from './package.json'

const config = {
    input: './index.ts',
    external: [ 'acey', 'axios', 'create-hash', 'tweetnacl', 'tweetnacl-util', 'bip39', 'bip32', 'wallet-util', 'wallet-script', 'moment'],
    output: [
        {
            globals: {
                'acey': 'acey',
                'axios': 'axios',
                'create-hash': 'create-hash',
                'tweetnacl': 'tweetnacl',
                'tweetnacl-util': 'tweetnacl-util',
                'bip39': 'bip39',
                'bip32': 'bip32',
                'moment': 'moment',
                'wallet-util': 'wallet-util',
                'wallet-script': 'wallet-script'
            },
            file: pkg.main,
            format: 'umd',
            name: 'involvera-wallet-js'
        },
    ],
    plugins: [
        external(),
        url(),
        typescript({
            tsconfig: 'tsconfig.json',
            tsconfigOverride: { compilerOptions: { module: 'es2015' } },
            clean: true
        }),
        nodeResolve({
            preferBuiltins: false
        }),
        nodePolyfills(),
        commonjs(),
    ]
}

if (process.env.NODE_ENV === 'production') {
    config.plugins.push(uglify());
}

export default config