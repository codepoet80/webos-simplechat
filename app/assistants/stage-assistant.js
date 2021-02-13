Mojo.Additions = Additions;

function StageAssistant() {
    /* this is the creator function for your stage assistant object */
}

StageAssistant.prototype.setup = function() {
    /* this function is for setup tasks that have to happen when the stage is first created */
    this.controller.pushScene({ name: "main" });
    this.controller.setWindowOrientation("free");
};

StageAssistant.prototype.orientationChanged = function(orientation) {
    Mojo.Log.info("stage orientation changed to: " + orientation);
};