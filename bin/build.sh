#!/usr/bin/env bash

rm -rf dist;
parcel build index.html
./bin/generate-service-worker-assets.sh
