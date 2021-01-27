var path = require('path');
var fs = require('fs');
var _data = require('./data');
var https = require('https');
var http = require('http');
var helpers = require('./helpers');
var url = require('url');
//var _logs = require('./logs');
var _logs = require('./logs');



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
        //      console.log (originalCheckData);
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


  //console.log (originalCheckData);


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
      
    'host':hostName,
    'method':originalCheckData.method.toUpperCase(),
    'path':path,
    'timeout':originalCheckData.timeoutseconds*1000


  };

//  console.log("Details",requestDetails);




 
 


  callback = function(response) {
 
    response.on('data', function (e) {
        checkOutcome.responseCode = response.statusCode;
        workers.processCheckOutcome(originalCheckData,checkOutcome);
      });
  
      


    response.on('end', function () {
     // console.log("respon",checkOutcome.responseCode);
    });
  }
  



  var req = http.request(requestDetails, callback);

  req.on('error',function(e){
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {'error' : true, 'value' : e};

      workers.processCheckOutcome(originalCheckData,checkOutcome);
    
    
  });







  req.on('timeout',function(){
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {'error' : true, 'value' : 'timeout'};
      workers.processCheckOutcome(originalCheckData,checkOutcome);
      
    
  });




  req.end();


 
};






// Process the check outcome, update the check data as needed, trigger an alert if needed
// Special logic for accomodating a check that has never been tested before (don't alert on that one)
workers.processCheckOutcome = function(originalCheckData,checkOutcome){

   // console.log("error: ",checkOutcome.error);

    //console.log("Response code: ",checkOutcome.responseCode);


  // Decide if the check is considered up or down
  var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successcodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';


  //console.log("sTATE:   ",state);





  // Decide if an alert is warranted
  var alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;
  var timeOfCheck = Date.now();
  workers.log(originalCheckData,checkOutcome,alertWarranted,timeOfCheck);
  //workers.log(originalCheckData,checkOutcome,state,alertWarranted,timeOfCheck);


  // Update the check data
  var newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = timeOfCheck;

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
  








// Send check data to a log file
workers.log = function(originalCheckData,checkOutcome,state,alertWarranted,timeOfCheck){
  // Form the log data
  var logData = {
    'check' : originalCheckData,
    'outcome' : checkOutcome,
    'state' : state,
    'alert' : alertWarranted,
    'time' : timeOfCheck
  };

  // Convert the data to a string
  var logString = JSON.stringify(logData);

  // Determine the name of the log file
  var logFileName = originalCheckData.id;

  // Append the log string to the file
  _logs.append(logFileName,logString,function(err){
    if(!err){
      console.log("Logging to file succeeded");
    } else {
      console.log("Logging to file failed");
    }
  });

};

// Timer to execute the worker-process once per minute
workers.loop = function(){
  setInterval(function(){
    workers.gatherAllChecks();
  },1000 * 60);
};

// Rotate (compress) the log files
workers.rotateLogs = function(){
  // List all the (non compressed) log files
  _logs.list(false,function(err,logs){
    if(!err && logs && logs.length > 0){
      logs.forEach(function(logName){
        // Compress the data to a different file
        var logId = logName.replace('.log','');
        var newFileId = logId+'-'+Date.now();
        _logs.compress(logId,newFileId,function(err){
          if(!err){
            // Truncate the log
            _logs.truncate(logId,function(err){
              if(!err){
                console.log("Success truncating logfile");
              } else {
                console.log("Error truncating logfile");
              }
            });
          } else {
            console.log("Error compressing one of the log files.",err);
          }
        });
      });
    } else {
      console.log('Error: Could not find any logs to rotate');
    }
  });
};

// Timer to execute the log-rotation process once per day
workers.logRotationLoop = function(){
  setInterval(function(){
    workers.rotateLogs();
  },1000 * 60 * 60 * 24);
}
 module.exports = workers;

// Init script
workers.init = function(){

  // Execute all the checks immediately
  workers.gatherAllChecks();

  // Call the loop so the checks will execute later on
  workers.loop();

  // Compress all the logs immediately
  workers.rotateLogs();

  // Call the compression loop so checks will execute later on
  workers.logRotationLoop();
};


 // Export the module



 