var path = require('path');
var fs = require('fs');
var _data = require('./data');
var https = require('https');
var http = require('http');
var helpers = require('./helpers');
var url = require('url');

var workers={};




workers.gatherAllChecks = function(){
    // Get all the checks
    _data.list('checks',function(err,checks){
      if(!err && checks && checks.length > 0){
        checks.forEach(function(check){
          // Read in the check data
          _data.read('checks',check,function(err,originalCheckData){
            if(!err && originalCheckData){
              // Pass it to the check validator, and let that function continue the function or log the error(s) as needed
              console.log (originalCheckData);
              workers.validateCheckData(originalCheckData);
            } else {
              console.log("Error reading one of the check's data: ",err);
            }
          });
        });
      } else {
        console.log('Error: Could not find any checks to process');
      }
    });
  
  
  };



workers.validateCheckData=function(originalCheckData){


  console.log (originalCheckData);


    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userphone = typeof(originalCheckData.userphone) == 'string' && originalCheckData.userphone.trim().length == 11 ? originalCheckData.userphone.trim() : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http','https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' &&  ['post','get','put','delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successcodes = typeof(originalCheckData.successcodes) == 'object' && originalCheckData.successcodes instanceof Array && originalCheckData.successcodes.length > 0 ? originalCheckData.successcodes : false;
    originalCheckData.timeoutseconds = typeof(originalCheckData.timeoutseconds) == 'number' && originalCheckData.timeoutseconds % 1 === 0 && originalCheckData.timeoutseconds >= 1 && originalCheckData.timeoutseconds <= 5 ? originalCheckData.timeoutseconds : false;
    // Set the keys that may not be set (if the workers have never seen this check before)
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up','down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;




    if (originalCheckData.id &&
      originalCheckData.userphone&&
      originalCheckData.protocol&&
      originalCheckData.url&&
      originalCheckData.method&&
      originalCheckData.successcodes&&
      originalCheckData.timeoutseconds
      ){
        workers.performCheck(originalCheckData);

      }


      else
      {
        console.log("one of the the check is not formated ,skipping it",originalCheckData);
      }
  
};



workers.performCheck= function(originalCheckData){
  var checkOutcome={
    'error':false,
    'responseCode': false
  }

  var outcomeSent = false;
  var parsedUrl = url.parse(originalCheckData.protocol+'://'+originalCheckData.url, true);

  var hostName = parsedUrl.hostname;
  var path = parsedUrl.path;
  var t4emp;


  var requestDetails={
    'protocol': originalCheckData.protocol+':',
    'hostName':hostName,
    'method':originalCheckData.method.toUpperCase(),
    'path':path,
    'timeout':originalCheckData.timeoutseconds*1000


  };

  console.log(requestDetails);
  var h;
  // Instantiate the request object (using either the http or https module)
  var _moduleToUse = originalCheckData.protocol == 'http' ? http : https;

;
  var req = _moduleToUse.request(requestDetails,function(res){
      // Grab the status of the sent request
      var status =  res.statusCode;
      h=res.statusCode;

      // Update the checkOutcome and pass the data along
      checkOutcome.responseCode = status;
      if(!outcomeSent){
        workers.processCheckOutcome(originalCheckData,checkOutcome);
        outcomeSent = true;
      }
  });
  var str;

  
  console.log('hhhhhh',h);

  // Bind to the error event so it doesn't get thrown
  req.on('error',function(e){
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {'error' : true, 'value' : e};
    if(!outcomeSent){
      workers.processCheckOutcome(originalCheckData,checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the timeout event
  req.on('timeout',function(){
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {'error' : true, 'value' : 'timeout'};
    if(!outcomeSent){
      workers.processCheckOutcome(originalCheckData,checkOutcome);
      outcomeSent = true;
    }
  });


  req.on('end', function () {
    console.log("str",h);
  });






  req.end();

};






// Process the check outcome, update the check data as needed, trigger an alert if needed
// Special logic for accomodating a check that has never been tested before (don't alert on that one)
workers.processCheckOutcome = function(originalCheckData,checkOutcome){

  console.log("ddd",checkOutcome.responseCode);


  // Decide if the check is considered up or down
  var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successcodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

  // Decide if an alert is warranted
  var alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

  // Update the check data
  var newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();

  // Save the updates
  _data.update('checks',newCheckData.id,newCheckData,function(err){
    if(!err){
      // Send the new check data to the next phase in the process if needed
      if(alertWarranted){
        workers.alertUserToStatusChange(newCheckData);
      } else {
        console.log("Check outcome has not changed, no alert needed");
      }
    } else {
      console.log("Error trying to save updates to one of the checks");
    }
  });
};





  // Alert the user as to a change in their check status
  workers.alertUserToStatusChange = function(newCheckData){
    var msg = 'Alert: Your check for '+newCheckData.method.toUpperCase()+' '+newCheckData.protocol+'://'+newCheckData.url+' is currently '+newCheckData.state;
    helpers.sendTwilioSms(newCheckData.userphone,msg,function(err){
      if(!err){
        console.log("Success: User was alerted to a status change in their check, via sms: ",msg);
      } else {
        console.log("Error: Could not send sms alert to user who had a state change in their check",msg);
      }
    });
  };
  






workers.loop = function(){
  setInterval(function(){
    workers.gatherAllChecks();
  },1000 * 60);
};





workers.init= function(){
    workers.gatherAllChecks();



    workers.loop();





};




module.exports= workers;