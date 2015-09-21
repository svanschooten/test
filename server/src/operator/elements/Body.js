/** @jsx React.DOM */
var React = require("react"),
	Login = require("./Login"),
	Locify = require("./Locify"),
	FontIcon = require("material-ui").FontIcon;

var Body = React.createClass({
	getInitialState: function () {
		return {
			loggedIn: false,
			credentials: {
				oid: null,
				token: null
			}
		};
	},
	render: function () {
		return (
			<div id="main-body">
				<h2 id="main-header"><FontIcon className="fa fa-map-marker" />Locify | Operator</h2>
				{this.state.loggedIn 
					? <Locify logout={this._setLogin} credentials={this.state.credentials} />
					: <Login login={this._setLogin} />
				}
			</div>
		);
	},
	_setLogin: function (login, credentials) {
		this.setState({
			loggedIn: login,
			"credentials": {
				"oid": login ? credentials.oid : null,
				"token": login ? credentials.token : null
			}
		});
	}
});

module.exports = Body;