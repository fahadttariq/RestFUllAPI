var http = require("http");
var https = require("https");
var url = require('url');
var fs = require('fs');
var handlers= require('./handlers.js');
var path = require("path");



var Stringdecoder  = require('string_decoder').StringDecoder;
//var config= require("dotenv").config({path:"./config.js"});

//var config = require('./config.js');
var config = require('./config');
var _data = require ("./data");
const helpers = require("./helpers.js");







var server ={};


//send sms through twilio

helpers.sendTwilioSms("03354364678","hello",function(err){
    console.log({"this error":err})

});

server.httpsserveroptiion={

    'key': fs.readFileSync( path.join(__dirname,  '/../https/key.pem')),
  'cert': fs.readFileSync(path.join(__dirname,  '/../https/cert.pem'))
}

 
server.httpsserver =https.createServer(server.httpsserveroptiion,function (req,res){
    server.unifaiedserve(req,res);



});





server.httpserver =http.createServer(function (req,res){
    server.unifaiedserve(req,res);



});




server.unifaiedserve = function(req,res){
    // Parse the url
var parsedUrl = url.parse(req.url, true);
// Get the path
var path = parsedUrl.pathname;
var trimmedPath = path.replace(/^\/+|\/+$/g, '');

//get query like "?fizz=fitt"

var queryobj = parsedUrl.query;

//get method post or get 
var method = req.method.toLowerCase();

//header if any  from postman
var headerobj = req.headers;

//playload i.e body from postman if any
var decoder = new Stringdecoder('utf8');
var buffer = "";
req.on('data',function(data){

    buffer+= decoder.write(data);
}); 
req.on('end',function(){
    buffer+=decoder.end();
   // res.end("response ended "   );

//chose handler

 //Conditional (ternary) operator
//      condition ? exprIfTrue : exprIfFalse
//               if^        else^

var chosehandler =typeof(server.router[trimmedPath])!== 'undefined' ? server.router[trimmedPath]:handlers.notfound;


var data= {
    'trimedpath': trimmedPath,
    'queryStringObject': queryobj,
    'method': method,
    'headers': headerobj,
    'payload': helpers.parseJsonToObject( buffer)
    
};

chosehandler(data,function (statusCode,payload) {

    statusCode=typeof(statusCode)=='number'?statusCode:200;


    payload = typeof(payload)=='object'?payload:{};
    //console.log(typeof(payload));




    payloadstring =JSON.stringify(payload);


    res.setHeader("Content-Type","application/json");


    res.writeHead(statusCode);
    res.end(payloadstring);

    console.log("returning response ",statusCode,payloadstring);



    
});





//console.log('path: '+trimmedPath + "   method: "+method +"   Query parameter ",queryobj   );


//console.log(' Palyloads if any , buffer:   ',buffer)


});





//res.end("response end "   );



//console.log('path: '+trimmedPath + "   method: "+method +"   Query parameter ",queryobj  );

//console.log ("/n");

//console.log ("header:  ",headerobj);

};




// routiing the request






server. router ={
    'ping' : handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    "checks":handlers.checks
}





server.init= function(){
    server.httpsserver.listen(config.httpsPort,function(){

        console.log("listening port "+config.httpsPort+"    mode :"+config.envName+"");
    });
    
    
    server.httpserver.listen(config.httpPort,function(){
    
        console.log("listening port "+config.httpPort+"    mode :"+config.envName+"");
    });
    


}



module.exports= server;
