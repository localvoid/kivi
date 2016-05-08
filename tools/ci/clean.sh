#!/usr/bin/env bash

set -ex -o pipefail

echo 'travis_fold:start:CLEAN'

echo 'travis_fold:start:clean.sauceConnect'
killall sc
while [[ -n `ps -ef | grep "sauce-connect-" | grep -v "grep"` ]]; do
  printf "."
  sleep .5
done
echo 'travis_fold:end:clean.sauceConnect'

echo 'travis_fold:end:CLEAN'