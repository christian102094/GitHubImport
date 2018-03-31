sap.ui.define(["githubplugin/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox"
], function(Controller, JSONModel, MessageBox) {
	"use strict";

	return Controller.extend("githubplugin.controller.RepoSearch", {
		onInit: function() {
			this.getView().setModel(new JSONModel({
				search: "",
				items: [],
				total_count: 0
			}));
		},

		onSearch: function() {
			var me = this;
			var oView = this.getView();
			var sSearch = oView.getModel().getProperty("/search");
			var context = oView.getViewData().context;

			// Abort HTTP calls from GitHub service
			context.service.githubapiservice.abortSearch();

			if (me.taskId) {
				context.service.progress.stopTask(me.taskId);
			}

			// TODO
			var sToken = window.sessionStorage.getItem("github_token");
			if (!sToken) {
				this.openFragment("githubplugin.view.GitHubLogin", null, true, false, {
					path: ""
				}, true); 
			}

			// Start new task
			context.service.progress.startTask("searchrepositories", "Search repositories").then(function(taskId) {
				me.taskId = taskId;

				// Search repositories in GitHub
				return context.service.githubapiservice.search(sSearch);
			}).then(function(result) {
				var transformedResult = [];

				result.items.forEach(function(oRepo) {
					transformedResult.push(oRepo);
				});

				// Update model with GitHub repository list
				me.getView().getModel().setProperty("/items", transformedResult);
				me.getView().getModel().setProperty("/total_count", result.total_count);

				return context.service.progress.stopTask(me.taskId);
			}).catch(function() {
				MessageBox.error("Error during search, try again later...");
				return context.service.progress.stopTask(me.taskId);
			});
		},

		onSelectionChange: function(oEvent) {
			var me = this;
			var listItem = oEvent.getParameter("listItem");
			var path;

			if (listItem) {
				path = listItem.getBindingContextPath();
			}

			if (path) {
				me.openFragment("githubplugin.view.Repository", null, true, false, {
					path: path
				});
			}
		},

		onCancel: function() {
			var context = this.getView().getViewData().context;
			context.service.githubapiservice.abortSearch();

			if (this.taskId) {
				context.service.progress.stopTask(this.taskId);
			}
		}
	});
});