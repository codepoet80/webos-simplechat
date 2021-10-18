function VersionAssistant(startup) {
    this.isStartup = startup;

    // on first start, this message is displayed, along with the current version message from below
    this.startupMessage = Mojo.Controller.appInfo.startupMessage;

    //New Features
    this.changelog = [
        {
            version: "Version 1.0.2 Changes",
            detail: [
                "Fixes a bug that prevents background downloads when Always Use HTTP is on",
            ]
        },
        {
            version: "Version 1.0.1 Changes",
            detail: [
                "Add download button to detail scene",
                "Fix a layout issue",
            ]
        },
        {
            version: "Version 1.0.0 Features",
            detail: [
                "Wirelessly add photos to Exhibition from anywhere with automatic downloads -- just turn it on in Preferences (requires FileMgr)",
                "Touch2Share content between your devices, either loading it in a web page, or right in the app (turn on 'Handle URLs' in the menu)",
                "Share photos you take on your device via email, text message, or other web apps by copying the link the app makes for you -- grab it from the content detail scene, or turn on 'Copy Link on Share' in Preferences",
                "Start a new share from JustType -- turn it on in your JustType settings",
                "Host your own server for more control and privacy!"
            ]
        },
        {
            version: "Coming Soon",
            detail: [
                "Shared Clipboard mode will minimize to a Dashboard to make it quick and easy to share text and links between your devices",
                "Share with other users, without needing to log out and back in",
            ]
        }
    ];

    // setup command menu
    this.cmdMenuModel = {
        visible: false,
        items: [
            {},
            {
                label: $L("OK! Let's Go..."),
                command: 'do-continue'
            },
            {}
        ]
    };
};

VersionAssistant.prototype.setup = function() {
    this.titleElement = this.controller.get('title');
    this.dataElement = this.controller.get('data');

    this.titleElement.innerHTML = $L('Version Info');

    var html = '';
    html += '<div style="margin: 2px 12px 12px 12px">' + this.startupMessage + '</div>';

    for (var i = 0; i < this.changelog.length; i++) {
        html += Mojo.View.render({ object: { title: this.changelog[i].version }, template: 'version/rowDivider' });
        html += '<ul>';

        for (var j = 0; j < this.changelog[i].detail.length; j++) {
            html += '<li>' + this.changelog[i].detail[j] + '</li>';
        }
        html += '</ul>';
    }

    // set data
    this.dataElement.innerHTML = html;

    // setup menu
    this.controller.setupWidget(Mojo.Menu.appMenu, { omitDefaultItems: true }, { visible: false });

    //if (this.isStartup) {
    // set command menu
    this.controller.setupWidget(Mojo.Menu.commandMenu, { menuClass: 'no-fade' }, this.cmdMenuModel);
    //}
};

VersionAssistant.prototype.activate = function(event) {
    this.timer = this.controller.window.setTimeout(this.showContinue.bind(this), 2 * 1000);
};
VersionAssistant.prototype.deactivate = function(event) {};
VersionAssistant.prototype.cleanup = function(event) {};

VersionAssistant.prototype.showContinue = function() {
    // show the command menu
    this.controller.setMenuVisible(Mojo.Menu.commandMenu, true);
};

VersionAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-continue':
                this.controller.stageController.popScene();
                break;
        }
    }
};