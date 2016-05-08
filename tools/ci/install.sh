#!/usr/bin/env bash

set -ex -o pipefail

echo 'travis_fold:start:INSTALL'

# Use newer verison of GCC to that is required to compile native npm modules for Node v4+ on Ubuntu Precise
# more info: https://docs.travis-ci.com/user/languages/javascript-with-nodejs#Node.js-v4-(or-io.js-v3)-compiler-requirements
export CXX=g++-4.8

mkdir -p /tmp/ci

echo 'travis_fold:start:install.gulp-cli'
npm -g install gulp-cli
echo 'travis_fold:end:install.gulp-cli'

echo 'travis_fold:start:install.typings-cli'
npm -g install typings
echo 'travis_fold:end:install.typings-cli'

echo 'travis_fold:start:install.node_modules'
npm install
echo 'travis_fold:end:install.node_modules'

echo 'travis_fold:start:install.typings'
typings install
echo 'travis_fold:end:install.typings'

# Setup Sauce Connect
echo 'travis_fold:start:install.sauceConnect'
./setup_sauce.sh
echo 'travis_fold:end:install.sauceConnect'

echo 'travis_fold:end:INSTALL'
