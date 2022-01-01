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
    Mojo.Log.info("Using Last Share: " + JSON.stringify(appModel.LastShareSelected));
    this.controller.setupWidget("txtShareContent",
        this.attributes = textAttrib,
        this.model = {
            value: appModel.LastShareSelected.content,
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
    Mojo.Event.listen(this.controller.get("goButton"), Mojo.Event.tap, this.handleOKPress.bind(this));
    Mojo.Event.listen(this.controller.get("cancelButton"), Mojo.Event.tap, this.handleCancelPress.bind(this));
    //Resize event
    this.controller.window.onresize = this.calculateControlsPosition.bind(this);
    this.calculateControlsPosition();
};

NewshareAssistant.prototype.calculateControlsPosition = function() {
    var maxHeight = 380;
    if ((this.controller.window.innerHeight - 210) < maxHeight)
        maxHeight = this.controller.window.innerHeight - 210;
    this.controller.get("txtShareContent").style.height = maxHeight + "px";
}

NewshareAssistant.prototype.handleCancelPress = function(event) {
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    stageController.pushScene({ transition: Mojo.Transition.crossFade, name: "main" });
}

NewshareAssistant.prototype.handleOKPress = function(event) {
    var shareContent = this.controller.get("txtShareContent").mojo.getValue();
    if (shareContent && shareContent != "") {
        if (appModel.LastShareSelected.contenttype == "application/json") {
            try {
                var testObj = JSON.parse(shareContent);
            } catch (ex) {
                Mojo.Controller.getAppController().showBanner({ messageText: 'JSON content not be parsed', icon: 'assets/notify.png' }, { source: 'notification' });
                this.controller.get('goButton').mojo.deactivate();
                this.controller.window.setTimeout(this.controller.get('txtShareContent').mojo.focus(), 500);
                return false;
            }
        }
        appModel.LastShareSelected.content = shareContent;        
        this.tryAddShare();
    } else {
        this.controller.get('goButton').mojo.deactivate();
        this.controller.get("txtShareContent").mojo.focus();
    }
}

NewshareAssistant.prototype.tryAddShare = function() {
    serviceModel.DoShareAddRequestText(appModel.LastShareSelected.content, appModel.AppSettingsCurrent["Username"], appModel.AppSettingsCurrent["Credential"], appModel.LastShareSelected.contenttype, function(responseObj) {
        if (responseObj && responseObj.guid && responseObj.guid != "") {
            Mojo.Log.info("Add share success!");
            if (appModel.AppSettingsCurrent["CopyLinkOnShare"]) {
                var stageController = Mojo.Controller.getAppController().getActiveStageController()
                stageController.setClipboard(serviceModel.MakeShareURL(appModel.AppSettingsCurrent["Username"], responseObj.guid, "text"));
                Mojo.Controller.getAppController().showBanner({ messageText: 'Content shared, link copied!', icon: 'assets/notify.png' }, { source: 'notification' });
            } else {
                Mojo.Controller.getAppController().showBanner({ messageText: 'Content shared!', icon: 'assets/notify.png' }, { source: 'notification' });
            }
        } else {
            this.errorHandler("Share failure: " + JSON.stringify(responseObj))
        }
        this.handleCancelPress();
    }.bind(this), this.errorHandler.bind(this));
}

NewshareAssistant.prototype.errorHandler = function (errorText, callback) {
    Mojo.Log.error(errorText);
    Mojo.Controller.getAppController().showBanner({ messageText: errorText, icon: "assets/notify.png" }, "", "");
    errorText = errorText.charAt(0).toUpperCase() + errorText.slice(1);
    this.controller.get('goButton').mojo.deactivate();
    Mojo.Additions.ShowDialogBox("Share Sevice Error", errorText);
}

NewshareAssistant.prototype.deactivate = function(event) {
    Mojo.Log.info("NewShare assistant deactivated");
    Mojo.Event.stopListening(this.controller.get("goButton"), Mojo.Event.tap, this.handleOKPress);
    Mojo.Event.stopListening(this.controller.get("cancelButton"), Mojo.Event.tap, this.handleCancelPress);
};

NewshareAssistant.prototype.cleanup = function(event) {
    Mojo.Log.info("NewShare assistant cleaned up");
    /* this function should do any cleanup needed before the scene is destroyed as 
       a result of being popped off the scene stack */
};