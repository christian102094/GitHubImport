define({
	sBaseUrl: "https://api.github.com",
	client: null,
	$http: function(url) {
		var me = this;
		var core = {
			// Method that performs the ajax request
			ajax: function(method, url, args) {

				var promise = new Promise(function(resolve, reject) {
					me.client = new XMLHttpRequest();

					var uri = url;

					if (args && (method === 'POST' || method === 'PUT')) {
						uri += '?';
						var argcount = 0;
						for (var key in args) {
							if (args.hasOwnProperty(key)) {
								if (argcount++) {
									uri += '&';
								}
								uri += encodeURIComponent(key) + '=' + encodeURIComponent(args[key]);
							}
						}
					}

					if ("withCredentials" in me.client) {
						// XHR for Chrome/Firefox/Opera/Safari.
						me.client.open(method, uri, true);
					} else if (typeof XDomainRequest !== "undefined") {
						// XDomainRequest for IE.
						me.client = new XDomainRequest();
						me.client.open(method, uri);
					} else {
						// CORS not supported.
						me.client = null;
						return;
					}

					// me.client.open(method, uri);
					me.client.send();

					me.client.onload = function() {
						if (this.status === 200) {
							// Performs the function "resolve" when this.status is equal to 200
							resolve(this.response);
						} else {
							// Performs the function "reject" when this.status is different than 200
							reject(this.statusText);
						}
					};
					me.client.onerror = function() {
						reject(this.statusText);
					};
				});

				// Return the promise
				return promise;
			}
		};

		// Adapter pattern
		return {
			"get": function(args) {
				return core.ajax('GET', url, args);
			},
			"post": function(args) {
				return core.ajax('POST', url, args);
			},
			"put": function(args) {
				return core.ajax('PUT', url, args);
			},
			"delete": function(args) {
				return core.ajax('DELETE', url, args);
			}
		};
	},
	search: function(sSearch) {
		var me = this;

		return me.$http(me.sBaseUrl + "/search/repositories?q=topic:" + sSearch).get().then(
			function(response) {
				// parse output to json. 
				return JSON.parse(response);
			}
		);
	},
	abortSearch: function() {
		if (this.client) {
			this.client.abort();
		}
	},
	getFile: function(sFileUrl) {
		var me = this;
		return me.$http(sFileUrl).get();
	}
});