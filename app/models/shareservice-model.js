/*
ShareBoard Model - Mojo
 Version 1.0
 Created: 2021
 Author: Jonathan Wise
 License: MIT
 Description: A model to interact with a share service
*/

var ShareServiceModel = function() {
    this.urlBase = Mojo.Controller.appInfo.serviceURL;
    this.shortUrlBase = Mojo.Controller.appInfo.shortURL;
};

//Properties
ShareServiceModel.prototype.ForceHTTP = false;
ShareServiceModel.prototype.UseCustomShare = false;
ShareServiceModel.prototype.CustomShareUser = "";
ShareServiceModel.prototype.CustomSharePhrase = "";
ShareServiceModel.prototype.UseCustomEndpoint = false;
ShareServiceModel.prototype.CustomEndpointURL = "";
ShareServiceModel.prototype.CustomShortURL = "";
ShareServiceModel.prototype.UseCustomClientId = false;
ShareServiceModel.prototype.CustomClientId = "";
//ShareServiceModel.prototype.ServiceCompatWarning = 0;

ShareServiceModel.prototype.buildURL = function(username, actionType) {
    var urlBase = this.urlBase;
    if (this.UseCustomEndpoint == true && this.CustomEndpointURL != "") {
        urlBase = this.CustomEndpointURL;
    }
    //Make sure we don't end up with double slashes in the built URL if there's a custom endpoint
    var urlTest = urlBase.split("://");
    if (urlTest[urlTest.length - 1].indexOf("/") != -1) {
        urlBase = urlBase.substring(0, urlBase.length - 1);
    }
    var path = urlBase + "/" + actionType + ".php";
    if (username)
        path += "?username=" + username;
    if (this.ForceHTTP)
        path = path.replace ("https:", "http:");
    return path;
}

//HTTP request for list files
ShareServiceModel.prototype.DoShareListRequest = function(username, credential, callback) {
    this.retVal = "";
    if (callback)
        callback = callback.bind(this);

    Mojo.Log.info("calling sharing service at " + this.buildURL(username, "get-shares") + " with key " + this.getCurrentClientKey());

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", this.buildURL(username, "get-shares"));
    xmlhttp.setRequestHeader("client-id", this.getCurrentClientKey());
    xmlhttp.setRequestHeader("share-phrase", credential);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (xmlhttp.status == 404) {
                Mojo.Log.error("Share service returned 404 sharing content. If the service is online, there's probably a version mismatch between service and client.");
                Mojo.Controller.getAppController().showBanner({ messageText: "Error sharing: 404 at endpoint" }, "", "");
                if (callback) callback(false);
                return false;
            } else {
                if (xmlhttp.responseText && xmlhttp.responseText != "") {
                    try {
                        var responseObj = JSON.parse(xmlhttp.responseText);
                        if (responseObj.error) {
                            Mojo.Log.error("Share service returned error: " + responseObj.error);
                            Mojo.Controller.getAppController().showBanner({ messageText: "Error getting shares: " + responseObj.error }, "", "");
                            if (callback) {
                                callback(xmlhttp.responseText);
                                return false;
                            }
                        } else {
                            //Mojo.Log.info("Share List success! " + xmlhttp.responseText);
                            if (callback) {
                                callback(xmlhttp.responseText);
                            } else {
                                Mojo.Controller.getAppController().showBanner({ messageText: "Content shared!" }, "", "");
                            }
                            return true;
                        }
                    } catch (ex) {
                        Mojo.Controller.getAppController().showBanner({ messageText: "Error getting shares: server response malformed" }, "", "");
                        Mojo.Log.error("Share service response could not be parsed, error was: " + ex + ", response: " + xmlhttp.responseText);
                    }
                } else {
                    Mojo.Controller.getAppController().showBanner({ messageText: "Error getting shares: server response empty" }, "", "");
                    Mojo.Log.error("Share service response was empty: " + xmlhttp.responseText);
                }
                if (callback) callback(false);
                return false;
            }
        }
    }.bind(this);
}

