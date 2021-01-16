var _data = require('./data');
var helpers = require('./helpers');
var config = require ('./config');



var handlers={};

handlers.ping=function  (data,callback) {
    callback(200,);
    
};

handlers.notfound=function  (data,callback) {
    callback(404);
};

handlers.users= function(data,callback){
    var acceptablemehods =['post','get','put','delete'];
    if (acceptablemehods.indexOf(data.method)>-1){

        handlers._users[data.method](data,callback);
    }
    else{
        callback(405,{'error':'invalid method'});

    }


};

handlers._users={};
handlers._users.post=function(data,callback){

    console.log(data.payload.firstname);
    var firstname= typeof(data.payload.firstname)=='string'&& data.payload.firstname.trim().length>0?data.payload.firstname.trim():false;
    var lastname= typeof(data.payload.lastname)=='string'&& data.payload.lastname.trim().length>0?data.payload.lastname.trim():false;
    var phone= typeof(data.payload.phone)=='string'&& data.payload.phone.trim().length==11?data.payload.phone.trim():false;
    var password= typeof(data.payload.password)=='string'&& data.payload.password.trim().length>0?data.payload.password.trim():false;
    var aggerement= typeof(data.payload.aggerement)=='boolean'&& data.payload.aggerement==true?true:false;


    if (firstname&&lastname&&phone&&password&&aggerement){

        _data.read('user',phone,function(err,data){
            if(err){
                var hasedpassword = helpers.hash(password);
                if (hasedpassword){
                    var userobj = {
                        'firstname':firstname,
                        'lastname' :lastname,
                        'phone':phone,
                        'hasedpassword':hasedpassword,
                        'aggerement':true
                    };


                    _data.create('user',phone,userobj,function(err){
                        if (!err){
                        callback(200);    
                        }
                        else
                        {
                            callback(500,{'Error': 'couldnt create the user' });
                        }


                    });
                    




                }
                else{
                    callback(500,{'Error' : 'Could not hash the user\'s password.'});
                }



            }
            else
            {
                callback(400,{'Error' : 'A user with that phone number already exists'});
            }




        });


    }
    else {
        callback(400,{'Error' : 'Missing required fields',
        'hi':'ki',
        'firstname':firstname,
                        'lastname' :lastname,
                        'phone':phone,
                        'hasedpassword':password,
                        'aggerement':aggerement
        

    });
      }

    

}




handlers._users.get = function(data,callback){

// Check that phone number is valid
var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 11 ? data.queryStringObject.phone.trim() : false;
if(phone){

  // Get token from headers
  var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
  // Verify that the given token is valid for the phone number
  handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
    if(tokenIsValid){
      // Lookup the user
      _data.read('user',phone,function(err,data){
        if(!err && data){
          // Remove the hashed password from the user user object before returning it to the requester
          delete data.hashedPassword;
          callback(200,data);
        } else {
          callback(404);
        }
      });
    } else {
      callback(403,{"Error" : "Missing required token in header, or token is invalid."})
    }
  });
} else {
  callback(400,{'Error' : 'Missingg required field'})
}
};



  handlers._users.put = function(data,callback){
    /// required field
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 11 ? data.payload.phone.trim() : false;
  
    // Check feilsd to update
    var firstname = typeof(data.payload.firstname) == 'string' && data.payload.firstname.trim().length > 0 ? data.payload.firstname.trim() : false;
    var lastname = typeof(data.payload.lastname) == 'string' && data.payload.lastname.trim().length > 0 ? data.payload.lastname.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  
    //error phone if not
    if(phone){
      // Error if nothing is sent to update
      if(firstname || lastname || password){
       // Get token from headers
      var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

      // Verify that the given token is valid for the phone number
      handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
        if(tokenIsValid){

          // Lookup the user
          _data.read('user',phone,function(err,userData){
            if(!err && userData){
              // Update the fields if necessary
              if(firstname){
                userData.firstname = firstname;
              }
              if(lastname){
                userData.lastname = lastname;
              }
              if(password){
                userData.hasedpassword = helpers.hash(password);
              }
              // Store the new updates
              _data.update('user',phone,userData,function(err){
                if(!err){
                  callback(200);
                } else {
                  callback(500,{'Error' : 'Could not update the user.'});
                }
              });
            } else {
              callback(400,{'Error' : 'Specified user does not exist.'});
            }
          });
        } else {
          callback(403,{"Error" : "Missing required token in header, or token is invalid."});
        }
      });
      } else {
        callback(400,{'Error' : 'NO fields to update.'});
      }
    } else {
      callback(400,{'Error' : 'Missing  phone required field.'});
    }
  
  };




  handlers._users.delete = function(data,callback){
    // Check that phone number is valid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 11 ? data.queryStringObject.phone.trim() : false;
    if(phone){
      var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
      if(tokenIsValid){
        // Lookup the user
        _data.read('user',phone,function(err,userData){
          if(!err && userData){
            _data.delete('user',phone,function(err){
              if(!err){
                
                  // Delete each of the checks associated with the user
                  var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                  var checksToDelete = userChecks.length;
                  if(checksToDelete > 0){
                    var checksDeleted = 0;
                    var deletionErrors = false;
                    // Loop through the checks
                    userChecks.forEach(function(checkId){
                      // Delete the check
                      _data.delete('checks',checkId,function(err){
                        if(err){
                          deletionErrors = true;
                        }
                        checksDeleted++;
                        if(checksDeleted == checksToDelete){
                          if(!deletionErrors){
                            callback(200);
                          } else {
                            callback(500,{'Error' : "Errors encountered while attempting to delete all of the user's checks. All checks may not have been deleted from the system successfully."})
                          }
                        }
                      });
                    });
                  } else {
                    callback(200);
                  }
                





                
              } else {
                callback(500,{'Error' : 'Could not delete the specified user'});
              }
            });
          } else {
            callback(400,{'Error' : 'Could not find the specified user.'});
          }
        });
      } else {
        callback(403,{"Error" : "Missing required token in header, or token is invalid."});
      }
    });
    } else {
      callback(400,{'Error' : 'Missing required field'})
    }
  };
  







