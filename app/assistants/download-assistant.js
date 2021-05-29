/* 
This alarm scene is used for Touchpads, which will only pretend to change settings if running in the background
Launching this scene forces the Touchpad to wake up to deal with presenting it, and when it does we have a good
chance of successfully changing the settings. We can then close this window. All the smarts for this are in stage assistant.
 */
var downloadMgrInt = null;
function DownloadAssistant(argFromPusher) {
    this.passedArguments = argFromPusher;
    this.downloadList = [];
}

DownloadAssistant.prototype.setup = function() {
    Mojo.Log.info("Dashboard notification stage setup at " + new Date());
    this.displayDashboard(Mojo.Controller.appInfo.title, "Checking for new shares...");

    //Event handlers
    Mojo.Event.listen(this.controller.get("dashboardinfo"), Mojo.Event.tap, this.handleTap.bind(this));
}

DownloadAssistant.prototype.activate = function(event) {
    Mojo.Log.info("Dashboard activating!");
    this.fetchShares();
}

DownloadAssistant.prototype.displayDashboard = function(title, message, count) {
    var infoElement = this.controller.get("dashboardinfo");
    var info = { title: title, message: message };
    if (count) {
        info.count = count;
        info.showCount = "inline";
    } else {
        info.showCount = "none";
    }
    var renderedInfo = Mojo.View.render({ object: info, template: "download/item-info" });
    infoElement.innerHTML = renderedInfo;
    this.controller.getSceneScroller().mojo.revealTop(true);
}

DownloadAssistant.prototype.fetchShares = function() {
    serviceModel.DoShareListRequest(appModel.AppSettingsCurrent["Username"], appModel.AppSettingsCurrent["Credential"], function(responseObj){
        if (responseObj != null) {
            if (responseObj.shares) {
                //If we got a good looking response, find out what to download
                Mojo.Log.info("Download dashboard ready to process share list: " + JSON.stringify(responseObj));
                this.checkIfDownloadNeeded(appModel.AppSettingsCurrent["Username"], responseObj.shares, responseObj.accesslevel);
            } else {
                Mojo.Log.warn("Share list was empty in Download dashboard. Either there was no matching result, or there were server or connectivity problems.");
                appModel.CloseNotificationStage();
            }
        } else {
            Mojo.Log.error("No usable response from server while Download dashboard loading shares: " + response);
            appModel.CloseNotificationStage();
        }
    }.bind(this), this.errorHandler.bind(this));
}

DownloadAssistant.prototype.checkIfDownloadNeeded = function(username, results, accessLevel) {

    Mojo.Log.info("Determining which shares need to be downloaded...");
    this.downloadList = [];
    this.getFileListForUser(username, function(fileList) {
        for (var i = 0; i < results.length; i++) {
            if (results[i].guid) {
                //Figure out what mimetype to use
                if (results[i].contenttype == "image/jpeg")
                    ext = ".jpg";
                else if (results[i].contenttype == "text/plain")
                    ext = ".txt";
                else if (results[i].contenttype == "text/json")
                    ext = ".json";
                else {
                    var ext = results[i].contenttype.split("/");
                    ext = ext[ext.length - 1];
                    ext = "." + ext;
                }
                var fileToCheck = results[i].guid + ext;
                var found = false;
                if (fileList.items) {
                    for (var f = 0;f < fileList.items.length;f ++){
                        if (fileList.items[f].name == fileToCheck) {
                            Mojo.Log.info("Already downloaded: " + fileToCheck);
                            found = true;
                        }
                    }
                }
                if (!found) {
                    var newURL = results[i].thumbnail;
                    newURL = newURL.replace("tthumb", "t");
                    newURL = newURL.replace("ithumb", "i");
                    Mojo.Log.info("Need to download: " + newURL);
                    this.downloadList.push(newURL);
                    var usePath = "sharespace/" + username;
                    if (appModel.AppSettingsCurrent["UseCustomDownloadPath"] && appModel.AppSettingsCurrent["CustomDownloadPath"] != "")
                        usePath = appModel.AppSettingsCurrent["CustomDownloadPath"];
                    systemModel.DownloadFile(newURL, results[i].contenttype, usePath, results[i].guid);
                }
            }
        }
        Mojo.Log.info("Files in download list: " + this.downloadList.length);
        if (this.downloadList.length > 0) {
            this.displayDashboard(Mojo.Controller.appInfo.title, "Downloading shares...", this.downloadList.length);
        } else {
            this.displayDashboard(Mojo.Controller.appInfo.title, "No new shares to download.");
        }
        downloadMgrInt = this.controller.window.setInterval(function() {
            this.checkDownloadManagerStatus();
        }.bind(this), 1500);
    }.bind(this));
}

