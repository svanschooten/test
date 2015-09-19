#!/bin/bash

lessc ./main.less > ../../user/css/main.css;
cp ../../user/css/main.css ../../../locify/www/css/main.css;
browserify -t reactify ./main.js -o ../../user/js/main.js;
cp ../../user/js/main.js ../../../locify/www/js/main.js;
cp index.html ../../user/index.html;
cp index.html ../../../locify/www/index.html;
