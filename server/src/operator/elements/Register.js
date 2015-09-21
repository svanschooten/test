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
			errorText: "",
			stations: {},
			current_station: false
		};
	},
	render: function () {
		var $this = this;
		menu_items = (new Array({
				text: "Select a station",
				payload: -1
			}))
			.concat(Object.keys($this.state.stations)
			.map(function(id) {
				var station = $this.state.stations[id];
				return {
					text: station.name,
					payload: station.sid
				}
			}));
		return (
			<div id="register-body">
				<h2 id="register-header"><FontIcon className="fa fa-map-marker" />Locify | Operator | Register</h2>
				<div className="register-wrapper">
					<p className="error">{this.state.errorText}</p>
					<TextField ref="name" errorText={this.state.errorText} onChange={this._handleErrorInputChange} floatingLabelText="name" onEnterKeyDown={this._register}/>
					<TextField ref="email" errorText={this.state.errorText} onChange={this._handleErrorInputChange} floatingLabelText="email" type="email" onEnterKeyDown={this._register}/>
					<TextField ref="password" errorText={this.state.errorText} onChange={this._handleErrorInputChange} floatingLabelText="password" type="password" onEnterKeyDown={this._register}/>
					<TextField ref="password2" errorText={this.state.errorText} onChange={this._handleErrorInputChange} floatingLabelText="confirm password" type="password" onEnterKeyDown={this._register}/>
					<DropDownMenu menuItems={menu_items} ref="newLocificationStation" onChange={this._updateStationInfo}/>
					<TextField ref="stationKey" errorText={this.state.errorText} onChange={this._handleErrorInputChange} floatingLabelText="station key" onEnterKeyDown={this._register}/>
					<RaisedButton label="Register" primary={true} onClick={this._register} disabled={this.state.current_station === false}/>
				</div>
			</div>
		);
	},
	_updateStationInfo: function (_, i, item) {
		if (i === 0) {
			this.setState({
				current_station: false
			});
		} else {
			this.setState({
				current_station: item.payload
			});
		}
	},
	_handleErrorInputChange: function () {
		this.setState({
			errorText: ""
		});
	},
	componentDidMount: function () {
		var $this = this;
		request.get("/api/user/get/stations").then(function(res){
			var station_object = {};
			res.data.forEach(function(station) {
				station_object[station["sid"]] = station;
			});
			$this.setState({
				stations: station_object
			});
		});
	},
	_register: function () {
		var $this = this;
		if ($this.refs.password.getValue() === $this.refs.password2.getValue()) {
			request.post("/api/operator/register", {
				"name": $this.refs.name.getValue(),
				"email": $this.refs.email.getValue(),
				"password": $this.refs.password.getValue(),
				"station": $this.state.current_station,
				"stationcode": $this.refs.stationKey.getValue()
			}).then(function(res){
				if(res.data.success) {
					sessionStorage.setItem("oid", res.data.oid);
					sessionStorage.setItem("token", res.data.token);
					window.location.assign("http://80.112.151.115:8080/operator/");;
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