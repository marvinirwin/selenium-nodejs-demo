

const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const {
    registerEventWriter,
    registerEventListener,
    go,
    test
} = require('selenium-listener');
const {
    executeStoryObject,
    addActionToStoryObject,
    addDefinitionToStoryObject,
    createStoryDisplay,
    setStoryDisplayText,
    updateStoryObjectInBrowser,
    getStoryObject,
    loadJavascript
} = require('./javascript');
const sleep = n => new Promise(resolve => setTimeout(resolve, n));
const fs = require('fs');
const SAVE_FILENAME = './names.json';
const nearley = require("nearley");
const grammar = require("./grammar/grammar.js");
const _ = require('lodash');

(async () => {
    /**
     * @type {WebDriver}
     */
    let d;
    d = new webdriver.Builder()
        .forBrowser('chrome')
        .build();
    await d.get('http://localhost:8081');
    await loadJavascript(d);
    await updateStoryObjectInBrowser(d, getStoryObject());
    await createStoryDisplay(d);
    await go(d,
        async function (e) {
            const {type, targetSel, targetTe4xt, newName, selectorForElementGettingNamed, action, subject} = e;
            switch (type) {
                case "NAME_SELECTOR":
                    addDefinitionToStoryObject(selectorForElementGettingNamed, newName, d);
                    setStoryDisplayText(d, getStoryObject());
                    await updateStoryObjectInBrowser(d, getStoryObject());
                    break;
                case "ACTION":
                    addActionToStoryObject(action, subject, d);
                    setStoryDisplayText(d, getStoryObject());
                    await updateStoryObjectInBrowser(d, getStoryObject());
                    break;
                case "EXECUTE_STORY":
                    executeStoryObject(d);
                    break;

            }
        },
        /**
         *
         * @param e
         * @return {*[]}
         */
        function (e) {
            switch (e.type) {
                case "click":
                    if (e.target.className === 'name-selector-prompt') {
                        return [false, null];
                    }
                    // For now only record things with the shift key
                    if (!e.shiftKey) {
                        return [false, null];
                    }
                    let s = unique(e.target);
                    let storyObject = window.storyObject;
                    let name1 = window.storyObject.names[s];
                    if (!name1) {
                        window.prompt(s);
                    } else if (name1) {
                        return [
                            true, {
                                type: 'ACTION',
                                action: e.type,
                                subject: name1
                            }];
                    }
                    return [
                        false,
                        null
                    ];
                case "keypress":
                    if (ek.key === 'e') {
                            $.toast(`alt: ${e.altKey} ctrl: ${e.ctrlKey}`);
                    }

                    if (ek.key === 'e' && ek.altKey && ek.ctrlKey) {
                        return [true, {
                            type: "EXECUTE_STORY",
                        }];
                    }
                    return [false, null];

                case "keydown":
                    /**
                     * @type {KeyboardEvent}
                     */
                    let ek = e;
                    if (ek.target.className === 'name-selector-prompt' && ek.key === "Enter") {
                        let newName = e.target.value;
                        const p = e.target.placeholder;
                        let newVar = {
                            type: "NAME_SELECTOR",
                            newName: newName,
                            selectorForElementGettingNamed: p
                        };
                        e.target.remove();
                        return [
                            true,
                            newVar
                        ]
                    }

                    return [false, null];
                default:
                    return [false, null]
            }
        },
    );



    // await execute(d, parsed);
    // await sleep(1);
    // Now click a random thing
    /*
    * @type {WebElement}
     */
    /*    const e = await d.findElement(webdriver.By.css('div'));
        await e.click();*/

})();
