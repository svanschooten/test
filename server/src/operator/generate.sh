#!/bin/bash

lessc ./main.less > ../../operator/css/main.css;
browserify -t reactify ./main.js -o ../../operator/js/main.js;
browserify -t reactify ./register.js -o ../../operator/js/register.js;
cp index.html ../../operator/index.html;
