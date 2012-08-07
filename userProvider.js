UserProvider = function(host, port) {
  this.db= new Db('IRCLogin', new Server(host, port, {auto_reconnect: true}, {}));
  this.db.open(function(){});
};


UserProvider.prototype.getCollection= function(callback) {
  this.db.collection('users', function(error, user_collection) {
    if( error ) callback(error);
    else callback(null, user_collection);
  });
};

UserProvider.prototype.findAll = function(callback) {
    this.getCollection(function(error, user_collection) {
      if( error ) callback(error)
      else {
        user_collection.find().toArray(function(error, results) {
          if( error ) callback(error)
          else callback(null, results)
        });
      }
    });
};

UserProvider.prototype.findAllLoggedIn = function(callback) {
    this.getCollection(function(error, user_collection) {
      if( error ) callback(error)
      else {
        user_collection.find({loggedIn:"true"}).toArray(function(error, results) {
          if( error ) callback(error)
          else callback(null, results)
        });
      }
    });
};


UserProvider.prototype.findByUsername = function(username, callback) {
    this.getCollection(function(error, user_collection) {
      if( error ) callback(error)
      else {
        user_collection.findOne({email: username}, function(error, result) {
          if( error ) callback(error)
          else callback(null, result)
        });
      }
    });
};

UserProvider.prototype.loggedIn = function(username) {
	this.getCollection(function(error, user_collection) {
        user_collection.update({email:username},{$set:{loggedIn:"true"}});
    });
}

UserProvider.prototype.loggedOut = function(username) {
	this.getCollection(function(error, user_collection) {
        user_collection.update({email:username},{$set:{loggedIn:"false"}});
    });
}

UserProvider.prototype.save = function(users, callback) {
    this.getCollection(function(error, user_collection) {
      if( error ) callback(error)
      else {
        if( typeof(users.length)=="undefined")
          users = [users];

        for( var i =0;i< users.length;i++ ) {
          user = users[i];
          user.created_at = new Date();
          if( user.comments === undefined ) user.comments = [];
          for(var j =0;j< user.comments.length; j++) {
            user.comments[j].created_at = new Date();
          }
        }

        user_collection.insert(users, function() {
          callback(null, users);
        });
      }
    });
};

exports.UserProvider = UserProvider;