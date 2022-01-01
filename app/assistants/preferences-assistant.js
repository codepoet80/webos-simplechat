function PreferencesAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
}

PreferencesAssistant.prototype.setup = function() {
    /* setup widgets here */

    //Refresh timeout picker
    this.controller.setupWidget("listRefresh",
        this.attributes = {
            label: $L("Refresh"),
            choices: [
                { label: "Manual", value: "" },
                { label: "1 minute", value: 60000 },
                { label: "2 minutes", value: 120000 },
                { label: "3 minutes", value: 180000 },
                { label: "5 minutes", value: 300000 }
            ]
        },
        this.model = {
            value: appModel.AppSettingsCurrent["RefreshTimeout"],
            disabled: false
        }
    );
    //Toggles
    var disableDL = true;
    if (appModel.FileMgrPresent)
        disableDL = false;
    this.controller.setupWidget("toggleAutoDownload",
        this.attributes = {
            trueValue: true,
            falseValue: false
        },
        this.model = {
            value: appModel.AppSettingsCurrent["UseAutoDownload"],
            disabled: disableDL
        }
    );
    //List boxes
    this.controller.setupWidget("listAutoDownloadTime",
        this.attributes = {
            label: $L("Download Interval"),
            choices: [
                { label: "5 minutes", value: "00:05:00" },
                { label: "30 minutes", value: "00:30:00" },
                { label: "1 Hour", value: "01:00:00" },
                { label: "2 Hours", value: "02:00:00" },
                { label: "3 Hours", value: "03:00:00" },
                { label: "6 Hours", value: "06:00:00" },
                { label: "12 Hours", value: "12:00:00" },
                { label: "24 Hours", value: "23:59:59" }
            ]
        },
        this.model = {
            value: appModel.AppSettingsCurrent["AutoDownloadTime"],
            disabled: disableDL
        }
    );
    if (appModel.FileMgrPresent)
        this.controller.get("divDownloadExplain").innerHTML = "Frequent automatic downloads can have significant impact on battery life.";
    //More toggles
    this.controller.setupWidget("toggleCopyLinkOnShare",
        this.attributes = {
            trueValue: true,
            falseValue: false
        },
        this.model = {
            value: appModel.AppSettingsCurrent["CopyLinkOnShare"],
            disabled: false
        }
    );
    this.controller.setupWidget("toggleForceHTTP",
        this.attributes = {
            trueValue: true,
            falseValue: false
        },
        this.model = {
            value: appModel.AppSettingsCurrent["ForceHTTP"],
            disabled: false
        }
    );
    this.controller.setupWidget("toggleCustomClientId",
        this.attributes = {
            trueValue: true,
            falseValue: false
        },
        this.model = {
            value: appModel.AppSettingsCurrent["UseCustomClientId"],
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
    //Text fields
    this.controller.setupWidget("txtCustomClientId",
        this.attributes = {
            hintText: $L("Your Service Client Id"),
            multiline: false,
            enterSubmits: false,
            autoReplace: false,
            textCase: Mojo.Widget.steModeLowerCase
        },
        this.model = {
            value: appModel.AppSettingsCurrent["CustomClientId"],
            disabled: !appModel.AppSettingsCurrent["UseCustomEndpoint"]
        }
    );
    this.controller.setupWidget("txtEndpointURL",
        this.attributes = {
            hintText: $L("http://your-server.com/"),
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
    this.controller.setupWidget("txtShortURL",
        this.attributes = {
            hintText: $L("http://short.link/"),
            multiline: false,
            enterSubmits: false,
            autoReplace: false,
            textCase: Mojo.Widget.steModeLowerCase
        },
        this.model = {
            value: appModel.AppSettingsCurrent["ShortURL"],
            disabled: !appModel.AppSettingsCurrent["UseCustomEndpoint"]
        }
    );
    this.controller.setupWidget("txtCustomCreateKey",
        this.attributes = {
            hintText: $L("Your Service Create Key"),
            multiline: false,
            enterSubmits: false,
            autoReplace: false,
            textCase: Mojo.Widget.steModeLowerCase
        },
        this.model = {
            value: appModel.AppSettingsCurrent["CustomCreateKey"],
            disabled: !appModel.AppSettingsCurrent["UseCustomEndpoint"]
        }
    );
    //Drawer
    this.controller.setupWidget("drawerSelfHost",
        this.attributes = {
            modelProperty: 'open',
            unstyled: false
        },
        this.model = {
            open: appModel.AppSettingsCurrent["UseCustomEndpoint"]
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
    
};

PreferencesAssistant.prototype.activate = function(event) {
    /* put in event handlers here that should only be in effect when this scene is active. For
       example, key handlers that are observing the document */

    /* add event handlers to listen to events from widgets */
    Mojo.Event.listen(this.controller.get("listRefresh"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("toggleAutoDownload"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("listAutoDownloadTime"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("toggleCopyLinkOnShare"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("toggleForceHTTP"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("toggleCustomClientId"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("txtCustomClientId"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("toggleCustomEndPoint"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("txtEndpointURL"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("txtShortURL"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("txtCustomCreateKey"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("btnOK"), Mojo.Event.tap, this.okClick.bind(this));
};

PreferencesAssistant.prototype.showBetaFeatures = function() {
    //No beta features right now
}

PreferencesAssistant.prototype.handleValueChange = function(event) {

    Mojo.Log.info(event.srcElement.id + " value changed to " + event.value);
    switch (event.srcElement.id) {
        case "toggleCustomClientId":
            {
                var thisWidgetSetup = this.controller.getWidgetSetup("txtCustomClientId");
                thisWidgetSetup.model.disabled = !event.value;
                this.controller.modelChanged(thisWidgetSetup.model);
                if (event.value)
                    this.controller.get('txtCustomClientId').mojo.focus();
                break;
            }
        case "toggleAutoDownload":
            {
                var thisWidgetSetup = this.controller.getWidgetSetup("listAutoDownloadTime");
                thisWidgetSetup.model.disabled = !event.value;
                this.controller.modelChanged(thisWidgetSetup.model);
                break;
            }
        case "toggleCustomEndPoint":
            {
                //Toggle enabled on related text boxes
                var thisWidgetSetup = this.controller.getWidgetSetup("drawerSelfHost");
                thisWidgetSetup.model.open = event.value;
                this.controller.modelChanged(thisWidgetSetup.model);
                var thisWidgetSetup = this.controller.getWidgetSetup("txtEndpointURL");
                thisWidgetSetup.model.disabled = !event.value;
                this.controller.modelChanged(thisWidgetSetup.model);
                var thisWidgetSetup = this.controller.getWidgetSetup("txtShortURL");
                thisWidgetSetup.model.disabled = !event.value;
                this.controller.modelChanged(thisWidgetSetup.model);
                var thisWidgetSetup = this.controller.getWidgetSetup("txtCustomCreateKey");
                thisWidgetSetup.model.disabled = !event.value;
                this.controller.modelChanged(thisWidgetSetup.model);
                if (event.value)
                    this.controller.get('txtEndpointURL').mojo.focus();
                break;
            }
        case "txtEndpointURL":
            var lastChar = event.value[event.value.length - 1]
            if (lastChar != "/") {
                event.value = event.value + "/";
                Mojo.Log.warn("Custom end point URL was missing trailing slash, it has been added. Value is now: " + event.value);
            }
            if(!appModel.AppSettingsCurrent["ShortURL"] || appModel.AppSettingsCurrent["ShortURL"] == "") {
                this.controller.get('txtShortURL').mojo.setValue(event.value);
                appModel.AppSettingsCurrent["ShortURL"] = event.value;
            }
            break;
    }

    //We stashed the preference name in the title of the HTML element, so we don't have to use a case statement
    Mojo.Log.info(event.srcElement.title + " now: " + event.value);
    appModel.AppSettingsCurrent[event.srcElement.title] = event.value;
    appModel.SaveSettings();
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
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    stageController.popScene();
}

PreferencesAssistant.prototype.deactivate = function(event) {
    if (this.controller.get('txtEndpointURL').mojo.getValue() == "") {
        appModel.AppSettingsCurrent["UseCustomEndpoint"] = false;
    }
    appModel.SaveSettings();
    appModel.EstablishAlarms();

    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    Mojo.Event.stopListening(this.controller.get("listRefresh"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("toggleAutoDownload"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("listAutoDownloadTime"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("toggleForceHTTP"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("toggleCustomClientId"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("txtCustomClientId"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("toggleCustomEndPoint"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("txtEndpointURL"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("txtShortURL"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("txtCustomCreateKey"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("btnOK"), Mojo.Event.tap, this.okClick);
};

PreferencesAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */

};