/*
    Share Space clipboard app for webOS.
    This app depends on a sharing service, which is hosted by webOS Archive at no cost for what remains of the webOS mobile community.
    You can also host the service yourself: http://www.github.com/codepoet80/sharing-service
*/

function MainAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
}

MainAssistant.prototype.setup = function() {

    //Load preferences
    appModel.LoadSettings();
    Mojo.Log.info("settings now: " + JSON.stringify(appModel.AppSettingsCurrent));
    
    //Loading spinner - with global members for easy toggling later
    this.spinnerAttrs = {
        spinnerSize: Mojo.Widget.spinnerLarge
    };
    this.spinnerModel = {
        spinning: false
    }
    this.controller.setupWidget('workingSpinner', this.spinnerAttrs, this.spinnerModel);
    //Share List (starts empty)
    this.emptyShares = [
        { id: "-1", videoName: "Empty", thumbnail: "", selectedState: true }
    ]
    this.shareListElement = this.controller.get('shareList');
    this.shareInfoModel = {
        items: this.emptyShares
    };
    //Share List templates (loads other HTML)
    this.template = {
        itemTemplate: 'main/item-template',
        listTemplate: 'main/list-template',
        swipeToDelete: true,
        preventDeleteProperty: "readonly",
        addItemLabel: "New Share"
    };
    this.controller.setupWidget("shareList", this.template, this.shareInfoModel);
    //Menu
    this.appMenuAttributes = { omitDefaultItems: true };
    this.appMenuModel = {
        label: "Settings",
        items: [
            Mojo.Menu.editItem,
            { label: "Preferences", command: 'do-Preferences' },
            { label: "Handle URLs", chosen: false, command: 'do-HandleURLs' },
            { label: "Log In", command: 'do-LogInOut' },
            { label: "About", command: 'do-myAbout' }
        ]
    };
    if(appModel.AppSettingsCurrent["SharePhrase"] && appModel.AppSettingsCurrent["SharePhrase"] != "") {
        this.appMenuModel.items.push({ label: "Show Share Phrase", command: 'do-mySharePhrase' });
    }
    this.controller.setupWidget(Mojo.Menu.appMenu, this.appMenuAttributes, this.appMenuModel);
    //Command Buttons
    this.cmdMenuAttributes = {
            spacerHeight: 40,
            //menuClass: 'no-fade'
        },
        this.cmdMenuModel = {
            visible: false,
            items: [{
                    items: [
                        { label: 'Refresh', icon: 'refresh', command: 'do-refresh' }
                    ]
                },
                {
                    items: [
                        { label: 'New', icon: 'new', command: 'do-new' }
                    ]
                }
            ]
        };
    this.controller.setupWidget(Mojo.Menu.commandMenu, this.cmdMenuAttributes, this.cmdMenuModel);
    /* Always on Event handlers */
    Mojo.Event.listen(this.controller.get("shareList"), Mojo.Event.listDelete, this.handleListDelete.bind(this));
    Mojo.Event.listen(this.controller.get("shareList"), Mojo.Event.listTap, this.handleListClick.bind(this));
    Mojo.Event.listen(this.controller.get("shareList"), Mojo.Event.listAdd, this.handleListAdd.bind(this));
    //Just type
    //this.keypressHandler = this.handleKeyPress.bindAsEventListener(this);
    //this.controller.document.addEventListener("keypress", this.keypressHandler, true);

    //Check for updates
    if (!appModel.UpdateCheckDone) {
        appModel.UpdateCheckDone = true;
        updaterModel.CheckForUpdate("Share Space", this.handleUpdateResponse.bind(this));
    }
};

