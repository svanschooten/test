var React = require('react'),
injectTapEventPlugin = require("react-tap-event-plugin"),
Body = require("./elements/Body.js");

//Needed for onTouchTap
//Can go away when react 1.0 release
//Check this repo:
//https://github.com/zilverline/react-tap-event-plugin
injectTapEventPlugin();

window.onload = function () {
	React.render(
		<Body/>,
		document.getElementById("content")
	);
};