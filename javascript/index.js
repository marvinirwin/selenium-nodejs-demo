const path = require('path');
const fs = require('fs');
const SAVE_FILENAME = './story.json';
const _ = require('lodash');
const nearley = require('nearley');
const grammar = require('../grammar/grammar');
const webdriver = require('selenium-webdriver');
const sleep = n => new Promise(resolve => setTimeout(resolve, n));
const {Subject, BehaviorSubject} = require('rxjs');
const {prompt, createSentenceAndInputBox} = require('./ui');

/**
 * Gets the driver to place a script tag containing the css from the file at @param path
 * @param driver
 * @param path
 * @return {Promise<void>}
 */
async function loadCss(driver, path) {
    await driver.executeScript(
        `
        const style = document.createElement('style');
        style.innerHTML = arguments[0];
        document.body.appendChild(style);
        `
        , fs.readFileSync(path).toString());
}

/**
 * Loads all necessary javascript for this project
 * @param driver {WebDriver}
 * @return {Promise<void>}
 */
async function loadJavascript(driver) {
    await loadBundle(driver, path.join(__dirname, 'bundle.js'), 'unique');
    await loadBundle(driver, path.join(__dirname, 'lodash.min.js'));
    await loadBundle(driver, path.join(__dirname, 'jquery.js'));
    await loadBundle(driver, path.join(__dirname, 'jquery.toast.min.js'));
    await loadCss(driver, path.join(__dirname, 'jquery.toast.min.css'));
    await loadBundle(driver, path.join(__dirname, 'jquery-ui.min.js'));
    await loadCss(driver, path.join(__dirname, 'jquery-ui.min.css'));
    await loadCss(driver, path.join(__dirname, 'jquery-ui.structure.min.css'));
    await loadCss(driver, path.join(__dirname, 'jquery-ui.theme.min.css'));
    await driver.executeScript(`window.prompt = ${(prompt.toString())}`);
    // await loadBundle(driver, path.join(__dirname, 'jquery-modal.js')); TODO do we need this?
}

/**
 * Get your driver to create a script element with text from the file at @param path
 * Pass a globalName to have whatever the javascript returned available to all
 * @param driver
 * @param path
 * @param globalName
 * @return {Promise<void>}
 */
async function loadBundle(driver, path, globalName) {
    const text = fs.readFileSync(path).toString();
    const f = () => {
        const scriptTag = document.createElement('script');
        scriptTag.innerText = arguments[0];
        document.body.appendChild(scriptTag);
    };

    let args;
    if (globalName) {
        args = `${globalName} = ${text}`;
    } else {
        args = text;
    }
    await driver.executeScript(
        `
        const scriptTag = document.createElement('script');
        scriptTag.innerHTML = arguments[0];
        document.body.appendChild(scriptTag);
        `
        , args);
}

/**
 * Kindly asks the JQuery instance to place a toast message on the screen
 * @param driver
 * @param msg
 * @return {Promise<void>}
 */
async function debugToast(driver, msg) {
    await driver.executeScript(
        `
            $.toast("${msg}")
        `
    );
}

/**
 * Uses nearly to parse a sentence, returning objects for selenium to execute
 * @param sentence
 * @return {{[p: string]: *}}
 */
function parseSentence(sentence) {
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(sentence);
    let value = parser.results;
    if (!value.length) {
        console.info(sentence)
    }
    if (!value[0]) {
        console.log();
    }
    const t = value[0][0];
    Object.keys(t).forEach(k => {
        // This is a weird hack because sometimes elements are arrays which should not be
        if (Array.isArray(t[k])) {
            t[k] = t[k][0];
        }
    });
    // console.log(JSON.stringify(value, null, /**/'\t'));
    return {...t, sentence};
}

/**
 * Converts e
 * @param driver
 * @param sentences
 * @return {Promise<void>}
 */
async function executeSentences(driver, sentences) {
    try {
        const parsedSentences = sentences.map(s => parseSentence(s));
        const scope = {};
        let scopeElement;
        for (let i = 0; i < parsedSentences.length; i++) {
            const p = parsedSentences[i];
            switch (p.type) {
                case "definition":
                    const {varName, selector} = p;
                    debugToast(driver, `${varName} is ${selector}`);
                    scope[varName] = selector;
                    break;
                case "action":
                    const {verb, article, noun} = p;
                    debugToast(driver, `${verb} ${noun}`);
                    switch (verb) {
                        case "Click":
                            // For now you can only reference nouns by their variable names, not raw selectors
                            scopeElement = scope[noun];
                            if (!scopeElement) {
                                throw new Error(`Unknown variable ${noun}`);
                            }
                            // Tell selenium to click something, maybe do some mousing over
                            // TODO figure out if I can just put a selector in here
                            const e = await driver.findElement(webdriver.By.css(scopeElement));
                            e.click();
                            break;
                        case "Type":
                            // TODO this is a terrible hack, but it will work for now
                            const el = await driver.findElement(webdriver.By.css(scopeElement));
                            await el.sendKeys(noun);
                            break;
                        // Send selenium something
                        /*
                                                    for (let j = 0; j < noun.length; j++) {
                                                        const nounElement = noun[j];
                                                        await new webdriver.ActionSequence(driver)
                                                            .keyDown(nounElement);
                                                        await new webdriver.ActionSequence(driver)
                                                            .keyUp(nounElement);
                                                    }
                        */
                        // TODO see if the above works, I shoud be able to get to the pcs with selenium
                    }
                    await sleep(2000);
                    break;
            }
        }
    } catch (e) {
        console.error(e)
        await sleep(10000)
    } finally {
        driver.close()
    }
}

/**
 * Performs all necessary setup for a DSL IDE/interpreter
 * @param page
 * @param browser
 * @return {Promise<WebDriver>}
 */
async function setup(page, browser = 'chrome') {
    const d = new webdriver.Builder()
        .forBrowser(browser)
        .build();
    await d.get(page);

    return d;
}

function insertActionIntoStory(action, story) {
    return story + '\n' + action;
}

function insertDefinitionIntoStory(definition, story) {
    const els = story.split('\n');
    const firstAction = els.findIndex(({type}) => type === 'action');
    return els.slice(0, firstAction).concat(definition).concat(els.slice(firstAction)) // TODO I don't know if this will work
}

function loadStoryFromDisk() {
    return fs.existsSync('./story.txt') ? fs.readFileSync('./story.txt') : '';
}

module.exports = {
    loadJavascript,
    debugToast,
    insertActionIntoStory,
    insertDefinitionIntoStory,
    executeSentences,
    parseSentence
};

