#!/usr/bin/env bash

set -e -o pipefail

echo 'travis_fold:start:TEST'

# used by xvfb that is used by Chromium
export DISPLAY=:99.0

# Used by karma and karma-chrome-launcher
export CHROME_BIN=/usr/bin/google-chrome

echo 'travis_fold:start:test.build'
gulp build:tests
echo 'travis_fold:end:test.build'

echo 'travis_fold:start:test.run'
sh -e /etc/init.d/xvfb start
while [ ! -f "/tmp/ci/sauce-ready" ]; do
  printf "."
  sleep .5
done
karma start ./karma.conf.js --single-run --browsers="Chrome,sl_chrome,sl_firefox,sl_safari9,sl_ie_11"
echo 'travis_fold:end:test.run'

echo 'travis_fold:end:TEST'
