import React from 'react';
import { render } from '@testing-library/react';
import App, {Action, Definition, parseSentence, StoryManager} from './App';
import {useObservable} from "./useObservable";
import {ShowStoryList} from "./App";


test('storyManager does its thing', done => {
  const s1 = parseSentence('BodyEl is body.');
  const s2 = parseSentence('Click the BodyEl.');

  const d = new StoryManager();
  expect(d.activeStoryIndex$.getValue()).toBe(undefined);
  expect(d.stories$.getValue().length).toBe(0);
  // Now add an action?
/*
  d.activeStory$.subscribe(s => {
    expect(s).toBeTruthy()
  })
*/

  d.newAction$.next(
      Action.createAction("Click the loginButton.")
  )
  // We should have an active story with one action now
  expect(d.activeStoryIndex$.getValue()).toBe(0);
  expect(d.stories$.getValue().length).toBe(1);

  d.newDefinition$.next(Definition.createDefinition('loginButton is body.'))
  expect(d.activeStoryIndex$.getValue()).toBe(0);
  expect(d.stories$.getValue().length).toBe(1);
  expect(d.stories$.getValue()[0].getValue().length).toBe(2);


  done()
});
test('renders things', done => {
  const d = new StoryManager();

  const { getByText } = render(<App />);
  // now shift click
  // Then assert the prompt
  //
})
