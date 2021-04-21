/*
    SimpleChat client app for webOS.
    This app depends on a SimpleChat service, provided by webOS Archive at no cost for what remains of the webOS mobile community.
*/

function MainAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
    this.doingMessageEdit = false;
    this.serverRetries = 0;
    this.serverGiveUp = 4;
    this.maximized = false;
}

MainAssistant.prototype.setup = function() {
    // title
    this.controller.get('spnTitle').innerHTML = Mojo.Controller.appInfo.pageTitle;
    // setup message field
    this.messageFieldModel = {
        'original': ''
    };
    this.messageFieldModel.attributes = {
        hintText: $L(" Enter a message..."),
        enterSubmits: false,
        focus: true,
        multiline: true,
        textCase: Mojo.Widget.steModeSentenceCase,
        focusMode: Mojo.Widget.focusSelectMode,
        autoReplace: true,
        autoEmoticons: true,
        emoticons: true,
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
        items: [] //{ uid: "-1", sender: "none", message: "", formattedMessage: "" }
    };
    //Chat Log List templates (loads other HTML)
    this.template = {
        itemTemplate: 'main/item-template',
        listTemplate: 'main/list-template',
        hasNoWidgets: true,
        swipeToDelete: false,
        renderLimit: 25,
        reorderable: false,
        hasNoWidgets: true,
        onItemRendered: this.handleItemRendered.bind(this)
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
            { label: Mojo.Controller.appInfo.title + " Info", command: 'do-Info' },
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
                items: [
                    { label: 'Emoticon', iconPath: 'assets/emoticon.png', command: 'do-Emoticon' }
                ]
            },
            {
                items: [
                    { label: 'Send', icon: 'send', command: 'do-Send' }
                ]
            }
        ]
    };
    this.controller.setupWidget(Mojo.Menu.commandMenu, this.cmdMenuAttributes, this.cmdMenuModel);
    this.menuOn = true;

    /* Always on Event handlers */
    Mojo.Event.listen(this.controller.get("chatList"), Mojo.Event.listTap, this.handleListClick.bind(this));
    Mojo.Event.listen(this.controller.stageController.document, Mojo.Event.stageActivate, this.activateWindow.bind(this));
    Mojo.Event.listen(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.deactivateWindow.bind(this));

    // Non-Mojo handlers
    this.keyupHandler = this.handleKeyUp.bindAsEventListener(this);
    this.controller.document.addEventListener("keyup", this.keyupHandler, true);

    //Check for updates
    this.checkForUpdates();
};

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
    //Set an alert sound
    if (!appModel.AppSettingsCurrent["AlertSound"] || appModel.AppSettingsCurrent["AlertSound"] == "") {
        appModel.AppSettingsCurrent["AlertSound"] = "Subtle (short)";
    }
    //Check for Emoji option
    if (appModel.AppSettingsCurrent["ShowEmojis"] == null) {
        Mojo.Log.info("Adding Emoji setting with default value!")
        appModel.AppSettingsCurrent["ShowEmojis"] = appModel.AppSettingsDefaults["ShowEmojis"];
        appModel.SaveSettings();
    }
    //Init Message memory
    if (!appModel.AppSettingsCurrent["MyMessages"]) {
        appModel.AppSettingsCurrent["MyMessages"] = [];
    }
    if (appModel.AppSettingsCurrent["LastKnownMessages"]) { //This was the old way, clean it up
        appModel.AppSettingsCurrent["LastKnownMessages"] = null;
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
    //Set some variables
    this.maximized = true;
    this.serverRetries = 0;
    this.pendingMessages = [];
    this.firstPoll = true;

    //Disable background sync
    Mojo.Log.info("Switching to foreground sync")
    this.startPollingServer();
    systemModel.ClearSystemAlarm("SimpleChat");

    //Get ready for input
    this.handleTextFocus();

    //Determine if we should show any startup messages
    var currVersion = Mojo.Controller.appInfo.version;
    if (!welcomed && (!appModel.AppSettingsCurrent["LastVersionRun"] || appModel.AppSettingsCurrent["LastVersionRun"] != currVersion)) {
        this.pausePollingServer();
        var stageController = Mojo.Controller.getAppController().getActiveStageController();
        stageController.pushScene({ name: "version", disableSceneScroller: false });
        appModel.AppSettingsCurrent["LastVersionRun"] = currVersion;
        welcomed = true;
    } else {
        //Scale UI for orientation and listen for future orientation changes
        this.controller.window.addEventListener('resize', this.orientationChanged.bind(this)); //we have to do this for TouchPad because it does not get orientationChanged events
        this.orientationChanged();

        //Add event handlers
        Mojo.Event.listen(this.controller.get("chatList"), Mojo.Event.listTap, this.handleListClick.bind(this));
        Mojo.Event.listenForFocusChanges(this.controller.get("txtMessage"), this.handleTextFocus.bind(this));
        //this.controller.document.getElementById("divComposeTitle").addEventListener("click", this.toggleCommandMenu.bind(this));
        this.controller.document.getElementById("spanCompose").addEventListener("click", this.toggleCommandMenu.bind(this));
        this.controller.document.getElementById("imgTwisty").addEventListener("click", this.toggleCommandMenu.bind(this));

        //Figure out if this is our first time
        if (appModel.AppSettingsCurrent["FirstRun"] || !appModel.AppSettingsCurrent["SenderName"] || (appModel.AppSettingsCurrent["SenderName"] && appModel.AppSettingsCurrent["SenderName"].toLowerCase() == "webos user")) {
            appModel.AppSettingsCurrent["FirstRun"] = false;
            this.getUsername();
        } else {
            this.controller.get('txtMessage').mojo.focus();
        }
    }
};

