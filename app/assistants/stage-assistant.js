function StageAssistant() {
    /* this is the creator function for your stage assistant object */
}

StageAssistant.prototype.activate = function() {
    Mojo.Log.error("Stage activated");
    stageController = Mojo.Controller.stageController;
    if (stageController.getScenes().length < 1)
        stageController.pushScene('main');
}

StageAssistant.prototype.setup = function() {
    Mojo.Log.info("Stage assistant created!");
};