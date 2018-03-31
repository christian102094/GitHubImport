define({
	setSelection: function(oSelection) {
		this.selection = oSelection;
	},
	_getSelection: function() {
		if (this.selection.getEntity().isRoot()) { //TODO
			return this.selection;
		}
		throw new Error("Workspace not selected. Please select \"Workspace\" folder");
	},
	createLibFolder: function(sDownloadPath, bIsProjectRoot) {
		var me = this;
		me.sDownloadPath = sDownloadPath;

		return this._getSelection().getProject().then(function(project) {
			me.project = project;
			return project.getChild(me.sDownloadPath);
		}).then(function(getChildResult) {
			if (!bIsProjectRoot) {
				return me.project.createFolder(sDownloadPath);
			}
			if (getChildResult === null) {
				return me.project.createFolder(sDownloadPath);
			} else {
				throw new Error("Project " + sDownloadPath + " already exists");
			}
		});
	},
	createFile: function(sDownloadPath, sFile, content) {
		var me = this;

		return this._getSelection().getProject().then(function(project) {
			return project.createFolder(sDownloadPath);
		}).catch(function() {
			throw new Error("[Error] Error creating folder" + sDownloadPath);
		}).then(function(folder) {
			me.folder = folder;
			return folder.getChild(sFile);
		}).catch(function() {
			return me.folder.createFile(sFile);
		}).then(function(existsFile) {
			if (!existsFile) {
				var temp = me.folder;
				return temp.createFile(sFile).then(function(temp) {
					return temp.setContent(content).then(function() {
						return temp.save();
					});
				});
			}
			// existsFile.save();
			return existsFile;
		}).then(function() {
			return sFile;
		}).catch(function(error) {
			console.log("[Error] Error saving content");
			console.log(error);
			return sFile;
		});
	}
});