/*
 * Client-side JavaScript library to access Evrythng API
 * https://github.com/evrythng/evrythng-tools
 *
 * Copyright [2013] [EVRYTHNG Ltd. London / Zurich]
 *
 * Released under the http://www.apache.org/licenses/LICENSE-2.0
 * https://github.com/evrythng/evrythng-tools/blob/master/LICENSE.txt
 *
 */

Evrythng = function(options) {
	this.options = {};
	if (typeof options === 'object') {
		for (var i in options) {
			this.options[i] = options[i];
		}
	}
};


/*
	JSONP wrapper
*/
Evrythng.prototype.jsonp = function(url, callback) {
	if (typeof this.options.jQuery === 'function') {
		var promise = this.options.jQuery.getJSON(url);
		return (typeof callback === 'function') ? promise.then(callback) : promise;
	}
	else {
		return load.jsonp(url, callback);
	}
};


/*
	Facebook
*/
Evrythng.prototype.fbInit = function(callback) {
	var self = this;
	this.options.loginCallback = callback;
	window.fbAsyncInit = function() {
		self.fbAsyncInit.call(self);
	};
	if (typeof this.options.loadingCallback === 'function') this.options.loadingCallback.call(this, true);
	load.js('//connect.facebook.net/en_US/all.js', function() {
		if (typeof FB != 'object') {
			if (typeof self.options.loadingCallback === 'function') self.options.loadingCallback.call(self, false);
			if (window.console) console.log('It seems that Facebook is not available on your network.<br/>Please use another Internet connection');
		}
	});
};


Evrythng.prototype.fbAsyncInit = function() {
	var self = this,
		actionButton = self.options.actionButton ? document.getElementById(self.options.actionButton) : null;
	FB.init({appId: this.options.facebookAppId, status: true, cookie: true, xfbml: false, oauth: true});
	FB.getLoginStatus(function(response) {
		if (response.status === 'connected') {
			if (actionButton) {
				actionButton.onclick = function() {
					self.fbCallback.call(self, response);
				};
			}
			if (self.options.forceLogin) self.fbCallback.call(self, response);
		}
		else {
			if (actionButton) {
				actionButton.onclick = function() {
					self.fbLogin.call(self, self.fbCallback);
				};
			}
			if (self.options.forceLogin) self.fbLogin.call(self);
		}
	});
	if (typeof this.options.loadingCallback === 'function') this.options.loadingCallback.call(this, false);
};


Evrythng.prototype.fbLogin = function(callback) {
	var self = this;
	if (typeof this.options.loadingCallback === 'function') this.options.loadingCallback.call(this, true);
	FB.login(function(response) {
		if (!response.authResponse) {
			if (typeof self.options.loadingCallback === 'function') self.options.loadingCallback.call(self, false);
			if (window.console) console.log('FB User cancelled login or did not fully authorize');
		}
		if (typeof callback === 'function') callback.call(self, response);
	}, {scope: 'publish_actions,email,user_birthday,user_location'});
};


Evrythng.prototype.fbCallback = function(response) {
	var self = this;
	if (response.status === 'connected') {
		if (response.authResponse) {
			if (typeof this.options.loadingCallback === 'function') this.options.loadingCallback.call(this, true);
			FB.api('/me', function(fbUser) {
				if (!fbUser.name) {
					self.fbLogin.call(self, self.fbCallback);
				}
				else {
					var data = {
							'access': {
								'token': response.authResponse.accessToken
							}
						};
					self.query({
						url: '/auth/facebook',
						data: data,
						method: 'post'
					}, function(access) {
						if (access.evrythngApiKey) {
							if (typeof self.options.loginCallback === 'function') {
								self.options.loginCallback.call(self, access, fbUser);
								if (typeof self.options.loadingCallback === 'function') self.options.loadingCallback.call(self, false);
							}
						}
					});
				}
			});
		}
		else {
			if (window.console) console.log('Cannot login via Facebook');
		}
	}
	else {
		if (response.status === 'not_authorized') {
			if (typeof this.options.loadingCallback === 'function') this.options.loadingCallback.call(this, false);
			if (window.console) console.log('User is logged in to Facebook, but has not authenticated your app');
		}
		else {
			if (typeof this.options.loadingCallback === 'function') this.options.loadingCallback.call(this, false);
			if (window.console) console.log('User is not logged in to Facebook');
		}
		/*
		location.href = 'https://www.facebook.com/connect/uiserver.php?app_id=' 
		 + this.options.facebookAppId + '&method=permissions.request&display=page&next=' 
		 + location.protocol + '//' + location.host + location.pathname + location.search 
		 + '&response_type=token&fbconnect=1&perms=publish_actions,email,user_birthday,user_location';
		*/
	}
};