/* Screen Adjustments */
MainAssistant.prototype.handleTextFocus = function(event) {
    this.adustScrollerForKeyboard(this.lastOrientation);
}

//Handles the enter key
MainAssistant.prototype.handleKeyUp = function(event) {
    if (event && Mojo.Char.isEnterKey(event.keyCode)) {
        if (event.srcElement.parentElement.id == "txtMessage" && !this.menuOn) {
            this.handleSendMessage();
        }
    }
};

//This is called by Mojo on phones, but has to be manually attached on TouchPad
MainAssistant.prototype.orientationChanged = function() {
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
        this.adustScrollerForKeyboard(orientation);
        this.controller.get('palm_anon_element_0mojo-scene-maintxtMessage-write').rows = "2";
        this.controller.get('palm_anon_element_0mojo-scene-maintxtMessage-write').setAttribute("x-palm-enable-emoticons", true);
    }
    this.lastOrientation = orientation;
}

MainAssistant.prototype.adustScrollerForKeyboard = function(orientation) {
    //Handle virtual keyboard on Touchpad
    var bottomBuffer;
    this.chatScroller = this.controller.get("chatScroller");
    this.scalingFactor = this.controller.window.zoomFactor || 1;

    if (this.DeviceType == "TouchPad") {
        if (this.controller.document.activeElement.id == "palm_anon_element_0mojo-scene-maintxtMessage-write")
            bottomBuffer = 600;
        else
            bottomBuffer = 260;
    } else
        bottomBuffer = 250;

    if (orientation == "tall")
        this.scaledHeight = Math.floor(Mojo.Environment.DeviceInfo.screenHeight / this.scalingFactor) - bottomBuffer;
    else
        this.scaledHeight = Math.floor(Mojo.Environment.DeviceInfo.screenWidth / this.scalingFactor) - bottomBuffer;

    //Mojo.Log.info(this.DeviceType + " orientation is " + orientation + " bottom buffer is: " + bottomBuffer + " scaled height: " + this.scaledHeight);
    this.chatScroller.style.height = this.scaledHeight + "px";

    setTimeout(fixScroll = function() {
        this.controller.getSceneScroller().mojo.revealTop(true);
    }.bind(this), 100);
}

/* Start and Stop service polling */
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

