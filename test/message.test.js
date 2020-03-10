const {DriverObs} = require("../javascript/communication");
const sleep = n => new Promise(resolve => setTimeout(resolve, n));
const webdriver = require('selenium-webdriver');

test('Primitives are passed between the driver observable', async () => {
    const driver = new webdriver.Builder()
        .forBrowser('chrome')
        .build();
    await d.get('localhost:8080');
    const d = new DriverObs(driver);

    // The driver observable takes a while to setup
    await sleep(1000);

    driver.executeScript( `
        window.seleniumContext.story$.next('test');
        `
    );

    let v;
    d.seleniumContext.story$.subscribe(newStory => {
        console.info("newstory");
        console.info(newStory);
        v = newStory;
    });

    await sleep(1000);

    expect(v === 'test');

    d.seleniumContext.story$.next('test');
});