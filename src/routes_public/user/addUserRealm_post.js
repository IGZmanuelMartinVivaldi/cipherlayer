'use strict';

const userMng = require('../../managers/user');
const _ = require('lodash');

module.exports = function (req, res, next) {
	const name = req.body.name;

	if (_.isEmpty(name)) {
		res.send(400, {
			err: 'BadRequestError',
			des: 'Missing name in request body'
		});
		return next();
	}

	userMng().addRealmToUser(req.user._id, name, function (err) {
		if (err) {
			if (!err.code) {
				res.send(500, err);
				return next(err);
			}

			const errCode = err.code;
			delete(err.code);
			res.send(errCode, err);
			return next(err);
		}

		res.send(204);
		return next();
	});
};
