define({
	setSelection: function(oSelection) {
		this.selection = oSelection;
	},
	getSelection: function() {
		if (this.selection.getEntity().isRoot()) { //TODO
			return this.selection;
		}
		throw {
			message: "Workspace not selected. Please select \"Workspace\" folder"
		};
	},
	createLibFolder: function(sDownloadPath) {
		return this.getSelection().getProject().then(function(project) {
			return project.createFolder(sDownloadPath);
		});
	},
	createFile: function(sDownloadPath, sFile, content) {
		var me = this;

		return this.getSelection().getProject().then(function(project) {
			return project.createFolder(sDownloadPath);
		}).catch(function() {
			console.log("[Error] Error creating folder");
		}).then(function(folder) {
			me.folder = folder;
			return folder.getChild(sFile);
		}).catch(function() {
			return me.folder.createFile(sFile);
		}).then(function(existsFile) {
			me.filename = sFile;
			if (!existsFile) {
				return me.folder.createFile(sFile);
			}
			return existsFile;
		}).then(function(existsFile) {
			me.existFile = existsFile;
			return existsFile.setContent(content);
		}).then(function() {
			return me.existFile.save();
		}).then(function() {
			return sFile;
		}).catch(function() {
			console.log("[Error] Error saving content?");
			return sFile;
		});
	}
});