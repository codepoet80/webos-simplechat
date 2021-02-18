/*
    SimpleChat client app for webOS.
    This app depends on a SimpleChat service, provided by webOS Archive at no cost for what remains of the webOS mobile community.
*/

function MainAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
}

MainAssistant.prototype.setup = function() {

    // setup message field
    this.messageFieldModel = {
        'original': ''
    };
    this.messageFieldModel.attributes = {
        hintText: $L(" Enter a message..."),
        enterSubmits: true,
        focus: true,
        multiline: false,
        textCase: Mojo.Widget.steModeSentenceCase,
        focusMode: Mojo.Widget.focusSelectMode,
        autoReplace: true,
        requiresEnterKey: true,
        changeOnKeyPress: false
    };
    this.controller.setupWidget(
        'txtMessage',
        this.messageFieldModel.attributes,
        this.messageFieldModel
    );
    //Loading spinner - with global members for easy toggling later
    this.spinnerAttrs = {
        spinnerSize: Mojo.Widget.spinnerSmall
    };
    this.spinnerModel = {
        spinning: false
    }
    this.controller.setupWidget('workingSpinner', this.spinnerAttrs, this.spinnerModel);
    //Chat Log List (starts empty)
    this.listElement = this.controller.get('chatList');
    this.listInfoModel = {
        items: [] //{ uid: "-1", sender: "none", message: "" }
    };
    //Chat Log List templates (loads other HTML)
    this.template = {
        itemTemplate: 'main/item-template',
        listTemplate: 'main/list-template',
        swipeToDelete: false,
        renderLimit: 25,
        reorderable: false
    };
    this.controller.setupWidget('chatList', this.template, this.listInfoModel);
    //Scroller
    this.scrollerModel = {
        mode: 'vertical',
        weight: 'light',
        friction: 'low'
    };
    this.controller.setupWidget('chatScroller', {}, this.scrollerModel);
    //Menu
    this.appMenuAttributes = { omitDefaultItems: true };
    this.appMenuModel = {
        label: "Settings",
        items: [
            Mojo.Menu.editItem,
            { label: "Change Username", command: 'do-Username' },
            { label: "Preferences", command: 'do-Preferences' },
            { label: "About", command: 'do-myAbout' }
        ]
    };
    this.controller.setupWidget(Mojo.Menu.appMenu, this.appMenuAttributes, this.appMenuModel);
    //Command Buttons
    this.cmdMenuAttributes = {
        spacerHeight: 0,
        menuClass: 'no-fade'
    };
    this.cmdMenuModel = {
        visible: true,
        items: [{
                items: []
            },
            {
                items: [
                    { label: 'Send', icon: 'send', command: 'do-Send' }
                ]
            }
        ]
    };
    this.controller.setupWidget(Mojo.Menu.commandMenu, this.cmdMenuAttributes, this.cmdMenuModel);

    /* Always on Event handlers */
    Mojo.Event.listen(this.controller.get("chatList"), Mojo.Event.listTap, this.handleListClick.bind(this));
    Mojo.Event.listen(this.controller.stageController.document, Mojo.Event.stageActivate, this.activateWindow.bind(this));
    Mojo.Event.listen(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.deactivateWindow.bind(this));

    //Check for updates
    if (!appModel.UpdateCheckDone) {
        appModel.UpdateCheckDone = true;
        updaterModel.CheckForUpdate("webOS SimpleChat", this.handleUpdateResponse.bind(this));
    }
};

MainAssistant.prototype.handleUpdateResponse = function(responseObj) {
    if (responseObj && responseObj.updateFound) {
        updaterModel.PromptUserForUpdate(function(response) {
            if (response)
                updaterModel.InstallUpdate();
        }.bind(this));
    }
}

