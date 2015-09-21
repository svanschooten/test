/** @jsx React.DOM */
var React = require("react"),
	request = require('axios'),
	FontIcon = require("material-ui").FontIcon,
	mui = require("material-ui"),
	TextField = mui.TextField,
	RaisedButton = mui.RaisedButton
	DropDownMenu = mui.DropDownMenu;

var Body = React.createClass({
	getInitialState: function () {
		return {
			errorText: ""
		};
	},
	render: function () {
		return (
			<div id="register-body">
				<h2 id="register-header"><FontIcon className="fa fa-map-marker" />Locify | User | Register</h2>
				<div className="register-wrapper">
					<p className="error">{this.state.errorText}</p>
					<TextField ref="name" errorText={this.state.errorText} onChange={this._handleErrorInputChange} floatingLabelText="name" onEnterKeyDown={this._register}/>
					<TextField ref="email" errorText={this.state.errorText} onChange={this._handleErrorInputChange} floatingLabelText="email" type="email" onEnterKeyDown={this._register}/>
					<TextField ref="password" errorText={this.state.errorText} onChange={this._handleErrorInputChange} floatingLabelText="password" type="password" onEnterKeyDown={this._register}/>
					<TextField ref="password2" errorText={this.state.errorText} onChange={this._handleErrorInputChange} floatingLabelText="confirm password" type="password" onEnterKeyDown={this._register}/>
					<RaisedButton label="Register" primary={true} onClick={this._register} disabled={this.state.current_station === false}/>
				</div>
			</div>
		);
	},
	_handleErrorInputChange: function () {
		this.setState({
			errorText: ""
		});
	},
	_register: function () {
		var $this = this;
		if ($this.refs.password.getValue() === $this.refs.password2.getValue()) {
			request.post("api/user/register", {
				"name": $this.refs.name.getValue(),
				"email": $this.refs.email.getValue(),
				"password": $this.refs.password.getValue()
			}).then(function(res){
				if(res.data.success) {
					sessionStorage.setItem("uid", res.data.uid);
					sessionStorage.setItem("token", res.data.token);
					window.location.assign("http://80.112.151.115:8080/");;
				} else {
					this.setState({
						errorText: res.data.reason
					});
				}
			});
		} else {
			this.setState({
				errorText: "Passwords don't match."
			});
		}
	}
});

module.exports = Body;