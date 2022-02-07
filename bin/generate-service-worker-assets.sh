#!/usr/bin/env bash

assets_filename="service_worker_assets.txt"
echo "Generating asset list in $assets_filename"

(
  cd dist || exit 1
  rm -f $assets_filename
  ls -- *.{html,js,css,png,ico,woff,webmanifest} | grep -v service_worker.js > $assets_filename
)
