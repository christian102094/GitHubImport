define({
	sBaseUrl: "https://api.github.com",
	client: null,
	aCredentials: {},
	$http: function(url) {
		var me = this;
		var core = {
			// Method that performs the ajax request
			ajax: function(method, url, args, auth, payload) {
				var promise = new Promise(function(resolve, reject) {
					me.client = new XMLHttpRequest();

					var uri = url;

					if (args && (method === "POST" || method === "PUT")) {
						uri += "?";
						var argcount = 0;
						for (var key in args) {
							if (args.hasOwnProperty(key)) {
								if (argcount++) {
									uri += "&";
								}
								uri += encodeURIComponent(key) + "=" + encodeURIComponent(args[key]);
							}
						}
					}

					if ("withCredentials" in me.client) {
						// XHR for Chrome/Firefox/Opera/Safari.
						me.client.open(method, uri, true);

						// Authorization Header
						if (auth) {
							if (auth.type === "Basic") {
								me.client.setRequestHeader("Authorization", "Basic " + btoa(auth.user + ":" + auth.password));
							}
						} else {
							var sGitHubUser = me.aCredentials.github_user;
							var sGitHubToken = me.aCredentials.github_token;
						
							me.client.setRequestHeader("Authorization", "Basic " + btoa(sGitHubUser + ":" + sGitHubToken));
						}

					} else if (typeof XDomainRequest !== "undefined") {
						// XDomainRequest for IE.
						me.client = new XDomainRequest();
						me.client.open(method, uri);
					} else {
						// CORS not supported.
						me.client = null;
						return;
					}

					if (payload) {
						me.client.send(JSON.stringify(payload));
					} else {
						me.client.send();
					}

					me.client.onload = function() {
						if (this.status === 200) {
							resolve(this.response);
						} else {
							var msg = "Code::" + this.status + "\n";

							if (this.responseText) {
								msg = msg + this.responseText;
							}

							reject(msg);
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
			"get": function(args, auth) {
				return core.ajax("GET", url, args, auth);
			},
			"post": function(args, auth, payload) {
				return core.ajax("POST", url, args, auth, payload);
			},
			"put": function(args, auth) {
				return core.ajax("PUT", url, args, auth);
			},
			"delete": function(args, auth) {
				return core.ajax("DELETE", url, args, auth);
			}
		};
	},

	search: function(sSearch) {
		var me = this,
			sUrl = me.sBaseUrl + "/search/repositories?q=topic:" + sSearch;

		return me.$http(sUrl).get().then(function(response) {
			return JSON.parse(response);
		}).catch(function(oError) {
			return oError;
		});
	},

	abortSearch: function() {
		if (this.client) {
			this.client.abort();
		}
	},

	getFile: function(sFileUrl) {
		var me = this;
		return me.$http(sFileUrl).get();
	},

	_getObjects: function(obj, key, val) {
		var objects = [];
		for (var i in obj) {
			if (!obj.hasOwnProperty(i)) continue;
			if (typeof obj[i] == "object") {
				objects = objects.concat(this._getObjects(obj[i], key, val));
			} else
			//if key matches and value matches or if key matches and value is not passed (eliminating the case where key matches but passed value does not)
			if (i == key && obj[i] == val || i == key && val == "") { //
				objects.push(obj);
			} else if (obj[i] == val && key == "") {
				//only add if the object is not already in the array
				if (objects.lastIndexOf(obj) == -1) {
					objects.push(obj);
				}
			}
		}
		return objects;
	},

	saveToPreferences: function(sKey, sValue) {
		var _this = this;
		// Store token in user preferences
		this.context.service.preferences.set({
			val: sValue
		}, sKey, false).then(function(oResult) {
			console.log("GitHub plugin: pref set ok");
			_this.aCredentials[sKey] = sValue;
			return true;
		}).catch(function(oError) {
			console.log("GitHub plugin: pref set fail");
			return false;
		});
	},

	getFromPreferences: function(sKey) {
		var _this = this;
		return this.context.service.preferences.get(sKey).then(function(oResult) {
			console.log("GitHub plugin: pref get ok");
			_this.aCredentials[sKey] = oResult["val"];
			return oResult["val"];
		}).catch(function(oError) {
			console.log("GitHub plugin: pref get fail");
			return false;
		});
	},

	searchAuthorization: function(sUser, sPassword) {
		var me = this;
		var sURL = "https://api.github.com/authorizations";
		var oAuth = {
			type: "Basic",
			user: sUser,
			password: sPassword
		};
		var oPayload = {
			"scopes": [
				"public_repo"
			],
			"note": "GitHub Plugin - SAP Web IDE"
		};

		// Try to create authorization
		return me.$http(sURL).post(false, oAuth, oPayload).then(function(oResponse) {
			if (oResponse.token) {
				// TODO Is necessary to handle 200?
			}
			return "OK";
		}).catch(function(oMessage) {
			// Handle if authorization creation was successful (201 Created)
			if (oMessage.search("Code::201") !== -1) {
				oMessage = oMessage.replace("Code::201\n", "");
				var sToken = JSON.parse(oMessage).token;
				// TODO save token
				me.saveToPreferences("github_user", sUser);
				me.saveToPreferences("github_token", sToken);
			}

			// If authorization already exists
			if (oMessage.search("already_exists") !== -1) {
				// Get authorizations list
				return me.$http(sURL).get(false, oAuth).then(function(oResponse) {
					// Get authorization ID
					var node = me._getObjects(JSON.parse(oResponse), "note", "GitHub Plugin - SAP Web IDE");
					return node["0"].id;
				}).then(function(nId) {
					// Delete the authorization
					return me.$http(sURL + "/" + nId).delete(false, oAuth).then(function(oResponse) {
						console.log(oResponse);
					}).catch(function(oMessage) {
						if (oMessage.search("Code::204") !== -1) {
							return me.$http(sURL).post(false, oAuth, oPayload).then(function(oResponse) {
								// TODO necessary to handle 200?
							}).catch(function(oMessage) {
								if (oMessage.search("Code::201") !== -1) {
									oMessage = oMessage.replace("Code::201\n", "");
									var sToken = JSON.parse(oMessage).token;
									// TODO save token
									me.saveToPreferences("github_user", sUser);
									me.saveToPreferences("github_token", sToken);
								} else {
									// TODO handle error
									console.log("Error not handled");
								}
							});
						}
					});
				}).catch(function(oMessage) {
					console.log("nIdError not handled"); // TODO
				});
			}
		});
	}
});