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
		if (typeof(Storage) !== "undefined" && sessionStorage.uid && sessionStorage.token) {
			request.post("api/user/login", {
				"uid": sessionStorage.uid,
				"token": sessionStorage.token
			}).then(function(res){
				if(res.data.success) {
					$this.props.login(true, {
						"uid": sessionStorage.uid,
						"token": sessionStorage.token
					});
				} else {
					sessionStorage.removeItem("uid");
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
				<TextField ref="email" errorText={this.state.errorText} onChange={this._handleErrorInputChange} floatingLabelText="email" type="email" onEnterKeyDown={this._evalLogin}/>
				<br/>
				<TextField ref="password" errorText={this.state.errorText} onChange={this._handleErrorInputChange} floatingLabelText="password" type="password" onEnterKeyDown={this._evalLogin}/>
				<br/>
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
		request.post("api/user/login", {
			"email": $this.refs.email.getValue(),
			"password": $this.refs.password.getValue()
		}).then(function(res){
			if(res.data.success) {
				sessionStorage.setItem("uid", res.data.uid);
				sessionStorage.setItem("token", res.data.token);
				$this.props.login(true, {
					"uid": res.data.uid,
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