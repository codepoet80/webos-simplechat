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
    this.cmdMenuAttributes = {}
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
    //Mojo.Event.listen(this.controller.get("txtMessage"), Mojo.Event.propertyChange, this.handleSendMessage.bind(this));
    Mojo.Event.listen(this.controller.get("chatList"), Mojo.Event.listTap, this.handleListClick.bind(this));

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
    //Load preferences
    appModel.LoadSettings();
    Mojo.Log.info("settings now: " + JSON.stringify(appModel.AppSettingsCurrent));
    //Figure out server info
    this.serviceEndpointBase = appModel.ServiceEndpointBase;
    if (appModel.AppSettingsCurrent["UseCustomEndpoint"] && appModel.AppSettingsCurrent["EndpointURL"]) {
        this.serviceEndpointBase = appModel.AppSettingsCurrent["EndpointURL"];
    }
    this.clientId = appModel.ClientId;
    if (appModel.AppSettingsCurrent["UseClientAPIKey"] && appModel.AppSettingsCurrent["ClientAPIKey"]) {
        this.clientId = appModel.AppSettingsCurrent["ClientAPIKey"];
    }
    Mojo.Log.warn("*** Using secret: " + this.clientId + " because secrets were: " + secrets.clientid);
    //Figure out if this is our first time
    if (appModel.AppSettingsCurrent["FirstRun"]) {
        appModel.AppSettingsCurrent["FirstRun"] = false;
        var pretendEvent = {
            type: Mojo.Event.command,
            command: 'do-Username'
        }
        this.handleCommand(pretendEvent);
    } else {
        this.controller.get('txtMessage').mojo.focus();
    }
    //Find out what kind of device this is
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
    this.scaleScroller();
    systemModel.PreventDisplaySleep();
    this.pendingMessages = [];
    this.firstPoll = true;
    this.startPollingServer();
};

MainAssistant.prototype.scaleScroller = function() {
    this.chatScroller = this.controller.get("chatScroller");
    this.scalingFactor = this.controller.window.zoomFactor || 1;
    //TODO: This will be different in landscape
    var bottomBuffer;
    if (this.DeviceType == "TouchPad")
        bottomBuffer = 350;
    else
        bottomBuffer = 280;
    this.scaledHeight = Math.floor(Mojo.Environment.DeviceInfo.screenHeight / this.scalingFactor) - bottomBuffer;
    this.chatScroller.style.height = this.scaledHeight + "px";
}

MainAssistant.prototype.startPollingServer = function() {
    this.getChats();
    var useInt = 10000;
    if (appModel.AppSettingsCurrent["ForegroundUpdate"])
        useInt = appModel.AppSettingsCurrent["ForegroundUpdate"];
    this.FileCheckInt = setInterval(this.getChats.bind(this), useInt);
}

MainAssistant.prototype.pausePollingServer = function() {
    this.getChats();
    clearInterval(this.FileCheckInt);
}

//Handle menu and button bar commands
MainAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-Send':
                this.handleSendMessage();
                break;
            case 'do-Username':
                this.pausePollingServer();
                var stageController = Mojo.Controller.getAppController().getActiveStageController();
                if (stageController) {
                    this.controller = stageController.activeScene();
                    this.controller.showDialog({
                        template: 'user/user-scene',
                        assistant: new UserAssistant(this, function(val) {
                                Mojo.Log.error("got value from dialog: " + val);
                                this.startPollingServer();
                                //this.handleDialogDone(val);
                            }.bind(this)) //since this will be a dialog, not a scene, it must be defined in sources.json without a 'scenes' member
                    });
                }
                break;
            case 'do-Preferences':
                this.pausePollingServer();
                var stageController = Mojo.Controller.stageController;
                stageController.pushScene({ name: "preferences", disableSceneScroller: false });
                break;
            case 'do-myAbout':
                Mojo.Additions.ShowDialogBox("SimpleChat - " + Mojo.Controller.appInfo.version, "SimpleChat client for webOS. Copyright 2021, Jon Wise. Distributed under an MIT License.<br>Source code available at: https://github.com/codepoet80/webos-simplechat");
                break;
        }
    }
};

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
                    this.chatScroller.mojo.revealBottom();
                    this.chatScroller.mojo.adjustBy(0, -200);
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

