/* Copyright 2010 Palm, Inc.  All rights reserved. */
/*global Mojo, $L, Class, window, document, PalmSystem, AppAssistant, palmGetResource, Foundations, _, */

var EmoticonPickerDialogAssistant = function(sceneAssistant, onselect) {

    this.sceneAssistant = sceneAssistant;
    this.controller = sceneAssistant.controller;
    this.onselect = onselect;
};

EmoticonPickerDialogAssistant.prototype.show = function() {
    this.controller.showDialog({
        template: 'main/emoticonpicker-dialog',
        assistant: this
    });
};

EmoticonPickerDialogAssistant.prototype.setup = function(widget) {
    this.widget = widget;
    var emoTable = this.controller.get('emo-table');
    var emoticonList = [
        "B-)",
        ">:(",
        ":'(",
        ":[",
        ":-!",
        "X(",
        ":@",
        "o_O",
        ":O",
        ">:-)",
        "O:)",
        "<3",
        ":-*",
        ":D",
        ":/",
        ":(",
        ":|",
        ":P",
        ";)",
        ":)"
    ];

    var row = emoTable.insertRow();
    var insertCell = this.insertCell;
    emoticonList.forEach(function(emoticon) {
        if (row.cells.length === 5) {
            row = emoTable.insertRow(0);
        }
        insertCell(row, emoticon);
    });

    emoTable.addEventListener(Mojo.Event.tap, this.handleEmoticonSelect.bind(this));
    this.controller.get('cancel_button').addEventListener(Mojo.Event.tap, this.handleClose.bind(this));
};

EmoticonPickerDialogAssistant.prototype.insertCell = function(row, emoticon) {
    var cell = row.insertCell(0);
    var MojoHTML = Mojo.Format.runTextIndexer(emoticon.escapeHTML());
    MojoHTML = MojoHTML.replace("file:///usr/palm/", "");
    cell.innerHTML = MojoHTML;
    cell.setAttribute("emo", emoticon);
    cell.style.height = "40px";
};

EmoticonPickerDialogAssistant.prototype.handleEmoticonSelect = function(event) {
    event.stopPropagation(); // stop the tap because it causes the underlying text item to lose focus
    event.preventDefault();

    var td = event.target;
    if (td && td.tagName !== "TD") {
        td = event.target.up('td');
    }

    if (td) {
        this.onselect(td.getAttribute("emo"));
    }
    this.widget.mojo.close();
};

EmoticonPickerDialogAssistant.prototype.handleClose = function(event) {
    event.stopPropagation(); // stop the tap because it causes the underlying text item to lose focus
    event.preventDefault();
    this.widget.mojo.close();
};