MainAssistant.prototype.activate = function(event) {
    //Set options for service model
    serviceModel.ForceHTTP = appModel.AppSettingsCurrent["ForceHTTP"];
    serviceModel.UseCustomEndpoint = appModel.AppSettingsCurrent["UseCustomEndpoint"];
    serviceModel.CustomEndpointURL = appModel.AppSettingsCurrent["EndpointURL"];
    serviceModel.CustomShortURL = appModel.AppSettingsCurrent["ShortURL"];
    serviceModel.UseCustomClientId = appModel.AppSettingsCurrent["UseCustomClientId"];
    serviceModel.CustomClientId = appModel.AppSettingsCurrent["CustomClientId"];

    //Set correct menu label
    var loggedInLabel = "Log In";
    if (appModel.AppSettingsCurrent["Username"] != "" && appModel.AppSettingsCurrent["Credential"] != "") {
        loggedInLabel = "Log Out";
        var thisCommandModel = this.controller.getWidgetSetup(Mojo.Menu.commandMenu).model;
        thisCommandModel.visible = true;
        this.controller.modelChanged(thisCommandModel);
    }
    var thisMenuModel = this.controller.getWidgetSetup(Mojo.Menu.appMenu).model;
    thisMenuModel.items[3].label = loggedInLabel;
    this.controller.modelChanged(thisMenuModel);

    //find out what kind of device this is
    if (Mojo.Environment.DeviceInfo.platformVersionMajor >= 3) {
        this.DeviceType = "TouchPad";
        Mojo.Log.info("Device detected as TouchPad");
    } else {
        if (window.screen.width == 800 || window.screen.height == 800) {
            this.DeviceType = "Pre3";
            Mojo.Log.info("Device detected as Pre3");
        } else if ((window.screen.width == 480 || window.screen.height == 480) && (window.screen.width == 320 || window.screen.height == 320)) {
            this.DeviceType = "Pre";
            Mojo.Log.warn("Device detected as Pre or Pre2");
        } else {
            this.DeviceType = "Tiny";
            Mojo.Log.warn("Device detected as Pixi or Veer");
        }
    }
    if (appModel.AppSettingsCurrent["FirstRun"]) {
        appModel.AppSettingsCurrent["FirstRun"] = false;
        appModel.SaveSettings();
        this.showWelcomePrompt();
    } else {
        if (appModel.AppSettingsCurrent["Username"] != "" && appModel.AppSettingsCurrent["Credential"] != "") {
            Mojo.Log.info("About to fetch shares...");
            this.fetchShares();
            if (appModel.AppSettingsCurrent["RefreshTimeout"] && appModel.AppSettingsCurrent["RefreshTimeout"] > 1000) {
                Mojo.Log.info("Auto refresh interval: " + appModel.AppSettingsCurrent["RefreshTimeout"]);
                clearInterval(this.refreshInt);
                this.refreshInt = window.setInterval(this.fetchShares.bind(this), appModel.AppSettingsCurrent["RefreshTimeout"]);
            } else {
                Mojo.Log.warn("Using Manual Refresh");
            }
            //handle launch with query
            Mojo.Log.info("Main scene loaded with launch query: " + JSON.stringify(appModel.LaunchQuery));
            if (appModel.LaunchQuery && appModel.LaunchQuery != "") {
                if (appModel.LaunchQuery.newshare) {
                    Mojo.Log.warn("Creating new text Share from Just Type");
                    appModel.LastShareSelected = { guid: "new", contenttype: "text/plain", content: appModel.LaunchQuery };
                    this.showNewShareScene();
                } else if (appModel.LaunchQuery.target && appModel.LaunchQuery.target != "") {
                    Mojo.Log.warn("Handling URL launch of: " + appModel.LaunchQuery.target );
                } else {
                    Mojo.Log.warn("Unknown launch query received");
                }
            }
        } else {
            appModel.LaunchQuery = "";
            this.showWelcomePrompt();
        }
    }
    //Check if we're registered to handle URLs
    useShortLink = Mojo.Controller.appInfo.shortURL;
    if (appModel.AppSettingsCurrent["UseCustomEndpoint"] && appModel.AppSettingsCurrent["ShortURL"] && appModel.AppSettingsCurrent["ShortURL"] != "")
        useShortLink = appModel.AppSettingsCurrent["ShortURL"];
    systemModel.ListHandlersForURL("https://wosa.link",
        function(response) {
            var thisMenuModel = this.controller.getWidgetSetup(Mojo.Menu.appMenu).model;
            if (JSON.stringify(response).indexOf(Mojo.Controller.appInfo.id) != -1) {
                Mojo.Log.warn("This app handles the Short URL " + useShortLink);
                thisMenuModel.items[2].chosen = true;
            } else {
                Mojo.Log.warn("This app does not handle the Short URL " + useShortLink);
                thisMenuModel.items[2].chosen = false;
            }
            this.controller.modelChanged(thisMenuModel);
            
        }.bind(this)
    );
};

