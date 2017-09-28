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
			context.service.githubapiservice.abortSearch();
			if (me.taskId) {
				context.service.progress.stopTask(me.taskId);
			}
			context.service.progress.startTask("searchrepositories", "Search repositories").then(function(taskId) {
				me.taskId = taskId;
				return context.service.githubapiservice.search(sSearch).then(function(result) {
					var transformedResult = [];
					result.items.forEach(function(oRepo) {
						console.log("REPO: ");
						console.log(oRepo);

						// oRepo.assets.map(function(asset) {
						// 	console.log("ASSET: ");
						// 	console.log(asset);
						// 	asset.files = asset.files.reduce(
						// 		function(oResult, file) {
						// 			console.log("FILE:");
						// 			console.log(file);
						// 			if (/\.(map)$/i.test(file)) {
						// 				// skip '.map' files
						// 			} else {
						// 				// default set min.js and min.css to the manifest
						// 				// download all ...
						// 				var manifest = /\.min\.(js|css)$/i.test(file);
						// 				oResult.push({
						// 					filename: file,
						// 					download: true,
						// 					manifest: manifest,
						// 					status: ""
						// 				});
						// 			}
						// 			return oResult;
						// 		}, []);
						// 	return asset;
						// });
						transformedResult.push(oRepo);

					});
					me.getView().getModel().setProperty("/items", transformedResult);
					me.getView().getModel().setProperty("/total_count", result.total_count);
					return context.service.progress.stopTask(me.taskId);
				}).catch(function() {
					MessageBox.error("Error during search, try again later...");
					return context.service.progress.stopTask(me.taskId);
				});
			});
		},
		onSelectionChange: function(oEvent) {
			var me = this;
			var listItem = oEvent.getParameter("listItem");
			
			if (listItem) {
				var path = listItem.getBindingContextPath();
			}
			if (path) {
				me.openFragment("githubplugin.view.Repository", null, true, false, {
					path: path
						// project: me.getView().getModel().getProperty("/project") //TODO goes?
				});

			}
		},
		onCancel: function() {
			var oView = this.getView();
			var context = oView.getViewData().context;

			context.service.githubapiservice.abortSearch();
			if (this.taskId) {
				context.service.progress.stopTask(this.taskId);
			}
		}
	});
});