Evrythng.prototype.fbPost = function(options, callback) {
	var self = this;
	/*FB.ui({
		method: 'stream.publish',
		message: options.message,
		attachment: options.attachment,
		action_links: options.action_links,
		user_prompt_message: options.user_prompt_message
	},
	function(response) {
		if (window.console) console.log(response);
		if (response && response.post_id) {
			if (window.console) console.log('Post was published');
		}
		else {
			if (window.console) console.log('Post was not published');
		}
		if (typeof callback === 'function') {
			callback.call(self, response);
		}
	});*/
	//if (typeof this.options.loadingCallback === 'function') this.options.loadingCallback.call(this, true);
	var post = {
		message: options.message,
		picture: options.picture,
		link: options.link,
		name: options.name,
		description: options.description
	};
	if (options.tags) post.tags = options.tags;
	if (options.place) post.place = options.place;
	FB.api('/' + (options.user || 'me') + '/feed', 'post', post, function(data) {
		//if (typeof self.options.loadingCallback === 'function') self.options.loadingCallback.call(self, false);
		if (typeof callback === 'function') {
			callback.call(self, data);
		}
	});
};


Evrythng.prototype.fbFriends = function(options, callback) {
	var self = this;
	FB.api('/' + (options.user || 'me') + '/friends', function(response) {
		if (typeof callback === 'function' && response.data) {
			var friends = response.data;
			if (options && options.orderBy === 'name') {
				friends = response.data.sort(function(a, b) {
						var x = a.name.toLowerCase();
						var y = b.name.toLowerCase();
						return ((x < y) ? -1 : ((x > y) ? 1 : 0));
				})
			}
			callback.call(self, friends);
		}
	});
};


/*
	Checkin
*/
Evrythng.prototype.checkin = function(options, callback) {
	var self = this,
		query = {
			url: '/actions/checkins',
			data: {
				timestamp: new Date().getTime(),
				type: 'checkins',
				tags: options.tags,
				location: {
					latitude: options.defaultLocation ? options.defaultLocation.latitude : null,
					longitude: options.defaultLocation ? options.defaultLocation.longitude : null
				},
				locationSource: 'sensor'
			},
			method: 'post',
			params: {
				access_token: options.evrythngApiKey
			}
		},
		doCheckin = function() {
			self.query(query, function(response) {
				if (typeof self.options.loadingCallback === 'function') self.options.loadingCallback.call(self, false);
				if (typeof callback === 'function') {
					callback.call(self, response);
				}
			});
		};
	// is it a product checkin or a thng checkin?
	if (options.thng) {
		query.data.thng = options.thng;
	}
	else if (options.product) {
		query.data.product = options.product;
	}
	if (options.createThng) {
		query.params.createThng = options.createThng;
	}
	if (typeof this.options.loadingCallback === 'function') this.options.loadingCallback.call(this, true);
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
			query.data.location.latitude = position.coords.latitude;
			query.data.location.longitude = position.coords.longitude;
			doCheckin();
		}, function(error) {
			doCheckin();
		});
	}
	else {
		doCheckin();
	}
};


/*
	Scan
*/
Evrythng.prototype.scan = function(options, callback) {
	var self = this,
		query = {
			url: '/actions/scans',
			data: {
				thng: options.thng,
				timestamp: new Date().getTime(),
				type: 'scans',
				location: {
					latitude: options.defaultLocation ? options.defaultLocation.latitude : null,
					longitude: options.defaultLocation ? options.defaultLocation.longitude : null
				},
				locationSource: 'sensor'
			},
			method: 'post',
			params: {
				access_token: options.evrythngApiKey
			}
		},
		doScan = function() {
			self.query(query, function(response) {
				if (typeof self.options.loadingCallback === 'function') self.options.loadingCallback.call(self, false);
				if (typeof callback === 'function') {
					callback.call(self, response);
				}
			});
		};
	if (typeof this.options.loadingCallback === 'function') this.options.loadingCallback.call(this, true);
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
			data.location.latitude = position.coords.latitude;
			data.location.longitude = position.coords.longitude;
			doScan();
		}, function(error) {
			doScan();
		});
	} else {
		doScan();
	}
};