//HTTP request for add file
ShareServiceModel.prototype.DoShareAddRequestText = function(content, username, credential, contenttype, callback) {
    if (!credential)
        credential = this.getCurrentSharePhrase();

    var useURL = this.buildURL(username, "share-text");
    Mojo.Log.info("Adding text share: " + content + " of type " + contenttype + " from URL " + useURL);

    if (callback)
        callback = callback.bind(this);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", useURL);
    xmlhttp.setRequestHeader("client-id", this.getCurrentClientKey());
    xmlhttp.setRequestHeader("share-phrase", credential);
    xmlhttp.setRequestHeader("content-type", contenttype);
    xmlhttp.send(content);
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (xmlhttp.status == 404) {
                Mojo.Log.error("Share service returned 404 sharing content. If the service is online, there's probably a version mismatch between service and client.");
                Mojo.Controller.getAppController().showBanner({ messageText: "Error sharing: 404 at endpoint" }, "", "");
                if (callback) callback(false);
                return false;
            } else {
                Mojo.Log.info("Share service sent response while sharing text: " + xmlhttp.responseText);
                Mojo.Log.warn(JSON.stringify(xmlhttp));
                if (xmlhttp.responseText && xmlhttp.responseText != "") {
                    try {
                        var responseObj = JSON.parse(xmlhttp.responseText);
                        if (responseObj.error) {
                            Mojo.Log.error("Share service returned error: " + responseObj.error);
                            Mojo.Controller.getAppController().showBanner({ messageText: "Error sharing: " + responseObj.error }, "", "");
                        } else {
                            Mojo.Log.info("Share success! " + xmlhttp.responseText);
                            if (callback) {
                                callback(xmlhttp.responseText);
                            } else {
                                Mojo.Controller.getAppController().showBanner({ messageText: "Content shared!" }, "", "");
                            }
                            return true;
                        }
                    } catch (ex) {
                        Mojo.Controller.getAppController().showBanner({ messageText: "Error sharing: server response malformed" }, "", "");
                        Mojo.Log.error("Share service response could not be parsed, error was: " + ex + ", response: " + xmlhttp.responseText);
                    }
                } else {
                    Mojo.Controller.getAppController().showBanner({ messageText: "Error sharing: server response empty" }, "", "");
                    Mojo.Log.error("Share service response was empty: " + xmlhttp.responseText);
                }
                if (callback) callback(false);
                return false;
            }
        }
    }.bind(this);
}

//Upload a file
ShareServiceModel.prototype.DoShareAddRequestImage = function (fullFilePath, username, credential, contenttype, callback) {

    if (!fullFilePath){
        Mojo.Log.error("Image file path not supplied");
        return false;
    }
	if (!credential)
        credential = this.getCurrentSharePhrase();

    var useURL = this.buildURL(username, "share-image");
    Mojo.Log.info("Adding image share: " + fullFilePath + " of type " + contenttype + " from URL " + useURL);

    if (callback)
        callback = callback.bind(this);
    
    this.uploadRequest = new Mojo.Service.Request('palm://com.palm.downloadmanager/', {
        method: 'upload',
        parameters: {
            fileName: fullFilePath,
            url: useURL,
            fileLabel: "image",
            contentType: contenttype,
            postParameters: [
                {"key":"username", "data": username},
                {"key":"sharephrase" , "data": credential},
            ],
            customHttpHeaders : [ 
                'client-id: ' + this.getCurrentClientKey(),
            ],
            subscribe: true
        },
        onSuccess: function(response) {
            Mojo.Log.info("Upload progress", JSON.stringify(response));
            if (callback) {
                callback(response.responseString);
                return true;
            } else {
                if (response.completed == true) {
                    if (response.responseString) {
                        var responseObj = JSON.parse(response.responseString);
                        if (responseObj.error) {
                            Mojo.Log.error("Upload Error: ", responseObj.error);
                            if (callback) {
                                callback(responseObj.error);
                            } else {
                                Mojo.Controller.getAppController().showBanner({ messageText: "Upload error: " + responseObj.error }, "", "");
                            }
                        } else {
                            Mojo.Log.info("Upload response: " + response.responseString);
                            if (callback) {
                                callback(response.responseStringj);
                            } else {
                                Mojo.Controller.getAppController().showBanner({ messageText: "Content uploaded!" }, "", "");
                            }
                        }
                    }
                }
            }
        },
        onFailure: function(response) {
            Mojo.Log.error("Upload Failure: ", JSON.stringify(response));
            if (callback) {
                callback(response.responseString);
                return false;
            } else {
                Mojo.Controller.getAppController().showBanner({ messageText: "Upload error:" + JSON.stringify(response.responseString.error) }, "", "");
            }
        }
    });
}

//HTTP request for list files
ShareServiceModel.prototype.DoShareDeleteRequest = function(itemid, username, credential, callback) {
    this.retVal = "";
    if (callback)
        callback = callback.bind(this);

    Mojo.Log.info("calling sharing service at " + this.buildURL(username, "delete-share-item") + " for item " + itemid + " with key " + this.getCurrentClientKey());

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", this.buildURL(username, "delete-share-item"));
    xmlhttp.setRequestHeader("client-id", this.getCurrentClientKey());
    xmlhttp.setRequestHeader("password", credential);
    xmlhttp.setRequestHeader("itemid", itemid);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (xmlhttp.status == 404) {
                Mojo.Log.error("Share service returned 404 deleting content. If the service is online, there's probably a version mismatch between service and client.");
                Mojo.Controller.getAppController().showBanner({ messageText: "Error sharing: 404 at endpoint" }, "", "");
                if (callback) callback(false);
                return false;
            } else {
                if (xmlhttp.responseText && xmlhttp.responseText != "") {
                    try {
                        var responseObj = JSON.parse(xmlhttp.responseText);
                        if (responseObj.error) {
                            Mojo.Log.error("Share service returned error: " + responseObj.error);
                            if (callback) {
                                callback(xmlhttp.responseText);
                                return false;
                            } else {
                                Mojo.Controller.getAppController().showBanner({ messageText: "Error deleting share: " + responseObj.error }, "", "");
                            }
                        } else {
                            //Mojo.Log.info("Share List success! " + xmlhttp.responseText);
                            if (callback) {
                                callback(xmlhttp.responseText);
                            } else {
                                Mojo.Controller.getAppController().showBanner({ messageText: "Content deleted!" }, "", "");
                            }
                            return true;
                        }
                    } catch (ex) {
                        Mojo.Controller.getAppController().showBanner({ messageText: "Error deleting share: server response malformed" }, "", "");
                        Mojo.Log.error("Share service response could not be parsed, error was: " + ex + ", response: " + xmlhttp.responseText);
                    }
                } else {
                    Mojo.Controller.getAppController().showBanner({ messageText: "Error deleting share: server response empty" }, "", "");
                    Mojo.Log.error("Share service delete response was empty: " + xmlhttp.responseText);
                }
                if (callback) callback(false);
                return false;
            }
        }
    }.bind(this);
}

