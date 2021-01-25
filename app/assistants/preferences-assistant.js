function PreferencesAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
}

PreferencesAssistant.prototype.setup = function() {
    /* setup widgets here */

    //Timeout picker
    this.controller.setupWidget("listForegroundUpdate",
        this.attributes = {
            label: $L("Foreground Update"),
            choices: [
                { label: "5 seconds", value: 5000 },
                { label: "10 seconds", value: 10000 },
                { label: "30 second", value: 30000 },
                { label: "1 minute", value: 60000 },
                { label: "2 minutes", value: 120000 },
                { label: "5 minutes", value: 180000 },
            ]
        },
        this.model = {
            value: appModel.AppSettingsCurrent["ForegroundUpdate"],
            disabled: false
        }
    );
    this.controller.setupWidget("listBackgroundUpdate",
        this.attributes = {
            label: $L("Background Update"),
            choices: [
                { label: "2 minutes", value: 120000 },
                { label: "5 minutes", value: 300000 },
                { label: "10 minutes", value: 600000 },
                { label: "15 minutes", value: 900000 },
                { label: "30 minutes", value: 1800000 },
                { label: "1 Hour", value: 3600000 },
            ]
        },
        this.model = {
            value: appModel.AppSettingsCurrent["BackgroundUpdate"],
            disabled: true
        }
    );
    //API Toggles
    this.controller.setupWidget("toggleClientAPI",
        this.attributes = {
            trueValue: true,
            falseValue: false
        },
        this.model = {
            value: appModel.AppSettingsCurrent["UseClientAPIKey"],
            disabled: false
        }
    );
    this.controller.setupWidget("toggleCustomEndPoint",
        this.attributes = {
            trueValue: true,
            falseValue: false
        },
        this.model = {
            value: appModel.AppSettingsCurrent["UseCustomEndpoint"],
            disabled: false
        }
    );
    //API Text fields
    this.controller.setupWidget("txtClientAPI",
        this.attributes = {
            hintText: $L("Your Client Id"),
            multiline: false,
            enterSubmits: false,
            autoReplace: false,
            textCase: Mojo.Widget.steModeLowerCase
        },
        this.model = {
            value: appModel.AppSettingsCurrent["ClientAPIKey"],
            disabled: !appModel.AppSettingsCurrent["UseClientAPIKey"]
        }
    );
    this.controller.setupWidget("txtEndpointURL",
        this.attributes = {
            hintText: $L("http://your-simplechat-server.com"),
            multiline: false,
            enterSubmits: false,
            autoReplace: false,
            textCase: Mojo.Widget.steModeLowerCase
        },
        this.model = {
            value: appModel.AppSettingsCurrent["EndpointURL"],
            disabled: !appModel.AppSettingsCurrent["EndpointURL"]
        }
    );
    //OK Button
    this.controller.setupWidget("btnOK", { type: Mojo.Widget.activityButton }, { label: "Done", disabled: false });
    //Menu
    this.appMenuAttributes = { omitDefaultItems: true };
    this.appMenuModel = {
        label: "Settings",
        items: [
            Mojo.Menu.editItem,
            { label: "Reset Settings", command: 'do-resetSettings' }
        ]
    };
    this.controller.setupWidget(Mojo.Menu.appMenu, this.appMenuAttributes, this.appMenuModel);

    /* add event handlers to listen to events from widgets */
    Mojo.Event.listen(this.controller.get("listForegroundUpdate"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("listBackgroundUpdate"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("txtClientAPI"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("txtEndpointURL"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("toggleClientAPI"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("toggleCustomEndPoint"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("btnOK"), Mojo.Event.tap, this.okClick.bind(this));
};

PreferencesAssistant.prototype.activate = function(event) {
    /* put in event handlers here that should only be in effect when this scene is active. For
       example, key handlers that are observing the document */
    //this.showBetaFeatures();
};

PreferencesAssistant.prototype.showBetaFeatures = function() {
    //No beta features right now
}

PreferencesAssistant.prototype.handleValueChange = function(event) {

    Mojo.Log.info(event.srcElement.id + " value changed to " + event.value);
    if (event.srcElement.id == "toggleGoogleAPI") {
        var thisWidgetSetup = this.controller.getWidgetSetup("txtGoogleAPI");
        thisWidgetSetup.model.disabled = !event.value;
        this.controller.modelChanged(thisWidgetSetup.model);
        if (event.value)
            this.controller.get('txtGoogleAPI').mojo.focus();
    } else if (event.srcElement.id == "toggleClientAPI") {
        var thisWidgetSetup = this.controller.getWidgetSetup("txtClientAPI");
        thisWidgetSetup.model.disabled = !event.value;
        this.controller.modelChanged(thisWidgetSetup.model);
        if (event.value)
            this.controller.get('txtClientAPI').mojo.focus();
    } else if (event.srcElement.id == "toggleServerKey") {
        var thisWidgetSetup = this.controller.getWidgetSetup("txtServerKey");
        thisWidgetSetup.model.disabled = !event.value;
        this.controller.modelChanged(thisWidgetSetup.model);
        if (event.value)
            this.controller.get('txtServerKey').mojo.focus();
    } else if (event.srcElement.id == "toggleCustomEndPoint") {
        var thisWidgetSetup = this.controller.getWidgetSetup("txtEndpointURL");
        thisWidgetSetup.model.disabled = !event.value;
        this.controller.modelChanged(thisWidgetSetup.model);
        if (event.value)
            this.controller.get('txtEndpointURL').mojo.focus();
    }

    //We stashed the preference name in the title of the HTML element, so we don't have to use a case statement
    Mojo.Log.info(event.srcElement.title + " now: " + event.value);
    appModel.AppSettingsCurrent[event.srcElement.title] = event.value;
    appModel.SaveSettings();

    //Show/hide beta features
    this.showBetaFeatures();
};

//Handle menu and button bar commands
PreferencesAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-goBack':
                Mojo.Controller.stageController.popScene();
                break;
            case 'do-resetSettings':
                appModel.ResetSettings(appModel.AppSettingsDefaults);
                break;
        }
    }
};

PreferencesAssistant.prototype.okClick = function(event) {
    Mojo.Controller.stageController.popScene();
}

PreferencesAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */

    Mojo.Event.stopListening(this.controller.get("listSearchmax"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("listTimeout"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("txtGoogleAPI"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("txtClientAPI"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("toggleGoogleAPI"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("toggleClientAPI"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("toggleServerKey"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("btnOK"), Mojo.Event.tap, this.okClick.bind(this));

};

PreferencesAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */

};