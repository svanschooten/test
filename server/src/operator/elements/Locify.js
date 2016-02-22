/** @jsx React.DOM */
var React = require("react"),
	request = require('axios'),
	FontIcon = require("material-ui").FontIcon,
	mui = require("material-ui"),
	RaisedButton = mui.RaisedButton,
	RefreshIndicator = mui.RefreshIndicator,
	TextField = mui.TextField,
	DropDownMenu = mui.DropDownMenu,
	Paper = mui.Paper,
	rgm = require("react-googlemaps"),
	Map = rgm.Map,
	Marker = rgm.Marker,
	GoogleMapsAPI = window.google.maps,
	LatLng = GoogleMapsAPI.LatLng;

var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;
var connection;

var Body = React.createClass({
	getInitialState: function () {
		return {
			error: false,
			locifications: {},
			location: new LatLng(0,0),
			center: new LatLng(0,0),
			zoom: false,
			current_locification: false,
			status: false,
			orig_status: 0,
			orig_status_index: 0,
			menu_items: [{text: "", payload: -1}],
			statusses: {},
			highlight: false
		};
	},
	render: function () {
		var $this = this, i = 0;
		return (
			<div id="locify-main">
				{this.state.error 
					? <div className="error">{this.state.error}</div>
					: ""
				}
				<div  id="logout-btn"><RaisedButton label="Logout" primary={true} onClick={this._logout}/></div>
				<div className="locify-wrapper-top">
					<Paper  zDepth={2}>
						<p>Message: <span className={(!this.state.current_locification ? "hidden" : "") + " message"}>{this.state.current_locification ? this.state.locifications[this.state.current_locification].message : ""}</span></p>
						<DropDownMenu menuItems={this.state.menu_items} ref="newLocificationStatus" disabled={this.state.current_locification === false} onChange={this._updateStatusInfo} selectedIndex={this.state.orig_status_index}/>
						<RaisedButton label="Update status" onClick={this._updateStatus} disabled={this.state.current_locification === false}/>
					</Paper>
				</div>
				<div className="locify-wrapper-bottom">
					<div className="locify-list">
						<Paper zDepth={2}>
							<ReactCSSTransitionGroup transitionName="translocifications">
							{ Object.keys(this.state.locifications).sort(function(a, b){
								if ($this.state.locifications[a].created_at < $this.state.locifications[b].created_at ) {
									return 1;
								} else if ($this.state.locifications[a].created_at > $this.state.locifications[b].created_at ) {
									return -1;
								}
								return 0;
							}).map(function(lid) {
								var loc = $this.state.locifications[lid];
								if (i > 25) {
									return "";
								}
								return (<div key={lid} className={($this.state.statusses[loc.status].status) + " locification-wrapper " + (($this.state.highlight && ($this.state.highlight === lid)) ? "blink": "")} onClick={function() {
									$this.setState({
										current_locification: lid,
										location: new LatLng(loc.latitude, loc.longitude),
										center: new LatLng(loc.latitude, loc.longitude),
										orig_status: loc.status,
										orig_status_index: $this.state.statusses[loc.status]["menu id"]
									});
								}}>
									<Paper zDepth={1}>
										<p>
											<span>Date: {(new Date(loc.created_at.substring(0, loc.created_at.length - 1))).toString()}</span>
											<span className="status">Status: {$this.state.statusses[loc.status].status}</span>
										</p>
										<p>
											<span>Latitude: {(new String(loc.latitude)).substr(0, 10)}</span>
											<span className="long">Longitude: {(new String(loc.longitude)).substr(0, 10)}</span>
										</p>
										<div className="message">
											<p>User: [{loc.uid}] &nbsp; {loc.name}</p>
											<p>Message: {loc.message}</p>	
										</div>
									</Paper>
								</div>);
							})}
							</ReactCSSTransitionGroup>
						</Paper>
					</div>
					<div className="station-info">
						<Paper zDepth={2}>
							<div className="map-wrapper">
								{this.state.zoom === false
									? ""
									: 	<Map initialZoom={this.state.zoom} center={this.state.center} width={400} height={400} onCenterChange={this.handleCenterChange}>
											<Marker position={this.state.location} />
										</Map>
									}
							</div>
						</Paper>
					</div>
				</div>
			</div>
		);
	},
	handleCenterChange: function(map) {
		this.setState({
			center: map.getCenter()
		});
	},
	_updateStatus: function () {
		var $this = this;
		connection.send(JSON.stringify({
			"action": "update",
			"oid": $this.props.credentials.oid,
			"token": $this.props.credentials.token,
			"lid": $this.state.current_locification,
			"status": $this.state.status
		}));
	},
	_updateStatusInfo: function (_, _, item) {
		if (item.payload === this.state.orig_status) {
			this.setState({
				status: false
			});
		} else {
			this.setState({
				status: item.payload,
				orig_status_index: this.state.statusses[item.payload]["menu id"]
			});
		}
	},
	componentDidMount: function () {
		var $this = this;
		navigator.geolocation.getCurrentPosition(function(position) {
			$this.setState({
				location: new LatLng(position.coords.latitude, position.coords.longitude),
				center: new LatLng(position.coords.latitude, position.coords.longitude),
				zoom: 15
			});
		}, function (err) {
			$this.setState({
				error: err.message
			});
		}, {
			enableHighAccuracy: true
		});
		request.get("/api/user/get/statusses").then(function(res){
			var status_object = {}, i = 0;
			var menu_items_object = res.data.map(function(status) {
				status_object[status["sid"]] = status;
				status_object[status["sid"]]["menu id"] = i;
				i = i + 1;
				return {
					text: status.status,
					payload: status["sid"]
				};
			});
			$this.setState({
				menu_items: menu_items_object,
				statusses: status_object
			}, function () {
				$this.refresh();
			});
		});
		connection = new WebSocket("ws://localhost:8001/");
		connection.onopen = function () {
			console.log("Connection opened");
			connection.send(JSON.stringify({
				"action": "register",
				"oid": $this.props.credentials.oid,
				"token": $this.props.credentials.token
			}));
			$this.setState({
				error: false
			});
		}
		connection.onclose = function () {
			console.log("Connection closed");
			$this.setState({
				error: "Lost connection!"
			});
		}
		connection.onmessage = function (event) {
			var data = JSON.parse(event.data);
			switch (data.action) {
				case "register":
					break;
				case "update":
					if (data.success) {
						$this.refresh();
						$this.setState({
							error: false
						});
					} else {
						$this.setState({
							error: "Something went wrong while updating!"
						});
					}
					break;
				case "locify":
					$this.setState({
						highlight: data.lid
					});
					$this.refresh();
					break;
				default:
					console.log("undefined action: " + data.action);
			}
		}
	},
	refresh: function (cb) {
		var $this = this;
		request.post("/api/operator/get/locifications", {
			"oid": $this.props.credentials.oid,
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
	},
	_logout: function () {
		var $this = this;
		connection.close();
		request.post("/api/operator/logout", {
			"oid": $this.props.credentials.oid
		});
		this.props.logout(false);
	}
});

module.exports = Body;