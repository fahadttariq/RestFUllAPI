var server = require ('./lib/server');
var workers = require('./lib/worker');
var ww = require('./lib/ww');


app ={};
app.init=function(){
    server.init();


   //workers.init();

   ww.init();






};



app.init();

module.exports=app;

