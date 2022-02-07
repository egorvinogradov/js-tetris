#!/usr/bin/env bash

rm -rf dist

concurrently \
  "parcel index.html --port 5000" \
  "sleep 3 && ./bin/generate-service-worker-assets.sh"