// Tokens
handlers.tokens = function(data,callback){
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
      handlers._tokens[data.method](data,callback);
    } else {
      callback(405);
    }
  };
  
  // Container for all the tokens methods
  handlers._tokens  = {};
  
  // Tokens - post
  // Required data: phone, password
  // Optional data: none
  handlers._tokens.post = function(data,callback){
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 11 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    if(phone && password){
      // Lookup the user who matches that phone number
      _data.read('user',phone,function(err,userData){
        if(!err && userData){
          // Hash the sent password, and compare it to the password stored in the user object
          var hasedpassword = helpers.hash(password);
          if(hasedpassword == userData.hasedpassword){
            // If valid, create a new token with a random name. Set an expiration date 1 hour in the future.
            var tokenId = helpers.createRandomString(20);
            var expires = Date.now() + 1000 * 60 * 60;
            var tokenObject = {
              'phone' : phone,
              'id' : tokenId,
              'expires' : expires
            };
  
            // Store the token
            _data.create('tokens',tokenId,tokenObject,function(err){
              if(!err){
                callback(200,tokenObject);
              } else {
                callback(500,{'Error' : 'Could not create the new token'});
              }
            });
          } else {
            callback(400,{'Error' : 'Password did not match the specified user\'s stored password'});
          }
        } else {
          callback(400,{'Error' : 'Could not find the specified user.'});
        }
      });
    } else {
      callback(400,{'Error' : 'Missing required field(s).'})
    }
  };
  
  // Tokens - get
  // Required data: id
  // Optional data: none
  handlers._tokens.get = function(data,callback){
    // Check that id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
      // Lookup the token
      _data.read('tokens',id,function(err,tokenData){
        if(!err && tokenData){
          callback(200,tokenData);
        } else {
          callback(404,{'Error':'couldnt read'});
        }
      });
    } else {
      callback(400,{'Error' : 'Missing required field, or field invalid'})
    }
  };
  







  // Tokens - put
  // Required data: id, extend
  // Optional data: none
  handlers._tokens.put = function(data,callback){
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
    if(id && extend){
      // Lookup the existing token
      _data.read('tokens',id,function(err,tokenData){
        if(!err && tokenData){
          // Check to make sure the token isn't already expired
          if(tokenData.expires > Date.now()){
            // Set the expiration an hour from now
            tokenData.expires = Date.now() + 1000 * 60 * 60;
            // Store the new updates
            _data.update('tokens',id,tokenData,function(err){
              if(!err){
                callback(200);
              } else {
                callback(500,{'Error' : 'Could not update the token\'s expiration.'});
              }
            });
          } else {
            callback(400,{"Error" : "The token has already expired, and cannot be extended."});
          }
        } else {
          callback(400,{'Error' : 'Specified user does not exist.'});
        }
      });
    } else {
      callback(400,{"Error": "Missing required field(s) or field(s) are invalid."});
    }
  };
  

  
  
  // Tokens - delete
  // Required data: id
  // Optional data: none
  handlers._tokens.delete = function(data,callback){
    // Check that id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
      // Lookup the token
      _data.read('tokens',id,function(err,tokenData){
        if(!err && tokenData){
          // Delete the token
          _data.delete('tokens',id,function(err){
            if(!err){
              callback(200);
            } else {
              callback(500,{'Error' : 'Could not delete the specified token'});
            }
          });
        } else {
          callback(400,{'Error' : 'Could not find the specified token.'});
        }
      });
    } else {
      callback(400,{'Error' : 'Missing required field'})
    }
  };
  








  // Verify if a given token id is currently valid for a given user
  handlers._tokens.verifyToken = function(id,phone,callback){
    // Lookup the token
    _data.read('tokens',id,function(err,tokenData){
      if(!err && tokenData){
        // Check that the token is for the given user and has not expired
        if(tokenData.phone == phone && tokenData.expires > Date.now()){
          callback(true);
        } else {
          callback(false);
        }
      } else {
        callback(false);
      }
    });
  };
  





 






