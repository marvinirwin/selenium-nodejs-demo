MAIN -> SENTENCE {% id %}
DEFINITION -> NOUN _ "is" _ NOUN {% ([varName, _, _1, _2, selector]) => ({type: 'definition', varName, selector}) %}
ACTION -> VERB _ ARTICLE _ NOUN {% ([verb, _, article, _1, noun]) => ({type: 'action', verb, article, noun}) %}
SENTENCE -> (ACTION | DEFINITION | WAIT)  "." {% id %}

VERB -> "Click" | "Type" | "Wait" {% id %}
ARTICLE -> "any" | "the" | "this"   {% id %}
selectorCharacter -> ([0-9a-zA-Z] | ">" | " " | "." | "#" | "(" | ")" | ":" | "_" | "-" {% id %}
_ -> " " {% id %}
NOUN -> selectorCharacter:+ {% ([d]) => d.join('') %}