/*
	Applications CRUD
*/
Evrythng.prototype.createApplication = function(options, callback) {
	var self = this;
	return self.query({
		url: self.buildUrl('/applications'),
		method : 'post',
		data : options.data
	}, callback);
};


Evrythng.prototype.readApplications = function(options, callback) {
	var self = this;
	return self.query({
		url: self.buildUrl('/applications')
	}, callback);
};


Evrythng.prototype.readApplication = function(options, callback) {
	var self = this;
	return self.query({
		url: self.buildUrl('/applications/%s', options.application)
	}, callback);
};


Evrythng.prototype.updateApplication = function(options, callback) {
	var self = this;
	return self.query({
		url: self.buildUrl('/applications/%s', options.application),
		method : 'put',
		data : options.data
	}, callback);
};


Evrythng.prototype.deleteApplication = function(options, callback) {
	var self = this;
	return self.query({
		url: self.buildUrl('/applications/%s', options.application),
		method : 'delete'
	}, callback);
};


/*
	Products CRUD
*/
Evrythng.prototype.createProduct = function(options, callback) {
	var self = this,
		query = {
			url: '/products',
			method: 'post',
			data: options.data
		};
	if (self.options.evrythngAppId) query.params = {app: self.options.evrythngAppId};
	return self.query(query, callback);
};


Evrythng.prototype.readProducts = function(options, callback) {
	var self = this,
		query = {
			url: '/products'
		};
	if (self.options.evrythngAppId) query.params = {app: self.options.evrythngAppId};
	return self.query(query, callback);
};


Evrythng.prototype.readProduct = function(options, callback) {
	var self = this,
		query = {
			url: self.buildUrl('/products/%s', options.product)
		};
	if (self.options.evrythngAppId) query.params = {app: self.options.evrythngAppId};
	return self.query(query, callback);
};


Evrythng.prototype.updateProduct = function(options, callback) {
	var self = this,
		query = {
			url: self.buildUrl('/products/%s', options.product),
			method: 'put',
			data: options.data
		};
	if (self.options.evrythngAppId) query.params = {app: self.options.evrythngAppId};
	return self.query(query, callback);
};


Evrythng.prototype.deleteProduct = function(options, callback) {
	var self = this,
		query = {
			url: self.buildUrl('/products/%s', options.product),
			method: 'delete'
		};
	if (self.options.evrythngAppId) query.params = {app: self.options.evrythngAppId};
	return self.query(query, callback);
};


/*
	Properties CRUD
*/
Evrythng.prototype.createProperty = function(options, callback) {
	var self = this;
	return self.query({
		url: self.buildUrl('/thngs/%s/properties', options.thng),
		method: 'post',
		data: options.data
	}, callback);
};


Evrythng.prototype.readProperties = function(options, callback) {
	var self = this;
	return self.query({
		url: self.buildUrl('/thngs/%s/properties', options.thng)
	}, callback);
};


Evrythng.prototype.readProperty = function(options, callback) {
	var self = this;
	return self.query({
		url: self.buildUrl('/thngs/%s/properties/%s', options.thng, options.property)
	}, callback);
};


Evrythng.prototype.updateProperty = function(options, callback) {
	var self = this;
	return self.query({
		url: self.buildUrl('/thngs/%s/properties', options.thng),
		method: 'put',
		data: options.data
	}, callback);
};


Evrythng.prototype.deleteProperty = function(options, callback) {
	var self = this;
	return self.query({
		url: self.buildUrl('/thngs/%s/properties/%s', options.thng, options.property),
		method: 'delete'
	}, callback);
};


/*
	Thngs R
*/
Evrythng.prototype.readThng = function(options, callback) {
	var self = this;
	return self.query({
		url: self.buildUrl('/thngs/%s', options.thng)
	}, callback);
};


/*
	Analytics R
*/
Evrythng.prototype.readAnalytics = function(options, callback) {
	var self = this;
	return self.query({
		url: self.buildUrl('/analytics/query/%s', options.kpi),
		params: options.params
	}, callback);
};


