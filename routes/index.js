
/*
 * GET home page.
 */

exports.index = function(req, res){
  if (!req.session.email)
  	res.render('index', { title: 'HackerSchool Live Help' ,layout:false});
  else
  	res.redirect('/chat');
};

exports.home = function(req, res){
	res.render('home', {title: 'Welcome home!'})
}

exports.chat = function(req, res){
	res.render('chat', {title: 'Chat!'})
}

exports.newUser = function(req, res){
	res.render('newUser', {title: 'Register'})
}

