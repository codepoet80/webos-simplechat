/*
    Share Space clipboard app for webOS.
    This app depends on a sharing service, which is hosted by webOS Archive at no cost for what remains of the webOS mobile community.
    You can also host the service yourself: http://www.github.com/codepoet80/sharing-service
*/

var refreshInt;
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
    this.deviceType = systemModel.DetectDevice();
    this.errorCount = 5;
    
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
            { label: "About", command: 'do-myAbout' },
            { label: "Version Info", command: 'do-versionInfo' },
            //{ label: "Debug Mode", chosen: appModel.AppSettingsCurrent["DebugMode"], command: 'do-debugMode' }      //TODO: Remove Debug Menu
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
    if (appModel.AppSettingsCurrent["DebugMode"]) {
        this.cmdMenuModel.items[0].items.push({ label: "Download", command: 'do-download' });
    }
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
        //Check for dependencies
        this.checkForFileMgr();
    }
};

MainAssistant.prototype.activate = function(data) {

    //Set options for service model
    serviceModel.ForceHTTP = appModel.AppSettingsCurrent["ForceHTTP"];
    serviceModel.UseCustomEndpoint = appModel.AppSettingsCurrent["UseCustomEndpoint"];
    serviceModel.CustomEndpointURL = appModel.AppSettingsCurrent["EndpointURL"];
    serviceModel.CustomShortURL = appModel.AppSettingsCurrent["ShortURL"];
    serviceModel.CustomCreateKey = appModel.AppSettingsCurrent["CustomCreateKey"];
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

    if (appModel.AppSettingsCurrent["Username"] != "" && appModel.AppSettingsCurrent["Credential"] != "") {
        Mojo.Log.info("About to fetch shares...");
        this.controller.get('workingSpinner').mojo.start();
        this.fetchShares();

        //handle launch with query
        Mojo.Log.info("Main scene loaded with launch query: " + JSON.stringify(appModel.LaunchQuery) + ", data: " + JSON.stringify(data));
        var busy = false;
        if (appModel.LaunchQuery && appModel.LaunchQuery != "") {
            busy = true;
            //JustType Launch
            if (appModel.LaunchQuery.newshare) {
                Mojo.Log.info("Creating new text Share from Just Type");
                appModel.LastShareSelected = { guid: "new", contenttype: "text/plain", content: appModel.LaunchQuery.newshare };
                this.showNewShareScene();
            }
            //URL Launch
            else if (appModel.LaunchQuery.target && appModel.LaunchQuery.target != "") {
                this.handleURLInvocation(appModel.LaunchQuery.target);
            }
            //Some other kind of query launch 
            else {
                Mojo.Log.warn("Unknown launch query received");
            }
            appModel.LaunchQuery = "";
        }
        //Handle camera sub-launch
        if (data && data.filename) {
            busy = true;
            Mojo.Log.info("Creating a new share from Camera sub-launch " + data.filename);
            Mojo.Controller.getAppController().showBanner({ messageText: "Sharing camera image...", icon: "assets/notify.png" }, "", "");
            this.uploadCameraImage(data.filename);
        }
        if (!busy && appModel.AppSettingsCurrent["LastVersionRun"] != Mojo.Controller.appInfo.version) {
            appModel.AppSettingsCurrent["LastVersionRun"] = Mojo.Controller.appInfo.version;
            appModel.SaveSettings();
            var stageController = Mojo.Controller.getAppController().getActiveStageController();
            stageController.pushScene({ name: "version", disableSceneScroller: false });
        }
    } else {
        appModel.LaunchQuery = "";
        this.showWelcomePrompt();
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

MainAssistant.prototype.checkForFileMgr = function() {
    systemModel.GetInstalledApps(function(response) {
        var found = false;
        if (response && response.apps) {
            for (var i=0; i<response.apps.length; i++)
            {
                if (response.apps[i].id == "ca.canucksoftware.filemgr")
                    found = true;
            }
        } else
            Mojo.Log.info("Could not get listed of installed apps.")
        if (found)
            Mojo.Log.info("Found FileMgr by Jason Robitaille! Download features enabled.")
        else {
            appModel.AppSettingsCurrent["UseAutoDownload"] = false;
            Mojo.Log.info("Could not find FileMgr installed! Download features disabled.")
        }
        appModel.FileMgrPresent = found;
        
    }.bind(this));
}

MainAssistant.prototype.handleUpdateResponse = function(responseObj) {
    if (responseObj && responseObj.updateFound) {
        updaterModel.PromptUserForUpdate(function(response) {
            if (response)
                updaterModel.InstallUpdate();
        }.bind(this));
    }
}

MainAssistant.prototype.handleURLInvocation = function(query) {
    Mojo.Log.info("Handling URL launch of: " + appModel.LaunchQuery.target);
    serviceModel.QueryShareData(query, function(itemData) {
        Mojo.Log.info("Item query response payload was: " + JSON.stringify(itemData));
        if (itemData && itemData.guid) {
            appModel.LastShareSelected = itemData;
            var stageController = Mojo.Controller.getAppController().getActiveStageController();
            stageController.pushScene({ transition: Mojo.Transition.crossFade, name: "detail" });
        } else {
            Mojo.Log.error("Item query data invalid.");
        }  
    });
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
            case 'do-versionInfo':
                var stageController = Mojo.Controller.getAppController().getActiveStageController();
                stageController.pushScene({ name: "version", disableSceneScroller: false });
                break;
            case 'do-mySharePhrase':
                Mojo.Additions.ShowDialogBox("Your Share Phrase", "<b>" + appModel.AppSettingsCurrent["SharePhrase"] + "</b><br><br>Remember that anyone who has your Share Space name and Share Phrase can share with you.");
                break;
            case 'do-debugMode':
                if (appModel.AppSettingsCurrent["DebugMode"]) {
                    appModel.AppSettingsCurrent["DebugMode"] = false;
                } else {
                    appModel.AppSettingsCurrent["DebugMode"] = true;
                }
                appModel.SaveSettings();
                var stageController = Mojo.Controller.getAppController().getActiveStageController();
                stageController.swapScene({ transition: Mojo.Transition.crossFade, name: "main" });
                break;
            case 'do-download':
                Mojo.Log.info("Trying to download in background");
                appModel.ShowDownloaderStage();
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
    appModel.LastShareSelected = event.item;
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

    this.controller.window.clearInterval(refreshInt);
    if (appModel.AppSettingsCurrent["RefreshTimeout"] && appModel.AppSettingsCurrent["RefreshTimeout"] > 1000) {
        Mojo.Log.info("Auto refresh interval: " + appModel.AppSettingsCurrent["RefreshTimeout"]);
        refreshInt = this.controller.window.setInterval(this.fetchShares.bind(this), appModel.AppSettingsCurrent["RefreshTimeout"]);
    } else {
        Mojo.Log.warn("Using Manual Refresh");
    }

    serviceModel.DoShareListRequest(appModel.AppSettingsCurrent["Username"], appModel.AppSettingsCurrent["Credential"], function(responseObj){
        //Mojo.Log.info("ready to process share list: " + JSON.stringify(responseObj));
    
        if (responseObj != null) {
            if (responseObj.shares) {
                //If we got a good looking response, update the UI
                this.updateShareListWidget(appModel.AppSettingsCurrent["Username"], responseObj.shares, responseObj.accesslevel);
                if ((!appModel.AppSettingsCurrent["SharePhrase"] || appModel.AppSettingsCurrent["SharePhrase"] == "") && responseObj.sharephrase){
                    appModel.AppSettingsCurrent["SharePhrase"] = responseObj.sharephrase;
                    appModel.SaveSettings();
                }
            } else {
                Mojo.Log.warn("Share list was empty. Either there was no matching result, or there were server or connectivity problems.");
            }
        } else {
            Mojo.Log.error("No usable response from server while loading shares: " + response);
            this.errorHandler("The server did not answer with a usable response to the share list request. Check network connectivity, SSL and/or self-host settings.");
        }
    }.bind(this), this.errorHandler.bind(this));
}

MainAssistant.prototype.updateShareListWidget = function(username, results, accessLevel) {

    Mojo.Log.info("Displaying shares for: " + username + " with access level: " + accessLevel);
    this.controller.get("spnUsername").innerHTML = username;
    this.controller.get("workingSpinner").mojo.stop();
    this.controller.get("divSpinnerContainer").style.display = "none";

    var thisShareList = this.controller.getWidgetSetup("shareList");
    thisShareList.model.items = []; //remove the previous list
    for (var i = 0; i < results.length; i++) {
        if (accessLevel && accessLevel == "admin") {
            results[i].readonly = false;
        } else {
            results[i].readonly = true;
        }
        results[i].timestamp = appModel.convertTimeStamp(results[i].timestamp, true);
        thisShareList.model.items.push(results[i]);
    }

    Mojo.Log.info("Updating share list widget with " + results.length + " results!");
    this.controller.get("showShareList").style.display = "block";
    this.controller.modelChanged(thisShareList.model);
    this.errorCount = 0;
}

/* New Share Stuff */

MainAssistant.prototype.showNewShareOptions = function() {
    var choices = [
        { label: "Text", value: "text/plain", type: "neutral" },
        { label: "JSON", value: "application/json", type: "neutral" },
        { label: "Image", value: "image", type: "neutral" },
    ];
    if (this.DeviceType != "TouchPad")
        choices.push({ label: "Camera", value: "camera", type: "neutral" });
    choices.push({ label: "Cancel", value: "cancel", type: "negative" });

    this.controller.showAlertDialog({
        onChoose: function(value) {
            Mojo.Log.info("Choice was: " + value);
            if (value == "image") {
                this.pickAndUploadImage();
            } else if (value == "camera") {
                this.getCameraImage();
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
        choices: choices
    });
}

MainAssistant.prototype.pickAndUploadImage = function() {
    var self = this; //Retain the reference for the callback
    var params = { kind: 'image', actionName: 'Share Photo',
        onSelect: function(file){
            Mojo.Log.info("selected file was: " + JSON.stringify(file));
            Mojo.Controller.getAppController().showBanner({ messageText: 'Sharing image...', icon: 'assets/notify.png' }, { source: 'notification' });

            //Figure out what mimetype to use
            var ext = file.fullPath.split(".");
            ext = ext[ext.length - 1].toLowerCase();
            if (ext == "jpg")
                mimetype = "image/jpeg";
            else 
                mimetype = "image/" + ext;
                
            serviceModel.DoShareAddRequestImage(file.fullPath, appModel.AppSettingsCurrent["Username"], appModel.AppSettingsCurrent["Credential"], mimetype, function(responseObj) {
                if (responseObj != null) {
                    Mojo.Log.info("image share response: " + JSON.stringify(responseObj));
                    if (appModel.AppSettingsCurrent["CopyLinkOnShare"]) {
                        var stageController = Mojo.Controller.getAppController().getActiveStageController()
                        stageController.setClipboard(serviceModel.MakeShareURL(appModel.AppSettingsCurrent["Username"], responseObj.guid, "image"));
                        Mojo.Controller.getAppController().showBanner({ messageText: "Image shared, link copied!", icon: "assets/notify.png" }, "", "");
                    } else {
                        Mojo.Controller.getAppController().showBanner({ messageText: "Image shared!", icon: "assets/notify.png" }, "", "");
                    }
                    self.fetchShares();
                } else {
                    Mojo.Log.error("No usable response from server while uploading share");
                    Mojo.Controller.getAppController().showBanner({ messageText: "Bad response uploading image", icon: "assets/notify.png" }, "", "");
                }
            }.bind(self), function(errorText) {
                Mojo.Log.error(errorText);
                Mojo.Controller.getAppController().showBanner({ messageText: "Upload failure: " + errorText, icon: "assets/notify.png" }, "", "");
            });
        }
    }
    Mojo.FilePicker.pickFile(params, this.controller.stageController);
}

MainAssistant.prototype.getCameraImage = function() {
    this.controller.stageController.pushScene(
        { appId: "com.palm.app.camera", name: "capture" },
        { sublaunch: true, mode: "stil" }
      ); 
}

MainAssistant.prototype.uploadCameraImage = function(file) {
    var self = this;
    serviceModel.DoShareAddRequestImage(file, appModel.AppSettingsCurrent["Username"], appModel.AppSettingsCurrent["Credential"], "image/jpeg", function(responseObj) {
        if (responseObj != null) {
            if (appModel.AppSettingsCurrent["CopyLinkOnShare"]) {
                var stageController = Mojo.Controller.getAppController().getActiveStageController()
                stageController.setClipboard(serviceModel.MakeShareURL(appModel.AppSettingsCurrent["Username"], responseObj.guid, "image"));
                Mojo.Controller.getAppController().showBanner({ messageText: "Image shared, link copied!", icon: "assets/notify.png" }, "", "");
            } else {
                Mojo.Controller.getAppController().showBanner({ messageText: "Image shared!", icon: "assets/notify.png" }, "", "");
            }
            self.fetchShares();
        } else {
            Mojo.Log.error("No usable response from server while uploading share");
            Mojo.Controller.getAppController().showBanner({ messageText: "Bad response uploading image", icon: "assets/notify.png" }, "", "");
        }
    }.bind(self), function(errorText) {
        Mojo.Log.error(errorText);
        Mojo.Controller.getAppController().showBanner({ messageText: "Upload failure: " + errorText, icon: "assets/notify.png" }, "", "");
    });
}

MainAssistant.prototype.showNewShareScene = function() {
    this.DoingEdit = true;
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    if (!stageController)
        stageController = Mojo.Controller.getAppController().getStageController(MainStageName);
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
            assistant: new LoginAssistant(this, function(dialogResponse) {
                if (dialogResponse == true) {
                    Mojo.Log.info("Re-painting scene after successful login!");
                    //Re-paint scene
                    var stageController = Mojo.Controller.getAppController().getActiveStageController();
                    stageController.swapScene({ transition: Mojo.Transition.crossFade, name: "main", disableSceneScroller: false });
                } else {
                    if (dialogResponse.error) {
                        var readableError = dialogResponse.error.replace("Share service error: ", "");
                        readableError = readableError.charAt(0).toUpperCase() + readableError.slice(1);
                        Mojo.Additions.ShowDialogBox("Share Service Error", readableError);
                    }
                }
            }.bind(this))
        });
    }
}

/* End of Life Stuff */

MainAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    this.controller.window.clearInterval(refreshInt);
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

MainAssistant.prototype.errorHandler = function (errorText, callback) {
    this.errorCount++;
    Mojo.Log.error("error count: " + this.errorCount + ", " + errorText);
    if (this.errorCount > 5) {
        Mojo.Additions.ShowDialogBox("Sync Error", errorText);
        this.controller.window.clearInterval(refreshInt);
        Mojo.Controller.getAppController().showBanner({ messageText: "Offline", icon: "assets/notify.png" }, "", "");
    }
    if (callback) {
        callback.bind(this);
        callback({"error": errorText});
    }
}

Array.prototype.move = function(from, to) {
    this.splice(to, 0, this.splice(from, 1)[0]);
}