/*
	Users R
*/
Evrythng.prototype.readUsers = function(options, callback) {
	var self = this,
		query = {
			url: self.buildUrl('/users')
		};
	if (self.options.evrythngAppId) query.params = {app: self.options.evrythngAppId};
	return self.query(query, callback);
};


Evrythng.prototype.readUser = function(options, callback) {
	var self = this,
		query = {
			url: self.buildUrl('/users/%s', options.user)
		};
	if (self.options.evrythngAppId) query.params = {app: self.options.evrythngAppId};
	return self.query(query, callback);
};


/*
	Loyalty R
*/
Evrythng.prototype.readLoyaltyStatus = function(options, callback) {
	var self = this;
	return self.query({
		url: self.buildUrl('/loyalty/%s/status', options.user)
	}, callback);
};


Evrythng.prototype.readLoyaltyTransactions = function(options, callback) {
	var self = this,
		query = {
			url: self.buildUrl('/loyalty/%s/transactions', options.user)
		};
	if (self.options.evrythngAppId) query.params = {app: self.options.evrythngAppId};
	return self.query(query, callback);
};


/*
	Actions R
*/

Evrythng.prototype.readActionTypes = function(options, callback) {
	var self = this;
	return self.query({
		url: '/actions'
	}, callback);
};


Evrythng.prototype.readActions = function(options, callback) {
	var self = this;
	return self.query({
		url: self.buildUrl('/actions/%s', options.type),
		params: options.params
	}, callback);
};


Evrythng.prototype.readAction = function(options, callback) {
	var self = this;
	return self.query({
		url: self.buildUrl('/actions/' + options.type + '/%s', options.action),
		params: options.params
	}, callback);
};


/*
	Multimedia CR
*/

Evrythng.prototype.createMultimedia = function(options, callback) {
	var self = this;
	return self.query({
		url: '/contents/multimedia',
		data: options.data,
		method: 'post',
		params: {
			access_token: options.evrythngApiKey
		}
	}, callback);
};


Evrythng.prototype.readMultimedia = function(options, callback) {
	var self = this;
	return self.query({
		url: self.buildUrl('/contents/multimedia/%s', options.multimedia),
		params: {
			access_token: options.evrythngApiKey
		}
	}, callback);
};


/*
	Files R
*/

Evrythng.prototype.readFiles = function(options, callback) {
	var self = this;
	return self.query({
		url: '/files'
	}, callback);
};


Evrythng.prototype.readFile = function(options, callback) {
	var self = this;
	return self.query({
		url: self.buildUrl('/files/%s', options.file)
	}, callback);
};



////////////////////////
////// UTILITIES ///////
////////////////////////


/*
	Query API utility
*/
Evrythng.prototype.query = function(options, callback) {
	var self = this;
	if (typeof options.params !== 'object') options.params = {};
	if (options.method) options.params.method = options.method;
	if (options.data) options.params.data = JSON.stringify(options.data);
	if (!options.params.access_token) options.params.access_token = self.options.evrythngApiKey;
	return self.jsonp(self.options.evrythngApiUrl + options.url + (options.url.indexOf('?') > -1 ? '&' : '?') + 'callback=?&' + self.buildParams(options.params), function(response) {
		if (window.console) console.log(response);
		if (typeof callback === 'function') {
			callback.call(self, response);
		}
		return response;
	});
};


/*
	Helper method to build a resource path
	e.g., buildUrl('/thngs/%s', thngId);
*/
Evrythng.prototype.buildUrl = function(str) {
		var args = [].slice.call(arguments, 1), i = 0;
		return str.replace(/%s/g, function() {
				return args[i++];
		});
};


/*
	Helper method to build query string
*/
Evrythng.prototype.buildParams = function(obj) {
	var out = [];
	for (var i in obj) {
		out.push(i + '=' + encodeURIComponent(obj[i]));
	}
	return out.join('&');
};


/*
	Helper method to read URL parameter
*/
Evrythng.prototype.getParam = function(name) {
	name = name.replace(/[\[]/, '\\\[').replace(/[\]]/, '\\\]');
	var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
		results = regex.exec(location.search);
	return results == null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};


/*
	Helper to escape html
*/
Evrythng.prototype.escapeHTML = function(str) {
	var pre = document.createElement('pre');
	pre.appendChild(document.createTextNode(str));
	return pre.innerHTML;
};


