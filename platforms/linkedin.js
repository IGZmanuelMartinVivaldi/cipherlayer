var userDao = require('../dao');
var tokenManager = require('../managers/token');
var countrycodes = require('../countrycodes');

var userDao = require('./dao');

var config = JSON.parse(require('fs').readFileSync('./config.json','utf8'));

// PASSPORT
var LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
var linkedInStrategy = new LinkedInStrategy({
    clientID: config.linkedin.consumerKey,
    clientSecret: config.linkedin.consumerSecret,
    callbackURL: config.linkedin.callbackURL,
    scope: config.linkedin.scope,
    passReqToCallback: true
}, function(req, accessToken, refreshToken, profile, done) {
    var data = {
        accessToken:accessToken,
        refreshToken:refreshToken,
        profile:profile
    };
    done(null, data);
});

function linkedInCallback(req, res, next){
    var data = req.user;
    var profile = data.profile;
    userDao.getFromUsername(profile._json.emailAddress, function(err, foundUser){
        if(err){
            if(err.message == userDao.ERROR_USER_NOT_FOUND){
                var inData = {
                    accessToken:data.accessToken,
                    refreshToken:data.refreshToken
                };
                tokenManager.createAccessToken(profile.id, inData, function(err, token){
                    countrycodes.countryFromPhone(profile._json.mobile_phone, function(err, country){
                        var returnProfile = {
                            name: profile._json.formattedName,
                            email: profile._json.emailAddress,
                            in: token
                        };

                        if(!err){
                            returnProfile.country = country['ISO3166-1-Alpha-2'];
                            returnProfile.phone = profile._json.mobile_phone.replace('+'+country.Dial,'');
                        }

                        res.send(203, returnProfile);
                        next(false);
                    });
                });
            } else {
                res.send(500, {err:'internal_error', des:'There was an internal error matching linkedin profile'});
                next(false);
            }
        } else {
            tokenManager.createBothTokens(foundUser.username, function(err, tokens){
                if(err) {
                    res.send(409,{err: err.message});
                } else {
                    tokens.expiresIn = config.accessToken.expiration * 60;
                    res.send(200,tokens);
                }
                next(false);
            });
        }
        next(false);
    });
}

function addUserPlatform(req, res, next){
    var data = req.user;
    var profile = data.profile;

    userDao.getFromUsername(profile._json.emailAddress, function(err, foundUser){
        if(err){
            if(err.message == userDao.ERROR_USER_NOT_FOUND){
                res.send(500, {err:'internal_error', des:'User not found'});
                next(false);
            } else {
                res.send(500, {err:'internal_error', des:'There was an internal error matching linkedin profile'});
                next(false);
            }
        } else {
            var updatedPlatforms = [];
            var platforms = profile.platforms;
            var platformExists = false;

            if(foundUser.platforms && foundUser.platforms.length>0){
                platforms.forEach(function(platform){
                    if(platform.platform == 'in'){
                        platform.accessToken = data.accessToken;
                        platform.refreshToken = data.refreshToken;
                        platform.expiry = config.accessToken.expiration * 60;
                        platformExists = true;
                    }
                    updatedPlatforms.push(platform);
                });
            }

            if(!platformExists){
                var linkedInPlatform = {
                    platform : 'in',
                    accessToken : data.accessToken,
                    refreshToken : data.refreshToken,
                    expiry : config.accessToken.expiration * 60
                };
                updatedPlatforms.push(linkedInPlatform);
            }

            userDao.updateById(foundUser.id.toString(), {$set: {platforms: updatedPlatforms} }, function(err, updatedUsers){
                if(err){
                    res.send(500, {err:'internal_error', des:'Error updating the user'});
                    return next(false);
                } else {
                    if(updatedUsers != 1){
                        res.send(500, {err:'internal_error', des:'Error updating the user'});
                        return next(false);
                    }
                    res.send(204);
                    return next(false);
                }
            });
        }
    });
}

function addRoutes(server, passport){
    passport.use(linkedInStrategy);
    server.get('/auth/in', passport.authenticate('linkedin', { state: ((yourDateObject.getTime() * 10000) + 621355968000000000) }));
    server.post('/auth/in', addUserPlatform);
    server.get('/auth/in/callback', passport.authenticate('linkedin', { failureRedirect: '/auth/error', session: false} ), linkedInCallback);
}

module.exports = addRoutes;