MainAssistant.prototype.handleUpdateResponse = function(responseObj) {
    if (responseObj && responseObj.updateFound) {
        updaterModel.PromptUserForUpdate(function(response) {
            if (response)
                updaterModel.InstallUpdate();
        }.bind(this));
    }
}

/* UI Event Handlers */

//Handles the enter key
MainAssistant.prototype.handleKeyPress = function(event) {
    if (event.srcElement.toString().indexOf("HTMLInputElement") == -1) {
        if (!event.shiftKey && !this.DoingEdit) {
            Mojo.Log.info("Key pressed!" + String.fromCharCode(event.keyCode));
            appModel.LastShareSelected = { guid: "new" };
            this.showNewShareOptions();
        }
    }
};

MainAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-HandleURLs':
                var thisMenuModel = this.controller.getWidgetSetup(Mojo.Menu.appMenu).model;
                if (thisMenuModel.items[2].chosen) {
                    //remote URL handler
                    systemModel.removeHandlerForURL(Mojo.Controller.appInfo.id);
                    thisMenuModel.items[2].chosen = false;
                } else {
                    //add URL handler
                    systemModel.AddHandlerForURL("^[^:]+://wosa.link", Mojo.Controller.appInfo.id);
                    thisMenuModel.items[2].chosen = true;
                }
                this.controller.modelChanged(thisMenuModel);
                break;
            case 'do-LogInOut':
                this.doLogInOut();
                break;
            case 'do-Preferences':
                var stageController = Mojo.Controller.getAppController().getActiveStageController();
                stageController.pushScene({ name: "preferences", disableSceneScroller: false });
                break;
            case 'do-myAbout':
                Mojo.Additions.ShowDialogBox("Share Space - " + Mojo.Controller.appInfo.version, "Share Space sharing service client for webOS. Copyright 2021, Jon Wise. Distributed under an MIT License.<br>Source code available at: https://github.com/codepoet80/webos-sharespace");
                break;
            case 'do-mySharePhrase':
                Mojo.Additions.ShowDialogBox("Your Share Phrase", "<b>" + appModel.AppSettingsCurrent["SharePhrase"] + "</b><br><br>Remember that anyone who has your Share Space name and Share Phrase can share with you.");
                break;
            case 'do-new':
                appModel.LastShareSelected = { guid: "new" };
                this.showNewShareOptions();
                break;
            case 'do-refresh':
                this.fetchShares();
                break;
        }
    }
}

MainAssistant.prototype.handleListDelete = function(event) {
    Mojo.Log.warn("Deleting item: " + event.item.guid);
    serviceModel.DoShareDeleteRequest(event.item.guid, appModel.AppSettingsCurrent["Username"], appModel.AppSettingsCurrent["Credential"]);
}

MainAssistant.prototype.handleListClick = function(event) {

    Mojo.Log.info("Item tapped with element class " + event.originalEvent.target.className);
    Mojo.Log.info("Item details: " + JSON.stringify(event.item));
    appModel.LastShareSelected  = event.item;
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    stageController.pushScene({ transition: Mojo.Transition.crossFade, name: "detail" });

    return false;
}

MainAssistant.prototype.handleListAdd = function(event) {
    //TODO: Verify this works
    appModel.LastShareSelected = { guid: "new" };
    this.showNewShareOptions();
}

MainAssistant.prototype.handlePopupChoose = function(share, command) {
    Mojo.Log.info("Perform: ", command, " on ", share.guid);
    switch (command) {
        case "do-complete":
            
            break;
    }
}

