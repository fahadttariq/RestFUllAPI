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
    console.log({"sms error":err})

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
// If the request is within the public directory use to the public handler instead
chosehandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chosehandler;


var data= {
    'trimedpath': trimmedPath,
    'queryStringObject': queryobj,
    'method': method,
    'headers': headerobj,
    'payload': helpers.parseJsonToObject( buffer)
    
};



chosehandler(data,function(statusCode,payload,contentType){

    // Determine the type of response (fallback to JSON)
    contentType = typeof(contentType) == 'string' ? contentType : 'json';
    console.log(contentType);


    // Use the status code returned from the handler, or set the default status code to 200
    statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
    console.log(statusCode);

    // Return the response parts that are content-type specific
    var payloadString = '';
    if(contentType == 'json'){
      res.setHeader('Content-Type', 'application/json');
      payload = typeof(payload) == 'object'? payload : {};
      payloadString = JSON.stringify(payload);
    }

    if(contentType == 'html'){
      res.setHeader('Content-Type', 'text/html');
      payloadString = typeof(payload) == 'string'? payload : '';
    }


    if(contentType == 'favicon'){
      res.setHeader('Content-Type', 'image/x-icon');
      payloadString = typeof(payload) !== 'undefined' ? payload : '';
    }

    if(contentType == 'plain'){
      res.setHeader('Content-Type', 'text/plain');
      payloadString = typeof(payload) !== 'undefined' ? payload : '';
    }

    if(contentType == 'css'){
      res.setHeader('Content-Type', 'text/css');
      payloadString = typeof(payload) !== 'undefined' ? payload : '';
    }

    if(contentType == 'png'){
      res.setHeader('Content-Type', 'image/png');
      payloadString = typeof(payload) !== 'undefined' ? payload : '';
    }

    if(contentType == 'jpg'){
      res.setHeader('Content-Type', 'image/jpeg');
      payloadString = typeof(payload) !== 'undefined' ? payload : '';
    }








    // Return the response-parts common to all content-types
    res.writeHead(statusCode);
    res.end(payloadString);

    // If the response is 200, print green, otherwise print red
    if(statusCode == 200){
      console.log('\x1b[32m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+''+statusCode);
    } else {
      console.log('\x1b[31m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+''+statusCode);
    }
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
    '' : handlers.index,
  
    'account/create' : handlers.accountCreate,
    'account/edit' : handlers.accountEdit,
  
    'account/deleted' : handlers.accountDeleted,
  
    'session/create' : handlers.sessionCreate,
  
    'session/deleted' : handlers.sessionDeleted,
  
    'checks/all' : handlers.checksList,
  
    'checks/create' : handlers.checksCreate,
  
    'checks/edit' : handlers.checksEdit,

    'ping' : handlers.ping,
    'api/users': handlers.users,
    'api/tokens': handlers.tokens,
    "api/checks":handlers.checks,
    "favicon.ico":handlers.favicon,
    "public":handlers.public
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
