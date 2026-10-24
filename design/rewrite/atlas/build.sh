#!/bin/sh
# Builds the atlas page from its sources
cd "$(dirname "$0")" && cat src/head.html src/core.js src/cast.js src/places.js src/app.js > index.html