//cheaks

// Checks
handlers.checks = function(data,callback){
  var acceptableMethods = ['post','get','put','delete'];
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._checks[data.method](data,callback);
  } else {
    callback(405);
  }
};

// Container for all the checks methods
handlers._checks  = {};


// Checks - post
// Required data: protocol,url,method,successCodes,timeoutSeconds, 
//tokenid in headers
// Optional data: none
handlers._checks.post = function(data,callback){
  // Validate inputs
  console.log("gft");
  var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  var successcodes = typeof(data.payload.successcodes) == 'object' && data.payload.successcodes instanceof Array && data.payload.successcodes.length > 0 ? data.payload.successcodes : false;
  var timeoutseconds = typeof(data.payload.timeoutseconds) == 'number' && data.payload.timeoutseconds % 1 === 0 && data.payload.timeoutseconds >= 1 && data.payload.timeoutseconds <= 5 ? data.payload.timeoutseconds : false;
  if(protocol && url && method && successcodes && timeoutseconds){

    // Get token from headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    
    console.log(typeof(data.headers.token));


    // Lookup the user phone by reading the token
    _data.read('tokens',token,function(err,tokendata){
      if(!err && tokendata){
        var userphone = tokendata.phone;

        // Lookup the user data
        _data.read('user',userphone,function(err,userdata){
          if(!err && userdata){
            var userchecks = typeof(userdata.checks) == 'object' && userdata.checks instanceof Array ? userdata.checks : [];
            // Verify that user has less than the number of max-checks per user
            if(userchecks.length < config.maxchecks){
              // Create random id for check
              var checkid = helpers.createRandomString(20);

              // Create check object including userPhone
              var checkobject = {
                'id' : checkid,
                'userphone' : userphone,
                'protocol' : protocol,
                'url' : url,
                'method' : method,
                'successcodes' : successcodes,
                'timeoutseconds' : timeoutseconds
              };

              // Save the object
              _data.create('checks',checkid,checkobject,function(err){
                if(!err){
                  // Add check id to the user's object
                  userdata.checks = userchecks;
                  userdata.checks.push(checkid);

                  console.log({"checkdataf":userdata})

                  // Save the new user data
                  _data.update('user',userphone,userdata,function(err){
                    if(!err){
                      // Return the data about the new check
                      callback(200,checkobject);
                    } else {
                      callback(500,{'Error' : 'Could not update the user with the new check.'});
                    }
                  });
                } else {
                  callback(500,{'Error' : 'Could not create the new check'});
                }
              });



            } else {
              callback(400,{'Error' : 'The user already has the maximum number of checks ('+config.maxchecks+').'})
            }


          } else {
            callback(403,{'Error' : 'The user'});
          }
        });


      } else {
        callback(403,{'Error' : 'The userty'});
      }
    });
  } else {
    

    callback(400,{'Error' : 'Missing required inputs, or inputs are invalid','feilds':data});
  }
};






