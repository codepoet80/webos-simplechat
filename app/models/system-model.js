/*
System Model
 Version 1.6
 Created: 2022
 Author: Jonathan Wise
 License: MIT
 Description: A generic and re-usable model for accessing webOS system features more easily
				Privileged functions can only be called if your App ID starts with com.palm
*/

//** Note: If you synced this file from a common repository, local edits may be over-written! */

var SystemModel = function() { 

};
SystemModel.WOSAPrefs = {};

//You should probably use Mojo.Environment.DeviceInfo for this
//  http://sdk.webosarchive.com/docs/docs.html#reference/mojo/classes/mojo-environment.html#summary
SystemModel.prototype.DetectDevice = function() {
    //find out what kind of device this is
    var deviceType;
    if (Mojo.Environment.DeviceInfo.platformVersionMajor >= 3) {
        deviceType = "TouchPad";
        Mojo.Log.info("Device detected as TouchPad");
    } else {
        if (window.screen.width == 800 || window.screen.height == 800) {
            deviceType = "Pre3";
            Mojo.Log.info("Device detected as Pre3");
        } else if ((window.screen.width == 480 || window.screen.height == 480) && (window.screen.width == 320 || window.screen.height == 320)) {
            deviceType = "Pre";
            Mojo.Log.info("Device detected as Pre or Pre2");
        } else {
            deviceType = "Tiny";
            Mojo.Log.info("Device detected as Pixi or Veer");
        }
    }
    return deviceType;
}

//Create a named System Alarm using relative time ("in")
SystemModel.prototype.SetSystemAlarmRelative = function(alarmName, alarmTime) {
    this.wakeupRequest = new Mojo.Service.Request("palm://com.palm.power/timeout", {
        method: "set",
        parameters: {
            "key": Mojo.Controller.appInfo.id + "-" + alarmName,
            "in": alarmTime,
            "wakeup": true,
            "uri": "palm://com.palm.applicationManager/open",
            "params": {
                "id": Mojo.Controller.appInfo.id,
                "params": { "action": alarmName }
            }
        },
        onSuccess: function(response) {
            Mojo.Log.info("Alarm Set Success", JSON.stringify(response));
        },
        onFailure: function(response) {
            Mojo.Log.error("Alarm Set Failure, " + alarmTime + ":",
                JSON.stringify(response), response.errorText);
        }
    });
    return true;
}

//Create a named System Alarm using absolute time ("at")
SystemModel.prototype.SetSystemAlarmAbsolute = function(alarmName, alarmTime) {
    this.wakeupRequest = new Mojo.Service.Request("palm://com.palm.power/timeout", {
        method: "set",
        parameters: {
            "key": Mojo.Controller.appInfo.id + "-" + alarmName,
            "at": alarmTime,
            "wakeup": true,
            "uri": "palm://com.palm.applicationManager/open",
            "params": {
                "id": Mojo.Controller.appInfo.id,
                "params": { "action": alarmName }
            }
        },
        onSuccess: function(response) {
            Mojo.Log.info("Alarm Set Success", JSON.stringify(response));
        },
        onFailure: function(response) {
            Mojo.Log.error("Alarm Set Failure, " + alarmTime + ":",
                JSON.stringify(response), response.errorText);
        }
    });
    return true;
}

//Remove a named System alarm
SystemModel.prototype.ClearSystemAlarm = function(alarmName) {
    this.wakeupRequest = new Mojo.Service.Request("palm://com.palm.power/timeout", {
        method: "clear",
        parameters: { "key": Mojo.Controller.appInfo.id + "-" + alarmName },
        onSuccess: function(response) {
            Mojo.Log.info("Alarm Clear Success", JSON.stringify(response));
            success = true;
        },
        onFailure: function(response) {
            Mojo.Log.error("Alarm Clear Failure",
                JSON.stringify(response), response.errorText);
            success = false;
        }
    });
    return true;
}

//Allow the display to sleep
SystemModel.prototype.AllowDisplaySleep = function(stageController) {
    try {
        if (!stageController)
            stageController = Mojo.Controller.getAppController().getActiveStageController();

        //Tell the System it doesn't have to stay awake any more
        Mojo.Log.info("Allowing display sleep");

        stageController.setWindowProperties({
            blockScreenTimeout: false
        });
    } catch(e) {
        //If the stage has already gone away, this function will return an error
        //  But it doesn't matter because webOS will perform this function anyway during stage clean-up
    }
}

