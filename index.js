var http = require("http");
var url = require('url');



var server =http.createServer(function (req,res){
// Parse the url
var parsedUrl = url.parse(req.url, true);
// Get the path
var path = parsedUrl.pathname;
var trimmedPath = path.replace(/^\/+|\/+$/g, '');


var queryobj = parsedUrl.query;


var method = req.method.toLowerCase();

var headerobj = req.headers;

res.end("response end "   );



console.log('path: '+trimmedPath + "   method: "+method +"   Query parameter ",queryobj  );

console.log ("/n");

console.log ("header:  ",headerobj);

});

server.listen(3000,function(){

    console.log("listening port 3000");
});
