function UserAssistant(sceneAssistant, doneCallBack) {
    this.doneCallBack = doneCallBack;
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
    Mojo.Log.info("new User assistant exists");
    this.sceneAssistant = sceneAssistant; //dialog's do not have their own controller, so need access to the launching scene's controller
}

UserAssistant.prototype.setup = function(widget) {
    /* this function is for setup tasks that have to happen when the scene is first created */
    this.widget = widget;
    Mojo.Log.info("User assistant setup");
    Mojo.Log.info("Current username is: " + appModel.AppSettingsCurrent["SenderName"]);

    /* setup widgets here */
    this.sceneAssistant.controller.setupWidget("txtUserName",
        this.attributes = {
            textFieldName: "userName",
            hintText: " Enter nickname",
            property: 'value',
            multi: false,
            enterSubmits: true,
            changeOnKeyPress: false,
            textReplacement: false,
            requiresEnterKey: false,
            focus: true
        },
        this.model = {
            value: appModel.AppSettingsCurrent["SenderName"],
            disabled: false
        }
    );
    this.sceneAssistant.controller.setupWidget("goButton", { type: Mojo.Widget.defaultButton }, { label: "OK", disabled: false });
    //this.sceneAssistant.controller.setupWidget("cancelButton", { type: Mojo.Widget.button }, { label: "Cancel", disabled: false });

    /* add event handlers to listen to events from widgets */
    Mojo.Event.listen(this.sceneAssistant.controller.get("txtUserName"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.sceneAssistant.controller.get("goButton"), Mojo.Event.tap, this.handleGoPress.bind(this));
    //Mojo.Event.listen(this.sceneAssistant.controller.get("cancelButton"), Mojo.Event.tap, this.handleCancelPress.bind(this));
};

UserAssistant.prototype.handleValueChange = function(event) {
    this.handleGoPress();
};

UserAssistant.prototype.handleGoPress = function(event) {
    var newName = this.sceneAssistant.controller.get('txtUserName').mojo.getValue();
    if (newName && newName != "" && newName != " " && newName.toLowerCase() != "webos user") {
        //Remember the name they entered
        appModel.AppSettingsCurrent["SenderName"] = newName;
        appModel.SaveSettings();
        this.doneCallBack(newName);
        this.widget.mojo.close();
    } else {
        Mojo.Controller.getAppController().showBanner({ messageText: "Provide a unique username!" }, "", "");
    }
}

UserAssistant.prototype.activate = function(event) {
    this.sceneAssistant.controller.get('txtUserName').mojo.focus();
    /* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
};

UserAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    Mojo.Event.stopListening(this.sceneAssistant.controller.get("txtUserName"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.stopListening(this.sceneAssistant.controller.get("goButton"), Mojo.Event.tap, this.handleGoPress.bind(this));
    //Mojo.Event.stopListening(this.sceneAssistant.controller.get("cancelButton"), Mojo.Event.tap, this.handleCancelPress.bind(this));
};

UserAssistant.prototype.cleanup = function(event) {
    Mojo.Log.info("user assistant cleaned up");
    /* this function should do any cleanup needed before the scene is destroyed as 
       a result of being popped off the scene stack */
};