MainAssistant.prototype.activate = function(event) {
    //Figure out server info
    this.serviceEndpointBase = appModel.ServiceEndpointBase;
    if (appModel.AppSettingsCurrent["UseCustomEndpoint"] && appModel.AppSettingsCurrent["EndpointURL"]) {
        this.serviceEndpointBase = appModel.AppSettingsCurrent["EndpointURL"];
    }
    this.clientId = appModel.ClientId;
    if (appModel.AppSettingsCurrent["UseClientAPIKey"] && appModel.AppSettingsCurrent["ClientAPIKey"]) {
        this.clientId = appModel.AppSettingsCurrent["ClientAPIKey"];
    }

    //Figure out if this is our first time
    if (appModel.AppSettingsCurrent["FirstRun"] || (appModel.AppSettingsCurrent["SenderName"] && appModel.AppSettingsCurrent["SenderName"].toLowerCase() == "webos user")) {
        appModel.AppSettingsCurrent["FirstRun"] = false;
        this.getUsername();
    } else {
        this.controller.get('txtMessage').mojo.focus();
    }
    //Find out what kind of device this is
    if (Mojo.Environment.DeviceInfo.platformVersionMajor >= 3) {
        this.DeviceType = "TouchPad";
        Mojo.Log.info("Device detected as TouchPad");
    } else {
        if (this.controller.window.screen.width == 800 || this.controller.window.screen.height == 800) {
            this.DeviceType = "Pre3";
            Mojo.Log.info("Device detected as Pre3");
        } else if ((this.controller.window.screen.width == 480 || this.controller.window.screen.height == 480) && (this.controller.window.screen.width == 320 || this.controller.window.screen.height == 320)) {
            this.DeviceType = "Pre";
            Mojo.Log.warn("Device detected as Pre or Pre2");
        } else {
            this.DeviceType = "Tiny";
            Mojo.Log.warn("Device detected as Pixi or Veer");
        }
    }
    //Scale UI for orientation and listen for future orientation changes
    this.controller.window.addEventListener('resize', this.orientationChanged.bind(this)); //we have to do this for TouchPad because it does not get orientationChanged events
    this.orientationChanged();

    this.controller.window.removeEventListener('resize', this.orientationChanged);

    //systemModel.PreventDisplaySleep();
    this.pendingMessages = [];
    this.firstPoll = true;
    this.startPollingServer();
};

MainAssistant.prototype.activateWindow = function(event) {
    this.rememberMessageGuids();
};

MainAssistant.prototype.deactivateWindow = function(event) {
    this.rememberMessageGuids();
};

//This is called by Mojo on phones, but has to be manually attached on TouchPad
MainAssistant.prototype.orientationChanged = function(orientation) {
    if (this.DeviceType != "TouchPad") {
        //For phones, it doesn't make sense to allow wide orientations
        //  But we need this for initial setup, so we'll force it to always be tall
        this.controller.stageController.setWindowOrientation("up");
        this.scaleScroller("tall")
    } else {
        if (this.controller.window.screen.height < this.controller.window.screen.width) { //touchpad orientations are sideways from phones
            this.scaleScroller("tall");
        } else {
            this.scaleScroller("wide");
        }
    }
};

MainAssistant.prototype.scaleScroller = function(orientation) {
    if (!this.lastOrientation || orientation != this.lastOrientation) {
        this.controller.get('txtMessage').mojo.blur();
        this.chatScroller = this.controller.get("chatScroller");
        this.scalingFactor = this.controller.window.zoomFactor || 1;

        var bottomBuffer;
        if (this.DeviceType == "TouchPad")
            bottomBuffer = 580;
        else
            bottomBuffer = 240;

        if (orientation == "tall")
            this.scaledHeight = Math.floor(Mojo.Environment.DeviceInfo.screenHeight / this.scalingFactor) - bottomBuffer;
        else
            this.scaledHeight = Math.floor(Mojo.Environment.DeviceInfo.screenWidth / this.scalingFactor) - bottomBuffer;

        Mojo.Log.info(this.DeviceType + " orientation is " + orientation + " bottom buffer is: " + bottomBuffer + " scaled height: " + this.scaledHeight);
        this.chatScroller.style.height = this.scaledHeight + "px";
        this.scrollToBottom();
        this.controller.get('txtMessage').mojo.focus();
        setTimeout(fixScroll = function() {
            this.controller.getSceneScroller().mojo.revealTop(true);
        }.bind(this), 100);
    }
    this.lastOrientation = orientation;
}

MainAssistant.prototype.startPollingServer = function() {
    this.getChats();
    var useInt = 10000;
    if (appModel.AppSettingsCurrent["ForegroundUpdate"])
        useInt = appModel.AppSettingsCurrent["ForegroundUpdate"];
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    this.controller = stageController.activeScene();
    this.FileCheckInt = this.controller.window.setInterval(this.getChats.bind(this), useInt);
}

MainAssistant.prototype.pausePollingServer = function() {
    this.controller.window.clearInterval(this.FileCheckInt);
}

