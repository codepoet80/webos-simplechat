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
    /* this function is for setup tasks that have to happen when the stage is first created */
    //this.controller.pushScene({ name: "main" });
    //this.controller.setWindowOrientation("free");
};