var debug = require('debug')('cipherlayer:routes:auth');
var userDao = require('../dao');
var tokenManager = require('../managers/token');
var config = JSON.parse(require('fs').readFileSync('config.json','utf8'));

function postAuthLogin(req,res,next){
    userDao.getFromUsernamePassword(req.body.username, req.body.password,function(err,foundUser){
        if(err) {
            res.send(409,{err: err.message});
            return next(false);
        } else {
            tokenManager.createBothTokens(foundUser._id, function(err, tokens){
                if(err) {
                    res.send(409,{err: err.message});
                } else {
                    tokens.expiresIn = config.accessToken.expiration;
                    res.send(200,tokens);
                }
                next(false);
            });
        }
    });
}

function postAuthUser(req,res,next){
    var user = {
        id:req.body.id,
        username:req.body.username,
        password:req.body.password
    };

    if(req.body.platforms){
        user.platforms = req.body.platforms;
    }

    userDao.addUser(user,function(err,createdUser){
        if(err){
            res.send(409,{err:err.message});
        } else {
            var responseUser = {
                username: createdUser.username
            };
            res.send(201,responseUser);
        }
        return next(false);
    });
}

function delAuthUser(req,res,next){
    userDao.deleteAllUsers(function(err){
        if(err){
            res.send(500,{err:err.message});
        } else {
            res.send(204);
        }
        return next(false);
    });
}

function addRoutes(service) {
    service.post('/auth/login', postAuthLogin);
    service.post('/auth/user', postAuthUser);
    service.del('/auth/user', delAuthUser);

    debug('Auth routes added');
}

module.exports = addRoutes;