/* UI Handlers */
MainAssistant.prototype.handleListClick = function(event) {
    appModel.LastMessageSelected = event.item;
    this.listTarget = event.originalEvent.target;
    if (this.listTarget.tagName != "A") { //don't pop-up menu if they tapped a hyperlink
        //Decide what items to put in pop-up menu
        var popupMenuItems = [];
        var isMine = false;
        for (var m = 0; m < appModel.AppSettingsCurrent["MyMessages"].length; m++) {
            if (appModel.AppSettingsCurrent["MyMessages"][m].uid == appModel.LastMessageSelected.uid)
                isMine = true;
        }
        if (isMine)
            popupMenuItems.push({ label: 'Edit Message', command: 'do-editMessage' });
        else {
            if (event.item.links != null) {
                popupMenuItems.push({ label: 'Copy Link', command: 'do-copyLink' });
                popupMenuItems.push({ label: 'Follow Link', command: 'do-followLink' });
            }
            popupMenuItems.push({ label: 'Copy Message', command: 'do-copy' });
            popupMenuItems.push({ label: 'Like', command: 'do-like' });
        }
        this.controller.popupSubmenu({
            onChoose: this.handlePopupChoose.bind(this, event.item),
            placeNear: this.listTarget,
            items: popupMenuItems
        });
    }
    return true;
}

MainAssistant.prototype.handlePopupChoose = function(message, command) {
    //Mojo.Log.info("Perform: ", command, " on ", message.uid);
    switch (command) {
        case "do-copy":
            var stageController = Mojo.Controller.getAppController().getActiveStageController();
            stageController.setClipboard(appModel.LastMessageSelected.message);
            Mojo.Controller.getAppController().showBanner("Message copied!", { source: 'notification' });
            break;
        case "do-copyLink":
            var useLink = appModel.LastMessageSelected.links[0];
            if (useLink.toLowerCase().indexOf("http://") == -1 && useLink.toLowerCase().indexOf("https://") == -1)
                useLink = "http://" + appModel.LastMessageSelected.links[0];
            var stageController = Mojo.Controller.getAppController().getActiveStageController();
            stageController.setClipboard(useLink);
            Mojo.Controller.getAppController().showBanner("Link copied!", { source: 'notification' });
            break;
        case "do-followLink":
            var useLink = appModel.LastMessageSelected.links[0];
            if (useLink.toLowerCase().indexOf("http://") == -1 && useLink.toLowerCase().indexOf("https://") == -1)
                useLink = "http://" + appModel.LastMessageSelected.links[0];
            //TODO: Handle more than one link
            Mojo.Log.info("Launching browser for URL " + useLink);
            var parameters = {
                "id": "com.palm.app.browser",
                "params": {
                    "target": useLink
                }
            }
            systemModel.LaunchApp("com.palm.app.browser", parameters);
            break;
        case "do-editMessage":
            this.doEditMessage(message);
            break;
        case "do-like":
            this.doLikeMessage(message);
            break;
    }
}

MainAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-Emoticon':
                var controller = this.controller;
                var onselect = function onEmoticonSelect(emoticon) {
                    controller.document.execCommand("insertText", true, emoticon);
                };
                var emoticonPicker = new EmoticonPickerDialogAssistant(this, onselect);
                emoticonPicker.show();
                break;
            case 'do-Send':
                this.handleSendMessage();
                break;
            case 'do-Username':
                this.getUsername();
                break;
            case 'do-Preferences':
                this.pausePollingServer();
                var stageController = Mojo.Controller.getAppController().getActiveStageController();
                stageController.pushScene({ name: "preferences", disableSceneScroller: false });
                break;
            case 'do-Info':
                this.pausePollingServer();
                var stageController = Mojo.Controller.getAppController().getActiveStageController();
                stageController.pushScene({ name: "version", disableSceneScroller: false });
                break;
            case 'do-myAbout':
                Mojo.Additions.ShowDialogBox(Mojo.Controller.appInfo.title + " - " + Mojo.Controller.appInfo.version, "SimpleChat client for webOS. Copyright 2021, Jon Wise. Distributed under an MIT License.<br>Source code available at: https://github.com/codepoet80/webos-simplechat");
                break;
        }
    }
};

