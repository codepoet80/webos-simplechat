/* 
This alarm scene is used for Touchpads, which will only pretend to change settings if running in the background
Launching this scene forces the Touchpad to wake up to deal with presenting it, and when it does we have a good
chance of successfully changing the settings. We can then close this window. All the smarts for this are in stage assistant.
 */
function DashboardAssistant(argFromPusher) {
    this.passedArguments = argFromPusher;
}

DashboardAssistant.prototype.setup = function() {
    Mojo.Log.info("notification stage setup at " + new Date());
    Mojo.Log.info("Last known message guid: " + appModel.AppSettingsCurrent["LastKnownMessage"]);
    this.displayDashboard("SimpleChat", "Checking for new messages...");

    this.serviceEndpointBase = appModel.ServiceEndpointBase;
    if (appModel.AppSettingsCurrent["UseCustomEndpoint"] && appModel.AppSettingsCurrent["EndpointURL"]) {
        this.serviceEndpointBase = appModel.AppSettingsCurrent["EndpointURL"];
    }
    serviceModel.getChats(this.serviceEndpointBase, function(response) {
        if (response != null && response != "") {
            var responseObj = JSON.parse(response);
            if (responseObj.status == "error") {
                Mojo.Log.error("Error message from server during background check: " + responseObj.msg);

            } else {
                if (responseObj.messages && responseObj.messages.length > 0) {
                    var mostRecentServerMessage = responseObj.messages[responseObj.messages.length - 1].uid;
                    if (appModel.AppSettingsCurrent["LastKnownMessage"] != mostRecentServerMessage) {
                        Mojo.Log.info("Found new chat on server during background check!");
                        this.displayDashboard("SimpleChat", "New messages in the chat!", 1);
                        this.playAlertSound();
                    } else {
                        Mojo.Log.info("No new chats on server during background check.");
                        var appController = Mojo.Controller.getAppController();
                        appController.closeAllStages();
                    }
                } else {
                    Mojo.Log.warn("Chat results were empty during scheduled background check. This is unlikely; server, API or connectivity problem possible");
                }
            }
        } else {
            Mojo.Log.error("No usable response from server during background check: " + response);
        }
    }.bind(this));

    //Event handlers
    Mojo.Event.listen(this.controller.get("dashboardinfo"), Mojo.Event.tap, this.handleTap.bind(this));
    Mojo.Event.listen(this.controller.get("dashboardinfo"), Mojo.Event.dragging, this.handleDrag.bind(this));
    Mojo.Event.listen(this.controller.get("dashboardinfo"), Mojo.Event.dragEnd, this.handleDragEnd.bind(this));
}

//TODO: This is common to two scenes
DashboardAssistant.prototype.playAlertSound = function() {
    if (!appModel.AppSettingsCurrent["AlertSound"] || appModel.AppSettingsCurrent["AlertSound"] == "") {
        appModel.AppSettingsCurrent["AlertSound"] = "Subtle (short)";
    }
    if (appModel.AppSettingsCurrent["AlertSound"] != "off") {
        var soundPath = "/media/internal/ringtones/" + appModel.AppSettingsCurrent["AlertSound"] + ".mp3";
        Mojo.Log.info("trying to play: " + soundPath);
        Mojo.Controller.getAppController().playSoundNotification("media", soundPath, 2500);
    }
}

DashboardAssistant.prototype.handleTap = function(event) {
    Mojo.Log.info("Dashboard tapped!");
    systemModel.LaunchApp("com.jonandnic.simplechat");
    var appController = Mojo.Controller.getAppController();
    appController.closeAllStages();
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
    Mojo.Log.info("Updating dashboard with: " + JSON.stringify(info));
    var renderedInfo = Mojo.View.render({ object: info, template: "dashboard/item-info" });
    infoElement.update(renderedInfo);
    infoElement.show();
    this.controller.getSceneScroller().mojo.revealTop(true);
}

// Cleanup anything we did in setup function
DashboardAssistant.prototype.cleanup = function() {
    Mojo.Log.info("notification stage closing at " + new Date());
}