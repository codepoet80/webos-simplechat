/*
In the app assistant, we setup some app-wide global objects and handle different kinds of launches, creating and delegating to the main stage
*/
var appModel = null;
var updaterModel = null;
var systemModel = null;
var MainStageName = "main";
Mojo.Additions = Additions;

function AppAssistant() {
    appModel = new AppModel();
    updaterModel = new UpdaterModel();
    systemModel = new SystemModel();
    serviceModel = new ServiceModel();
}

//This function will handle relaunching the app when an alarm goes off(see the device/alarm scene)
AppAssistant.prototype.handleLaunch = function(params) {
    //Load preferences
    appModel.LoadSettings();
    Mojo.Log.info("settings now: " + JSON.stringify(appModel.AppSettingsCurrent));
    if (!appModel.AppSettingsCurrent["BackgroundUpdate"]) {
        appModel.AppSettingsCurrent["BackgroundUpdate"] = "00:30:00";
        appModel.SaveSettings();
    }

    //get the proxy for the stage in the event it already exists (eg: app is currently open)
    var mainStage = this.controller.getStageProxy("main");
    Mojo.Log.info("SimpleChat is Launching! Launch params: " + JSON.stringify(params));

    //Reset alarms
    systemModel.ClearSystemAlarm("SimpleChat");
    if (appModel.AppSettingsCurrent["BackgroundUpdate"] && appModel.AppSettingsCurrent["BackgroundUpdate"] != "" && appModel.AppSettingsCurrent["BackgroundUpdate"] != -1)
        systemModel.SetSystemAlarmRelative("SimpleChat", appModel.AppSettingsCurrent["BackgroundUpdate"]);

    var AppRunning = false;
    if (mainStage) {
        Mojo.Log.info("Found existing stage, app was already running");
        AppRunning = true;
    } else {
        Mojo.Log.info("Did not find existing stage, this is a new app launch!");
    }

    if (AppRunning) //If the stage exists, use it
    {
        var stageController = this.controller.getStageController("main");
        if (!params || params["action"] == undefined) //If no parameters were passed, this is a normal launch
        {
            Mojo.Log.info("This is a normal re-launch");
            stageController.activate(); //bring existing stage into focus
            return;
        } else //If parameters were passed, this is a launch from a system alarm
        {
            Mojo.Log.info("This is a re-launch with parameters: " + JSON.stringify(params) + ". Safe to ignore, since app is already running.");
            return;
        }
    } else //If not, determine if we should make one
    {
        if (!params || params["action"] == undefined) //If no parameters were passed, this is a normal launch
        {
            Mojo.Log.info("This is a normal launch");
            var stageArguments = { name: MainStageName, lightweight: true };
            this.controller.createStageWithCallback(stageArguments, function(stageController) {
                stageController.pushScene(MainStageName);
            }.bind(this));
            return;
        } else //If parameters were passed, this is a launch from a system alarm
        {
            Mojo.Log.info("This is an alarm launch: " + JSON.stringify(params));

            //For some reason, if we get this far, we have no choice but to create then destroy the main stage
            var stageArguments = { name: MainStageName, lightweight: true };
            this.controller.createStageWithCallback(stageArguments, function(stageController) {
                Mojo.Controller.appController.closeStage("main");

            }.bind(this));
            systemModel.ShowNotificationStage("dashboard", "dashboard/notification-scene", 60, false, false);
            return;
        }
    }

};