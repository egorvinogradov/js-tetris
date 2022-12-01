#!/usr/bin/env bash

rm -rf dist;
parcel build index.html --public-url .
./bin/generate-service-worker-assets.sh
cp CNAME dist