MainAssistant.prototype.doEditMessage = function(message) {
    this.controller.get('txtMessage').mojo.setValue(appModel.LastMessageSelected.message);
    this.controller.get('spanCompose').innerHTML = "Edit";
    this.doingMessageEdit = true;
}

MainAssistant.prototype.doLikeMessage = function(message) {
    //post a like, update message, play a sound?
    if (!message.likes || message.likes == "" || message.likes == 0)
        message.likes = 1;
    else
        message.likes++;

    var thisWidgetSetup = this.controller.getWidgetSetup("chatList");
    for (var i = 0; i < thisWidgetSetup.model.items.length; i++) {
        if (thisWidgetSetup.model.items[i].uid == appModel.LastMessageSelected.uid) {
            thisWidgetSetup.model.items[i].likes = message.likes;
            thisWidgetSetup.model.items[i].color = "gray";
            this.controller.get('chatList').mojo.noticeUpdatedItems(i, [thisWidgetSetup.model.items[i]]);
        }
    }

    this.likeMessageToService();
}

/* Server Interactions */
MainAssistant.prototype.handleSendMessage = function(event) {
    this.controller.get('txtMessage').mojo.blur();
    var newMessage = this.controller.get('txtMessage').mojo.getValue();
    this.disableUI();
    systemModel.PlaySound("down2");

    if (this.doingMessageEdit) {
        this.editMessageToService(newMessage);
    } else {
        this.postMessageToService(newMessage);
    }
}

MainAssistant.prototype.postMessageToService = function(newMessage) {
    //Mojo.Log.info("Sending message:" + newMessage);
    serviceModel.postChat(appModel.AppSettingsCurrent["SenderName"], newMessage, this.serviceEndpointBase, this.clientId, function(response) {
        this.controller.get('txtMessage').mojo.setValue("");
        this.enableUI();
        try {
            var responseObj = JSON.parse(response);
            if (responseObj.error) {
                //Handle error
                Mojo.Log.error("Server error returned: " + responseObj.error);
            } else {
                Mojo.Log.info("Message accepted by server: " + responseObj.posted); //{ "posted": "604529e19fb7f", "senderKey": "604529e19fb99" }
                if (responseObj.posted) {
                    Mojo.Log.info("responseObj: " + JSON.stringify(responseObj));
                    var newMsg = {
                        uid: responseObj.posted,
                        sender: appModel.AppSettingsCurrent["SenderName"],
                        message: newMessage,
                        formattedMessage: Mojo.Format.runTextIndexer(newMessage),
                        timestamp: this.convertTimeStamp(new Date(), false),
                        color: "gray"
                    };
                    if (responseObj.senderKey) {
                        appModel.AppSettingsCurrent["MyMessages"].push({ uid: responseObj.posted, senderKey: responseObj.senderKey })
                    }
                    this.pendingMessages.push(responseObj.posted);

                    Mojo.Log.info("MyMessages now: " + JSON.stringify(appModel.AppSettingsCurrent["MyMessages"]));

                    var thisWidgetSetup = this.controller.getWidgetSetup("chatList");
                    thisWidgetSetup.model.items.push(newMsg);
                    this.controller.modelChanged(thisWidgetSetup.model);
                    this.scrollToBottom();
                } else {
                    Mojo.Log.warn("Did not understand server reponse to post!");
                }
            }
        } catch (error) {
            //Handle error
        }
    }.bind(this));
}

