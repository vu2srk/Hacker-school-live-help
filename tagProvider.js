TagProvider = function(host, port) {
	this.db = new Db('IRCLogin', new Server(host, port, {
		auto_reconnect : true
	}, {}));
	this.db.open(function() {
	});
};

TagProvider.prototype.getCollection = function(callback) {
	this.db.collection('tags', function(error, tag_collection) {
		if (error)
			callback(error);
		else
			callback(null, tag_collection);
	});
};

TagProvider.prototype.findAll = function(callback) {
	this.getCollection(function(error, tag_collection) {
		if (error)
			callback(error)
		else {
			tag_collection.find().sort({
				created_at : -1
			}).toArray(function(error, results) {
				if (error)
					callback(error)
				else
					callback(null, results)
			});
		}
	});
};

exports.TagProvider = TagProvider;