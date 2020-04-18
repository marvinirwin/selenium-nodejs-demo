import React, {useEffect, useState} from 'react';
import logo from './logo.svg';
import './App.css';
import {BehaviorSubject, Subject} from "rxjs";
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';

class SeleniumContext {
    private story$: BehaviorSubject<string>;
    private keydown$: Subject<unknown>;
    private click$: Subject<unknown>;
    private addAction$: Subject<unknown>;
    private addDefinition$: Subject<unknown>;
    private executeStory$: Subject<unknown>;
    private unit_test_bh$: BehaviorSubject<string>;
    private uniqueNameMap$: BehaviorSubject<string>;
    constructor() {
        this.story$ = new BehaviorSubject('');
        this.keydown$ = new Subject();
        this.click$ = new Subject();
        this.addAction$ = new Subject();
        this.addDefinition$ = new Subject();
        this.executeStory$ = new Subject();
        this.unit_test_bh$ = new BehaviorSubject('');
        this.uniqueNameMap$ = new BehaviorSubject('{}');
    }
}


function App() {
  const [actionList, setActionList] = useState([]);
    /**
     * @class {SeleniumContext}
     */
    // @ts-ignore
  const ctx = window.seleniumContext;
  useEffect(() => {
      ctx.sentences$.subscribe(s => {
          setActionList(s);
      });
  }, []);
  return <div>
      <List dense={true}>
          {actionList.map(a => <ListItem key={a}>a</ListItem>)}
      </List>
  </div>
}

export default App;