//Prevent the display from sleeping
SystemModel.prototype.PreventDisplaySleep = function(stageController) {
    if (!stageController)
        stageController = Mojo.Controller.getAppController().getActiveStageController();

    //Ask the System to stay awake while timer is running
    Mojo.Log.info("Preventing display sleep");

    stageController.setWindowProperties({
        blockScreenTimeout: true
    });
}

//Show a notification window in its own small stage
//	Launches with sound: pass true for default, false for no sound, or pass the path to a specific sound file
//  Note: This implementation will not work for pure background notifications as it requires the app to be active
SystemModel.prototype.ShowNotificationStage = function(stageName, sceneName, heightToUse, sound, vibrate) {
    Mojo.Log.info("Showing notification stage.");
    //Determine what sound to use
    var soundToUse;
    if (!sound)
        soundToUse = "assets/silent.mp3";
    else if (sound == true || sound == "")
        soundToUse = "/media/internal/ringtones/Dulcimer (short).mp3"
    else
        soundToUse = sound;
    if (vibrate)
        this.Vibrate(vibrate);

    var stageCallBack = function(stageController) {
        stageController.pushScene({ name: stageName, sceneTemplate: sceneName });
    }.bind(this);
    var appController = Mojo.Controller.getAppController();
    var stageController = appController.getStageController(stageName);
    if (stageController) {
        stageCallBack(stageController);
    } else {
        Mojo.Controller.getAppController().createStageWithCallback({
            name: stageName,
            lightweight: true,
            height: heightToUse,
            sound: soundToUse,
            clickableWhenLocked: true
        }, stageCallBack, 'dashboard');
    }
}

//Play a pre-defined system sound
SystemModel.prototype.PlaySound = function(soundName) {
    Mojo.Log.info("Playing sound: " + soundName);
    this.soundRequest = new Mojo.Service.Request("palm://com.palm.audio/systemsounds", {
        method: "playFeedback",
        parameters: {
            name: soundName
        },
        onSuccess: function() { success = true; },
        onFailure: function() { success = false; }
    });
}

//Play an alert sound
//Note: If you want more control, include an HTML5 audio tag with the id "audioPlayer"
//  Otherwise a system function will be used
SystemModel.prototype.PlayAlertSound = function(sound) {
    if (!sound || sound == "") {
        sound = "Subtle (short)";
    }
    if (sound != "off") {
        var soundPath = "/media/internal/ringtones/" + sound + ".mp3";
        if (sound.indexOf("/") != -1)
            soundPath = sound;

        var audioPlayer = document.getElementById("audioPlayer");
        if (audioPlayer) {
            Mojo.Log.info("Playing notification sound " + soundPath + " using audioPlayer element");
            if (soundPath) {
                Mojo.Log.info("trying to play audio: " + soundPath);
                audioPlayer.src = soundPath;
                audioPlayer.load();
            }
            audioPlayer.play();
        } else {
            Mojo.Log.warn("No audio element named audioPlayer, using notification sound to play " + soundPath);
            if (!sound || sound == "") {
                sound = "Subtle (short)";
            }
            Mojo.Log.info("trying to play: " + soundPath);
            Mojo.Controller.getAppController().playSoundNotification("media", soundPath, 2500);
        }
    }
}

//Vibrate the device
SystemModel.prototype.Vibrate = function(vibrate) {
    var success = true;
    Mojo.Log.info("Vibrating device.");
    if (!Number(vibrate)) {
        if (vibrate == true)
            vibeMax = 1;
        else
            vibeMax = 0;
    } else
        vibeMax = Number(vibrate);
    if (vibeMax > 0)
        vibeInterval = window.setInterval(doVibrate, 500);

    return success;
}

//Lock the physical volume buttons to the media volume (instead of default, notification volume)
SystemModel.prototype.LockVolumeKeys = function() {
    Mojo.Log.info("Locking media volume to hardware buttons");
    this.wakeupRequest = new Mojo.Service.Request("palm://com.palm.audio/media", {
        method: "lockVolumeKeys",
        onSuccess: function(response) {
            Mojo.Log.info("Lock Volume Keys Success", JSON.stringify(response));
        },
        onFailure: function(response) {
            Mojo.Log.error("Lock Volume Keys Failure: ", JSON.stringify(response));
        }
    });
    return true;
}