//Handle menu and button bar commands
MainAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-Send':
                this.handleSendMessage();
                break;
            case 'do-Username':
                this.getUsername();
                break;
            case 'do-Preferences':
                this.pausePollingServer();
                //var stageController = Mojo.Controller.stageController;
                var stageController = Mojo.Controller.getAppController().getActiveStageController();
                stageController.pushScene({ name: "preferences", disableSceneScroller: false });
                break;
            case 'do-myAbout':
                Mojo.Additions.ShowDialogBox("SimpleChat - " + Mojo.Controller.appInfo.version, "SimpleChat client for webOS. Copyright 2021, Jon Wise. Distributed under an MIT License.<br>Source code available at: https://github.com/codepoet80/webos-simplechat");
                break;
        }
    }
};

MainAssistant.prototype.getUsername = function() {
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    if (stageController) {
        this.controller = stageController.activeScene();
        this.controller.showDialog({
            template: 'user/user-scene',
            preventCancel: true,
            assistant: new UserAssistant(this, function(val) {
                    Mojo.Log.error("got value from dialog: " + val);
                    //this.startPollingServer();
                    //this.handleDialogDone(val);
                }.bind(this)) //since this will be a dialog, not a scene, it must be defined in sources.json without a 'scenes' member
        });
    }
}

//Handle mojo button taps
MainAssistant.prototype.handleClick = function(event) {

    //Nothing to do right now
}

MainAssistant.prototype.handleSendMessage = function(event) {

    this.controller.get('txtMessage').mojo.blur();
    var newMessage = this.controller.get('txtMessage').mojo.getValue();
    this.disableUI();
    systemModel.PlaySound("down2");

    serviceModel.postChat(appModel.AppSettingsCurrent["SenderName"], newMessage, this.serviceEndpointBase, this.clientId, function(response) {
        this.controller.get('txtMessage').mojo.setValue("");
        this.enableUI();
        try {
            var responseObj = JSON.parse(response);
            if (responseObj.error) {
                //Handle error
                Mojo.Log.error("Server error returned: " + responseObj.error);
            } else {
                Mojo.Log.info("message went through: " + responseObj.posted);
                if (responseObj.posted && responseObj.posted != "") {
                    var newMsg = {
                        uid: responseObj.posted,
                        sender: appModel.AppSettingsCurrent["SenderName"],
                        message: newMessage,
                        timestamp: this.convertTimeStamp(new Date(), false),
                        color: "gray"
                    };
                    this.pendingMessages.push(responseObj.posted);
                    Mojo.Log.info("message:" + JSON.stringify(newMsg));
                    var thisWidgetSetup = this.controller.getWidgetSetup("chatList");
                    thisWidgetSetup.model.items.push(newMsg);
                    this.controller.modelChanged(thisWidgetSetup.model);
                    this.scrollToBottom();
                }
            }
        } catch (error) {
            //Handle error
        }
    }.bind(this));
}

//Handle list item taps
MainAssistant.prototype.handleListClick = function(event) {
    Mojo.Log.info("Item tapped: " + event.item.uid);
    return false;
}

//Send a request to Service to get chat messages
MainAssistant.prototype.getChats = function() {
    serviceModel.getChats(this.serviceEndpointBase, function(response) {
        if (response != null && response != "") {
            var responseObj = JSON.parse(response);
            if (responseObj.status == "error") {
                Mojo.Log.error("Error message from server while fetch chats: " + responseObj.msg);
                Mojo.Additions.ShowDialogBox("Server Error", "The server responded to the chat request with: " + responseObj.msg.replace("ERROR: ", ""));
            } else {
                if (responseObj.messages && responseObj.messages.length > 0) {
                    this.updateChatsList(responseObj.messages);
                } else {
                    Mojo.Log.warn("Search results were empty. This is unlikely; server, API or connectivity problem possible");
                    Mojo.Additions.ShowDialogBox("No results", "The server did not report any matches for the search.");
                }
            }
        } else {
            Mojo.Log.error("No usable response from server while fetching chats: " + response);
            Mojo.Additions.ShowDialogBox("Server Error", "The server did not answer with a usable response to the chat request. Check network connectivity and/or self-host settings.");
        }
    }.bind(this));
}

