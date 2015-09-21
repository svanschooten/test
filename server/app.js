var express = require('express');
var bodyParser = require('body-parser');
var websocket = require("nodejs-websocket");
var uuid = require('node-uuid');
var mysql = require('mysql');
var bcrypt = require('bcryptjs');
var fs = require("fs");
var app = express();
var tokens = {
	users: {},
	operators: {}
};
var connections = {}, db;

app.use(express.static('user'));
app.use("/operator", express.static('operator'));
app.use(bodyParser.json());

(function makeConn() {
	db = mysql.createConnection({
		host: 'mysql.eu.dualdev.com',
		user: 'd237h1_locify',
		password : 'a5sgFo5',
		database : 'd237h1_locify'
	});
	db.connect(function(err) {
		if (err) {
			log(err);
			return;
		}
		console.log('connected as id ' + db.threadId);
	});
	db.on('error', function(err) {
		if (err.code === "PROTOCOL_CONNECTION_LOST") {
			makeConn();
		} else {
			log(err);
			return;
		}
	});
})();


var log = function(text) {
	var d = new Date(), logfile = "log/" + d.getDate() + "-" + d.getMonth() + "-" +  d.getYear() + ".log";
	fs.stat(logfile, function(err) {
		if (err == null) {
			fs.appendFile(logfile, JSON.stringify(text));
		} else {
			fs.writeFile(logfile, JSON.stringify(text));
		}
	});
}

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
						action: "register",
						success: true
					}));
					break;
				case "update":
					db.query(mysql.format('UPDATE ?? SET ?? = ?, ?? = CURRENT_TIMESTAMP WHERE ?? = ?', ['locifications', 'status', data.status, 'modified_at', 'lid', data.lid]), function (err, result) {
						if (err) {
							log(err);
							connection.sendText(JSON.stringify({
								action: "update",
								success: false
							}));
						}
						if (result.changedRows === 1) {
							connection.sendText(JSON.stringify({
								action: "update",
								success: true
							}));
						} else {
							connection.sendText(JSON.stringify({
								action: "update",
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

app.get('/api/user/get/statusses', function (req, res) {
	db.query(mysql.format("SELECT * FROM ??", ['statusses']), function(err, rows) {
		if (err) {
			log(err);
			res.status(500).send('Server error');
			return;
		}
		res.json(rows.concat([]).map(function(row){
			return row;
		}));
	});
});

app.get('/api/user/get/stations', function (req, res) {
	db.query(mysql.format("SELECT ??, ??, ??, ?? FROM ??", ['sid', 'name', 'city', 'address', 'stations']), function(err, rows) {
		if (err) {
			log(err);
			res.status(500).send('Server error');
			return;
		}
		var stations = rows;
		db.query(mysql.format("SELECT ??, ?? FROM ??, ?? WHERE ?? = ??", ['operators.oid', 'stations.sid', 'operators', 'stations', 'operators.station', 'stations.sid']), function(err, rows) {
			if (err) {
				log(err);
				res.status(500).send('Server error');
				return;
			}
			var i, ops = {};
			for (i = 0; i < rows.length; i++) {
				if (ops[rows[i]['sid']]) {
					ops[rows[i]['sid']] = ops[rows[i]['sid']] + (connections[rows[i]['oid']] ? 1 : 0);
				} else {
					ops[rows[i]['sid']] = (connections[rows[i]['oid']] ? 1 : 0);
				}
			}
			res.json(stations.concat([]).map(function(station){
				station["ops"] = ops[station['sid']] ? ops[station['sid']] : 0;
				return station;
			}));
		});
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
		db.query(mysql.format("SELECT * FROM ?? WHERE ?? = ?", ['users', 'email', req.body.email]), function(err, rows) {
			if (err) {
				log(err);
				res.status(500).send('Server error');
				return;
			}
			if (rows.length === 1 && bcrypt.compareSync(req.body.password, rows[0]['password'])) {
				if (!tokens.users[rows[0]['uid']]) {
					tokens.users[rows[0]['uid']] = uuid.v4();
				}
				res.json({
					success: true,
					uid: rows[0]['uid'],
					token: tokens.users[rows[0]['uid']]
				});
			} else {
				res.status(401).send('Unauthorized');
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
				log(err);
				res.status(500).send('Server error');
				return;
			}
			if (rows.length > 0) {
				res.json({
					success: false,
					reason: "User already exists with that email"
				});
			} else {
				db.query("INSERT INTO users SET ?", {
					'name': req.body.name, 
					'email': req.body.email, 
					'password': bcrypt.hashSync(req.body.password, 10)
				}, function (err, result) {
					if (err) {
						log(err);
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

app.post('/api/user/get/locifications', function (req, res) {
	if (req.body.uid && req.body.token){
		if (tokens.users[req.body.uid] === req.body.token) {
			db.query(mysql.format("SELECT * FROM ?? WHERE ?? = ? ORDER BY ?? DESC", ['locifications', 'uid', req.body.uid, 'created_at']), function(err, rows) {
				if (err) {
					log(err);
					res.status(500).send('Server error');
					return;
				}
				res.json(rows);
			});
		} else {
			res.status(401).send('Unauthorized');
		}
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

app.post('/api/user/locify', function (req, res) {
	if (req.body.uid && req.body.token && req.body.station && req.body.location && req.body.location.latitude && req.body.location.longitude){
		if (tokens.users[req.body.uid] === req.body.token) {
			db.query("INSERT INTO locifications SET ?", {
				'uid': req.body.uid, 
				'latitude': req.body.location.latitude, 
				'longitude': req.body.location.longitude,
				'station': req.body.station,
				'message': req.body.message ? req.body.message : "",
				'status': 1
			}, function (err, result) {
				if (err) {
					log(err);
					res.status(500).send('Server error');
					return;
				}
				res.json({
					success: true,
					lid: result.insertId,
				});
				db.query(mysql.format("SELECT ?? FROM ?? WHERE ?? = ?", ['oid', 'operators', 'station', req.body.station]), function(err, rows) {
					rows.forEach(function(row){
						if (connections[row['oid']]) {
							connections[row['oid']].sendText(JSON.stringify({
								"action": "locify",
								"lid": result.insertId
							}));
						}
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
		db.query(mysql.format("SELECT * FROM ?? WHERE ?? = ?", ['operators', 'email', req.body.email]), function(err, rows) {
			if (err) {
				log(err);
				res.status(500).send('Server error');
				return;
			}
			if (rows.length === 1 && bcrypt.compareSync(req.body.password, rows[0]['password'])) {
				if (!tokens.operators[rows[0]['oid']]) {
					tokens.operators[rows[0]['oid']] = uuid.v4();
				}
				res.json({
					success: true,
					oid: rows[0]['oid'],
					token: tokens.operators[rows[0]['oid']]
				});
			} else {
				res.status(401).send('Unauthorized');
			}
		});
	} else {
		res.status(400).send('Bad request');
	}
});

app.post('/api/operator/register', function (req, res) {
	if (req.body.name && req.body.email && req.body.password && req.body.station && req.body.stationcode) {
		db.query(mysql.format("SELECT * FROM ?? WHERE ?? = ?", ['operators', 'email', req.body.email]), function(err, rows) {
			if (err) {
				log(err);
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
						log(err);
						res.status(500).send('Server error');
						return;
					}
					if (req.body.stationcode === rows[0]['stationcode']) {
						db.query("INSERT INTO operators SET ?", {
							'name': req.body.name, 
							'email': req.body.email, 
							'password': bcrypt.hashSync(req.body.password, 10),
							'station': req.body.station
						}, function (err, result) {
							if (err) {
								log(err);
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
						res.json({
							success: false,
							reason: "Stationcode does not match with station"
						});
					}
				});
			}
		});
	} else {
		res.status(400).send('Bad request');
	}
});

app.post('/api/operator/get/locifications', function (req, res) {
	if (req.body.oid && req.body.token){
		if (tokens.operators[req.body.oid] === req.body.token) {
			db.query(mysql.format("SELECT locifications.lid, locifications.uid, locifications.latitude, locifications.longitude, locifications.station, locifications.message, locifications.status, locifications.created_at, locifications.modified_at FROM locifications, operators WHERE ?? = ? AND ?? = ?? ORDER BY ?? DESC", ['operators.oid', req.body.oid, 'locifications.station', 'operators.station', 'created_at']), function(err, rows) {
				if (err) {
					log(err);
					res.status(500).send('Server error');
					return;
				}
				res.json(rows);
			});
		} else {
			res.status(401).send('Unauthorized');
		}
	} else {
		res.status(400).send('Bad request');
	}
});

app.post('/api/user/logout', function (req, res) {
	if (req.body.uid && tokens.operators[req.body.uid]) {
		delete tokens.operators[req.body.uid];
		res.json({
			success: true
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

var server = app.listen(8080, function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log('Locify server listening at http://%s:%s', host, port);
});