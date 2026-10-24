#!/bin/sh
# Builds the atlas page from its sources; the painting code is the app's own, in packages/scene/paint
cd "$(dirname "$0")" && P=../../../packages/scene/paint && cat src/head.html $P/core.js $P/cast.js $P/places.js src/app.js > index.html