//HTTP request to get Terms and Conditions
ShareServiceModel.prototype.GetTnC = function(callback) {
    this.retVal = "";
    if (callback)
        callback = callback.bind(this);

    var useURL = this.buildURL(null, "tandc");
    Mojo.Log.info("Getting Terms and Conditions with query: " + useURL);
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", useURL);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (callback)
                callback(xmlhttp.responseText);
        }
    }.bind(this);
}

//HTTP request to get random share phrase
ShareServiceModel.prototype.GetRandomWords = function(callback) {
    this.retVal = "";
    if (callback)
        callback = callback.bind(this);

    var theQuery = this.buildURL(null, "random-words");
    Mojo.Log.info("Getting Random words query: " + theQuery);
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", theQuery);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (callback)
                callback(xmlhttp.responseText);
        }
    }.bind(this);
}

//HTTP request for new user
ShareServiceModel.prototype.DoNewUserRequest = function(username, sharephrase, password, callback) {
    
    var useURL = this.buildURL(null, "new-user");
    Mojo.Log.info("Creating user: " + username + " with share-phrase " + sharephrase + " and password " + password + " from URL " + useURL);

    if (callback)
        callback = callback.bind(this);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", useURL);
    xmlhttp.setRequestHeader("client-id", this.getCurrentClientKey());
    var request = {
        "username":username,
        "sharephrase":sharephrase,
        "password":password
    }
    xmlhttp.send(JSON.stringify(request));
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (xmlhttp.status == 404) {
                Mojo.Log.error("Share service returned 404 creating user. If the service is online, there's probably a version mismatch between service and client.");
                Mojo.Controller.getAppController().showBanner({ messageText: "Error sharing: 404 at endpoint" }, "", "");
                if (callback) callback(false);
                return false;
            } else {
                Mojo.Log.info("Share service sent response while creating user: " + xmlhttp.responseText);
                if (xmlhttp.responseText && xmlhttp.responseText != "") {
                    try {
                        var responseObj = JSON.parse(xmlhttp.responseText);
                        if (responseObj.error) {
                            Mojo.Log.error("Share service returned error creating user: " + responseObj.error);
                            if (callback) {
                                callback(xmlhttp.responseText);
                            } else {
                                Mojo.Controller.getAppController().showBanner({ messageText: "Error creating user: " + responseObj.error }, "", "");
                            }
                        } else {
                            Mojo.Log.info("New user success! " + xmlhttp.responseText);
                            if (callback) {
                                callback(xmlhttp.responseText);
                            } else {
                                Mojo.Controller.getAppController().showBanner({ messageText: "User created!" }, "", "");
                            }
                            return true;
                        }
                    } catch (ex) {
                        Mojo.Controller.getAppController().showBanner({ messageText: "Error creating user: server response malformed" }, "", "");
                        Mojo.Log.error("Share service response could not be parsed, error was: " + ex + ", response: " + xmlhttp.responseText);
                    }
                } else {
                    Mojo.Controller.getAppController().showBanner({ messageText: "Error sharing: server response empty" }, "", "");
                    Mojo.Log.error("Share service response was empty: " + xmlhttp.responseText);
                }
                if (callback) callback(false);
                return false;
            }
        }
    }.bind(this);
}

ShareServiceModel.prototype.getCurrentClientKey = function() {
    var retVal = atob(appKeys['shareBoardClientKey']);
    if (this.UseCustomEndpoint) {
        retVal = this.CustomClientId;
        Mojo.Log.info("Using custom shareboard client key: " + retVal);
    }
    Mojo.Log.info("Using shareboard client key: " + retVal);
    return retVal;
}

ShareServiceModel.prototype.getCurrentShareUser = function() {
    var retVal = appKeys['shareBoardUser'];
    if (this.UseCustomShare) {
        retVal = this.CustomShareUser;
        Mojo.Log.info("Using custom Share User: " + retVal);
    }
    return retVal;
}

ShareServiceModel.prototype.getCurrentSharePhrase = function() {
    var retVal = atob(appKeys['sharePhrase']);
    if (this.UseCustomShare) {
        retVal = this.CustomSharePhrase;
        Mojo.Log.info("Using custom Share Phrase: " + retVal);
    }
    return retVal;
}