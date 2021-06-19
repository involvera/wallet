import typescript from 'rollup-plugin-typescript2'
import external from 'rollup-plugin-peer-deps-external'
import url from '@rollup/plugin-url'
import { uglify } from 'rollup-plugin-uglify';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import pkg from './package.json'

const config = {
    input: './index.ts',
    external: [ 'acey', 'axios', 'create-hash', 'tweetnacl', 'tweetnacl-util', 'elliptic', 'bip39', 'bip32', 'wallet-util'],
    output: [
        {
            globals: {
                'acey': 'acey',
                'axios': 'axios',
                'create-hash': 'create-hash',
                'tweetnacl': 'tweetnacl',
                'lodash.clonedeep': 'cloneDeep',
                'tweetnacl-util': 'tweetnacl-util',
                'elliptic': 'elliptic',
                'bip39': 'bip39',
                'bip32': 'bip32',
                'wallet-util': 'wallet-util'
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
        nodeResolve()
    ]
}

if (process.env.NODE_ENV === 'production') {
    config.plugins.push(uglify());
}

export default config