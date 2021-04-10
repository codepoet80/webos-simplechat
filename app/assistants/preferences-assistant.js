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
    var backgroundValue;
    if (!appModel.AppSettingsCurrent["BackgroundUpdate"] || appModel.AppSettingsCurrent["BackgroundUpdate"] == 0 || appModel.AppSettingsCurrent["BackgroundUpdate"] == "")
        backgroundValue = "-1";
    else
        backgroundValue = appModel.AppSettingsCurrent["BackgroundUpdate"]
    this.controller.setupWidget("listBackgroundUpdate",
        this.attributes = {
            label: $L("Background Update"),
            choices: [
                { label: "Off", value: -1 },
                { label: "30 minutes", value: "00:30:00" },
                { label: "1 Hour", value: "01:00:00" },
                { label: "2 Hours", value: "02:00:00" },
                { label: "5 Hours", value: "05:00:00" },
            ]
        },
        this.model = {
            value: backgroundValue,
            disabled: false
        }
    );
    //Emoji toggle
    this.controller.setupWidget("toggleEmojis",
        this.attributes = {
            trueValue: true,
            falseValue: false
        },
        this.model = {
            value: appModel.AppSettingsCurrent["ShowEmojis"],
            disabled: false
        }
    );
    //Setup sound picker
    this.soundChoices = {
        choices: [
            { label: "Choose...", value: "choose" },
            { label: "Off", value: "off" }
        ]
    };
    if (appModel.AppSettingsCurrent["AlertSound"] != "off") {
        var useVal = appModel.AppSettingsCurrent["AlertSound"];
        var labelVal = useVal;
        if (Mojo.Environment.DeviceInfo.platformVersionMajor < 3) {
            labelVal = useVal.substring(0, 8) + "...";
        }
        this.soundChoices.choices.unshift({ label: labelVal, value: useVal });
    }
    this.controller.setupWidget("listAlertSound",
        this.attributes = this.soundChoices,
        this.model = {
            value: appModel.AppSettingsCurrent["AlertSound"],
            disabled: false
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
            focus: false,
            autoFocus: false,
            textCase: Mojo.Widget.steModeLowerCase
        },
        this.model = {
            value: appModel.AppSettingsCurrent["ClientAPIKey"],
            disabled: !appModel.AppSettingsCurrent["UseClientAPIKey"]
        }
    );
    this.controller.setupWidget("txtEndpointURL",
        this.attributes = {
            hintText: $L("http://your-chat-server.com/"),
            multiline: false,
            enterSubmits: false,
            autoReplace: false,
            textCase: Mojo.Widget.steModeLowerCase
        },
        this.model = {
            value: appModel.AppSettingsCurrent["EndpointURL"],
            disabled: !appModel.AppSettingsCurrent["UseCustomEndpoint"]
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
    Mojo.Event.listen(this.controller.get("toggleEmojis"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("listAlertSound"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
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
    switch (event.srcElement.id) {
        case "toggleEmojis":
            Mojo.Log.info("Should show banner!");
            Mojo.Controller.getAppController().showBanner({ messageText: "Re-launch app to apply this setting" }, "", "");
            break;
        case "listAlertSound":
            if (event.value == "choose") {
                this.setAlarmSound();
            } else {
                appModel.AppSettingsCurrent["AlertSound"] = event.value;
            }
            break;
        case "toggleClientAPI":
            var thisWidgetSetup = this.controller.getWidgetSetup("txtClientAPI");
            thisWidgetSetup.model.disabled = !event.value;
            this.controller.modelChanged(thisWidgetSetup.model);
            if (event.value)
                this.controller.get('txtClientAPI').mojo.focus();
            break;
        case "toggleCustomEndPoint":
            var thisWidgetSetup = this.controller.getWidgetSetup("txtEndpointURL");
            thisWidgetSetup.model.disabled = !event.value;
            this.controller.modelChanged(thisWidgetSetup.model);
            if (event.value)
                this.controller.get('txtEndpointURL').mojo.focus();
            break;
    }

    //We stashed the preference name in the title of the HTML element, so we don't have to use a case statement
    Mojo.Log.info(event.srcElement.title + " now: " + event.value);
    appModel.AppSettingsCurrent[event.srcElement.title] = event.value;
    appModel.SaveSettings();

    //Show/hide beta features
    this.showBetaFeatures();
};

// opens ringtone picker.
PreferencesAssistant.prototype.setAlarmSound = function() {
    var self = this;
    var params = {
        defaultKind: 'ringtone',
        onSelect: function(file) {
            var fileToUse = file.fullPath.replace("/media/internal/ringtones/", "").replace(".mp3", "");
            appModel.AppSettingsCurrent["AlertSound"] = fileToUse;
            appModel.SaveSettings();

            var useVal = fileToUse;
            var labelVal = useVal;
            try {
                if (Mojo.Environment.DeviceInfo.platformVersionMajor < 3) {
                    labelVal = useVal.substring(0, 8) + "...";
                }
            } catch (ex) {
                Mojo.Log.error("Could not set ringtone value");
            }

            self.soundChoices.choices[0].label = labelVal;
            self.soundChoices.choices[0].value = useVal;

            var thisWidgetSetup = self.controller.getWidgetSetup("listAlertSound");
            var thisWidgetModel = thisWidgetSetup.model;
            thisWidgetModel.value = fileToUse;

            self.controller.setWidgetModel("listAlertSound", thisWidgetModel);
            self.controller.modelChanged(thisWidgetModel);

            Mojo.Log.info("alarm sound changed to: " + fileToUse)

        }
    }
    var appController = Mojo.Controller.getAppController();
    var stageController = appController.getStageProxy("main");
    Mojo.FilePicker.pickFile(params, stageController);
}

//Handle menu and button bar commands
PreferencesAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-goBack':
                this.okClick();
                break;
            case 'do-resetSettings':
                appModel.ResetSettings(appModel.AppSettingsDefaults);
                break;
        }
    }
};

PreferencesAssistant.prototype.okClick = function(event) {
    var appController = Mojo.Controller.getAppController();
    var stageController = appController.getStageProxy("main");
    stageController.popScene();
}

PreferencesAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */

    systemModel.ClearSystemAlarm("SimpleChat");
    if (appModel.AppSettingsCurrent["BackgroundUpdate"] && appModel.AppSettingsCurrent["BackgroundUpdate"] != "" && appModel.AppSettingsCurrent["BackgroundUpdate"] != -1)
        systemModel.SetSystemAlarmRelative("SimpleChat", appModel.AppSettingsCurrent["BackgroundUpdate"]);

    Mojo.Event.stopListening(this.controller.get("listForegroundUpdate"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("listBackgroundUpdate"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("listAlertSound"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("txtClientAPI"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("toggleClientAPI"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("toggleCustomEndPoint"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("btnOK"), Mojo.Event.tap, this.okClick.bind(this));

};

PreferencesAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */

};