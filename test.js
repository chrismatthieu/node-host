var http = require('http');
var urlParse = require('url').parse;
var config = require('./config');
var sandbox = require('./sandbox');

var boxes = {};

var server = http.createServer(function (req, res) {
    if(req.connection.remoteAddress != "127.0.0.1") {res.writeHead(400, {"Connection":"close"}); return res.end();}
    console.log("connect", req.headers.host);
    //res.writeHead(200, {"Content-type": "text/plain"});
    if(req.headers.host == config.testHost) {
	res.writeHead(200, {"Content-type": "text/plain"});
	var data="";
	req.on('data', function(d) {
	    data += d.toString('ascii', 0);
	});
	req.on('end', function () {
	    var urlInfo = urlParse(req.url, true);
	    console.log(data, urlInfo.query.user, urlInfo.query.app);
	    if(urlInfo.query.key != config.testSKey) {
		res.write("This test server has expired");
		res.end();
		return;
	    }
	    sandbox.build(data, urlInfo.query.user, function (d) {
		var name;
		do {
		    name = config.testBase.replace(/\#\#/g, Math.random().toString().substring(2,12));
		}while(boxes[name] && config.testDoNotOverwrite);
		boxes[name] = new sandbox.SandBox(d, {test: true, user: urlInfo.query.user || null, app: urlInfo.query.app || null});
		if(config.testDoNotOverwrite) // if overwritable, then no need to keep clean
		    setTimeout(function () {
			boxes[name] =null;
		    }, config.testTimeToLive);
		res.write("http://"+name /* + ":8000" for testing */);
		if(boxes[name].error) res.write("\nerror\n");
		res.end();
	    });
	});
    }else{
	if(boxes[req.headers.host]) {
	    boxes[req.headers.host].server(req, res);
	}else{
	    res.writeHead(503, {"Content-type": "text/html"});
	    res.write("This test server has expired");
	    res.end();
	}
    }
});

setInterval(function () {
    console.log(config.checkOkCode);
}, config.sendOkInterval);

server.listen(config.testPort);
