import React, {useEffect, useState} from 'react';
import './App.css';
import {BehaviorSubject, combineLatest, Observable, Subject} from "rxjs";
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
// @ts-ignore
import unique from 'unique-selector';
import {map, withLatestFrom} from "rxjs/operators";
import nearley from 'nearley';
import * as grammar from './grammar/grammar';
import {useObservable} from "./useObservable";
import {StoryManager} from "./StoryManager";
import RealApp from "./RealApp";

function App() {
    /**
     * @class {SeleniumContext}
     */
        // @ts-ignore
    const [ctx, setCtx] = useState(window.seleniumContext);
    const [manager, setManager] = useState()
    setInterval(() => {
        // @ts-ignore
        if (window.seleniumContext) {
            // @ts-ignore
            setCtx(window.seleniumContext);
        }
    }, 250);
    useEffect(() => {
        setManager(new StoryManager())
    }, [])

    return manager ? <RealApp storyManager={manager}/> : <h1>
        Waiting for SeleniumContext to appear
    </h1>
}



async function initClientSide() {
    /**
     * @type {SeleniumContext}
     */
        // We only need the server for replaying
    let ctx = await new Promise(resolve => {
            let i;
            i = setInterval(() => {
                // @ts-ignore
                ctx = window.seleniumContext;
                if (ctx) {
                    resolve(ctx);
                }
            }, 250);
        });
    const m = new StoryManager();
}





export default App;