//Launch an app
SystemModel.prototype.LaunchApp = function(appName, params) {
    if (!params)
        params = {};
    if (!params.id)
        params.id = appName;
    this.launchRequest = new Mojo.Service.Request("palm://com.palm.applicationManager", {
        method: "open",
        parameters: params,
        onSuccess: function(response) {
            Mojo.Log.info("App Launch Success", appName, JSON.stringify(response));
        },
        onFailure: function(response) {
            Mojo.Log.error("App Launch Failure", appName, JSON.stringify(response));
        }
    });
    return true;
}

//Use in combination with a Touch2Share launch to send a URI to a tapped device
SystemModel.prototype.SendDataForTouch2Share = function(url, callback) {
    if (!url) {
        Mojo.Log.error("Share URL not supplied");
        return false;
    }
	if (callback)
        callback = callback.bind(this);
	var params = {data: { target: url, type: "rawdata", mimetype: "text/html" }};
	Mojo.Log.info("Touch2Share payload is ", JSON.stringify(params));

    this.shareRequest = new Mojo.Service.Request("palm://com.palm.stservice", {
        method: "shareData",
        parameters: params,
		subscribe: true,
        onSuccess: function(response) {
            Mojo.Log.info("Touch2Share Success!", JSON.stringify(response));
            if (callback) {
                callback(response);
                return true;
            }
        },
        onFailure: function(response) {
            Mojo.Log.error("Touch2Share Failure: ", JSON.stringify(response));
            if (callback) {
                callback(response);
                return false;
            }
        }
    });
    return true;
}

//Download a file
//A fire-and-forget way to interact with the DownloadManager. The user will get a generic notification when the download is complete.
SystemModel.prototype.DownloadFile = function (url, mimetype, pathFromInteral, fileName, subscribe, callback) {
    if (!url) {
        Mojo.Log.error("Download URL not supplied");
        return false;
    }
    if (!pathFromInteral){
        Mojo.Log.error("Save path not supplied");
        return false;
    }
	if (callback)
        callback = callback.bind(this);
    
    //Figure out what extension to use
    var ext = "";
    mimetype = mimetype.toLowerCase();
    if (mimetype.indexOf("image/") != -1) {
        if (mimetype == "image/jpeg")
            ext = "jpg"
        else {
            ext = mimetype.split("/");
            ext = ext[ext.length - 1];
        }
    } else if (mimetype == "text/plain") {
        ext = "txt";
    } else if (mimetype == "application/json") {
        ext = "json";
    } else {
        if (mimetype.indexOf("/") != -1) {
            ext = mimetype.split("/");
            ext = ext[1];
        }
    }
    ext = "." + ext;
    
    this.downloadRequest = new Mojo.Service.Request('palm://com.palm.downloadmanager/', {
        method: 'download',
        parameters: {
            target: url,
            mime: mimetype,
            targetDir : "/media/internal/" + pathFromInteral,
            targetFilename : fileName + ext,
            keepFilenameOnRedirect: true,
            subscribe: subscribe
        },
        onSuccess: function(response) {
            Mojo.Log.info("Download Success!", JSON.stringify(response));
            if (callback) {
                callback(response);
                return true;
            } else {
                if (response.completed == true) {
                    Mojo.Controller.getAppController().showBanner({ messageText: "Content downloaded!" }, "", "");
                }
            }
        },
        onFailure: function(response) {
            Mojo.Log.error("Download Failure: ", JSON.stringify(response));
            if (callback) {
                callback(response);
                return false;
            } else {
                Mojo.Controller.getAppController().showBanner({ messageText: "Download error:" + JSON.stringify(response) }, "", "");
            }
        }
    });
}

SystemModel.prototype.LoadWOSAPrefs = function (callback) {
    if (callback)
        callback.bind(this);
    var req = new Ajax.Request("/media/internal/.wosaprefs", {
        method: 'get',
        onFailure: function() {
            Mojo.Log.warn("Could not load .wosaprefs file. Preferences cannot be opened.");
            callback(null);
        },
        on404: function() {
            Mojo.Log.warn("Could not find .wosaprefs file. Preferences cannot be opened.");
            callback(null);
        },
        onSuccess: function(response) {
            if (response && response.responseText) {
                Mojo.Log.info("Loaded .wosaprefs file: " + JSON.stringify(response.responseText));
                try {
                    prefsObj = JSON.parse(response.responseText);
                    this.WOSAPrefs = prefsObj.preferences;
                } catch(ex) {
                    Mojo.Log.warn("Could not parse .wosaprefs file. Preferences cannot be opened. " + ex);
                    callback(null);
                    return;
                }
                callback(prefsObj);
                return;
            } else {
                Mojo.Log.warn("Could not read .wosaprefs file. Preferences cannot be opened.");
            }
            callback(null);
        }.bind(this)
    });
}

