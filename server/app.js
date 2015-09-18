var express = require('express');
var bodyParser = require('body-parser');
var websocket = require("nodejs-websocket");
var uuid = require('node-uuid');
var mysql = require('mysql');
var bcrypt = require('bcryptjs');
var app = express();
var tokens = {
	users: {},
	operators: {}
};
var connections = {};

app.use(express.static('user'));
app.use("/operator", express.static('operator'));
app.use(bodyParser.json());

var db = mysql.createConnection({
	host: 'mysql.eu.dualdev.com',
	user: 'd237h1_locify',
	password : 'a5sgFo5',
	database : 'd237h1_locify'
});

var operator_server = websocket.createServer(function (connection) {
	var oid;
	connection.on("text", function (msg) {
		var data = JSON.parse(msg);
		if (data.token && data.oid && tokens.operators[data.oid] === data.token && data.action) {
			switch (data.action) {
				case "register":
					oid = data.oid;
					connections[oid] = connection;
					connection.sendText(JSON.stringify({
						success: true
					}));
					break;
				case "update":
					db.query(mysql.format('UPDATE ?? SET ?? = ? WHERE ?? = ?', ['locifications', 'status', data.status, 'lid', data.lid]), function (err, result) {
						if (result.changedRows === 1) {
							connection.sendText(JSON.stringify({
								success: true
							}));
						} else {
							connection.sendText(JSON.stringify({
								success: false
							}));
						}
					});
					break;
				default:
					console.log(msg);
			}
		} else {
			connection.close();
		}
	});
	connection.on("close", function () {
		delete connections[oid];
	});
}).listen(8001);

app.post('/api/user/get/statusses', function (req, res) {
	db.query(mysql.format("SELECT * FROM ??", ['statusses']), function(err, rows) {
		res.json(rows.map(function(row){
			return row;
		}));
	});
});

app.post('/api/user/get/stations', function (req, res) {
	db.query(mysql.format("SELECT * FROM ??", ['stations']), function(err, rows) {
		res.json(rows.map(function(row){
			return row;
		}));
	});
});

app.post('/api/user/login', function (req, res) {
	if (req.body.uid && req.body.token) {
		if (tokens.users[req.body.uid] === req.body.token) {
			res.json({
				success: true,
				uid: req.body.uid,
				token: tokens.users[req.body.uid]
			});
		} else {
			res.status(401).send('Unauthorized');
		}
	} else if (req.body.email, req.body.password) {
		db.query(mysql.format("SELECT * FROM ?? WHERE ?? = ? AND ?? = ?", ['users', 'email', req.body.email, 'password', req.body.password]), function(err, rows) {
			if (err) {
				res.status(500).send('Server error');
				return;
			}
			if (rows.length === 1) {
				if (!tokens.users[rows[0]['uid']]) {
					tokens.users[rows[0]['uid']] = uuid.v4();
				}
				res.json({
					success: true,
					uid: rows[0]['uid'],
					token: tokens.users[rows[0]['uid']]
				});
			} else {
				res.status(500).send('Server error');
			}
		});
	} else {
		res.status(400).send('Bad request');
	}
});

