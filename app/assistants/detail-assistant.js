function DetailAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
}

DetailAssistant.prototype.setup = function() {
    /* setup widgets here */

    //Menu
    this.appMenuAttributes = { omitDefaultItems: true };
    this.appMenuModel = {
        label: "Settings",
        items: [{
            label: $L('Select All'),
            command: Mojo.Menu.selectAllCmd,
            shortcut: 'a',
            disabled: false
        }, {
            label: $L('Copy'),
            command: Mojo.Menu.copyCmd,
            shortcut: 'c',
            disabled: false
        }]
    };
    this.controller.setupWidget(Mojo.Menu.appMenu, this.appMenuAttributes, this.appMenuModel);
    //Text content field
    this.controller.setupWidget("divTextContent",
        this.attributes = {
            multiline: true,
            enterSubmits: false,
            focus: false
        },
        this.model = {
            value: "",
            disabled: false
        }
    ); 
    //OK Button
    this.controller.setupWidget("btnOK",
        this.attributes = {
        },
        this.model = {
            label : "OK",
            disabled: false
        }
    );
    //Command Menu
    this.cmdMenuAttributes = {
        spacerHeight: 0,
        menuClass: 'no-fade'
    },
    this.cmdMenuModel = {
        visible: true,
        items: [{
                items: [
                    { label: 'Back', icon: 'back', command: 'do-goBack' }
                ]
            },
            {
                items: [
                    { label: 'Share', command: 'do-share' }
                ]
            },
            {
                items: [
                    { label: 'Save', icon: 'save', command: 'do-save' },
                ]
            }
        ]
    };

    this.controller.setupWidget(Mojo.Menu.commandMenu, this.cmdMenuAttributes, this.cmdMenuModel);

    /* add event handlers to listen to events from widgets */
};

DetailAssistant.prototype.activate = function(event) {

    //Bind selected podcast to scene elements
    Mojo.Log.info(JSON.stringify(appModel.LastShareSelected));
    
    this.controller.get("divShareTitle").innerHTML = "Shared: " + appModel.LastShareSelected.timestamp;

    //Show links
    if (appModel.LastShareSelected.contenttype.indexOf("image") != -1) {    //image links

        var link = this.makeShareURLs(appModel.LastShareSelected.thumbnail, "image");
        appModel.CurrentShareURL = link;
        this.controller.get("divShareLinks").innerHTML += "• <a href='" + link + "'>View in Browser</a>";
        this.controller.get("divShareLinks").innerHTML += " &nbsp;(<a href='javascript:this.doCopy(\"" + link + "\")'>Copy Link</a>)<br>";
        //TODO: We need to handle tapping of the link with an app launch request
        link = this.makeShareURLs(appModel.LastShareSelected.thumbnail, "download");
        this.downloadLink = link;
    } else {    //text links
        var link = this.makeShareURLs(appModel.LastShareSelected.thumbnail, "t");
        appModel.CurrentShareURL = link;
        this.downloadLink = link;
        this.controller.get("divShareLinks").innerHTML = "• <a href='" + link + "'>View in Browser</a>";
        this.controller.get("divShareLinks").innerHTML += " &nbsp;(<a href='javascript:this.doCopy(\"" + link + "\")'>Copy Link</a>)<br>";
    }
    if (appModel.AppSettingsCurrent["DebugMode"]) {
        this.controller.get("divShareInfo").style.display = "block";
    }

    //Show actual content
    if (appModel.LastShareSelected.contenttype == "application/json") {
        this.controller.get("divTextContent").innerHTML = "<pre>" + JSON.stringify(appModel.LastShareSelected.content, null, 1) + "</pre>"
    } else if (appModel.LastShareSelected.contenttype == "text/plain") {
        this.controller.get("divTextContent").innerHTML = "<pre>" + appModel.LastShareSelected.content + "</pre>"
    } else {
        this.controller.get("divImageContent").innerHTML = "<img src='" + appModel.LastShareSelected.content + "' style='max-width:90%;'>";
    }

    Mojo.Controller.getAppController().showBanner({ messageText: 'Touch2Share Ready!', icon: 'assets/notify.png' }, { source: 'notification' });
};

doCopy = function(link) {
    Mojo.Log.info("Copy tapped for link " + link);
    var stageController = Mojo.Controller.getAppController().getActiveStageController()
    stageController.setClipboard(link);
    Mojo.Controller.getAppController().showBanner({ messageText: 'Link copied!', icon: 'assets/notify.png' }, { source: 'notification' });
}

DetailAssistant.prototype.makeShareURLs = function(thumbUrl, type) {
    var newURL = thumbUrl;
    newURL = newURL.replace("tthumb", type);
    newURL = newURL.replace("ithumb", type);
    return newURL;
}

//Handle menu and button bar commands
DetailAssistant.prototype.handleCommand = function(event) {

    Mojo.Log.info("handling command button press for command: " + event.command);
    if (event.type == Mojo.Event.command) {
        var stageController = Mojo.Controller.getAppController().getActiveStageController();
        switch (event.command) {
            case 'do-goBack':
                stageController.popScene();
                break;
            case 'do-share':
                var itemsToShow = [
                    { label: 'Open in Browser', command: 'do-browserOpen' },
                    { label: 'Email Link', command: 'do-emailLink' },
                    { label: 'Copy Link', command: 'do-copyLink' }
                ]
                if (appModel.LastShareSelected.contenttype.indexOf("image") == -1) {
                    itemsToShow.push({ label: 'Copy Content', command: 'do-copyContent' });
                }
                this.controller.popupSubmenu({
                    onChoose: this.handlePopupChoose.bind(this, event.item),
                    //placeNear: Mojo.Menu.commandMenu,
                    items: itemsToShow
                });
                break;
            case 'do-save':
                var usePath = "sharespace/" + appModel.AppSettingsCurrent["Username"];
                if (appModel.AppSettingsCurrent["UseCustomDownloadPath"] && appModel.AppSettingsCurrent["CustomDownloadPath"] != "")
                    usePath = appModel.AppSettingsCurrent["CustomDownloadPath"];
                systemModel.DownloadFile(this.downloadLink, appModel.LastShareSelected.contenttype, usePath, appModel.LastShareSelected.guid, true);
                break;
        }
    }
};

DetailAssistant.prototype.handlePopupChoose = function(task, command) {
    Mojo.Log.info("Perform: ", command);
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    switch (command) {
        case "do-browserOpen":
            this.controller.serviceRequest("palm://com.palm.applicationManager", {
                method: "launch",
                parameters: {
                    id: 'com.palm.app.browser',
                    params: {
                        "target": appModel.CurrentShareURL
                    }
                }
            });
            break;
        case "do-emailLink":
            this.controller.serviceRequest("palm://com.palm.applicationManager", {
                method: 'open',
                parameters: {
                    id: "com.palm.app.email",
                    params: {
                        summary: "Check out this link",
                        text: this.downloadLink
                    }
                }
            });
            break;
        case "do-copyLink":
            stageController.setClipboard(this.downloadLink);
            Mojo.Controller.getAppController().showBanner({ messageText: 'Link copied!', icon: 'assets/notify.png' }, { source: 'notification' });
            break;
        case "do-copyContent":
            stageController.setClipboard(appModel.LastShareSelected.content);
            Mojo.Controller.getAppController().showBanner({ messageText: 'Content copied!', icon: 'assets/notify.png' }, { source: 'notification' });
            break;
    }
}

DetailAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */

    //Mojo.Event.stopListening(this.controller.get("btnOK"), Mojo.Event.tap, this.okClick.bind(this));
};

DetailAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */

};