/* Get Share Stuff */
MainAssistant.prototype.fetchShares = function() {
    serviceModel.DoShareListRequest(appModel.AppSettingsCurrent["Username"], appModel.AppSettingsCurrent["Credential"], this.handleServerResponse.bind(this));
}

MainAssistant.prototype.handleServerResponse = function(response) {
    Mojo.Log.info("ready to process share list: " + response);
    
    if (response != null && response != "") {
        var responseObj = JSON.parse(response);
        if (responseObj.status == "error") {
            Mojo.Log.error("Error message from server while loading shares: " + responseObj.msg);
            Mojo.Controller.errorDialog("The server responded to the share list request with: " + responseObj.msg.replace("ERROR: ", ""));
        } else {
            if (responseObj.shares) {
                //If we got a good looking response update the UI
                this.updateShareListWidget(appModel.AppSettingsCurrent["Username"], responseObj.shares, responseObj.accesslevel);
                if ((!appModel.AppSettingsCurrent["SharePhrase"] || appModel.AppSettingsCurrent["SharePhrase"] == "") && responseObj.sharephrase){
                    appModel.AppSettingsCurrent["SharePhrase"] = responseObj.sharephrase;
                    appModel.SaveSettings();
                }
            } else {
                Mojo.Log.warn("Share list was empty. Either there was no matching result, or there were server or connectivity problems.");
                Mojo.Additions.ShowDialogBox("No shares", "The server did not report any shares for the specified username.");
            }
        }
    } else {
        Mojo.Log.error("No usable response from server while loading shares: " + response);
        Mojo.Controller.errorDialog("The server did not answer with a usable response to the share list request. Check network connectivity, SSL and/or self-host settings.");
    }
}

MainAssistant.prototype.updateShareListWidget = function(username, results, accessLevel) {

    Mojo.Log.info("Displaying shares for: " + username + " with access level: " + accessLevel);
    this.controller.get("spnUsername").innerHTML = username;

    var thisShareList = this.controller.getWidgetSetup("shareList");
    thisShareList.model.items = []; //remove the previous list
    for (var i = 0; i < results.length; i++) {
        if (accessLevel && accessLevel == "admin") {
            results[i].readonly = false;
        } else {
            results[i].readonly = true;
        }
        thisShareList.model.items.push(results[i]);
    }

    Mojo.Log.info("Updating share list widget with " + results.length + " results!");
    this.controller.get("showShareList").style.display = "block";
    this.controller.modelChanged(thisShareList.model);
}

/* New Share Stuff */

MainAssistant.prototype.showNewShareOptions = function() {
    this.controller.showAlertDialog({
        onChoose: function(value) {
            Mojo.Log.info("Choice was: " + value);
            if (value == "image") {
                this.invokeFilePicker();
            } else if (value == "text/plain" || value == "application/json") {
                appModel.LastShareSelected.contenttype = value;
                Mojo.Log.info("LastShareSelected: " + JSON.stringify(appModel.LastShareSelected));
                this.showNewShareScene();
            } else {
                Mojo.Log.info("Cancelled new share");
            }
        },
        title: "New Share",
        message: "What do you want to share?",
        choices: [
            { label: "Text", value: "text/plain", type: "neutral" },
            { label: "JSON", value: "application/json", type: "neutral" },
            { label: "Image", value: "image", type: "neutral" },
            { label: "Cancel", value: "cancel", type: "negative" }
        ]
    });
}

MainAssistant.prototype.invokeFilePicker = function() {
    var self = this; //Retain the reference for the callback
    var params = { kind: 'image', actionName: 'Share Photo',
        onSelect: function(file){
                Mojo.Log.info("selected file was: " + JSON.stringify(file));
                Mojo.Controller.getAppController().showBanner({ messageText: "Sharing image..." }, "", "");

                //Figure out what mimetype to use
                var ext = file.fullPath.split(".");
                ext = ext[ext.length - 1].toLowerCase();
                if (ext == "jpg")
                    mimetype = "image/jpeg";
                else 
                    mimetype = "image/" + ext;
                    
                serviceModel.DoShareAddRequestImage(file.fullPath, appModel.AppSettingsCurrent["Username"], appModel.AppSettingsCurrent["Credential"], mimetype);
            }
    }
    Mojo.FilePicker.pickFile(params, this.controller.stageController);
}