/*
	Helper to convert dataURL to Blob
*/
Evrythng.prototype.dataURLtoBlob = function(dataURL) {
	var byteString,
		mimestring,
		content = [];
	if (dataURL.split(',')[0].indexOf('base64') !== -1) {
		byteString = atob(dataURL.split(',')[1]);
	}
	else {
		byteString = decodeURI(dataURL.split(',')[1]);
	}
	mimestring = dataURL.split(',')[0].split(':')[1].split(';')[0];
	for (var i=0; i<byteString.length; i++) {
		content[i] = byteString.charCodeAt(i);
	}
	return new Blob([new Uint8Array(content)], {type: mimestring});
};


/*
	Helper to get mime type by file's extension
*/
Evrythng.prototype.getMimeType = function(ext) {
	return (function(){
		var a = 'audio/',
			v = 'video/',
			i = 'image/';
		return {
			//-- image
			'jpg':i+'jpeg',
			'jpeg':i+'jpeg',
			'png':i+'png',
			'gif':i+'gif',
			//-- audio
			'flac':a+'flac',
			'mp3':a+'mpeg',
			'm4a':a+'aac',
			'm4b':a+'aac',
			'm4p':a+'aac',
			'm4r':a+'aac',
			'aac':a+'aac',
			'adts':a+'aac',
			'wav':a+'wav',
			'bwf':a+'wav',
			'aiff':a+'aiff',
			'aif':a+'aiff',
			'aifc':a+'aiff',
			'cdda':a+'aiff',
			'au':a+'basic',
			'snd':a+'basic',
			'ulw':a+'basic',
			'mid':a+'midi',
			'midi':a+'midi',
			'smf':a+'midi',
			'kar':a+'midi',
			'qcp':a+'vnd.qcelp',
			'gsm':a+'x-gsm',
			'amr':a+'amr',
			'caf':a+'x-caf',
			'ac3':a+'ac3',
			'm2a':a+'mpeg',
			'swa':a+'mpeg',
			'wma':a+'x-ms-wma',
			'wax':a+'x-ms-wax',
			'mpga':a+'mpeg',
			'mpega':a+'mpeg',
			'3gpp2':a+'3gpp2',
			'oga':a+'ogg',
			//-- video
			'3gp':v+'3gpp',
			'3gpp':v+'3gpp',
			'3g2':v+'3gpp2',
			'3gp2':v+'3gpp2',
			'h261':v+'h261',
			'h263':v+'h263',
			'h264':v+'h264',
			'jpgv':v+'jpeg',
			'jpm':v+'jpm',
			'jpgm':v+'jpm',
			'mj2':v+'mj2',
			'mjp2':v+'mj2',
			'mp4':v+'mp4',
			'mp4v':v+'mp4',
			'mpg4':v+'mp4',
			'm4u':v+'x-mpegurl',
			'mp2':v+'mpeg',
			'mpm':v+'mpeg',
			'mpa':v+'mpeg',
			'mpeg':v+'mpeg',
			'mpg':v+'mpeg',
			'mpe':v+'mpeg',
			'mpv':v+'mpeg',
			'mp2v':v+'mpeg-2',
			'mpv2':v+'mpeg-2',
			'm1s':v+'mpeg',
			'm1a':v+'mpeg',
			'm75':v+'mpeg',
			'm15':v+'mpeg',
			'm1v':v+'mpeg',
			'm2v':v+'mpeg',
			'qt':v+'quicktime',
			'mov':v+'quicktime',
			'mqv':v+'quicktime',
			'fvt':v+'vnd.fvt',
			'mxu':v+'vnd.mpegurl',
			'm4u':v+'vnd.mpegurl',
			'viv':v+'vnd.vivo',
			'vivo':v+'vnd.vivo',
			'fli':v+'fli',
			'flc':v+'flc',
			'cel':v+'flc',
			'asr':v+'x-ms-asf',
			'asf':v+'x-ms-asf',
			'asx':v+'x-ms-asx',
			'lsf':v+'x-la-asf',
			'lsx':v+'x-la-asf',
			'wm':v+'x-ms-wm',
			'wmp':v+'x-ms-wmp',
			'wmv':v+'x-ms-wmv',
			'wmx':v+'x-ms-wmx',
			'wvx':v+'x-ms-wvx',
			'avi':v+'x-msvideo',
			'avs':v+'avs-video',
			'mv':v+'x-sgi-movie',
			'movie':v+'x-sgi-movie',
			'ice':'x-conference/x-cooltalk',
			'f4v':v+'mp4',
			'f4p':v+'mp4',
			'flv':v+'flv',
			'swf':'application/x-shockwave-flash',
			'spl':'application/futuresplash',
			'dxr':'application/x-director',
			'dir':'application/x-director',
			'dcr':'application/x-director',
			'divx':v+'divx',
			'div':v+'divx',
			'dv':v+'x-dv',
			'dif':v+'x-dv',
			'dl':v+'dl',
			'gl':v+'gl',
			'ogv':v+'ogg',
			'ogg':'application/x-ogg',
			'ogx':'application/ogg',
			'axv':v+'annodex',
			'anx':'application/annodex',
			'afl':v+'animaflex',
			'fmf':v+'x-atomic3d-feature',
			'isu':v+'x-isvideo',
			'mjpg':v+'x-motion-jpeg',
			'qtc':v+'x-qtc',
			'rv':v+'vnd.rn-realvideo',
			'ra':'audio/x-pn-realaudio',
			'ram':'audio/x-pn-realaudio',
			'rm':'audio/x-pn-realaudio-plugin',
			'rpm':'audio/x-pn-realaudio-plugin',
			'rpj':'application/vnd.rn-realplayer-javascript',
			'scm':v+'x-scm',
			'vdo':v+'vdo',
			'vos':v+'vosaic',
			'xdr':v+'x-amt-demorun',
			'xsr':v+'x-amt-showrun',
			'sdv':v+'sd-video',
			'vob':v+'mpeg-system',
			'm4v':v+'x-m4v',
			'vlc':'application/x-vlc-plugin',
			'amc':'application/x-mpeg'
		};
	})()[ext];
};


