var server = require ('./lib/server');
//var workers = require('./lib/worker');
var workers = require('./lib/ww');


app ={};
app.init=function(){
    server.init();


   //workers.init();

   workers.init();

};



app.init();

module.exports=app;

