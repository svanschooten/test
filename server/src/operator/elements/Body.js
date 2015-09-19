/** @jsx React.DOM */
var React = require("react"),
	FontIcon = require("material-ui").FontIcon;

var Body = React.createClass({
	getInitialState: function () {
		return {
			loggedIn: false
		};
	},
	render: function () {
		return (
			<div id="main-body">
				<h3 id="main-header"><FontIcon className="fa fa-sign-in" />Entree! Admin page</h3>
			</div>
		);
	},
	_setLogin: function (login) {
		this.setState({
			loggedIn: login
		});
	}
});

module.exports = Body;