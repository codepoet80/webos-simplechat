function LoginAssistant(sceneAssistant, doneCallBack) {
    this.doneCallBack = doneCallBack;
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
    Mojo.Log.info("new Login assistant exists");
    this.sceneAssistant = sceneAssistant; //dialog's do not have their own controller, so need access to the launching scene's controller
}

LoginAssistant.prototype.setup = function(widget) {
    /* this function is for setup tasks that have to happen when the scene is first created */
    this.widget = widget;
    Mojo.Log.info("login assistant setup");
    Mojo.Log.info("Current Move is: " + appModel.AppSettingsCurrent["Username"]);

    /* setup widgets here */
    this.sceneAssistant.controller.setupWidget("txtUsername",
        this.attributes = {
            textFieldName: "Username",
            hintText: "User or Service Name",
            property: 'value',
            multiline: false,
            changeOnKeyPress: true,
            autoReplace: false,
            textCase: Mojo.Widget.steModeLowerCase,
            requiresEnterKey: false,
            focus: false
        },
        this.model = {
            value: appModel.AppSettingsCurrent["Username"],
            disabled: false
        }
    );
    this.sceneAssistant.controller.setupWidget("txtCredential",
        this.attributes = {
            textFieldName: "Credential",
            hintText: "Share phrase or password",
            property: 'value',
            multiline: false,
            changeOnKeyPress: true,
            autoReplace: false,
            textCase: Mojo.Widget.steModeLowerCase,
            requiresEnterKey: false,
            focus: false
        },
        this.model = {
            value: appModel.AppSettingsCurrent["Credential"],
            disabled: false
        }
    );
    this.sceneAssistant.controller.setupWidget("linkSpinner",
        this.attributes = {
            spinnerSize: "small"
        },
        this.model = {
            spinning: true
        }
    );
    this.sceneAssistant.controller.setupWidget("goButton", { type: Mojo.Widget.activityButton }, { label: "OK", disabled: false });
    this.sceneAssistant.controller.setupWidget("cancelButton", { type: Mojo.Widget.button }, { label: "Cancel", disabled: false });

    /* add event handlers to listen to events from widgets */
    Mojo.Event.listen(this.sceneAssistant.controller.get("txtUsername"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.sceneAssistant.controller.get("txtCredential"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.sceneAssistant.controller.get("goButton"), Mojo.Event.tap, this.handleGoPress.bind(this));
    Mojo.Event.listen(this.sceneAssistant.controller.get("cancelButton"), Mojo.Event.tap, this.handleCancelPress.bind(this));
};

LoginAssistant.prototype.activate = function(event) {
    Mojo.Log.info("Login assistant activated");
    /* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */

};

LoginAssistant.prototype.handleValueChange = function(event) {
    //Mojo.Log.info(event.srcElement.title + " now: " + event.value);
    /*if (event.srcElement.title == "Username" && event.value.toLowerCase() == "jjj" && devModeChessMove && devModeGrandmaster) {
        Mojo.Controller.getAppController().showBanner("Dev mode enabled!", { source: 'notification' });
        Mojo.Log.warn("Switching to Developer Mode! " + devModeChessMove);
        appModel.AppSettingsCurrent["Username"] = devModeChessMove;
        appModel.AppSettingsCurrent["Credential"] = devModeGrandmaster;
    } else {*/
        //We stashed the preference name in the title of the HTML element, so we don't have to use a case statement
        appModel.AppSettingsCurrent[event.srcElement.title] = event.value;
    //}
}

LoginAssistant.prototype.handleCancelPress = function(event) {
    this.doneCallBack(false);
    this.widget.mojo.close();
}

LoginAssistant.prototype.handleGoPress = function(event) {

    //Update UI for this state
    this.sceneAssistant.controller.get("addressError").style.display = "none";
    this.sceneAssistant.controller.get("linkError").style.display = "none";

    this.tryServiceLogin(this.handleLoginResponse.bind(this));
}

LoginAssistant.prototype.tryServiceLogin = function(callback) {
    serviceModel.DoShareListRequest(appModel.AppSettingsCurrent["Username"], appModel.AppSettingsCurrent["Credential"], callback);
}

LoginAssistant.prototype.handleLoginResponse = function(response) {
    Mojo.Log.info("login response was: " + response);
    try {
        var responseObj = JSON.parse(response);
    } catch (ex) {
        Mojo.Log.error("Could not parse login response: " + response);
        //Show error message
        Mojo.Controller.errorDialog("The server response to the log in request was malformed. Login failed.");
        //Dismiss this dialog
        this.doneCallBack(false);
        this.widget.mojo.close();
    }
    if (responseObj && responseObj.shares && responseObj.shares != "") {
        Mojo.Log.info("Login success!");
        //appModel.AppSettingsCurrent["Username"] = responseObj.notation;
        appModel.SaveSettings();
        //Dismiss this dialog
        this.doneCallBack(true);
        this.widget.mojo.close();
    } else {
        Mojo.Log.warn("Login failure: " + response);
        //Show error message
        Mojo.Controller.errorDialog("Login failure. Check connectivity and your credentials. If you haven't logged in for a long time, create a new account.");
        //Dismiss this dialog
        this.doneCallBack(false);
        this.widget.mojo.close();
    }

}

LoginAssistant.prototype.deactivate = function(event) {
    Mojo.Log.info("Login assistant deactivated");
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    Mojo.Event.stopListening(this.sceneAssistant.controller.get("txtUsername"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.stopListening(this.sceneAssistant.controller.get("txtCredential"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.stopListening(this.sceneAssistant.controller.get("goButton"), Mojo.Event.tap, this.handleGoPress.bind(this));
    Mojo.Event.stopListening(this.sceneAssistant.controller.get("cancelButton"), Mojo.Event.tap, this.handleCancelPress.bind(this));
};

LoginAssistant.prototype.cleanup = function(event) {
    Mojo.Log.info("Login assistant cleaned up");
    /* this function should do any cleanup needed before the scene is destroyed as 
       a result of being popped off the scene stack */
};