function NewuserAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
}

NewuserAssistant.prototype.setup = function() {
    /* setup widgets here */
    this.controller.setupWidget("scrollTnC",
        this.attributes = {
            mode: 'vertical'
        },
        this.model = {}
    );

    //Agree Button
    this.controller.setupWidget("btnAgree", { type: Mojo.Widget.defaultButton }, { label: "Agree", buttonClass: "affirmative", disabled: true });
    //Cancel Button
    this.controller.setupWidget("btnCancel", { type: Mojo.Widget.defaultButton }, { label: "Cancel", buttonClass: "negative", disabled: false });
    //OK Button
    this.controller.setupWidget("btnOK", { type: Mojo.Widget.activityButton }, { label: "Create Space", buttonClass: "affirmative", disabled: false });

    //Username Field
    this.controller.setupWidget("txtUsername",
        this.attributes = {
            hintText: $L("Choose a username"),
            multiline: false,
            enterSubmits: false,
            focus: true,
            textCase: Mojo.Widget.steModeLowerCase,
            autoReplace: false
        },
        this.model = {
            disabled: false
        }
    );
    //Username Field
    this.controller.setupWidget("txtPassword",
        this.attributes = {
            hintText: $L("Enter a Password"),
            multiline: false,
            enterSubmits: false,
            focus: false,
            textCase: Mojo.Widget.steModeLowerCase,
            autoReplace: false
        },
        this.model = {
            disabled: false
        }
    ); 

    //Menu
    this.appMenuAttributes = { omitDefaultItems: true };
    this.appMenuModel = {};
    this.controller.setupWidget(Mojo.Menu.appMenu, this.appMenuAttributes, this.appMenuModel);
};

NewuserAssistant.prototype.activate = function(event) {
    /* add event handlers to listen to events from widgets */
    Mojo.Event.listen(this.controller.get("btnAgree"), Mojo.Event.tap, this.agreeClick.bind(this));
    Mojo.Event.listen(this.controller.get("btnCancel"), Mojo.Event.tap, this.cancelClick.bind(this));
    Mojo.Event.listen(this.controller.get("btnOK"), Mojo.Event.tap, this.okClick.bind(this));
    //bind tryagain listener
    this.controller.get("imgTryagain").addEventListener("click", this.generateSharePhrase.bind(this));

    //Get terms and conditions from service and put into UI
    serviceModel.GetTnC(function(response) {
        this.controller.get("divTnC").innerHTML = response;
        Mojo.Additions.DisableWidget("btnAgree", false);
    }.bind(this));
    this.sharephrase = "";

    //Resize event
    this.controller.window.onresize = this.calculateControlsPosition.bind(this);
    this.calculateControlsPosition();
};

NewuserAssistant.prototype.calculateControlsPosition = function() {
    this.controller.get("scrollTnC").style.height = (window.innerHeight - 180) + "px";
}

NewuserAssistant.prototype.agreeClick = function(event) {

    Mojo.Additions.DisableWidget("btnAgree", true);
    this.controller.get("divCredentials").style.display = "block";
    this.controller.get("btnOK").style.display = "block";
    //this.controller.get("btnCancel").style.display = "none";
    this.generateSharePhrase();
    this.controller.getSceneScroller().mojo.revealElement(document.getElementById("txtPassword"));
}

NewuserAssistant.prototype.generateSharePhrase = function() {
    //Get new credentials from service and put into UI
    serviceModel.GetRandomWords(function(response) {
        Mojo.Log.info(response);
        if (response) {
            this.controller.get("divSharephrase").innerHTML = response;
            this.sharephrase = response;
        } else {
            Mojo.Additions.ShowDialogBox("Service Error", "Did not receive random words from service.");
        }
    }.bind(this));
}

NewuserAssistant.prototype.okClick = function(event) {
    //validate input
    var disallowed = ["con", "prn", "aux", "nul", "com", "do", "done", "elif", "else", "esac", "fi", "for", "function", "if", "in", "select", "then", "until", "while", "time"];
    this.username = this.controller.get('txtUsername').mojo.getValue().toLowerCase();
    if (this.username == "" || disallowed.indexOf(this.username) != -1 || this.username.match(/[^a-z]/g) || this.username.indexOf(" ") != -1) {
        Mojo.Additions.ShowDialogBox("Invalid username", "Your username must be one word, alphabetic characters only, and cannot contain any reserved words for Unix or Windows operating systems.");
        this.controller.get('btnOK').mojo.deactivate();
    } else {
        if (this.sharephrase && this.sharephrase != "") {
            this.password = this.controller.get('txtPassword').mojo.getValue().toLowerCase();
            if (this.password == "" || disallowed.indexOf(this.password) != -1 || this.password.match(/[^A-Za-z0-9 ]/g) || this.password.indexOf(" ") != -1) {
                Mojo.Additions.ShowDialogBox("Invalid password", "Your password must be one word, alpha-numeric characters only, and cannot contain any reserved words for Unix or Windows operating systems.");
                this.controller.get('btnOK').mojo.deactivate();
            } else {
                serviceModel.DoNewUserRequest(this.username, this.sharephrase, this.password, function(responseObj) {
                    if (responseObj != null) {
                        appModel.AppSettingsCurrent["Username"] = this.username;
                        appModel.AppSettingsCurrent["Credential"] = this.password;
                        appModel.AppSettingsCurrent["SharePhrase"] = this.sharephrase;
                        appModel.SaveSettings();
                        Mojo.Log.info("Successfully created account ", appModel.AppSettingsCurrent["Username"], appModel.AppSettingsCurrent["Credential"], appModel.AppSettingsCurrent["SharePhrase"]);
        
                        var stageController = Mojo.Controller.getAppController().getActiveStageController();
                        stageController.swapScene({ transition: Mojo.Transition.zoomFade, name: "welcome" });
                    } else {
                        Mojo.Log.error("No usable response from server while uploading share");
                        Mojo.Controller.getAppController().showBanner({ messageText: "Bad response uploading image", icon: "images/notify.png" }, "", "");
                    }
                    this.controller.get('btnOK').mojo.deactivate();
                }.bind(this), this.errorHandler.bind(this));
            }
        } else {
            Mojo.Additions.ShowDialogBox("Missing Share Phrase", "The share phrase is provided by the server, but appears to be missing. This likely means the server is unreachable, down, or improperly configured.");
            this.controller.get('btnOK').mojo.deactivate();
        }
    }
}

NewuserAssistant.prototype.cancelClick = function(event) {
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    stageController.swapScene({ transition: Mojo.Transition.zoomFade, name: "main" });
}

NewuserAssistant.prototype.errorHandler = function (errorText, callback) {
    Mojo.Log.error(errorText);
    Mojo.Controller.getAppController().showBanner({ messageText: errorText, icon: "images/notify.png" }, "", "");
    errorText = errorText.charAt(0).toUpperCase() + errorText.slice(1);
    Mojo.Additions.ShowDialogBox("Share Sevice Error", errorText);
    this.controller.get('btnOK').mojo.deactivate();
}

NewuserAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */

    Mojo.Event.stopListening(this.controller.get("btnAgree"), Mojo.Event.tap, this.agreeClick);
    Mojo.Event.stopListening(this.controller.get("btnCancel"), Mojo.Event.tap, this.cancelClick);
    Mojo.Event.stopListening(this.controller.get("btnOK"), Mojo.Event.tap, this.cancelClick);
    this.controller.window.removeEventListener("resize", this.calculateControlsPosition);
    this.controller.window.onresize = null;
};

NewuserAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */

};