//Helper Functions
var vibeInterval;
var vibeCount = 0;
var vibeMax = 5;
doVibrate = function() {
    vibeCount++;
    new Mojo.Service.Request("palm://com.palm.vibrate", {
        method: "vibrate",
        parameters: { "period": 500, "duration": 1000 }
    });

    if (vibeCount >= vibeMax) {
        clearInterval(vibeInterval);
        vibeCount = 0;
    }
}

//Privileged functions
/*	These functions can only be called with apps that have com.palm as the start of their App Id */

//Set the System Volume to a given level
SystemModel.prototype.SetSystemVolume = function(newVolume) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm") != -1) {
        this.service_identifier = 'palm://com.palm.audio/system';
        var request = new Mojo.Service.Request(this.service_identifier, {
            method: 'setVolume',
            parameters: { volume: newVolume },
            onSuccess: function(response) { Mojo.Log.info("System volume set to " + newVolume); },
            onFailure: function(response) { Mojo.Log.warn("System volume not set!", JSON.stringify(response)); }
        });
        return request;
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Get the current System Volume to a callback
SystemModel.prototype.GetSystemVolume = function(callback) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm") != -1) {
        this.service_identifier = 'palm://com.palm.audio/system';
        var request = new Mojo.Service.Request(this.service_identifier, {
            method: 'getVolume',
            onSuccess: callback,
            onFailure: callback
        });
        return request;
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Set the Ringtone Volume to a given level
SystemModel.prototype.SetRingtoneVolume = function(newVolume) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm") != -1) {
        this.service_identifier = 'palm://com.palm.audio/ringtone';
        var request = new Mojo.Service.Request(this.service_identifier, {
            method: 'setVolume',
            parameters: { volume: newVolume },
            onSuccess: function(response) { Mojo.Log.info("Ringtone volume set to " + newVolume); },
            onFailure: function(response) { Mojo.Log.warn("Ringtone volume not set!", JSON.stringify(response)); }
        });
        return request;
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Get the current Ringtone Volume to a callback
SystemModel.prototype.GetRingtoneVolume = function(callback) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm") != -1) {
        this.service_identifier = 'palm://com.palm.audio/ringtone';
        var request = new Mojo.Service.Request(this.service_identifier, {
            method: 'getVolume',
            onSuccess: callback,
            onFailure: callback
        });
        return request;
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Set the System Brightness to a given level
SystemModel.prototype.SetSystemBrightness = function(newBrightness) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm") != -1) {
        this.service_identifier = 'palm://com.palm.display/control';
        var request = new Mojo.Service.Request(this.service_identifier, {
            method: 'setProperty',
            parameters: { maximumBrightness: newBrightness },
            onSuccess: function(response) { Mojo.Log.info("Screen brightness set to " + newBrightness); },
            onFailure: function(response) { Mojo.Log.warn("Screen brightess not set!", JSON.stringify(response)); }
        });
        return request;
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Get the System Brightness
SystemModel.prototype.GetSystemBrightness = function(callback) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm") != -1) {
        Mojo.Log.info("Getting display state");
        new Mojo.Service.Request("palm://com.palm.display/control", {
            method: "getProperty",
            parameters: { properties: ['timeout', 'maximumBrightness'] },
            onSuccess: callback,
            onFailure: callback
        });
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Get the state of the display ("undefined", "dimmed", "off" or "on") to a callback
SystemModel.prototype.GetDisplayState = function(callBack) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm") != -1) {
        Mojo.Log.info("Getting display state");
        new Mojo.Service.Request("palm://com.palm.display/control", {
            method: "status",
            parameters: {},
            onSuccess: callBack,
            onFailure: callBack
        });
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Set the state of the display ("unlocked", "dimmed", "off" or "on")
SystemModel.prototype.SetDisplayState = function(state) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm") != -1) {
        Mojo.Log.info("Setting display state to " + state);
        new Mojo.Service.Request("palm://com.palm.display/control", {
            method: "setState",
            parameters: { "state": state },
            onSuccess: function(response) {
                Mojo.Log.info("Display set success: ", JSON.stringify(response));
            },
            onFailure: function(response) {
                Mojo.Log.error("Display set error: ", JSON.stringify(response), response.errorText);
            }
        });
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Set the Notifications-When-Locked state
SystemModel.prototype.SetShowNotificationsWhenLocked = function(value) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm") != -1) {
        Mojo.Log.info("Setting Notifications When Locked to " + value);
        this.service_identifier = 'palm://com.palm.systemservice';
        var request = new Mojo.Service.Request(this.service_identifier, {
            method: 'setPreferences',
            parameters: { showAlertsWhenLocked: value }
        });
        return request;
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Set the LED Notification state
SystemModel.prototype.SetLEDLightNotifications = function(value) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm") != -1) {
        Mojo.Log.info("Setting LED Notifications to " + value);
        this.service_identifier = 'palm://com.palm.systemservice';
        var request = new Mojo.Service.Request(this.service_identifier, {
            method: 'setPreferences',
            parameters: { BlinkNotifications: value }
        });
        return request;
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Get Internet Connection State
SystemModel.prototype.GetInternetConnectionState = function(callback) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm") == -1) {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
    Mojo.Log.info("Requesting Internet connection state from Connection Manager");
    this.connectedRequest = new Mojo.Service.Request("palm://com.palm.connectionmanager", {
        method: "getStatus",
        parameters: {
            subscribe: false
        },
        onSuccess: callback.bind(this),
        onFailure: callback.bind(this)
    });
}

