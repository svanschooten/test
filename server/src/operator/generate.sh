#!/bin/bash

lessc ./main.less > ../../operator/css/main.css;
browserify -t reactify ./main.js -o ../../operator/js/main.js;
cp index.html ../../operator/index.html;
