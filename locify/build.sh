#!/bin/bash

pushd src
	./generate.sh
popd
cordova run android