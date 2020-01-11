#!/bin/bash

cd ${0%/*}

cd src
rm ../build/tar-stream-chunker
clang -o ../build/tar-stream-chunker main.c options.c