//Send a search request to MeTube to send to Google for us (never worry about HTTPS encryption again)
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

//Update the UI with search results from Search Request
MainAssistant.prototype.updateChatsList = function(results) {

    Mojo.Log.info("Updating chat list widget with " + results.length + " results!");
    var thisWidgetSetup = this.controller.getWidgetSetup("chatList");
    //figure out what messages we already have
    var knownMessages = [];
    var noLongerPending = [];
    for (var j = 0; j < thisWidgetSetup.model.items.length; j++) {
        knownMessages.push(thisWidgetSetup.model.items[j].uid);
    }
    //find out if there are new or updates messages
    var listUpdated = -1;
    for (var i = 0; i < results.length; i++) {
        if (knownMessages.indexOf(results[i].uid) == -1) { //brand new message
            listUpdated = 1;
            thisWidgetSetup.model.items.push({
                uid: results[i].uid,
                sender: results[i].sender,
                message: results[i].message,
                timestamp: this.convertTimeStamp(results[i].timestamp, true),
                color: "black"
            });
        } else {
            //update a pending message
            if (this.pendingMessages.length > 0 && this.pendingMessages.indexOf(results[i].uid) != -1) {
                for (var j = 0; j < thisWidgetSetup.model.items.length; j++) {
                    if (thisWidgetSetup.model.items[j].uid == results[i].uid) {
                        noLongerPending.push(results[i].uid);
                        thisWidgetSetup.model.items[j].color = "black";
                        listUpdated = 0;
                    }
                }
            }
        }
    }
    //rebuild pending messages array to remove confirmed messages
    if (noLongerPending && noLongerPending.length > 0) {
        var newPending = [];
        for (var k = 0; k < this.pendingMessages.length; k++) {
            if (noLongerPending.indexOf(this.pendingMessages[k]) == -1)
                newPending.push(this.pendingMessages[k]);
        }
        this.pendingMessages = newPending;
        Mojo.Log.info("pending messages now: " + this.pendingMessages);
    }
    //update the UI
    if (listUpdated > -1) {
        this.controller.modelChanged(thisWidgetSetup.model);
        if (listUpdated > 0 && !this.firstPoll) {
            if (appModel.AppSettingsCurrent["AlertSound"] != "off") {
                var soundPath = "/media/internal/ringtones/" + appModel.AppSettingsCurrent["AlertSound"] + ".mp3";
                Mojo.Log.info("trying to play: " + soundPath);
                Mojo.Controller.getAppController().playSoundNotification("media", soundPath, 3000);
            }
        }
        this.chatScroller.mojo.revealBottom();
        this.chatScroller.mojo.adjustBy(0, -200);
        this.firstPoll = false;
    }
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

//Try to make strings easier on tiny devices
MainAssistant.prototype.cleanupString = function(str, mxwl, mxsl) {
    str = str.substring(0, mxsl);
    str = str.replace(/\s+/g, ' ').trim();
    str = str.replace(/[^a-z0-9\s]/gi, '');
    return str;
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

MainAssistant.prototype.decodeEntities = function(text) {
    var entities = [
        ['amp', '&'],
        ['apos', '\''],
        ['#x27', '\''],
        ['#x2F', '/'],
        ['#39', '\''],
        ['#47', '/'],
        ['lt', '<'],
        ['gt', '>'],
        ['nbsp', ' '],
        ['quot', '"']
    ];

    for (var i = 0, max = entities.length; i < max; ++i)
        text = text.replace(new RegExp('&' + entities[i][0] + ';', 'g'), entities[i][1]);

    return text;
}

MainAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    Mojo.Event.stopListening(this.controller.get("chatList"), Mojo.Event.listTap, this.handleListClick);
    Mojo.Event.stopListening(this.controller.get("txtMessage"), Mojo.Event.propertyChange, this.handleSendMessage);
    this.pausePollingServer();
};

MainAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
       a result of being popped off the scene stack */
};