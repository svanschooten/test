#!/bin/bash

lessc ./main.less > ../../user/css/main.css;
browserify -t reactify ./main.js -o ../../user/js/main.js;
cp index.html ../../user/index.html;