MainAssistant.prototype.showNewShareScene = function() {
    this.DoingEdit = true;
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    stageController.pushScene({ transition: Mojo.Transition.crossFade, name: "newshare" });
}

/* Login Stuff */
MainAssistant.prototype.showWelcomePrompt = function() {
    this.controller.showAlertDialog({
        onChoose: function(value) {
            if (value == "login") {
                this.showLogin();
            } else if (value == "new") {
                Mojo.Log.info("new selected!");
                var stageController = Mojo.Controller.getAppController().getActiveStageController();
                stageController.swapScene({ transition: Mojo.Transition.crossFade, name: "newuser" });
            }
        },
        title: "Welcome to Share Space!",
        message: "Your shared clipboard for webOS! This client app can be used with a web service and web app that lets you share content between devices, or with other users! Do you want to Log In to an existing share space, or create a new one?",
        choices: [
            { label: 'Log In', value: "login", type: 'affirmative' },
            { label: 'Create New', value: "new", type: 'neutral' },
        ]
    });
}

MainAssistant.prototype.doLogInOut = function() {
    if (appModel.AppSettingsCurrent["Username"] == "" && appModel.AppSettingsCurrent["Credential"] == "") {
        this.showWelcomePrompt();
    } else {    //Log out
        
        //Clear credentials
        appModel.AppSettingsCurrent["Username"] = "";
        appModel.AppSettingsCurrent["Credential"] = "";
        appModel.AppSettingsCurrent["SharePhrase"] = "";
        appModel.SaveSettings();

        //Re-paint scene
        var stageController = Mojo.Controller.getAppController().getActiveStageController();
        stageController.swapScene({ transition: Mojo.Transition.crossFade, name: "main", disableSceneScroller: false });
    }
}

MainAssistant.prototype.showLogin = function() {
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    if (stageController) {
        this.controller = stageController.activeScene();
        this.controller.showDialog({
            template: 'login/login-scene',
            assistant: new LoginAssistant(this, function(val) {
                    Mojo.Log.info("got value from login dialog: " + val);
                    this.handleLoginDialogDone(val);
                }.bind(this)) //since this will be a dialog, not a scene, it must be defined in sources.json without a 'scenes' member
        });
    }
}

MainAssistant.prototype.handleLoginDialogDone = function(val) {
    if (val) {
        Mojo.Log.info("Re-painting scene after successful login!");
        //Re-paint scene
        var stageController = Mojo.Controller.getAppController().getActiveStageController();
        stageController.swapScene({ transition: Mojo.Transition.crossFade, name: "main", disableSceneScroller: false });
    } else {
        //multiple reasons we could have got a false
    }
}

/* End of Life Stuff */

MainAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    clearInterval(this.refreshInt);
    Mojo.Event.stopListening(this.controller.get("shareList"), Mojo.Event.listDelete, this.handleListDelete);
    Mojo.Event.stopListening(this.controller.get("shareList"), Mojo.Event.listTap, this.handleListClick);
    Mojo.Event.stopListening(this.controller.get("shareList"), Mojo.Event.listAdd, this.handleListAdd);
    //Just type
    //this.controller.document.removeEventListener("keypress", this.keypressHandler);

};

MainAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
       a result of being popped off the scene stack */
};

/* Helper Functions */
Array.prototype.move = function(from, to) {
    this.splice(to, 0, this.splice(from, 1)[0]);
};

MainAssistant.prototype.playSound = function(soundToPlay) {
    if (appModel.AppSettingsCurrent["SoundTheme"] > 0) {
        soundToPlay = "sounds/" + soundToPlay + appModel.AppSettingsCurrent["SoundTheme"] + ".mp3";
        Mojo.Log.info("Trying to play sound: " + soundToPlay);
        Mojo.Controller.getAppController().playSoundNotification("media", soundToPlay, 1200);
    }
}