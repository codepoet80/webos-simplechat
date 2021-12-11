/*
Updater Model - Mojo
 Version 0.6
 Created: 2021
 Author: Jonathan Wise
 License: MIT
 Description: A model to check for and get updates from App Museum II web service.
    Does not require App Museum to be installed, but does require internet access, and Preware to do the actual install.
 Source: Find the latest version of this library and clean samples of how to use it on GitHub:
    https://github.com/codepoet80/webos-catalog-frontend/tree/main/Examples
*/

var UpdaterModel = function() {
    this.updateURL = "http://appcatalog.webosarchive.com/WebService/getLatestVersionInfo.php?app=";
    this.lastUpdateResponse = null;
};

/* "Public" Updater functions */

//Gather information and Check App Museum II web service to see if there are any updates
UpdaterModel.prototype.CheckForUpdate = function(appName, callback) {

    var currVersion = this.getVersionObject(Mojo.Controller.appInfo.version);
    Mojo.Log.info("UpdaterModel identified current app " + appName + " version: " + JSON.stringify(currVersion));

    this.deviceInfoRequest = new Mojo.Service.Request("palm://com.palm.preferences/systemProperties", {
        method: "Get",
        parameters:{"key": "com.palm.properties.nduid" },
        onSuccess: this.performIdentifiedUpdateCheck.bind(this, appName, currVersion, callback),
        onFailure: this.performIdentifiedUpdateCheck.bind(this, appName, currVersion, callback)
    });
}

//You can optionally call this function if you don't want to handle the user interaction related to prompting for an update
//  Pass the function to be called back with the user's response
//  Optionally pass a message to the user if you don't like the automatically constructed one
UpdaterModel.prototype.PromptUserForUpdate = function(callback, message) {
    if (!this.lastUpdateResponse) {
        Mojo.Log.warn("UpdaterModel: Not prompting user for update when no update has been discovered.");
    } else {
        if (!message)
            message = "An update for " + Mojo.Controller.appInfo.title + " was found in App Museum II:<br>" + this.lastUpdateResponse.versionNote + "<br>Do you want to update now?";

        if (callback)   // set scope for xmlhttp anonymous function callback
            callBack = callback.bind(this);

        var stageController = Mojo.Controller.getAppController().getActiveStageController();
        if (stageController) {
            this.controller = stageController.activeScene();

            this.controller.showAlertDialog({
                onChoose: function(value) {
                    if (value) {
                        Mojo.Log.info("User requested update now");
                    } else {
                        Mojo.Log.info("User deferred update.");
                    }
                    if (callBack)
                        callBack(value);
                },
                allowHTMLMessage: true,
                title: $L("Update Available!"),
                message: $L(message),
                choices: [
                    { label: $L('Update Now'), value: true, type: 'affirmative' },
                    { label: $L("Later"), value: false, type: 'negative' }
                ]
            });
        }
    }
}

//Ask Preware to actually install the update...
UpdaterModel.prototype.InstallUpdate = function() {
    if (!this.lastUpdateResponse) {
        Mojo.Log.warn("UpdaterModel: Not performing update when no update has been discovered.");
    } else {
        var app = this.lastUpdateResponse.downloadURI;
        Mojo.Log.info("Asking PreWare to perform update to " + app);

        this.InstallViaPreware(app);
        return true;
    }
}

UpdaterModel.prototype.InstallViaPreware = function(app) {
    //Ask webOS to launch the PreWare with install url
    this.prewareRequest = new Mojo.Service.Request("palm://com.palm.applicationManager", {
        method: "open",
        parameters: {
            "id": "org.webosinternals.preware",
            params: { type: "install", file: app }
        },
        onSuccess: function(response) {
            Mojo.Log.info("Preware launch success", JSON.stringify(response));
        }.bind(this),
        onFailure: function(response) {
            Mojo.Log.error("Preware launch failure, " + app + ":", JSON.stringify(response), response.errorText);
        }.bind(this)
    });
}

/* "Private" helper functions */

//Internal Function that uses the resolved information to actually do the check
UpdaterModel.prototype.performIdentifiedUpdateCheck = function(appName, currVersion, callback, response) {
    // Build appropriate URL for conditions
    var updateURL = this.updateURL + encodeURI(appName + "/" + Mojo.Controller.appInfo.version);
    // If we have a device identifier, use that
    if(response && JSON.stringify(response).indexOf("com.palm.properties.nduid") != -1) {
        updateURL = updateURL + "&clientid=" + response[Object.keys(response)[0]];
    }
    // Send some info about the device (could be used for compat checks)
    deviceData = Mojo.Environment.DeviceInfo.modelName + "/" + Mojo.Environment.DeviceInfo.platformVersion + "/" + Mojo.Environment.DeviceInfo.carrierName + "/" + Mojo.Locale.getCurrentLocale();
    updateURL = updateURL + "&device=" + encodeURIComponent(deviceData);
    
    if (callback)   // set scope for xmlhttp anonymous function callback
        callBack = callback.bind(this);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", updateURL);
    Mojo.Log.error("Updater calling: " + updateURL);
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            Mojo.Log.info("Museum responded: " + xmlhttp.responseText);
            if (xmlhttp.responseText != null && xmlhttp.responseText != "" && xmlhttp.responseText.indexOf("ERROR:") != 1) {
                var updateResponse = JSON.parse(xmlhttp.responseText);
                if (updateResponse.version != null) {
                    var museumVersion = this.getVersionObject(updateResponse.version);
                    if (this.isVersionHigher(currVersion, museumVersion)) {
                        Mojo.Log.warn("UpdaterModel found an update in webOS App Museum II!");
                        updateResponse.updateFound = true;
                    } else {
                        Mojo.Log.info("UpdaterModel did not find an update in webOS App Museum II!");
                        updateResponse.updateFound = false;
                    }
                }
                this.lastUpdateResponse = updateResponse;
            } else {
                Mojo.Log.info("UpdaterModel: No useable response from App Museum II update API");
            }
            if (callBack) {
                callBack(updateResponse);
            }
        }
    }.bind(this);
}

//Turn a version string into an object with three independent number values
UpdaterModel.prototype.getVersionObject = function(versionNum) {
    versionNumParts = versionNum.split(".");
    if (versionNumParts.length <= 2 || versionNumParts > 3) {
        Mojo.Log.error("UpdaterModel: An invalid version number was passed, webOS version numbers are #.#.#");
        return false;
    } else {
        var versionObject = {
            majorVersion: versionNumParts[0] * 1,
            minorVersion: versionNumParts[1] * 1,
            buildVersion: versionNumParts[2] * 1
        }
        return versionObject;
    }
}

//Given a current version and a version to compare, return true or false if the compare version is newer
UpdaterModel.prototype.isVersionHigher = function(currVersion, compareVersion) {
    if (!currVersion || !compareVersion) {
        Mojo.Log.error("UpdaterModel: Pass the versions to compare. If the second version is higher than the first, this function will return true");
    } else {
        if (compareVersion.majorVersion > currVersion.majorVersion)
            return true;
        if (compareVersion.majorVersion == currVersion.majorVersion && compareVersion.minorVersion > currVersion.minorVersion)
            return true;
        if (compareVersion.majorVersion == currVersion.majorVersion && compareVersion.minorVersion == currVersion.minorVersion && compareVersion.buildVersion > currVersion.buildVersion)
            return true;
        return false;
    }
}