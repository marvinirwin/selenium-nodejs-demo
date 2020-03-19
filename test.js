const {DriverObs} = require("./javascript/data-bus");

const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const {
    registerEventWriter,
    registerEventListener,
    go,
    test,
} = require('selenium-listener');
const {
    executeStoryObject,
    addActionToStoryObject,
    addDefinitionToStoryObject,
    createStoryDisplay,
    setStoryDisplayText,
    updateStoryObjectInBrowser,
    getStoryObject,
    loadJavascript,
    setup,
    debugToast,
    updateStory
} = require('./javascript');
const sleep = n => new Promise(resolve => setTimeout(resolve, n));
const fs = require('fs');
const SAVE_FILENAME = './names.json';
const nearley = require("nearley");
const grammar = require("./grammar/grammar.js");
const _ = require('lodash');
const loadStoryFromDisk = require("./javascript").loadStoryFromDisk;

(async () => {
    const driver = new webdriver.Builder()
        .forBrowser('chrome')
        .build();
    await driver.get('localhost:8080');
    const reactor = new DriverObs(driver);
    await reactor.setup();
    // At this point our entire setup script should be called for this page
    // await execute(d, parsed);
    // await sleep(1);
    // Now click a random thing
    /*
    * @type {WebElement}
     */
    /*    const e = await d.findElement(webdriver.By.css('div'));
        await e.click();*/

})();
