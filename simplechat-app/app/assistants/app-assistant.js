/*
In the app assistant, we setup some app-wide global objects and handle different kinds of launches, creating and delegating to the main stage
*/
var appModel = null;
var updaterModel = null;
var systemModel = null;
var MainStageName = "main";
var welcomed = false;
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
            systemModel.ShowNotificationStage("dashboard", "dashboard/dashboard-scene", 60, false, false);
            return;
        }
    } else //If not, determine if we should make one
    {
        if (!params || params["action"] == undefined) //If no parameters were passed, this is a normal launch
        {
            var currVersion = Mojo.Controller.appInfo.version;
            Mojo.Log.info("This is a normal launch of version " + currVersion);

            var stageArguments = { name: MainStageName, lightweight: true };
            this.controller.createStageWithCallback(stageArguments, function(stageController) {
                stageController.pushScene(MainStageName);
            }.bind(this));
            return;
        } else //If parameters were passed, this is a launch from a system alarm
        {

            Mojo.Log.info("This is an alarm launch: " + JSON.stringify(params));
            /*

            return;*/

            var pushClass0AlertScene = function(stageController) {
                stageController.pushScene('dashboard', "dashboard/dashboard-scene");
            }.bind(this);

            Mojo.Controller.getAppController().showBanner("New messages in the chat!", { source: 'notification' });
            //var stageArguments = { name: MainStageName, lightweight: true };
            //this.controller.createStageWithCallback(stageArguments, function(stageController) {
            //   Mojo.Controller.appController.closeStage("main");

            //}.bind(this));

            this.controller.createStageWithCallback({
                name: 'dashboard',
                lightweight: true,
                height: 100,
                soundclass: "assets/silent.mp3"
            }, pushClass0AlertScene, 'popupalert');

            //systemModel.ShowNotificationStage("dashboard", "dashboard/dashboard-scene", 60, false, false);
        }
    }
};

/*
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
*/