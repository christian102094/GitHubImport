define({
	onProjectSelectionChanged: function(oEvent) {
		if (oEvent.params.selection && oEvent.params.selection.length > 0 && oEvent.params.selection[0].document) {
			var oSelectedDoc = oEvent.params.selection[0].document;
			this.context.service.downloadservice.setSelection(oSelectedDoc);
			this.context.service.reposearchservice.getContent();
		}
	}
});