MainAssistant.prototype.editMessageToService = function(newMessage) {

    Mojo.Log.info("trying to edit: " + appModel.LastMessageSelected.uid);

    //Set UI back to compose mode
    this.controller.get('txtMessage').mojo.setValue("");
    this.controller.get('spanCompose').innerHTML = "Compose";
    this.doingMessageEdit = false;
    this.enableUI();

    var editKey; //Make sure we are allowed to edit this item
    for (var m = 0; m < appModel.AppSettingsCurrent["MyMessages"].length; m++) {
        if (appModel.AppSettingsCurrent["MyMessages"][m].uid == appModel.LastMessageSelected.uid)
            editKey = appModel.AppSettingsCurrent["MyMessages"][m].senderKey;
    }
    if (editKey) {
        //Force list item to update with new content (without informing Mojo, so the list doesn't bounce around. Mojo will get informed later)

        var thisWidgetSetup = this.controller.getWidgetSetup("chatList");
        for (var i = 0; i < thisWidgetSetup.model.items.length; i++) {
            if (thisWidgetSetup.model.items[i].uid == appModel.LastMessageSelected.uid) {
                thisWidgetSetup.model.items[i].message = newMessage;
                thisWidgetSetup.model.items[i].formattedMessage = Mojo.Format.runTextIndexer(newMessage);
                thisWidgetSetup.model.items[i].color = "gray";
                this.controller.get('chatList').mojo.noticeUpdatedItems(i, [thisWidgetSetup.model.items[i]]);
            }
        }

        //Tell server about the edit
        serviceModel.editChat(appModel.AppSettingsCurrent["SenderName"], newMessage, appModel.LastMessageSelected.uid, editKey, this.serviceEndpointBase, this.clientId, function(response) {
            try {
                var responseObj = JSON.parse(response);
                if (responseObj.error) {
                    Mojo.Log.error("Server error returned: " + responseObj.error);
                } else {
                    if (responseObj.warning) {
                        Mojo.Log.warn("Warning from server: " + responseObj.warning)
                    } else {
                        Mojo.Log.info("Edit accepted by server: " + responseObj.edited);
                    }
                }
            } catch (error) {
                //TODO: Handle error
            }
        }.bind(this));
    }
}

MainAssistant.prototype.likeMessageToService = function() {
    Mojo.Log.info("trying to like: " + appModel.LastMessageSelected.uid);

    serviceModel.likeChat(appModel.LastMessageSelected.uid, this.serviceEndpointBase, this.clientId, function(response) {
        this.enableUI();
        try {
            var responseObj = JSON.parse(response);
            Mojo.Log.info("like response from server: " + response);
            if (responseObj.error) {
                Mojo.Log.error("Server error returned: " + responseObj.error);
            } else {
                Mojo.Log.info("Like accepted by server: " + responseObj.liked);
            }
        } catch (error) {
            //TODO: Handle error
        }
    }.bind(this));
}

//Send a request to Service to get chat messages
MainAssistant.prototype.getChats = function() {
    if (this.serverRetries <= this.serverGiveUp) {
        serviceModel.getChats(this.serviceEndpointBase, this.clientId, function(response) {
            //Mojo.Log.info("getChat response: " + response);
            if (response != null && response != "") {
                var responseObj = JSON.parse(response);
                if (responseObj.status == "error") {
                    Mojo.Log.error("Error message from server while fetch chats: " + responseObj.msg);
                    Mojo.Additions.ShowDialogBox("Server Error", "The server responded to the chat request with: " + responseObj.msg.replace("ERROR: ", ""));
                } else {
                    if (responseObj.messages && responseObj.messages.length > 0) {
                        this.serverRetries = 0;
                        this.updateChatsList(responseObj.messages);
                    } else {
                        Mojo.Log.warn("Search results were empty. This is unlikely; server, API or connectivity problem possible");
                        Mojo.Additions.ShowDialogBox("No results", "The server did not report any matches for the search.");
                    }
                }
            } else {
                Mojo.Log.error("No usable response from server while fetching chats: " + response);
                this.serverRetries++;
                if (this.serverRetries == this.serverGiveUp) {
                    Mojo.Additions.ShowDialogBox("Server Error", "The server did not answer with a usable response to the chat request. Check network connectivity and/or self-host settings and re-launch the app.");
                }
            }
        }.bind(this));
    }
}

