/** @jsx React.DOM */
var React = require("react"),
	request = require('axios'),
	FontIcon = require("material-ui").FontIcon,
	mui = require("material-ui"),
	RaisedButton = mui.RaisedButton,
	RefreshIndicator = mui.RefreshIndicator,
	TextField = mui.TextField,
	DropDownMenu = mui.DropDownMenu,
	Paper = mui.Paper;
var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;
var watchID;

var Body = React.createClass({
	getInitialState: function () {
		return {
			error: false,
			locifications: {},
			location: {
				latitude: 0,
				longitude: 0
			},
			statusses: {},
			stations: {},
			current_station: false
		};
	},
	render: function () {
		var $this = this, 
			menu_items = (new Array({
					text: "Select a station",
					payload: -1
				}))
				.concat(Object.keys($this.state.stations)
				.map(function(id) {
					var station = $this.state.stations[id];
					return {
						text: (station.name + " (" + station.ops + ")"),
						payload: station.sid
					}
				}));
		return (
			<div id="locify-main">
				{this.state.error 
					? <div className="error">{this.state.error}</div>
					: ""
				}
				<div className="current-position">Your current position is lat: {(new String(this.state.location.latitude)).substr(0, 10)} &nbsp;long: {(new String(this.state.location.longitude)).substr(0, 10)}</div>
				<div className="locify-wrapper-top">
					<Paper  zDepth={2}>
						<TextField floatingLabelText="message (optional)" multiLine={true} ref="newLocificationMessage"/>
						<DropDownMenu menuItems={menu_items} ref="newLocificationStation" onChange={this._updateStationInfo}/>
						<RaisedButton label="Locify!" onClick={this._createLocification} disabled={this.state.current_station === false}/>
					</Paper>
				</div>
				<div className="locify-wrapper-bottom">
					<div className="station-info">
						<Paper  zDepth={2}>
							<p>Name: {this.state.current_station === false
								? ""
								: this.state.stations[this.state.current_station].name
							}</p>
							<p>City: {this.state.current_station === false
								? ""
								: this.state.stations[this.state.current_station].city
							}</p>
							<p>Address: {this.state.current_station === false
								? ""
								: this.state.stations[this.state.current_station].address
							}</p>
						</Paper>
					</div>
					<div className="locify-list">
						<Paper zDepth={2}>
							<ReactCSSTransitionGroup transitionName="translocifications">
							{Object.keys(this.state.locifications).sort().reverse().map(function(lid) {
								var loc = $this.state.locifications[lid];
								return (<div className="locification-wrapper">
									<Paper zDepth={1}>
										<p>Date: {(new Date(loc.created_at.substring(0, loc.created_at.length - 1))).toString()}</p>
										<p>Status: {$this.state.statusses[loc.status].status}</p>
										<p>Latitude: {(new String(loc.latitude)).substr(0, 10)}</p>
										<p>Longitude: {(new String(loc.longitude)).substr(0, 10)}</p>
										<p>Station: {$this.state.stations[loc.station].name}</p>
										{loc.message
											?	<p>Message: {loc.message}</p>
											:	""
										}
									</Paper>
								</div>);
							})}
							</ReactCSSTransitionGroup>
						</Paper>
					</div>
				</div>
			</div>
		);
	},
	_createLocification: function () {
		var $this = this;
		request.post("http://80.112.151.115:8080/api/user/locify", {
			"uid": $this.props.credentials.uid,
			"token": $this.props.credentials.token,
			"station": $this.state.current_station,
			"location": {
				"latitude": $this.state.location.latitude,
				"longitude": $this.state.location.longitude
			},
			"message": $this.refs.newLocificationMessage.getValue()
		}).then(function(res){
			if (res.data.success) {
				$this.refresh(function () {
					$this.setState({
						current_locification: res.data.lid
					});
					$this.refs.newLocificationMessage.clearValue();
				});
			}
		});
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
	componentDidMount: function () {
		var $this = this;
		watchID = navigator.geolocation.watchPosition(function(position) {
			$this.setState({
				location: {
					latitude: position.coords.latitude,
					longitude: position.coords.longitude
				},
				error: false
			});
		}, function (err) {
			$this.setState({
				error: err.message
			});
		}, {
			enableHighAccuracy: true
		});
		request.get("http://80.112.151.115:8080/api/user/get/stations").then(function(res){
			var station_object = {};
			res.data.forEach(function(station) {
				station_object[station["sid"]] = station;
			});
			$this.setState({
				stations: station_object
			});
		});
		request.get("http://80.112.151.115:8080/api/user/get/statusses").then(function(res){
			var status_object = {};
			res.data.forEach(function(status) {
				status_object[status["sid"]] = status;
			});
			$this.setState({
				statusses: status_object
			});
		});
		this.refresh();
	},
	componentDidUpdate: function () {
		$(".locify-list").pullToRefresh({
			callback: function () {
				var deferred = $.Deferred();
				$this.refresh(function() {
					deferred.resolve();
				});
				return deferred.promise();
			}
		});
	},
	refresh: function (cb) {
		var $this = this;
		request.post("http://80.112.151.115:8080/api/user/get/locifications", {
			"uid": $this.props.credentials.uid,
			"token": $this.props.credentials.token
		}).then(function(res){
			var locification_object = {};
			res.data.forEach(function(loc) {
				locification_object[loc["lid"]] = loc;
			});
			$this.setState({
				locifications: locification_object
			}, cb);
		});
	}
});

module.exports = Body;