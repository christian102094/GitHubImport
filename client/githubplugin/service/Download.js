define({
	setSelection: function(oSelection) {
		this.selection = oSelection;
	},
	getSelection: function() {
		if (this.selection.getEntity().isRoot()) { //TODO
			return this.selection;
		}
		throw new Error("Workspace not selected. Please select \"Workspace\" folder");
	},
	createLibFolder: function(sDownloadPath, bIsProjectRoot) {
		var me = this;
		return this.getSelection().getProject().then(function(project) {
			me.project = project;
			return project.getChild("SAPUI5Template");
		}).then(function(getChildResult){
			if (!bIsProjectRoot) {
				return me.project.createFolder(sDownloadPath);
			} 
			if (getChildResult === null) {
				return me.project.createFolder(sDownloadPath);
			} else {
				throw new Error("Project " + sDownloadPath + " already exists");
			}
		});
		
		
		// then(function(getChiledReturn) {
		// 	console.log(getChiledReturn);
		// 	throw new Error("Project " + sDownloadPath + " already exists");
		// }, function() {
		// 	return me.project.createFolder(sDownloadPath);
		// });
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
			console.log("[Error] Error saving content");
			return sFile;
		});
	}
});