DownloadAssistant.prototype.getFileListForUser = function(username, callback) {
    if (callback)
        callback.bind(this);
    Mojo.Log.info("Asking FileMgr service for list of files");
    this.controller.serviceRequest('palm://ca.canucksoftware.filemgr', { 
        method: 'listFiles',
        parameters: {
            path: "/media/internal/sharespace/" + username + "/", 
        },
        onSuccess: callback,
        onFailure: callback
    });
}

DownloadAssistant.prototype.checkDownloadManagerStatus = function() {
    if (this.downloadList.length > 0) {
        Mojo.Log.info("checking if download manager is done...");
        this.controller.serviceRequest('palm://com.palm.downloadmanager/', {
            method: 'listPending',
            parameters: {},
            onSuccess : function (response){ 
                //Mojo.Log.info("List Pending success, results="+JSON.stringify(response)); 
                if (response) {
                    if (response.count && response.count > 0) {
                        Mojo.Log.info("Remaining downloads: " + response.count);
                        this.displayDashboard(Mojo.Controller.appInfo.title, "Downloading shares...", response.count);
                    } else {
                        Mojo.Log.info("Download Manager completed all downloads!");
                        this.controller.window.clearInterval(downloadMgrInt);
                        if (InDockMode)
                            systemModel.SetDisplayState("dock");
                        appModel.CloseDashboardStageByName("download");
                    }
                } else {
                    Mojo.Log.error("List response failure");
                    this.controller.window.clearInterval(downloadMgrInt);
                    appModel.CloseDashboardStageByName("download");
                }
            }.bind(this),
            onFailure : function (e){ 
                Mojo.Log.error("List Pending failure, results="+JSON.stringify(e)); 
                this.controller.window.clearInterval(downloadMgrInt);
                appModel.CloseDashboardStageByName("download");
            }.bind(this)
        });
    } else {
        if (InDockMode)
            systemModel.SetDisplayState("dock");
        appModel.CloseDashboardStageByName("download");
    }
}

DownloadAssistant.prototype.handleTap = function(event) {
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

DownloadAssistant.prototype.handleDrag = function(event) {
    var infoElement = this.controller.get("dashboardinfo");
    infoElement.style.opacity = "0.5"; //TODO: this only seems to effect the icon
}

DownloadAssistant.prototype.handleDragEnd = function(event) {
    Mojo.Log.info("Dashboard drag end!");
    this.controller.window.clearInterval(downloadMgrInt);
    appModel.CloseDashboardStageByName("download");
}

DownloadAssistant.prototype.errorHandler = function (errorText, callback) {
    Mojo.Log.error("Error in Dashboard scene: " + errorText);
}

DownloadAssistant.prototype.deactivate = function(event) {
    Mojo.Event.stopListening(this.controller.get("dashboardinfo"), Mojo.Event.tap, this.handleTap);
}

// Cleanup anything we did in setup function
DownloadAssistant.prototype.cleanup = function() {
    Mojo.Log.info("Dashboard notification stage closing at " + new Date());
    //Event handlers
    Mojo.Event.stopListening(this.controller.get("dashboardinfo"), Mojo.Event.tap, this.handleTap);
    appModel.SaveSettings();
}