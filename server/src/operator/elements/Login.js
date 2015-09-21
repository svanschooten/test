/** @jsx React.DOM */
var React = require("react"),
	request = require('axios'),
	FontIcon = require("material-ui").FontIcon,
	mui = require("material-ui"),
	TextField = mui.TextField,
	RaisedButton = mui.RaisedButton;

var Body = React.createClass({
	getInitialState: function () {
		var $this = this;
		if (typeof(Storage) !== "undefined" && sessionStorage.oid && sessionStorage.token) {
			request.post("/api/operator/login", {
				"oid": sessionStorage.oid,
				"token": sessionStorage.token
			}).then(function(res){
				if(res.data.success) {
					$this.props.login(true, {
						"oid": sessionStorage.oid,
						"token": sessionStorage.token
					});
				} else {
					sessionStorage.removeItem("oid");
					sessionStorage.removeItem("token");
				}
			});
		}
		return {
			verifying: false,
			errorText: ""
		};
	},
	render: function () {
		return (
			<div id="login">
				<p className="error">{this.state.errorText}</p>
				<TextField ref="email" errorText={this.state.errorText} onChange={this._handleErrorInputChange} floatingLabelText="email" type="email" onEnterKeyDown={this._evalLogin}/>
				<br/>
				<TextField ref="password" errorText={this.state.errorText} onChange={this._handleErrorInputChange} floatingLabelText="password" type="password" onEnterKeyDown={this._evalLogin}/>
				<br/>
				<a href="register.html">register</a>
				<RaisedButton label="Login" primary={true} onClick={this._evalLogin}/>
			</div>
		);
	},
	_handleErrorInputChange: function () {
		this.setState({
			errorText: ""
		});
	},
	_evalLogin: function () {
		var $this = this;
		request.post("/api/operator/login", {
			"email": $this.refs.email.getValue(),
			"password": $this.refs.password.getValue()
		}).then(function(res){
			if(res.data.success) {
				sessionStorage.setItem("oid", res.data.oid);
				sessionStorage.setItem("token", res.data.token);
				$this.props.login(true, {
					"oid": res.data.oid,
					"token": res.data.token
				});
			} else {
				this.setState({
					errorText: "Unknown email and password combination!"
				});
			}
		});
	}
});

module.exports = Body;