//Update the UI with search results from chat request
MainAssistant.prototype.updateChatsList = function(results) {

    Mojo.Log.info("Proccessing " + results.length + " chat messages...");
    var thisWidgetSetup = this.controller.getWidgetSetup("chatList");

    //now make the new list
    var newMessages = [];
    for (var i = 0; i < results.length; i++) {
        var formattedMessage = Mojo.Format.runTextIndexer(results[i].message);
        if (formattedMessage.length < 1)
            formattedMessage = results[i].message;
        newMessages.push({
            uid: results[i].uid,
            sender: results[i].sender,
            message: results[i].message,
            formattedMessage: formattedMessage,
            postedFrom: results[i].postedFrom,
            links: this.detectURLs(results[i].message),
            timestamp: this.convertTimeStamp(results[i].timestamp, true),
            likes: results[i].likes,
            color: "black"
        });
    }
    var scrollPos = this.chatScroller.mojo.getState();

    //Compare the known list to the new list to see if anything has changed...
    //Delete old messages
    var deleted = false;
    for (var m = 0; m < thisWidgetSetup.model.items.length; m++) {
        var found = false;
        for (var n = 0; n < newMessages.length; n++) {
            if (newMessages[n].uid == thisWidgetSetup.model.items[m].uid)
                found = true;
        }
        if (!found) {
            Mojo.Log.info("Removing deleted message from list at position " + m);
            this.controller.get('chatList').mojo.noticeRemovedItems(m, 1);
            thisWidgetSetup.model.items.splice(m, 1);
            deleted = true;
        }
    }
    //Update existing messages (content or likes)
    var updated = false;
    for (var m = 0; m < thisWidgetSetup.model.items.length; m++) {
        for (var n = 0; n < newMessages.length; n++) {
            if (newMessages[n].uid == thisWidgetSetup.model.items[m].uid) {
                var changed = false;
                if (newMessages[n].message != thisWidgetSetup.model.items[m].message ||
                    newMessages[n].likes != thisWidgetSetup.model.items[m].likes ||
                    newMessages[n].color != thisWidgetSetup.model.items[m].color) {
                    //Mojo.Log.info("Updating message from list at position " + m);
                    //Mojo.Log.info("Old Message:          " + JSON.stringify(thisWidgetSetup.model.items[m]));
                    thisWidgetSetup.model.items[m] = newMessages[n];
                    this.controller.get('chatList').mojo.noticeUpdatedItems(m, [thisWidgetSetup.model.items[m]]);
                    changed = true;
                    //Mojo.Log.info("New Message should be: " + JSON.stringify(newMessages[n]));
                    //Mojo.Log.info("New Message is       : " + JSON.stringify(thisWidgetSetup.model.items[m]));
                }
            }
            if (changed)
                updated = true;
        }
    }
    //Insert new messages
    var inserted = [];
    if (thisWidgetSetup.model.items.length > 0) {
        for (var n = 0; n < newMessages.length; n++) {
            var found = false;
            for (var m = 0; m < thisWidgetSetup.model.items.length; m++) {
                if (thisWidgetSetup.model.items[m].uid == newMessages[n].uid) {
                    found = true;
                }
            }
            if (!found) {
                inserted.push(newMessages[n]);
                Mojo.Log.info("Found new message to add to the list: " + newMessages[n].uid);
            }
        }
    } else {
        Mojo.Log.info("The message list was empty, pushing entire server payload to the list.");
        inserted = newMessages;
    }
    //Handle UI due to changes
    if (inserted.length > 0 || updated || deleted) {
        if (inserted.length > 0) {
            if (!this.firstPoll) {
                this.doNotification();
                var offset = thisWidgetSetup.model.items.length - 1;
                for (var i = 0; i < inserted.length; i++) {
                    thisWidgetSetup.model.items.push(inserted[i]);
                }
                this.controller.get('chatList').mojo.noticeAddedItems(offset, inserted);
            } else {
                thisWidgetSetup.model.items = inserted;
            }
            this.controller.modelChanged(thisWidgetSetup.model);
            this.scrollToBottom();
        }
    } else {
        Mojo.Log.info("No changes to apply to list.")
    }
    this.firstPoll = false;

    //Also clean-up MyMessage history
    for (var m = 0; m < appModel.AppSettingsCurrent["MyMessages"].length; m++) {
        var found = false;
        for (var n = 0; n < thisWidgetSetup.model.items.length; n++) {
            if (thisWidgetSetup.model.items[n].uid == appModel.AppSettingsCurrent["MyMessages"][m].uid)
                found = true;
        }
        if (!found) {
            appModel.AppSettingsCurrent["MyMessages"].splice(m, 1);
        }
    }
}

