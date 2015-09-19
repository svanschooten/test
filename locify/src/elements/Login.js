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
		if (typeof(Storage) !== "undefined" && localStorage.uid && localStorage.token) {
			request.post("http://80.112.151.115:8080/api/user/login", {
				"uid": localStorage.uid,
				"token": localStorage.token
			}).then(function(res){
				if(res.data.success) {
					$this.props.login(true, {
						"uid": localStorage.uid,
						"token": localStorage.token
					});
				} else {
					localStorage.removeItem("uid");
					localStorage.removeItem("token");
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
		request.post("http://80.112.151.115:8080/api/user/login", {
			"email": $this.refs.email.getValue(),
			"password": $this.refs.password.getValue()
		}).then(function(res){
			if(res.data.success) {
				localStorage.setItem("uid", res.data.uid);
				localStorage.setItem("token", res.data.token);
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