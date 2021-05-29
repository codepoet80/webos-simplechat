/*
App Model
 Version 0.4
 Created: 2018
 Author: Jonathan Wise
 License: MIT
 Description: Common functions for webOS apps, particularly for managing persisted options in cookies
*/

var AppModel = function() {
    //Define your default scene (needed for settings management)
    this.DefaultScene = "main";

    //Define your app-wide, non-persisted settings here
    this.LaunchQuery = "";
    this.LastShareSelected = null;
    this.CurrentShareURL = null;
    this.FileMgrPresent = true;

    //Define your app preferences (to be saved by OS)
    this.AppSettingsCurrent = null;
    this.AppSettingsDefaults = {
        Username: "",
        Credential: "",
        SharePhrase: "",
        RefreshTimeout: 60000,
        UseAutoDownload: false,
        AutoDownloadTime: "01:00:00",
        ForceHTTP: false,
        UseCustomEndpoint: false,
        EndpointURL: "",
        ShortURL: "",
        UseCustomClientId: false,
        CustomClientId: "",
        CustomCreateKey: "",
        UseCustomDownloadPath: false,
        CustomDownloadPath: null,
        FirstRun: true,
        DebugMode: false,
    };
}

AppModel.prototype.ShowDownloaderStage = function() {
    Mojo.Log.info("App Model checking if we should to show Dashboard stage...");
    this.serviceEndpointBase = appModel.ServiceEndpointBase;
    if (appModel.AppSettingsCurrent["UseCustomEndpoint"] && appModel.AppSettingsCurrent["EndpointURL"]) {
        this.serviceEndpointBase = appModel.AppSettingsCurrent["EndpointURL"];
    }
    //Check for connectivity, then check for messages
    systemModel.GetInternetConnectionState(this.checkForMessages.bind(this));
}

AppModel.prototype.checkForMessages = function(connMgrResponse) {
    Mojo.Log.info("App Model got response from connection manager: " + JSON.stringify(connMgrResponse));
    if (connMgrResponse && connMgrResponse.isInternetConnectionAvailable) {
        this.actuallyShowDownloaderStage();
    }
}

AppModel.prototype.actuallyShowDownloaderStage = function() {
    this.controller = Mojo.Controller.getAppController();
    var dashboardStage = this.controller.getStageProxy("download");
    var pushDashScene = function(stageController) {
        stageController.pushScene('download', "download/download-scene");
    }.bind(this);

    if (!dashboardStage) {
        Mojo.Log.info("Download dashboard not open, creating it...");
        this.controller.createStageWithCallback({
            name: 'download',
            lightweight: true,
            height: 100,
            soundclass: "assets/silent.mp3"
        }, pushDashScene, 'dashboard');
    } else {
        Mojo.Log.info("Download dashboard already open, activating it...");
        var dashboardStageController = this.controller.getStageController("download");
        if (dashboardStageController) {
            dashboardStageController.activate();
            dashboardStageController.delegateToSceneAssistant("activate");
        }
    }
}

AppModel.prototype.CloseDashboardStageByName = function(stageName) {
    this.controller = Mojo.Controller.getAppController();
    var dashboardStage = this.controller.getStageProxy(stageName);

    if (!dashboardStage) {
        Mojo.Log.info(stageName + " dashboard not open, nothing to do");
    } else {
        Mojo.Log.info(stageName + " dashboard open, closing it...");
        this.controller.closeStage(stageName);
    }
}

//You probably don't need to change the below functions since they all work against the Cookie defaults you defined above.
//  LoadSettings: call when your app starts, or you want to load previously persisted options.
//  SaveSettings: call any time you want to persist an option.
//  ResetSettings: call if you want to forget stored settings and return to defaults. Your default scene will be popped and re-pushed.
AppModel.prototype.LoadSettings = function(safe) {
    this.AppSettingsCurrent = this.AppSettingsDefaults;
    var loadSuccess = false;
    var settingsCookie = new Mojo.Model.Cookie("settings");
    try {
        appSettings = settingsCookie.get();
        if ((typeof appSettings == "undefined" || appSettings == null) || (safe && !this.checkSettingsValid(appSettings))) {
            Mojo.Log.warn("** Using first run default settings");
        } else {
            Mojo.Log.info("** Using cookie settings!");
            this.loadCookieIntoCurrent(appSettings);
            loadSuccess = true;
        }
    } catch (ex) {
        settingsCookie.put(null);
        Mojo.Log.error("** Settings cookie were corrupt and have been purged!");
        Mojo.Log.error(ex);
    }
    return loadSuccess;
}

AppModel.prototype.loadCookieIntoCurrent = function(cookieSettings) {
    this.AppSettingsCurrent = cookieSettings;
}

AppModel.prototype.checkSettingsValid = function(loadedSettings) {
    var retValue = true;
    for (var key in this.AppSettingsDefaults) {
        if (typeof loadedSettings[key] === undefined || loadedSettings[key] == null) {
            Mojo.Log.warn("** An expected saved setting, " + key + ", was null or undefined.");
            retValue = false;
        }
        if (typeof loadedSettings[key] !== typeof this.AppSettingsDefaults[key]) {
            Mojo.Log.warn("** A saved setting, " + key + ", was of type " + typeof(loadedSettings[key]) + " but expected type " + typeof(this.AppSettingsDefaults[key]));
            retValue = false;
        }
        if (typeof this.AppSettingsDefaults[key] === "string" && this.AppSettingsDefaults[key].indexOf(this.BaseDateString) != -1 && loadedSettings[key].indexOf(this.BaseDateString)) {
            Mojo.Log.warn("** A saved setting could not be compared to an expected date value.");
            retValue = false;
        }
        if (typeof this.AppSettingsDefaults[key] === "string" && (this.AppSettingsDefaults[key] == "false" || this.AppSettingsDefaults[key] == "true")) {
            if (loadedSettings[key] != "false" && loadedSettings[key] != "true") {
                Mojo.Log.warn("** A saved setting did not have the expected boolean value.");
                retValue = false;
            }
        }
    }
    return retValue;
}

AppModel.prototype.SaveSettings = function() {
    var settingsCookie = new Mojo.Model.Cookie("settings");
    Mojo.Log.info("Saving settings as: " + JSON.stringify(appModel.AppSettingsCurrent));
    Mojo.Log.info("Default settings at Save time are: " + JSON.stringify(appModel.AppSettingsDefaults));

    settingsCookie.put(appModel.AppSettingsCurrent);
}

AppModel.prototype.ResetSettings = function() {
    Mojo.Log.info("resetting settings");
    //Tell main scene to drop settings
    this.AppSettingsCurrent = this.AppSettingsDefaults;
    this.SaveSettings();
    Mojo.Log.info("settings have been reset");

    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    stageController.popScene(this.DefaultScene);
    Mojo.Log.info("closed default scene");

    //Restart main scene
    stageController.pushScene(this.DefaultScene);
    Mojo.Log.info("re-opened default scene");
}