//Update the UI with search results from chat request
MainAssistant.prototype.updateChatsList = function(results) {

    Mojo.Log.info("Proccessing " + results.length + " chat messages...");
    var thisWidgetSetup = this.controller.getWidgetSetup("chatList");
    //figure out what messages we already have
    var knownMessages = [];
    for (var j = 0; j < thisWidgetSetup.model.items.length; j++) {
        knownMessages.push(thisWidgetSetup.model.items[j].uid);
    }
    //now make the new list
    var newMessages = [];
    for (var i = 0; i < results.length; i++) {
        newMessages.push({
            uid: results[i].uid,
            sender: results[i].sender,
            message: results[i].message,
            timestamp: this.convertTimeStamp(results[i].timestamp, true),
            color: "black"
        });
    }
    var listUpdated = -1;
    var scrollPos = this.chatScroller.mojo.getState();
    //compare the known list to the new list, only if something has changed...
    if (this.checkForMessageListChanges(newMessages, thisWidgetSetup.model.items)) {
        if (newMessages.length > 0)
            var newLastMessage = newMessages[newMessages.length - 1].uid;
        if (thisWidgetSetup.model.items.length > 0)
            var oldLastMessage = thisWidgetSetup.model.items[thisWidgetSetup.model.items.length - 1].uid;
        if (oldLastMessage != newLastMessage) {
            Mojo.Log.info("New message in list!");
            listUpdated = 1;
        } else {
            Mojo.Log.info("Existing message needs an update");
            listUpdated = 0;
        }
        thisWidgetSetup.model.items = [];
        thisWidgetSetup.model.items = newMessages;
        this.controller.modelChanged(thisWidgetSetup.model);
    }
    if (listUpdated == 1) { //if there was a new message
        this.scrollToBottom();
        if (!this.firstPoll)
            appModel.playAlertSound();
    } else if (listUpdated == 0) { //if there was just an update to an existing message
        if (this.pendingMessages.length == 0) {
            Mojo.Log.info("Scrolling back to: " + JSON.stringify(scrollPos));
            this.chatScroller.mojo.setState(scrollPos);
        } else {
            this.scrollToBottom();
            this.pendingMessages = [];
        }
    } else {
        Mojo.Log.info("Found no changes to apply.")
    }
    this.firstPoll = false;
}

//Determine if there's anything changed in the message list
MainAssistant.prototype.checkForMessageListChanges = function(newList, oldList) {
    if (newList.length != oldList.length)
        return true;
    for (var l = 0; l < oldList.length; l++) {
        if (oldList[l].guid != newList[l].guid) {
            return true;
        }
        if (oldList[l].message != newList[l].message) {
            return true;
        }
        if (oldList[l].color != newList[l].color) {
            return true;
        }
    }
    return false;
}

MainAssistant.prototype.scrollToBottom = function() {
    this.chatScroller.mojo.revealBottom();
    setTimeout(function() {
        this.chatScroller.mojo.revealBottom();
    }.bind(this), 500);
    //this.chatScroller.mojo.adjustBy(0, (this.controller.get('chatScroller').clientHeight) * -1);
}

MainAssistant.prototype.convertTimeStamp = function(timeStamp, isUTC) {
    if (isUTC) {
        var offset = new Date().getTimezoneOffset();
        timeStamp = Date.parse(timeStamp);
        timeStamp = timeStamp - ((offset * 60) * 1000);
        timeStamp = new Date(timeStamp);
    }
    timeStamp = timeStamp.toLocaleString();
    return timeStamp;
}

MainAssistant.prototype.disableUI = function(statusValue) {
    //start spinner
    if (!this.spinnerModel.spinning) {
        this.spinnerModel.spinning = true;
        this.controller.modelChanged(this.spinnerModel);
    }
}

MainAssistant.prototype.enableUI = function() {
    //stop spinner
    this.spinnerModel.spinning = false;
    this.controller.modelChanged(this.spinnerModel);
    this.controller.get('txtMessage').mojo.focus();
}

MainAssistant.prototype.rememberMessageGuids = function() {
    var thisWidgetSetup = this.controller.getWidgetSetup("chatList");
    if (thisWidgetSetup.model.items.length > 0) {
        var knownMessages = [];
        for (var i = 0; i < thisWidgetSetup.model.items.length; i++) {
            knownMessages.push(thisWidgetSetup.model.items[i].uid);
        }
        appModel.AppSettingsCurrent["LastKnownMessages"] = knownMessages;
        appModel.SaveSettings();
    }
}

MainAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    Mojo.Log.info("Main scene deactivated " + Mojo.Controller.appInfo.id);

    //Remember last known messages
    this.pausePollingServer();
    this.rememberMessageGuids();

    //Detach UI
    Mojo.Event.stopListening(this.controller.get("chatList"), Mojo.Event.listTap, this.handleListClick);
    this.controller.window.removeEventListener('resize', this.orientationChanged);
    Mojo.Event.stopListening(this.controller.stageController.document, Mojo.Event.stageActivate, this.activateWindow);
    Mojo.Event.stopListening(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.deactivateWindow);

};

MainAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
       a result of being popped off the scene stack */
    var appController = Mojo.Controller.getAppController();
    appController.closeAllStages();
};