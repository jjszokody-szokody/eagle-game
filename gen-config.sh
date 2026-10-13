#!/bin/sh
# Generates config.js from $CESIUM_ION_TOKEN (gitignored). Token ends up client-side, normal for ion tokens.
cd "$(dirname "$0")" && printf 'window.CESIUM_ION_TOKEN=%s;\n' "\"${CESIUM_ION_TOKEN}\"" > config.js
