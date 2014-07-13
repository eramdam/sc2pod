var http = require('http'),
    request = require('request'),
    url = require('url');

function stripTrailingSlash(str) {
    if(str.substr(-1) == '/') {
        return str.substr(0, str.length - 1);
    }
    return str;
}

http.createServer(function (req, res) {
  var trackId = url.parse(req.url).path.split("/").pop().split(".").shift();
  var UA = req.headers["user-agent"];
  var regex = "Mozilla|HTML|Gecko|Firefox";
  var proxyOut = res;

  console.log(JSON.stringify(req.headers["user-agent"]));
  if (!(new RegExp(regex).test(UA))) {
    request('http://api.soundcloud.com/tracks/'+trackId+'.json?client_id=026b5587c7f832772db1fdda382c7039', function(err, res, body) {
      if (!err && res.statusCode == 200) {
        var json = JSON.parse(body);

        if (!json.downloadable || UA.indexOf('iTunes/') === -1) {
          request("http://api.soundcloud.com/tracks/"+trackId+"/stream?client_id=026b5587c7f832772db1fdda382c7039").pipe(proxyOut);
          console.log("http://api.soundcloud.com/tracks/"+trackId+"/stream?client_id=026b5587c7f832772db1fdda382c7039");
        } else if (json.downloadable) {
          request("http://api.soundcloud.com/tracks/"+trackId+"/download?client_id=026b5587c7f832772db1fdda382c7039").pipe(proxyOut);
          console.log("http://api.soundcloud.com/tracks/"+trackId+"/download?client_id=026b5587c7f832772db1fdda382c7039");
        }
      }
    })
  	
  } else {
  	res.writeHead(403);
  	res.write("iTunes and likes are the only ones authorized!");
  	res.end();
  }
  // request("http://api.soundcloud.com/tracks/"+trackId+"/stream?client_id=026b5587c7f832772db1fdda382c7039").pipe(res);
}).listen(process.argv[2]);

console.log("Listening on http://localhost:"+process.argv[2]);