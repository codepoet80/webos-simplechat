/* 
This alarm scene is used for Touchpads, which will only pretend to change settings if running in the background
Launching this scene forces the Touchpad to wake up to deal with presenting it, and when it does we have a good
chance of successfully changing the settings. We can then close this window. All the smarts for this are in stage assistant.
 */
function DashboardAssistant(argFromPusher) {
    this.passedArguments = argFromPusher;
    this.lastMessageCount = 0;
}

DashboardAssistant.prototype.setup = function() {
    Mojo.Log.info("Notification stage setup at " + new Date());
    this.displayDashboard("SimpleChat", "Checking for new messages...");

    this.serviceEndpointBase = appModel.ServiceEndpointBase;
    if (appModel.AppSettingsCurrent["UseCustomEndpoint"] && appModel.AppSettingsCurrent["EndpointURL"]) {
        this.serviceEndpointBase = appModel.AppSettingsCurrent["EndpointURL"];
    }
    if (!appModel.AppSettingsCurrent["AlertSound"] || appModel.AppSettingsCurrent["AlertSound"] == "") {
        appModel.AppSettingsCurrent["AlertSound"] = "Subtle (short)";
    }

    //Event handlers
    Mojo.Event.listen(this.controller.get("dashboardinfo"), Mojo.Event.tap, this.handleTap.bind(this));
}

DashboardAssistant.prototype.activate = function(event) {
    Mojo.Log.info("dashboard activate called!");
    this.checkForMessages();
}

DashboardAssistant.prototype.checkForMessages = function() {
    Mojo.Log.info("checking for new messages...");
    serviceModel.getChats(this.serviceEndpointBase, function(response) {
        var appController = Mojo.Controller.getAppController();
        if (response != null && response != "") {
            var responseObj = JSON.parse(response);
            if (responseObj.status == "error") {
                Mojo.Log.error("Error message from server during background check: " + responseObj.msg);
                appController.closeAllStages();
            } else {
                if (responseObj.messages && responseObj.messages.length > 0) {
                    var newMessageCount = this.findNewMessageCount(appModel.AppSettingsCurrent["LastKnownMessage"], responseObj.messages);
                    if (newMessageCount > 0) {
                        Mojo.Log.info("Found new chat on server during background check!");

                        //If the main app window is open, it will play a sound. If not, play a sound here.
                        var appController = Mojo.Controller.getAppController();
                        var mainStage = appController.getStageController("main");
                        if (!mainStage) {
                            if (newMessageCount > this.lastMessageCount) {
                                systemModel.PlayAlertSound(appModel.AppSettingsCurrent["AlertSound"]);
                                this.lastMessageCount = newMessageCount;
                            }
                            this.displayDashboard("SimpleChat", "New messages in the chat!", newMessageCount);
                        } else {
                            this.displayDashboard("SimpleChat", "New messages in the chat!");
                        }
                    } else {
                        Mojo.Log.info("No new chats on server during background check.");
                        appController.closeStage("dashboard");
                    }
                } else {
                    Mojo.Log.warn("Chat results were empty during scheduled background check. This is unlikely; server, API or connectivity problem possible");
                    appController.closeStage("dashboard");
                }
            }
        } else {
            Mojo.Log.error("No usable response from server during background check: " + response);
            appController.closeStage("dashboard");
        }
    }.bind(this));
}

DashboardAssistant.prototype.findNewMessageCount = function(LastKnownMessage, newMessages) {
    var actuallyNewMessages = [];
    var startCounting = false;
    for (var j = 0; j < newMessages.length; j++) {
        if (startCounting) {
            actuallyNewMessages.push(newMessages[j].uid);
            appModel.AppSettingsCurrent["LastKnownMessage"] = newMessages[j].uid;
        }
        if (newMessages[j].uid == LastKnownMessage) {
            startCounting = true;
        }
    }
    return actuallyNewMessages.length;
}

DashboardAssistant.prototype.handleTap = function(event) {
    Mojo.Log.info("Dashboard tapped!");
    var appController = Mojo.Controller.getAppController();
    var mainStage = appController.getStageProxy("main");
    if (!mainStage) {
        systemModel.LaunchApp(Mojo.Controller.appInfo.id);
        appController.closeAllStages();
    } else {
        mainStage.activate();
        appController.closeStage("dashboard")
    }
}

DashboardAssistant.prototype.handleDrag = function(event) {
    var infoElement = this.controller.get("dashboardinfo");
    infoElement.style.opacity = "0.5"; //TODO: this only seems to effect the icon
}

DashboardAssistant.prototype.handleDragEnd = function(event) {
    Mojo.Log.info("Dashboard drag end!");
    var appController = Mojo.Controller.getAppController();
    appController.closeAllStages();
}

DashboardAssistant.prototype.displayDashboard = function(title, message, count) {
    if (count)
        Mojo.Log.warn("New message count now: " + count);
    var infoElement = this.controller.get("dashboardinfo");
    var info = { title: title, message: message };
    if (count) {
        info.count = count;
        info.showCount = "inline";
    } else {
        info.showCount = "none";
        Mojo.Log.warn("no message count for dashboard");
    }
    var renderedInfo = Mojo.View.render({ object: info, template: "dashboard/item-info" });
    infoElement.innerHTML = renderedInfo;
    this.controller.getSceneScroller().mojo.revealTop(true);
}

DashboardAssistant.prototype.deactivate = function(event) {
    Mojo.Event.stopListening(this.controller.get("dashboardinfo"), Mojo.Event.tap, this.handleTap);
}

// Cleanup anything we did in setup function
DashboardAssistant.prototype.cleanup = function() {
    Mojo.Log.info("notification stage closing at " + new Date());
}