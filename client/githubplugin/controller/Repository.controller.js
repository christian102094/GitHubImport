sap.ui.define(["githubplugin/controller/BaseController",
	'sap/ui/model/Context',
	'sap/m/MessageToast',
	'sap/m/MessageBox',
	'sap/ui/model/json/JSONModel',
	"sap/m/BusyDialog"
], function(BaseController, Context, MessageToast, MessageBox, JSONModel, BusyDialog) {
	"use strict";

	function getFilesRecursive(me, sFileUrl, oData, context, sRootPath) {
		var contentFilesPromises = [];
		var aContentsResult = me.contentsResult;
		me.contentsResult = [];
		var sPath = "";

		aContentsResult.forEach(function(oContent) {
			if (oContent.type === "file") {
				console.log("[getFile]" + oContent.path);
				contentFilesPromises.push(context.service.githubapiservice.getFile(oContent.download_url).then(
					function(fileResult) {
						if (oContent.path === oContent.name) {
							sPath = sRootPath + "/";
						} else {
							sPath = sRootPath + "/" + oContent.path;
							sPath = sPath.substring(0, sPath.lastIndexOf("/") + 1);
						}
						console.log("[createFile] " + sPath);
						return context.service.downloadservice.createFile(sPath, oContent.name, fileResult); //TODO
					}));
			} else if (oContent.type === "dir") {
				var subPath = sRootPath + "/" + oContent.path;

				console.log("[subPath]" + subPath);
				contentFilesPromises.push(context.service.downloadservice.createLibFolder(subPath).then(function() {

					var sFileUrl2 = "https://api.github.com/repos/" + oData.owner.login + "/" + oData.name + "/contents/" + oContent.path;
					console.log("[getFilesRecursive] " + sFileUrl2);
					return context.service.githubapiservice.getFile(sFileUrl2).then(function(contentsResult) {
						me.contentsResult = JSON.parse(contentsResult);
						return getFilesRecursive(me, sFileUrl2, oData, context, sRootPath);
					});
				}));
			}
		});
		return Promise.all(contentFilesPromises);
	}
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
		onAdd: function() {
			var me = this,
				context = this.parent.getView().getViewData().context,
				model = this.fragment.getModel(),
				data = this.fragment.getBindingContext().getObject(),
				sFileUrl = "https://api.github.com/repos/" + data.owner.login + "/" + data.name + "/contents";

			me.busyDialog.open();
			model.refresh(); //TODO necessary?

			context.service.progress.startTask("loadRepository", "Loading repository").then(function(taskid) {
				me.taskId = taskid;
				console.log("[starting task]");
				return context.service.githubapiservice.getFile(sFileUrl).then(function(contentsResult) {
					me.contentsResult = JSON.parse(contentsResult);
					console.log("[createLibFolder] " + data.name);
					return context.service.downloadservice.createLibFolder(data.name);
				}).then(function() {
					console.log("[getFilesRecursive] " + sFileUrl);
					return getFilesRecursive(me, sFileUrl, data, context, data.name);
				});
			}).then(function() {
				MessageBox.show("Finished importing the repository.");
			}).catch(function(error) {
				MessageBox.error("Finished with errors", {
					details: error.message
				});
			}).then(function() {
				model.refresh();
				me.busyDialog.close();
				return context.service.progress.stopTask(me.taskId);
			});
		},
		onClose: function() {
			this.fragment.close();
		}
	});
});