/*
	Upload
*/
Evrythng.prototype.createUpload = function(options) {
	options.evrythng = this;
	return new this.Upload(options);
};

Evrythng.prototype.Upload = function(options) {
	// defaults
	this.thumbnailFor = [];
	this.thumbnailWidth = 178;
	this.thumbnailHeight = 100;
	this.thumbnailType = 'image/jpeg';
	this.thumbnailQuality = .92;
	if (typeof options === 'object') {
		for (option in options) {
			this[option] = options[option];
		}
	}
	if (this.force) this.handleFileSelect(this.fileInput);
};

Evrythng.prototype.Upload.prototype.onFinishS3Put = function(public_url) {
	if (window.console) console.log('base.onFinishS3Put()', public_url);
};

Evrythng.prototype.Upload.prototype.onProgress = function(percent, status) {
	if (window.console) console.log('base.onProgress()', percent, status);
};

Evrythng.prototype.Upload.prototype.onError = function(status) {
	if (window.console) console.log('base.onError()', status);
};

Evrythng.prototype.Upload.prototype.handleFileSelect = function(file_element) {
	if (typeof(file_element) === 'undefined') {
		this.onError('Could not find the file select DOM element.');
		return;
	}
	var f, files, _i, _len, _results;
	files = file_element.files;
	if (files.length === 0) {
		return this.onError('No file selected.');
	}
	this.onProgress(0, 'Upload started.');
	_results = [];
	for (_i = 0, _len = files.length; _i < _len; _i++) {
		f = files[_i];
		_results.push(this.uploadFile(f));
	}
	return _results;
};

Evrythng.prototype.Upload.prototype.createCORSRequest = function(method, url) {
	var xhr;
	xhr = new XMLHttpRequest();
	if (xhr.withCredentials != null) {
		xhr.open(method, url, true);
	} else if (typeof XDomainRequest !== 'undefined') {
		xhr = new XDomainRequest();
		xhr.open(method, url);
	} else {
		xhr = null;
	}
	return xhr;
};

Evrythng.prototype.Upload.prototype.executeOnSignedUrl = function(file, type, name, callback) {
	this.evrythng.query({
		url: '/files/signature',
		params: {
			access_token: this.accessToken,
			type: type,
			name: name
		}
	}, function(result) {
		if (window.console) console.log('Signatue upload url : ' + result.signedUploadUrl + ' publicUrl : ' + result.publicUrl);
		return callback(type, result.signedUploadUrl, result.publicUrl);
	});
};

