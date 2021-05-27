function NewshareAssistant(sceneAssistant, doneCallBack) {
    this.doneCallBack = doneCallBack;
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
    Mojo.Log.info("new NewShare assistant exists");
    this.sceneAssistant = sceneAssistant; //dialog's do not have their own controller, so need access to the launching scene's controller
}

NewshareAssistant.prototype.setup = function(widget) {
    /* this function is for setup tasks that have to happen when the scene is first created */
    this.widget = widget;
    Mojo.Log.info("Current Share Target is: " + appModel.AppSettingsCurrent["Username"]);

    /* setup widgets here */
    //Text box
    var textAttrib = {
        textFieldName: "ShareContent",
        hintText: "Text to share",
        property: 'value',
        multiline: true,
        changeOnKeyPress: true,
        autoReplace: true,
        textCase: Mojo.Widget.steModeSentenceCase,
        requiresEnterKey: false,
        focus: true
    };
    if (appModel.LastShareSelected.contenttype == "application/json") {
        textAttrib.hintText = "JSON to share"
        textAttrib.autoReplace = false;
        textAttrib.textCase = Mojo.Widget.steModeLowerCase;
    }
    this.controller.setupWidget("txtShareContent",
        this.attributes = textAttrib,
        this.model = {
            disabled: false
        }
    );
    this.controller.setupWidget("goButton", { type: Mojo.Widget.activityButton }, { label: "OK", disabled: false });
    this.controller.setupWidget("cancelButton", { type: Mojo.Widget.button }, { label: "Cancel", disabled: false });
};

NewshareAssistant.prototype.activate = function(event) {
    Mojo.Log.info("NewShare assistant activated for share: " + appModel.LastShareSelected.guid);
    if (appModel.LastShareSelected.guid == "new") {
        this.controller.get("divEditTitle").innerHTML = "New Share Content";

    } else {
        this.controller.get("divEditTitle").innerHTML = "Edit Share Content";
    }

    /* add event handlers to listen to events from widgets */
    Mojo.Event.listen(this.controller.get("txtShareContent"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("goButton"), Mojo.Event.tap, this.handleOKPress.bind(this));
    Mojo.Event.listen(this.controller.get("cancelButton"), Mojo.Event.tap, this.handleCancelPress.bind(this));
    //Resize event
    this.controller.window.onresize = this.calculateControlsPosition.bind(this);
    this.calculateControlsPosition();
};

NewshareAssistant.prototype.calculateControlsPosition = function() {

    this.controller.get("txtShareContent").style.height = (window.innerHeight - 220) + "px";
    if (appModel.DeviceType == "Touchpad") {
        //TODO: make room for virtual keyboard     
        if (window.innerWidth > window.innerHeight) { //landscape
            //TODO: let's only allow landscape on touchpad
        }  
    }
}

NewshareAssistant.prototype.handleValueChange = function(event) {
    switch (event.srcElement.title) {
        case "ShareContent":
            this.ShareContent = event.value;
            break;
    }
}

NewshareAssistant.prototype.handleCancelPress = function(event) {
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    stageController.pushScene({ transition: Mojo.Transition.crossFade, name: "main" });
}

NewshareAssistant.prototype.handleOKPress = function(event) {
    if (this.ShareContent && this.ShareContent != "") {
        if (appModel.LastShareSelected.contenttype == "application/json") {
            try {
                var testObj = JSON.parse(this.ShareContent);
            } catch (ex) {
                Mojo.Controller.getAppController().showBanner({ messageText: 'JSON content not be parsed', icon: 'images/notify.png' }, { source: 'notification' });
                this.controller.get('goButton').mojo.deactivate();
                setTimeout(this.controller.get('txtShareContent').mojo.focus(), 500);
                return false;
            }
        }
        appModel.LastShareSelected.content = this.ShareContent;        
        this.tryAddShare();
    } else {
        this.handleCancelPress(event);
    }
}

NewshareAssistant.prototype.tryAddShare = function() {
    serviceModel.DoShareAddRequestText(appModel.LastShareSelected.content, appModel.AppSettingsCurrent["Username"], appModel.AppSettingsCurrent["Credential"], appModel.LastShareSelected.contenttype, function(response) {
        try {
            var responseObj = JSON.parse(response);
        } catch (ex) {
            Mojo.Log.error("Could not parse share add response!");
        }
        if (responseObj && responseObj.success && responseObj.success != "") {
            Mojo.Log.info("Add share success!");
            Mojo.Controller.getAppController().showBanner({ messageText: 'Content shared!', icon: 'images/notify.png' }, { source: 'notification' });
            
        } else {
            Mojo.Log.error("Add share failure: " + response);
        }
        this.handleCancelPress();
    }.bind(this));
}

NewshareAssistant.prototype.deactivate = function(event) {
    Mojo.Log.info("NewShare assistant deactivated");
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    Mojo.Event.stopListening(this.controller.get("txtShareContent"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.stopListening(this.controller.get("goButton"), Mojo.Event.tap, this.handleOKPress.bind(this));
    Mojo.Event.stopListening(this.controller.get("cancelButton"), Mojo.Event.tap, this.handleCancelPress.bind(this));
};

NewshareAssistant.prototype.cleanup = function(event) {
    Mojo.Log.info("NewShare assistant cleaned up");
    /* this function should do any cleanup needed before the scene is destroyed as 
       a result of being popped off the scene stack */
};