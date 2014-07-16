"use strict";

var request = require("request");
var Handlebars = require('handlebars');
var fs = require('fs');
var source = fs.readFileSync(__dirname + "/template.xml").toString();
var template = Handlebars.compile(source);

var Podcast = {};

exports.getXML = function(sc_key, url, callback) {
	request('http://api.soundcloud.com/resolve.json?url=' + url + '&client_id=' + sc_key, function(err, res, body) {
		console.log(url);
		if (!err && res.statusCode == 200) {
			var resJson = JSON.parse(body);
			if (resJson.kind === "playlist") {
				Podcast.title = resJson.title;
				Podcast.website = resJson.permalink_url;
				Podcast.description = resJson.description;
				UserInfos(sc_key, resJson.user.id, function(infos) {
					Podcast.avatar = infos.avatar_url.replace('-large-', '-original-');
					Podcast.fullname = infos.full_name;
					Podcast.items = [];

					PopulateTracks(resJson.tracks, Podcast.items, function() {
						callback(template(Podcast))
					});


				});
			} else if (resJson.kind === "user") {
				Podcast.title = resJson.username;
				Podcast.website = resJson.website;
				Podcast.fullname = resJson.full_name;
				Podcast.description = resJson.description;
				Podcast.avatar = resJson.avatar_url.replace('-large-', '-original-');
				Podcast.items = [];

				request('http://api.soundcloud.com/users/' + resJson.id + '/tracks.json?client_id=' + sc_key, function(err, res, body) {
					if (!err && res.statusCode == 200) {
						PopulateTracks(JSON.parse(body), Podcast.items, function() {
							callback(template(Podcast));
						})
					} else {
						throw err;
					}
				});
			} else {
				callback('Please provide a set, a playlist or an user link.');
			}
		} else {
			callback("Not found");
		}
	});
}


function UserInfos(sc_key, soundcloudUser, callback) {
	request('http://api.soundcloud.com/users/' + soundcloudUser + '.json?client_id=' + sc_key, function(err, res, body) {
		if (!err && res.statusCode == 200) {
			callback(JSON.parse(body));
		}
	})
}

function PopulateTracks(sourceArray, destArray, callback) {
	sourceArray.forEach(function(track) {
		var artwork_url = track.artwork_url || "";
		destArray.push({
			"title": track.title,
			"description": track.description,
			"author": track.user.username,
			"artwork": artwork_url.replace('-large-', '-original-'),
			"file_url": "http://scurl.erambert.me/track/" + track.id + ".mp3",
			"length": track.original_content_size,
			"duration": millisecondsToTime(track.duration),
			"created_at": new Date(track.created_at).toUTCString(),
			"guid": track.id,
		});
	});
	callback();
}

function millisecondsToTime(milli) {
	var milliseconds = milli % 1000;
	var seconds = Math.floor((milli / 1000) % 60);
	var minutes = Math.floor((milli / (60 * 1000)) % 60);
	var hours = Math.floor((milli / (3600 * 1000)));

	return hours + ":" + minutes + ":" + seconds;
}