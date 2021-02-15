/* 
This alarm scene is used for Touchpads, which will only pretend to change settings if running in the background
Launching this scene forces the Touchpad to wake up to deal with presenting it, and when it does we have a good
chance of successfully changing the settings. We can then close this window. All the smarts for this are in stage assistant.
 */
function DashboardAssistant(argFromPusher) {
    this.passedArguments = argFromPusher;
}

DashboardAssistant.prototype.setup = function() {
    Mojo.Log.info("Notification stage setup at " + new Date());
    this.displayDashboard("SimpleChat", "Checking for new messages...");

    this.serviceEndpointBase = appModel.ServiceEndpointBase;
    if (appModel.AppSettingsCurrent["UseCustomEndpoint"] && appModel.AppSettingsCurrent["EndpointURL"]) {
        this.serviceEndpointBase = appModel.AppSettingsCurrent["EndpointURL"];
    }
    serviceModel.getChats(this.serviceEndpointBase, function(response) {
        var appController = Mojo.Controller.getAppController();
        if (response != null && response != "") {
            var responseObj = JSON.parse(response);
            if (responseObj.status == "error") {
                Mojo.Log.error("Error message from server during background check: " + responseObj.msg);
                appController.closeAllStages();
            } else {
                if (responseObj.messages && responseObj.messages.length > 0) {
                    var newMessageCount = this.findNewMessageCount(appModel.AppSettingsCurrent["LastKnownMessages"], responseObj.messages);
                    if (newMessageCount > 0) {
                        Mojo.Log.info("Found new chat on server during background check!");
                        this.displayDashboard("SimpleChat", "New messages in the chat!", newMessageCount);
                        //If the main app window is open, it will play a sound. If not, play a sound here.
                        var appController = Mojo.Controller.getAppController();
                        var mainStage = appController.getStageController("main");
                        if (!mainStage) {
                            appModel.playAlertSound();
                        }
                    } else {
                        Mojo.Log.info("No new chats on server during background check.");
                        appController.closeAllStages();
                    }
                } else {
                    Mojo.Log.warn("Chat results were empty during scheduled background check. This is unlikely; server, API or connectivity problem possible");
                    appController.closeAllStages();
                }
            }
        } else {
            Mojo.Log.error("No usable response from server during background check: " + response);
            appController.closeAllStages();
        }
    }.bind(this));

    //Event handlers
    Mojo.Event.listen(this.controller.get("dashboardinfo"), Mojo.Event.tap, this.handleTap.bind(this));
}

DashboardAssistant.prototype.findNewMessageCount = function(oldMessageGuids, newMessages) {
    var actuallyNewMessages = [];
    for (var j = 0; j < newMessages.length; j++) {
        if (oldMessageGuids.indexOf(newMessages[j].uid) == -1)
            actuallyNewMessages.push(newMessages[j].uid);
    }
    return actuallyNewMessages.length;
}

DashboardAssistant.prototype.handleTap = function(event) {
    Mojo.Log.info("Dashboard tapped!");
    var appController = Mojo.Controller.getAppController();
    var mainStage = appController.getStageProxy("main");
    if (!mainStage) {
        systemModel.LaunchApp("com.jonandnic.simplechat");
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
    var infoElement = this.controller.get("dashboardinfo");

    var info = { title: title, message: message, count: count };
    var renderedInfo = Mojo.View.render({ object: info, template: "dashboard/item-info" });
    infoElement.innerHTML = renderedInfo;
    //infoElement.update(renderedInfo);
    //infoElement.show();
    this.controller.getSceneScroller().mojo.revealTop(true);
}

DashboardAssistant.prototype.deactivate = function(event) {
    Mojo.Event.stopListening(this.controller.get("dashboardinfo"), Mojo.Event.tap, this.handleTap);
}

// Cleanup anything we did in setup function
DashboardAssistant.prototype.cleanup = function() {
    Mojo.Log.info("notification stage closing at " + new Date());
}