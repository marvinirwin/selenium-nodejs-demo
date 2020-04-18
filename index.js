const webdriver = require('selenium-webdriver');
const {DriverObs} = require("./javascript/data-bus");
(async () => {
    const driver = new webdriver.Builder()
        .forBrowser('chrome')
        .build();
    await driver.get('localhost:8080');
    const obs = new DriverObs(driver);
    await obs.setup();

    })();