// Checks - get
// Required data: id?BLABLABAL...... CHECKID
// token in headers.... 
// Optional data: none
handlers._checks.get = function(data,callback){

  

  
  // Check that id is valid
  console.log("get");
  var checkid = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(checkid){
    // Lookup the check
   // console.log (checkid);
    _data.read('checks',checkid,function(err,checkData){
      if(!err && checkData){
        // Get the token that sent the request
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid and belongs to the user who created the check
        console.log("This is check data",checkData);
        handlers._tokens.verifyToken(token,checkData.userphone,function(tokenIsValid){
          console.log(token);
          console.log(tokenIsValid);
          console.checkData
          
          if(tokenIsValid){
            // Return check data
            callback(200,checkData);
          } else {
            callback(403);
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field, or field invalid'})
  }
};







// Checks - put
// Required data: id
// Optional data: protocol,url,method,successCodes,timeoutSeconds (one must be sent)
handlers._checks.put = function(data,callback){
  // Check for required field
  var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

  // Check for optional fields
  var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  // Error if id is invalid
  if(id){
    // Error if nothing is sent to update
    if(protocol || url || method || successCodes || timeoutSeconds){
      // Lookup the check
      _data.read('checks',id,function(err,checkData){
        if(!err && checkData){
          // Get the token that sent the request
          var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
          // Verify that the given token is valid and belongs to the user who created the check
          handlers._tokens.verifyToken(token,checkData.userphone,function(tokenIsValid){
            if(tokenIsValid){
              // Update check data where necessary
              if(protocol){
                checkData.protocol = protocol;
              }
              if(url){
                checkData.url = url;
              }
              if(method){
                checkData.method = method;
              }
              if(successCodes){
                checkData.successCodes = successCodes;
              }
              if(timeoutSeconds){
                checkData.timeoutSeconds = timeoutSeconds;
              }

              // Store the new updates
              _data.update('checks',id,checkData,function(err){
                if(!err){
                  callback(200);
                } else {
                  callback(500,{'Error' : 'Could not update the check.'});
                }
              });
            } else {
              callback(403);
            }
          });
        } else {
          callback(400,{'Error' : 'Check ID did not exist.'});
        }
      });
    } else {
      callback(400,{'Error' : 'Missing fields to update.'});
    }
  } else {
    callback(400,{'Error' : 'Missing required field.'});
  }
};


// Checks - delete
// Required data: id
// Optional data: none
handlers._checks.delete = function(data,callback){
  // Check that id is valid
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
    // Lookup the check
    _data.read('checks',id,function(err,checkdata){
      if(!err && checkdata){
        // Get the token that sent the request
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid and belongs to the user who created the check
        console.log({"token to validate":token});

        handlers._tokens.verifyToken(token,checkdata.userphone,function(tokenIsValid){
          if(tokenIsValid){

            // Delete the check data
            _data.delete('checks',id,function(err){
              if(!err){
                // Lookup the user's object to get all their checks
                _data.read('user',checkdata.userphone,function(err,userdata){
                  if(!err){
                    var userchecks = typeof(userdata.checks) == 'object' && userdata.checks instanceof Array ? userdata.checks : [];

                    // Remove the deleted check from their list of checks
                    var checkposition = userchecks.indexOf(id);
                    if(checkposition > -1){
                      userchecks.splice(checkposition,1);
                      // Re-save the user's data
                      userdata.checks = userchecks;
                      _data.update('user',checkdata.userphone,userdata,function(err){
                        if(!err){
                          callback(200);
                        } else {
                          callback(500,{'Error' : 'Could not update the user.'});
                        }
                      });
                    } else {
                      callback(500,{"Error" : "Could not find the check on the user's object, so could not remove it."});
                    }
                  } else {
                    callback(500,{"Error" : "Could not find the user who created the check, so could not remove the check from the list of checks on their user object."});
                  }
                });
              } else {
                callback(500,{"Error" : "Could not delete the check data."})
              }
            });
          } else {
            callback(403);
          }
        });
      } else {
        callback(400,{"Error" : "The check ID specified could not be found"});
      }
    });
  } else {
    callback(400,{"Error" : "Missing valid id"});
  }
};

  



module.exports=handlers;