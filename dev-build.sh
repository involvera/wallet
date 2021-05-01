rm -rf dist
yarn add acey --peer 
./node_modules/.bin/rollup -c
rm -rf node_modules/acey