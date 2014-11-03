var restify = require('restify');
var ciphertoken = require('ciphertoken');
var userDao = require('./dao');

var server = null;
var cToken = null;
var accessTokenExpiration = 0;

function start(port, cbk){
    server = restify.createServer({
        name: 'test-server'
    });

    server.use(restify.bodyParser());

    server.post('/auth/login',function(req,res,next){
        var tokens = {
            accessToken : cToken.createAccessToken(req.body.username),
            refreshToken : cToken.createAccessToken(req.body.username),
            expiresIn : accessTokenExpiration * 60
        };
        res.send(200,tokens);
        return next();
    });

    server.post('/user', function(req,res,next){
        userDao.addUser(req.body.username,req.body.password,function(err,createdUser){
            if(err){
                res.send(409,{err:err.message});
            } else {
                res.send(201,createdUser);
            }
            return next();
        });
    });

    server.listen(port, function () {
        cbk();
    });
}

function stop(cbk){
    server.close(function(){
        cbk();
    });
}

function setCryptoKeys(cipherKey, signKey, expiration){
    accessTokenExpiration = expiration;
    cToken = ciphertoken.create(cipherKey,signKey, {
        accessTokenExpirationMinutes: accessTokenExpiration
    });

}

module.exports = {
    start : start,
    stop : stop,
    setCryptoKeys : setCryptoKeys
};