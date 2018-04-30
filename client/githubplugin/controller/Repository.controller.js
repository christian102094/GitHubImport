sap.ui.define(["githubplugin/controller/BaseController",
	"sap/ui/model/Context",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/model/json/JSONModel",
	"sap/m/BusyDialog"
], function(BaseController, Context, MessageToast, MessageBox, JSONModel, BusyDialog) {
	"use strict";

	return BaseController.extend("githubplugin.controller.Repository", {
		busyDialog: new BusyDialog({
			showCancelButton: false
		}).addStyleClass("busy_indicator"),
		onBeforeShow: function(parent, fragment, callback, data) {
			this.parent = parent;
			this.fragment = fragment;
			this.data = data;
			this.fragment.bindElement(data.path);
		},
		b64DecodeUnicode: function(str) {
			return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
				return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
			}).join(""));
		},
		_getFilesRecursive: function getFilesRec(me, sFileUrl, oData, context, sRootPath) {
			var aContentFilesPromises = [];
			var sPath = "";
			var aContentsResult = me.contentsResult;

			me.contentsResult = [];

			aContentsResult.forEach(function(oContent) {
				if (oContent.type === "file") {
					var _sFileUrl = "https://api.github.com/repos/" + oData.owner.login + "/" + oData.name + "/contents/" + oContent.path;

					aContentFilesPromises.push(context.service.githubapiservice.getFile(_sFileUrl).then(
						function(fileResult) {
							if (oContent.path === oContent.name) {
								sPath = sRootPath + "/";
							} else {
								sPath = sRootPath + "/" + oContent.path;
								sPath = sPath.substring(0, sPath.lastIndexOf("/") + 1);
							}
							var content = me.b64DecodeUnicode(JSON.parse(fileResult).content.replace(/[\n]/g, ""));
							return context.service.downloadservice.createFile(sPath, oContent.name, content); //TODO
						}));
				} else if (oContent.type === "dir") {
					var subPath = sRootPath + "/" + oContent.path;

					aContentFilesPromises.push(context.service.downloadservice.createLibFolder(subPath).then(function() {
						var sFileUrl2 = "https://api.github.com/repos/" + oData.owner.login + "/" + oData.name + "/contents/" + oContent.path;

						return context.service.githubapiservice.getFile(sFileUrl2).then(function(contentsResult) {
							me.contentsResult = JSON.parse(contentsResult);
							return getFilesRec(me, sFileUrl2, oData, context, sRootPath);
						});
					}));
				}
			});
			return Promise.all(aContentFilesPromises);
		},

		onAdd: function() {
			var me = this,
				context = this.parent.getView().getViewData().context,
				model = this.fragment.getModel(),
				data = this.fragment.getBindingContext().getObject(),
				sFileUrl = "https://api.github.com/repos/" + data.owner.login + "/" + data.name + "/contents";

			// me.busyDialog.open();
			model.refresh();

			$._promises = [];
			return context.service.progress.startTask("loadRepository", "Loading repository").then(function(taskid) {
					me.taskId = taskid;
					me.onClose(); // CTS
					
					return context.service.githubapiservice.getFile(sFileUrl).then(function(contentsResult) {
						me.contentsResult = JSON.parse(contentsResult);
						return context.service.downloadservice.createLibFolder(data.name, true);
					}).then(function() {
						return me._getFilesRecursive(me, sFileUrl, data, context, data.name);
					}, function(oError) {
						throw oError;
					});
				})
				.then(function(result) {
					MessageBox.success("Finished importing the repository.");
				}).catch(function(error) {
					MessageBox.error("Finished with errors", {
						details: error.message
					});
				}).then(function() {
					model.refresh();
					// me.busyDialog.close();
					return context.service.progress.stopTask(me.taskId);
				});
		}
	});
});