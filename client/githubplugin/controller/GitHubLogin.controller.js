sap.ui.define(["githubplugin/controller/BaseController",
	"sap/ui/model/Context",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/model/json/JSONModel",
	"sap/m/BusyDialog",
	"sap/ui/core/Fragment"
], function(BaseController, Context, MessageToast, MessageBox, JSONModel, BusyDialog, Fragment) {
	"use strict";

	return BaseController.extend("githubplugin.controller.GitHubLogin", {
		busyDialog: new BusyDialog({
			showCancelButton: false
		}).addStyleClass("busy_indicator"),

		onBeforeShow: function(parent, fragment, callback, data) {
			this.parent = parent;
			this.fragment = fragment;
			this.data = data;
			this.fragment.bindElement(data.path);
		},

		onLogin: function() {
			var me = this,
				context = this.parent.getView().getViewData().context,
				model = this.fragment.getModel();

			me.busyDialog.open();
			model.refresh();

			$._promises = [];
			return context.service.progress.startTask("loginToGitHub", "Authenticating to GitHub").then(function(taskid) {
				me.taskId = taskid;

				return context.service.githubapiservice.searchAuthorization(Fragment.byId("GitHubLogin", "userInput").getValue(),
					Fragment.byId("GitHubLogin", "passwordInput").getValue());
			}).then(function(result) {
				return me.fragment.close();
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