Evrythng.prototype.Upload.prototype.upload = function(file, type, url, public_url) {
	var xhr, self = this;
	xhr = this.createCORSRequest('PUT', url);
	if (!xhr) {
		this.onError('CORS not supported');
	} else {
		xhr.onload = function() {
			if (xhr.status === 200) {
				self.onProgress(100, 'Upload completed.');
				return self.onFinishS3Put(public_url, file.size);
			} else {
				return self.onError('Upload error: ' + xhr.status);
			}
		};
		xhr.onerror = function() {
			return self.onError('XHR error.');
		};
		xhr.upload.onprogress = function(e) {
			var percentLoaded;
			if (e.lengthComputable) {
				percentLoaded = Math.round((e.loaded / e.total) * 100);
				return self.onProgress(percentLoaded, percentLoaded === 100 ? 'Finalizing.' : 'Uploading.');
			}
		};
	}
	xhr.setRequestHeader('Content-Type', type);
	xhr.setRequestHeader('x-amz-acl', 'public-read');
	return xhr.send(file);
};

Evrythng.prototype.Upload.prototype.uploadFile = function(file) {
	var self = this;
	if (this.thumbnailFor.indexOf(file.type.split('/')[0]) !== -1) {
		this.generateThumbnail(file, function(data) {
		//	self.executeOnSignedUrl(data, self.thumbnailType, 'thumbnail.' + self.thumbnailType.split('/')[1], function(type, signedURL, publicURL) {
		//		return self.upload(data, type, signedURL, publicURL);
		//	});
		});
	}
	return this.executeOnSignedUrl(file, file.type, this.name, function(type, signedURL, publicURL) {
		return self.upload(file, type, signedURL, publicURL);
	});
};

Evrythng.prototype.Upload.prototype.generateThumbnail = function(file, callback) {
	var self = this,
		URL = window.URL || window.webkitURL,
		type = file.type.split('/')[0];
	switch(type) {
		case 'image':
			var canvas = document.createElement('canvas'),
				context = canvas.getContext('2d'),
				img = new Image();
			img.onload = function() {
				canvas.width = self.thumbnailWidth;
				canvas.height = self.thumbnailHeight;
				var sourceX = 0;
				var sourceY = 0;
				var sourceWidth = img.width;
				var sourceHeight = img.height;
				var thumbnailRatio = canvas.width / canvas.height;
				var ratio = sourceWidth / sourceHeight;
				if (ratio < thumbnailRatio) {
					sourceHeight = Math.round(img.width / thumbnailRatio);
					sourceY = Math.round((img.height - sourceHeight) / 2);
				}
				if (ratio > thumbnailRatio) {
					sourceWidth = Math.round(img.height / thumbnailRatio);
					sourceX = Math.round((img.width - sourceWidth) / 2);
				}
				context.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
				if (typeof self.onThumbnail === 'function') self.onThumbnail.call(self, canvas);
				if (typeof callback === 'function') callback.call(self, self.evrythng.dataURLtoBlob(canvas.toDataURL(self.thumbnailType, self.thumbnailQuality)));
			};
			img.src = URL.createObjectURL(file);
		break;
		case 'video':
			var canvas = document.createElement('canvas'),
				context = canvas.getContext('2d'),
				video = document.createElement('video');
			video.style.visibility = 'hidden';
			video.style.position = 'absolute';
			document.body.appendChild(video);
			video.addEventListener('seeked', function() {
				canvas.width = self.thumbnailWidth;
				canvas.height = self.thumbnailHeight;
				var sourceX = 0;
				var sourceY = 0;
				var sourceWidth = video.videoWidth;
				var sourceHeight = video.videoHeight;
				var thumbnailRatio = canvas.width / canvas.height;
				var ratio = sourceWidth / sourceHeight;
				if (ratio < thumbnailRatio) {
					sourceHeight = Math.round(video.videoWidth / thumbnailRatio);
					sourceY = Math.round((video.videoHeight - sourceHeight) / 2);
				}
				if (ratio > thumbnailRatio) {
					sourceWidth = Math.round(video.videoHeight / thumbnailRatio);
					sourceX = Math.round((video.videoWidth - sourceWidth) / 2);
				}
				context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
				if (typeof self.onThumbnail === 'function') self.onThumbnail.call(self, canvas);
				if (typeof callback === 'function') callback.call(self, self.evrythng.dataURLtoBlob(canvas.toDataURL(self.thumbnailType, self.thumbnailQuality)));
			});
			video.addEventListener('canplay', function() {
				URL.revokeObjectURL(video.src);
				video.currentTime = Math.round(video.duration / 2);
			});
			video.src = URL.createObjectURL(file);
		break;
	}
	return true;
};


