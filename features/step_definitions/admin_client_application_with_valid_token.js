var world = require('../support/world');
var request = require('request');
var assert = require('assert');
var async = require('async');
var fs = require('fs');
var config = require('../../config.json');
var dao = require('../../src/managers/dao.js');
var clone = require("clone");
var nock = require('nock');

var cryptoMng = require('../../src/managers/crypto')({ password : 'password' });

module.exports = function(){
    this.Given(/^admin client application with a valid access token$/, function (callback) {

        async.series([

            // User post
            function(done){

                world.getUser().id = 'a1b2c3d4e5f6';
                world.getUser().username = 'valid_user' + (config.allowedDomains[0] ? config.allowedDomains[0] : '');
                world.getUser().password = 'valid_password';
                world.getUser().role = 'admin';

                var userToCreate = clone(world.getUser());
                cryptoMng.encrypt(userToCreate.password, function(encryptedPwd) {
                    userToCreate.password = encryptedPwd;
                    dao.addUser()(userToCreate, function (err, createdUser) {
                        assert.equal(err, null);
                        assert.notEqual(createdUser, undefined);
                        done();
                    });
                });
            },

            //User login
            function(done){
                var options = {
                    url: 'http://localhost:'+config.public_port+'/auth/login',
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8',
                        'Authorization' : 'basic ' + new Buffer(config.management.clientId + ':' + config.management.clientSecret).toString('base64')
                    },
                    method:'POST',
                    body : JSON.stringify(world.getUser())
                };

                options.headers[config.version.header] = "test/1";

                nock('http://localhost:'+ config.private_port)
                    .post('/api/me/session')
                    .reply(204);

                request(options, function(err,res,body) {
                    assert.equal(err,null);
                    world.getResponse().statusCode = res.statusCode;
                    body = JSON.parse(body);
                    world.getResponse().body = body;
                    world.getTokens().accessToken = body.accessToken;
                    world.getTokens().refreshToken = body.refreshToken;
                    world.getTokens().expiresIn = body.expiresIn;
                    done();
                });
            }
        ],function(err){
            assert.equal(err,null);
            callback();
        });
    });
};
