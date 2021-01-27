var server = require ('./lib/server');
//var workers = require('./lib/worker');
var workers = require('./lib/ww');
var cli = require('./lib/cli');


app ={};
app.init=function(){
    server.init();


   //workers.init();

   workers.init();


     // Start the CLI, but make sure it starts last
  setTimeout(function(){
    cli.init();
  },1000*5);


};



app.init();

module.exports=app;

