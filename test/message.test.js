const {DriverObs} = require("../javascript/data-bus");
const sleep = n => new Promise(resolve => setTimeout(resolve, n));
const webdriver = require('selenium-webdriver');
const command = require('selenium-webdriver/lib/command');
const input = require('selenium-webdriver/lib/input');
const {DumbSeleniumContext} = require("../javascript/data-bus");

/**
 * @type {WebDriver}
 */
let driver;
beforeEach(async () => {
    driver = new webdriver.Builder()
        .forBrowser('chrome')
        .build();
    await driver.get('localhost:8080');
});

test('Strings are passed from the browser to Node using seleniumContext', async () => {
    const obs = new DriverObs(driver);
    await obs.setup();

    // The driver observable takes a while to setup
    await sleep(1000);

    driver.executeScript( `
        window.seleniumContext.story$.next('test');
        `
    );

    let v;
    obs.seleniumContext.story$.subscribe(newStory => {
        v = newStory;
    });

    await sleep(1000);

    expect(v === 'test');
});
test('Strings are passed to Selenium from the browser', async () => {
    const obs = new DriverObs(driver);
    await obs.setup();
    await sleep(1000);
    driver.executeScript( `
        window.seleniumContext.story$.subscribe(v => {
            window.seleniumContext.unit_test_bh$.next(v);
        });
        window.seleniumContext.story$.next('test is test.');
        `
    );
    await sleep(1000);

    let value = obs.seleniumContext.unit_test_bh$.getValue();
    expect(false);// TOOD why isn't this working?
});
test('Objects are passed through the driver observable ', async () => {
    const obs = new DriverObs(driver);
    await obs.setup();


    obs.seleniumContext.story$.next('icecream is div.');

    await sleep(2000);
    let value = obs.seleniumContext.unit_test_bh$.getValue();
    let v;
    obs.seleniumContext.story$.subscribe(newStory => {
        v = newStory;
    });

    await sleep(1000);


    // expect(v).to().be('test');
});

async function clickAndNameDiv(obs) {
    const el = await obs.driver.findElement(webdriver.By.css('div'));

    await obs.driver.actions()
        .keyDown(input.Key.SHIFT)
        .move({origin: el})
        .press()
        .release()
        .keyUp(input.Key.SHIFT)
        .perform();

    await sleep(1000);
    // It should prompt us, so select the prompt
    const prompt = await obs.driver.findElement(webdriver.By.css('.name-selector-prompt'));
    // Now enter text in the prompt and press enter
    prompt.sendKeys('test');
    await obs.driver.actions()
        .keyDown(input.Key.ENTER)
        .keyUp(input.Key.ENTER)
        .perform();
    await sleep(1000);
}

async function blankDriverObserver() {
    const obs = new DriverObs(driver);
    await obs.setup();
    obs.seleniumContext.story$.next('');
    return obs;
}

test('Clicking and entering adds a definition and action', async () => {
    const obs = await blankDriverObserver();

    // The driver observable takes a while to setup
    await sleep(1000);
    await clickAndNameDiv(obs);
    const v = obs.seleniumContext.story$.getValue();
    let message = v.includes('test');
    console.info(v, message);
    expect(message);
});
test('Adding to the story adds to the story UI', async () => {
    const obs = await blankDriverObserver();

    // The driver observable takes a while to setup
    const storyEl = await obs.driver.findElement(webdriver.By.css('#user-story-element'));
    expect(storyEl);
    await sleep(1000);
    await clickAndNameDiv(obs);
    await sleep(1000);
    const childEls = await obs.driver.findElement(webdriver.By.css('.story-el'));
    expect(childEls.length === 1);
});
it('Replaying actions works', async () => {
    const obs = new DriverObs(driver);
    await obs.setup();
    // Create an element called erase, which when pressed erases an input
    function c() {
        const textInput = document.createElement('textarea');
        textInput.id = 'textinput';
        const popupButton = document.createElement('popup');
        popupButton.id = 'popupbutton';
        popupButton.onclick = function() {
            const popup = document.createElement('input');
            popup.id = 'popup';
            popup.textContent = 'ICECREAM';
        };
        const clearButton = document.createElement('button');
        clearButton.onclick = e => {
            textInput.textContent = '';
            document.getElementById('popup').remove();
        };
        document.appendChild(textInput);
        document.appendChild(popupButton);
        document.appendChild(clearButton);
    }
    await driver.executeScript(f);
    const textInput = driver.findElement(webdriver.By.css('#textinput'));
    const popupButton = driver.findElement(webdriver.By.css('#popupbutton'));
    async function shiftClick(el) {
        await obs.driver.actions()
            .keyDown(input.Key.SHIFT)
            .move({origin: el})
            .press()
            .release()
            .keyUp(input.Key.SHIFT)
            .perform();
    }
    async function nameEl(name) {
        const prompt = await obs.driver.findElement(webdriver.By.css('.name-selector-prompt'));
        await prompt.sendKeys(name);
        await obs.driver.actions()
            .keyDown(input.Key.ENTER)
            .keyUp(input.Key.ENTER)
            .perform();
    }
    await shiftClick(textInput);
    await nameEl('textinput');
    // Now give it a name
    await shiftClick(popupButton);
    await nameEl('popupbutton');
    // Now that all our elements are created, lets play some actions
    await shiftClick(textInput);
    await textInput.sendKeys('please be replayed')
    await shiftClick(popupButton);
    await sleep(1000);
    expect(obs.seleniumContext.story$.split('\n').length).toBe(3);
    // How do I replay actions again?
});
