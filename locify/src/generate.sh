#!/bin/bash

lessc ./main.less > ../www/css/main.css;
browserify -t reactify ./main.js -o ../www/js/main.js;
cp index.html ../www/index.html;