app.post('/api/user/register', function (req, res) {
	if (req.body.name && req.body.email && req.body.password) {
		db.query(mysql.format("SELECT * FROM ?? WHERE ?? = ?", ['users', 'email', req.body.email]), function(err, rows) {
			if (err) {
				res.status(500).send('Server error');
				return;
			}
			if (rows.length > 0) {
				res.json({
					success: false,
					reason: "User already exists with that email"
				});
			} else {
				db.query(mysql.format("INSERT INTO users SET ?", {
					'name': req.body.name, 
					'email': req.body.email, 
					'password': req.body.password
				}, function (err, result) {
					if (err) {
						res.status(500).send('Server error');
						return;
					}
					tokens.users[result.insertId] = uuid.v4();
					res.json({
						success: true,
						token: tokens.users[result.insertId],
						uid: result.insertId
					});
				});
			}
		});
	} else {
		res.status(400).send('Bad request');
	}
});

app.post('/api/user/logout', function (req, res) {
	if (req.body.uid && tokens.users[req.body.uid]) {
		delete tokens.users[req.body.uid];
		res.json({
			success: true
		});
	} else {
		res.status(400).send('Bad request');
	}
});

app.post('/api/user/notify', function (req, res) {
	if (req.body.uid && req.body.token && req.body.station && req.body.location && req.body.location.latitude && req.body.location.longitude && req.body.message){
		if (tokens.users[req.body.uid] === req.body.token) {
			db.query("INSERT INTO locifications SET ?", {
				'uid': req.body.uid, 
				'latitude': req.body.location.latitude, 
				'longitude': req.body.location.longitude,
				'station': req.body.station,
				'message': req.body.message,
				'status': 1
			}, function (err, result) {
				if (err) {
					res.status(500).send('Server error');
					return;
				}
				res.json({
					success: true,
					lid: result.insertId,
				});
				db.query(mysql.format("SELECT * FROM ?? WHERE ?? = ?", ['operators', 'station', req.body.station]), function(err, rows) {
					rows.forEach(function(row){
						connections[row['oid']].sendText(JSON.stringify({
							oid: row['oid'],
							target: req.body.station,
							lid: result.insertId
						}));
					});
				});
			});
		} else {
			res.status(401).send('Unauthorized');
		}
	} else {
		res.status(400).send('Bad request');
	}
});

app.post('/api/operator/login', function (req, res) {
	if (req.body.oid && req.body.token) {
		if (tokens.operators[req.body.oid] === req.body.token) {
			res.json({
				success: true,
				oid: req.body.oid,
				token: tokens.operators[req.body.oid]
			});
		} else {
			res.status(401).send('Unauthorized');
		}
	} else if (req.body.email, req.body.password) {
		db.query(mysql.format("SELECT * FROM ?? WHERE ?? = ? AND ?? = ?", ['operators', 'email', req.body.email, 'password', req.body.password]), function(err, rows) {
			if (err) {
				res.status(500).send('Server error');
				return;
			}
			if (rows.length === 1) {
				if (!tokens.operators[rows[0]['oid']]) {
					tokens.operators[rows[0]['oid']] = uuid.v4();
				}
				res.json({
					success: true,
					oid: rows[0]['oid'],
					token: tokens.operators[rows[0]['oid']]
				});
			} else {
				res.status(500).send('Server error');
			}
		});
	} else {
		res.status(400).send('Bad request');
	}
});

app.post('/api/operator/register', function (req, res) {
	if (req.body.name && req.body.email && req.body.password && req.body.station && req.body.stationcode) {
		db.query(mysql.format("SELECT * FROM ?? WHERE ?? = ?", ['users', 'email', req.body.email]), function(err, rows) {
			if (err) {
				res.status(500).send('Server error');
				return;
			}
			if (rows.length > 0) {
				res.json({
					success: false,
					reason: "User already exists with that email"
				});
			} else {
				db.query(mysql.format("SELECT * FROM ?? WHERE ?? = ?", ['stations', 'sid', req.body.station]), function(err, rows) {
					if (err) {
						res.status(500).send('Server error');
						return;
					}
					if (req.body.stationcode === rows[0]['stationcode']) {
						db.query("INSERT INTO operators SET ?", {
							'name': req.body.name, 
							'email': req.body.email, 
							'password': req.body.password,
							'station': req.body.station
						}, function (err, result) {
							if (err) {
								res.status(500).send('Server error');
								return;
							}
							tokens.operators[result.insertId] = uuid.v4();
							res.json({
								success: true,
								token: tokens.operators[result.insertId],
								oid: result.insertId
							});
						});
					} else {
						res.status(401).send('Unauthorized');
					}
				});
			}
		});
	} else {
		res.status(400).send('Bad request');
	}
});

app.post('/api/operator/logout', function (req, res) {
	if (req.body.oid && tokens.operators[req.body.oid]) {
		delete tokens.operators[req.body.oid];
		res.json({
			success: true
		});
	} else {
		res.status(400).send('Bad request');
	}
});

var server = app.listen(80, function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log('Locify server listening at http://%s:%s', host, port);
});