//Called by Mojo once the list has been painted, gives us an opportunity to force HTML changes in the message 
MainAssistant.prototype.handleItemRendered = function(listWidget, itemModel, itemNode) {
    itemNode.innerHTML = this.unescapeEntities(itemNode.innerHTML);
    itemNode.innerHTML = this.replaceImageLinks(itemNode.innerHTML);
    if (itemNode.innerHTML.indexOf("</span> </div>") != -1) {
        itemNode.innerHTML = itemModel.message;
        Mojo.Log.warn("**** EMPTY MESSAGE RENDERED! " + JSON.stringify(itemModel));
    }

    //Hide emojis if app settings say to do so
    if (!appModel.AppSettingsCurrent["ShowEmojis"]) {
        var emojis = this.controller.document.getElementsByName('emoji');
        for (var i = 0; i < emojis.length; i++) {
            emojis[i].style.display = 'none';
        }
    }
}

//Used to show or hide command menu buttons
MainAssistant.prototype.toggleCommandMenu = function(show) {
    Mojo.Log.info("Toggling command menu");
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    if (stageController) {
        this.controller = stageController.activeScene();

        var thisWidgetSetup = this.controller.getWidgetSetup(Mojo.Menu.commandMenu);
        var thisWidgetModel = thisWidgetSetup.model;
        if (!this.menuOn || show == true) {
            thisWidgetModel.visible = true;
            this.menuOn = true;
            this.controller.document.getElementById("imgTwisty").src = "assets/twisty-down.png";
        } else {
            thisWidgetModel.visible = false;
            this.menuOn = false;
            this.controller.document.getElementById("imgTwisty").src = "assets/twisty-right.png";
        }
        this.controller.modelChanged(thisWidgetModel);
    }
}

/* Helper Functions */
MainAssistant.prototype.doNotification = function() {
    systemModel.PlayAlertSound(appModel.AppSettingsCurrent["AlertSound"]);
    if (!this.maximized)
        appModel.ShowNotificationStage();
    else {}
}

MainAssistant.prototype.checkForUpdates = function() {
    if (!appModel.UpdateCheckDone) {
        //First check for old version
        var oldFound = false;
        systemModel.GetInstalledApps(function(response) {
            if (response && response.apps) {
                for (var a = 0; a < response.apps.length; a++) {
                    if (response.apps[a].id == "com.jonandnic.simplechat") {
                        oldFound = true;
                    }
                }
            }
            if (oldFound) {
                Mojo.Additions.ShowDialogBox("Deprecated App Found", "It looks like you have both the old and the new SimpleChat apps installed. This will cause problems with notifications. It is strongly recommended that you delete the old version of SimpleChat -- the old icon looks like this:<p align='center' style='margin:0px'><img src='assets/oldicon.png'></p>");
            } else {
                appModel.UpdateCheckDone = true;
                updaterModel.CheckForUpdate(Mojo.Controller.appInfo.appMuseumTitle, function(responseObj) {
                    if (responseObj && responseObj.updateFound) {
                        updaterModel.PromptUserForUpdate(function(response) {
                            if (response)
                                updaterModel.InstallUpdate();
                        }.bind(this));
                    }
                }.bind(this));
            }
        }.bind(this))
    }
}

MainAssistant.prototype.getUsername = function() {
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    if (stageController) {
        this.controller = stageController.activeScene();
        this.controller.showDialog({
            template: 'user/user-scene',
            preventCancel: true,
            assistant: new UserAssistant(this, function(val) {
                    Mojo.Log.info("got value from dialog: " + val);
                }.bind(this)) //since this will be a dialog, not a scene, it must be defined in sources.json without a 'scenes' member
        });
    }
}

