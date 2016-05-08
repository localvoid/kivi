#!/usr/bin/env bash

set -e -o pipefail

echo 'travis_fold:start:TEST'

# used by xvfb that is used by Chrome
export DISPLAY=:99.0

# Used by karma and karma-chrome-launcher
export CHROME_BIN=/usr/bin/google-chrome

echo 'travis_fold:start:test.run'
sh -e /etc/init.d/xvfb start
gulp test:sauce
echo 'travis_fold:end:test.run'

echo 'travis_fold:end:TEST'