//Set the WAN state
SystemModel.prototype.SetWANEnabled = function(value) {
    var state = value ? 'off' : 'on';
    if (Mojo.Controller.appInfo.id.indexOf("com.palm") != -1) {
        Mojo.Log.info("Setting WAN State to " + value);
        this.service_identifier = 'palm://com.palm.wan/';
        var request = new Mojo.Service.Request(this.service_identifier, {
            method: 'set',
            parameters: { disablewan: state },
            onSuccess: function(response) { Mojo.Log.info("WAN state set to " + value); },
            onFailure: function(response) { Mojo.Log.warn("WAN state not set!", JSON.stringify(response)); }
        });
        return request;
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Set the WIFI state
SystemModel.prototype.SetWifiEnabled = function(value) {
    var state = value ? 'enabled' : 'disabled';
    if (Mojo.Controller.appInfo.id.indexOf("com.palm") != -1) {
        Mojo.Log.info("Setting WIFI State to " + state);
        this.service_identifier = 'palm://com.palm.wifi';
        var request = new Mojo.Service.Request(this.service_identifier, {
            method: 'setstate',
            parameters: { 'state': state },
            onSuccess: function(response) { Mojo.Log.info("Wifi state set to " + state); },
            onFailure: function(response) { Mojo.Log.warn("Wifi state not set!", JSON.stringify(response)); }
        });
        return request;
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Set the Bluetooth radio state
SystemModel.prototype.SetBluetoothEnabled = function(value) {
    //var state  = value ? 'enabled':'disabled';
    if (Mojo.Controller.appInfo.id.indexOf("com.palm") != -1) {
        Mojo.Log.info("Setting Bluetooth State to " + value);
        if (value == true)
            this.bluetoothControlService("palm://com.palm.btmonitor/monitor/radioon", { visible: true, connectable: true }, null);
        else
            this.bluetoothControlService("palm://com.palm.btmonitor/monitor/radiooff", null, null);
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

//Helper for Bluetooth functions, do not call directly
SystemModel.prototype.bluetoothControlService = function(url, params, cb) {
    return new Mojo.Service.Request(url, {
        onSuccess: cb,
        onFailure: cb,
        parameters: params,
    });
}

SystemModel.prototype.GetInstalledApps = function(callback) {
    if (callback)
        callback.bind(this);
    if (Mojo.Controller.appInfo.id.indexOf("com.palm") != -1) {
        Mojo.Log.info("Getting list of installed apps.");
        this.appRequest = new Mojo.Service.Request("palm://com.palm.applicationManager/listApps", {
            method: "",
            parameters: {},
            onSuccess: callback,
            onFailure: callback
        });
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

SystemModel.prototype.GetRunningApps = function(callBack) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm") != -1) {
        Mojo.Log.info("Getting list of running apps.");
        this.appRequest = new Mojo.Service.Request("palm://com.palm.applicationManager/running", {
            method: "",
            parameters: {},
            onSuccess: callBack,
            onFailure: callBack
        });
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

SystemModel.prototype.KillApp = function(appId) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm") != -1) {
        Mojo.Log.info("Killing app id: " + appId);
        this.appRequest = new Mojo.Service.Request("palm://com.palm.applicationManager", {
            method: "close",
            parameters: { "processId": appId },
            onSuccess: function(response) { Mojo.Log.info("App was killed: " + appId); },
            onFailure: function(response) { Mojo.Log.warn("App was not killed!", JSON.stringify(response)); }
        });
    } else {
        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

SystemModel.prototype.ListHandlersForURL = function(url, callback) {

    if (Mojo.Controller.appInfo.id.indexOf("com.palm") != -1) {
        if (callback)
            callback.bind(this);
        Mojo.Log.info("Listing handlers for URL: " + url);

        this.serviceRequest = new Mojo.Service.Request("palm://com.palm.applicationManager", {
            method: "listAllHandlersForUrl",
            parameters: {
                "url": url
            },
            onSuccess: function(response) {
                //Mojo.Log.info("Handler list success: " + JSON.stringify(response));
                if (response && response.redirectHandlers) {
                    if (callback)
                        callback(response.redirectHandlers);
                } else {
                    Mojo.Log.error("Unexpected payload in system service request");
                }
            }.bind(this),
            onFailure: function(response) {
                Mojo.Log.error("Handler list failure: " + JSON.stringify(response));
                if (callback)
                    callback(response);
            }.bind(this)
        });
    } else {

        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

SystemModel.prototype.AddHandlerForURL = function(urlPattern, appId, callback) {

    if (Mojo.Controller.appInfo.id.indexOf("com.palm") != -1) {
        if (!urlPattern)
            throw "No urlPattern specified";
        if (callback)
            callback.bind(this);
        if (!appId)
            appId = Mojo.Controller.appInfo.id;
        Mojo.Log.info("Add handler for URL: " + urlPattern + " with app " + appId);

        if (urlPattern && urlPattern != "" && appId && appId != "" && appId.indexOf(".") > -1) {
            this.serviceRequest = new Mojo.Service.Request("palm://com.palm.applicationManager", {
                method: "addRedirectHandler",
                parameters: {
                    "appId": appId,
                    "urlPattern": urlPattern,
                    "schemeForm": false,
                },
                onSuccess: function(response) {
                    Mojo.Log.info("Handler registration success: " + JSON.stringify(response));
                    if (callback)
                        callback(response);
                    else
                        Mojo.Controller.getAppController().showBanner("URL Helper added: " + appId + ".", { source: 'notification' });
                }.bind(this),
                onFailure: function(response) {
                    Mojo.Log.error("Handler registration failure: " + JSON.stringify(response));
                    if (callback)
                        callback(response);
                    else
                        Mojo.Controller.getAppController().showBanner("URL Helper failed: " + appId + ".", { source: 'notification' });

                }.bind(this)
            });
        } else {
            Mojo.Log.error("Invalid parameters specified. Not attempting to add Redirect Handler!");
        }
    } else {

        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}

SystemModel.prototype.RemoveHandlerForURL = function(appId, callback) {
    if (Mojo.Controller.appInfo.id.indexOf("com.palm") != -1) {

        if (!appId)
            appId = Mojo.Controller.appInfo.id;
        if (callback)
            callback.bind(this);
        Mojo.Log.info("Remove URL handling for app: " + appId);

        this.serviceRequest = new Mojo.Service.Request("palm://com.palm.applicationManager", {
            method: "removeHandlersForAppId",
            parameters: {
                "appId": appId
            },
            onSuccess: function(response) {
                Mojo.Log.info("Handler remove success: " + JSON.stringify(response));
                if (callback)
                    callback(response);
                else
                    Mojo.Controller.getAppController().showBanner("URL Helper removed: " + appId + ".", { source: 'notification' }); 
            }.bind(this),
            onFailure: function(response) {
                Mojo.Log.error("Handler list failure: " + JSON.stringify(response));
                if (callback)
                    callback(response)
                else
                    Mojo.Controller.getAppController().showBanner("URL Helper failed: " + appId + ".", { source: 'notification' });
            }.bind(this)
        });
    } else {

        Mojo.Log.error("Privileged system services can only be called by apps with an ID that starts with 'com.palm'!");
        throw ("Privileged system service call not allowed for this App ID!");
    }
}