/*
	Load.js - JavaScript js/css, jsonp/ajax, sync/async loader
	Docs and source: https://github.com/articobandurini/load.js
	Distributed under MIT license.
*/
(function(b){var a=b.load=function(d){if(typeof d!=='object'||d instanceof Array){var c=a.args(arguments);d={url:c.url,callback:c.callback}}if(d.url&&d.url.length){if(typeof d.async==='undefined'){d.async=true}if(!d.type){d.type='js'}if(!(d.url instanceof Array)){d.url=[d.url]}a.sequence(d)}return a};a.sequence=function(e){var d=e.url.length,c=function(h){if(!h){h=1}d=d-h;if(!d&&typeof e.callback==='function'){e.callback.call(a)}},g=function(h){return h.length?(function(){c(h.length);a.sequence({url:h,async:e.async,type:e.type,callback:c})}):c};for(var f=0;f<e.url.length;f++){if(e.url[f] instanceof Array){a.sequence({url:e.url[f],async:e.async,type:e.type,callback:g(e.url.slice(f+1))});break}else{a.one({url:e.url[f],async:e.async,type:e.type,callback:c})}}return a};a.one=function(d){var c,f=false,e=document.getElementsByTagName('head')[0]||document.body;if(d.type==='css'||d.url.toLowerCase().match(/\.css$/)){f=true;c=document.createElement('link');c.rel='stylesheet';c.href=a.path(d.url+(d.url.toLowerCase().match(/\.css$/)?'':'.css'))}else{c=document.createElement('script');c.async=d.async;c.src=a.path(d.url+(d.type==='jsonp'||d.url.toLowerCase().match(/\.js$/)?'':'.js'))}e.appendChild(c);var g=function(h){if(typeof a.ready==='function'){a.ready.call(a,d.url)}if(typeof d.callback==='function'){d.callback.call(a)}if(!f&&h&&h.parentNode){h.parentNode.removeChild(h)}};if(navigator.userAgent.indexOf('MSIE')>=0){c.onreadystatechange=function(){if(this.readyState==='loaded'||this.readyState==='complete'){g(this)}}}else{c.onload=function(){g(this)}}return a};a.js=a.async=function(){var c=a.args(arguments);return a({url:c.url,callback:c.callback})};a.css=function(){var c=a.args(arguments);return a({url:c.url,callback:c.callback,type:'css'})};a.sync=function(){var c=a.args(arguments);return a({url:c.url,callback:c.callback,async:false})};a.jsonp=function(c,e,d){if(typeof e==='function'){if(!a.jsonp.index){a.jsonp.index=1}else{a.jsonp.index++}window['loadCallback'+a.jsonp.index]=e;c=c.replace('=?','=loadCallback'+a.jsonp.index)}return a.one({url:c,async:d!==false,type:'jsonp'})};a.ajax=function(c,h,d){var g;if(window.XMLHttpRequest){g=new XMLHttpRequest()}else{if(window.ActiveXObject){try{g=new ActiveXObject('Msxml2.XMLHTTP')}catch(f){try{g=new ActiveXObject('Microsoft.XMLHTTP')}catch(f){}}}}if(!g){return null}g.onreadystatechange=function(){if(g.readyState===4&&typeof h==='function'){h.call(g,g.responseText)}};g.open('GET',a.path(c),d);g.send();return a};a.args=function(c){var d=Array.prototype.slice.call(c);return{url:d,callback:(typeof d[d.length-1]==='function')?d.pop():undefined}};a.path=function(c){return c.match(/^(https?\:|file\:|\/)/i)?c:a.root+c};a.init=function(){a.root='';var f=document.getElementsByTagName('script'),d,e;for(var c=0;c<f.length;c++){if(f[c].src.match(/(^|\/)load(\.min)?\.js$/)||f[c].id==='load.js'){d=f[c].getAttribute('data-load');if(d){e=d.lastIndexOf('/')+1;a.root=e?d.substring(0,e):'';a({url:d.substring(e),async:f[c].getAttribute('data-async')!=='false'})}break}}};a.init()})(window);
