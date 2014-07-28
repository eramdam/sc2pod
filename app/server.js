"use strict";

var http = require('http');
var url = require('url');
var request = require('request');
var querystring = require('querystring');
var podXML = require('./podcast-xml.js');
var config;

try {
	config = JSON.parse(require('fs').readFileSync(__dirname + "/config.json"))
} catch (e) {
	throw e;
}


var server = http.createServer(function(req, res) {
	var proxyOut = res;
	proxyOut.setHeader('Access-Control-Allow-Origin', '*');
	proxyOut.setHeader('Access-Control-Request-Headers', 'x-requested-with, content-type, accept, origin, authorization, x-csrftoken');
	var REQURL = url.parse(req.url);
	if (REQURL.pathname == "/podcast" && querystring.parse(url.parse(req.url).query).url) {
		var SCURL = querystring.parse(url.parse(req.url).query).url;
		podXML.getXML(config.soundcloud_key, SCURL, function(XML) {
			res.write(XML);
			res.end();
			console.log("Returned XML for " + SCURL);
		});
	} else if (REQURL.pathname.indexOf("/track") != -1) {
		var trackId = url.parse(req.url).path.split("/").pop().split(".").shift();
		var UA = req.headers["user-agent"];
		var regex = "Mozilla|HTML|Gecko|Firefox";


		if (!(new RegExp(regex).test(UA))) {
			console.log(UA);
			request('http://api.soundcloud.com/tracks/' + trackId + '.json?client_id=' + config.soundcloud_key, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var json = JSON.parse(body);

					if (!json.downloadable || UA.indexOf('iTunes/') === -1) {
						request("http://api.soundcloud.com/tracks/" + trackId + "/stream?client_id=" + config.soundcloud_key).pipe(proxyOut);
						console.log("http://api.soundcloud.com/tracks/" + trackId + "/stream?client_id=" + config.soundcloud_key);
					} else if (json.downloadable) {
						request("http://api.soundcloud.com/tracks/" + trackId + "/download?client_id=" + config.soundcloud_key).pipe(proxyOut);
						console.log("http://api.soundcloud.com/tracks/" + trackId + "/download?client_id=" + config.soundcloud_key);
					}
				} else if (err) {
					throw err;
					proxyOut.end();
				}
			});

		} else {
			proxyOut.writeHead(403);
			proxyOut.write("iTunes and likes are the only ones authorized!");
			proxyOut.end();
		}
	} else if (REQURL.pathname == "/validate" && querystring.parse(url.parse(req.url).query).url) {
		var SCURL = querystring.parse(url.parse(req.url).query).url;
		request('http://api.soundcloud.com/resolve.json?url=' + SCURL + '&client_id=' + config.soundcloud_key, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				var resJson = JSON.parse(body);
				proxyOut.writeHead({"Content-Type": "application/json"});
				if (resJson.kind === "playlist" || resJson.kind === "user") {
					proxyOut.write(JSON.stringify({valid: true}));
					proxyOut.end();
				} else {
					proxyOut.write(JSON.stringify({valid: false}));
					proxyOut.end();
				}
			} else {
				proxyOut.write(JSON.stringify({valid: false}));
				proxyOut.end();
			}
		});
	} else {
		proxyOut.write("");
		proxyOut.end();
	}
}).listen(config.port);

console.log("Listening on port " + config.port);