MainAssistant.prototype.scrollToBottom = function() {
    this.chatScroller.mojo.revealBottom();
    setTimeout(function() {
        this.chatScroller.mojo.revealBottom();
    }.bind(this), 500);
    //this.controller.get('txtMessage').mojo.focus();
}

MainAssistant.prototype.scrollToPosition = function(scrollPos) {
    Mojo.Log.info("Scrolling back to: " + JSON.stringify(scrollPos));
    this.chatScroller.mojo.setState(scrollPos, true);
}

MainAssistant.prototype.unescapeEntities = function(str) {
    str = str.replace(/&gt;/g, ">");
    str = str.replace(/&lt;/g, "<");
    return str;
}

MainAssistant.prototype.replaceImageLinks = function(str) {
    var pattern = /href=\"(http)?:?(\/\/[^"']*\.(?:png|jpg|jpeg|gif|png|svg))/g;
    str = str.replace(pattern, function(match, protocol, url) {
        return "href=\"http://chat.webosarchive.com/image.php?" + btoa("http:" + url);
    });

    var pattern = /href=\"(https)?:?(\/\/[^"']*\.(?:png|jpg|jpeg|gif|png|svg))/g;
    str = str.replace(pattern, function(match, protocol, url) {
        return "href=\"http://chat.webosarchive.com/image.php?" + btoa("https:" + url);
    });
    return str;
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

MainAssistant.prototype.detectURLs = function(message) {
    if (!message) return
    var urlRegex = /(((https?:\/\/)|(www\.))[^\s]+)/g;
    return message.match(urlRegex)
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

MainAssistant.prototype.rememberLastMessage = function() {
    var thisWidgetSetup = this.controller.getWidgetSetup("chatList");
    if (thisWidgetSetup.model.items.length > 0) {
        appModel.AppSettingsCurrent["LastKnownMessage"] = thisWidgetSetup.model.items[thisWidgetSetup.model.items.length - 1].uid;
        appModel.SaveSettings();
    }
}

/* Mojo Lifecycle Stuff */
MainAssistant.prototype.activateWindow = function(event) {
    Mojo.Log.warn("SimpleChat being maximized!");
    this.maximized = true;
    this.rememberLastMessage();
    appModel.CloseNotificationStage();
};

MainAssistant.prototype.deactivateWindow = function(event) {
    Mojo.Log.warn("SimpleChat being minimized!");
    this.maximized = false;
    this.rememberLastMessage();
};

MainAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    Mojo.Log.info("Main scene deactivating " + Mojo.Controller.appInfo.id);
    this.maximized = false;

    //Get ready for background sync
    Mojo.Log.info("Switching to background sync");
    this.pausePollingServer();
    this.rememberLastMessage();
    systemModel.ClearSystemAlarm("SimpleChat");
    if (appModel.AppSettingsCurrent["BackgroundUpdate"] && appModel.AppSettingsCurrent["BackgroundUpdate"] != "" && appModel.AppSettingsCurrent["BackgroundUpdate"] != -1)
        systemModel.SetSystemAlarmRelative("SimpleChat", appModel.AppSettingsCurrent["BackgroundUpdate"]);

    //Detach UI handlers
    Mojo.Event.stopListening(this.controller.get("chatList"), Mojo.Event.listTap, this.handleListClick);
    this.controller.window.removeEventListener('resize', this.orientationChanged);
    //this.controller.document.getElementById("divComposeTitle").removeEventListener("click", this.toggleCommandMenu.bind(this));
    this.controller.document.getElementById("spanCompose").removeEventListener("click", this.toggleCommandMenu.bind(this));
    this.controller.document.getElementById("imgTwisty").removeEventListener("click", this.toggleCommandMenu.bind(this));


    Mojo.Event.stopListening(this.controller.stageController.document, Mojo.Event.stageActivate, this.activateWindow);
    Mojo.Event.stopListening(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.deactivateWindow);
};

MainAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
       a result of being popped off the scene stack */
    var appController = Mojo.Controller.getAppController();
    appController.closeAllStages();
};