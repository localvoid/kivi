#!/usr/bin/env bash

set -ex -o pipefail

echo 'travis_fold:start:INSTALL'

echo 'travis_fold:start:install.npm-cli-tools'
npm -g install gulp-cli typings karma-cli typescript tslint
echo 'travis_fold:end:install.npm-cli-tools'

echo 'travis_fold:start:install.node_modules'
npm install
echo 'travis_fold:end:install.node_modules'

echo 'travis_fold:start:install.typings'
typings install
echo 'travis_fold:end:install.typings'

echo 'travis_fold:end:INSTALL'
